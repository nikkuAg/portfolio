export type Vec = { x: number; y: number };
export type SnakeState = {
  snake: Vec[];
  food: Vec;
  dir: Vec;
  nextDir: Vec;
  score: number;
  gameOver: boolean;
  cols: number;
  rows: number;
  paused: boolean;
};

export const SNAKE_COLS = 24;
export const SNAKE_ROWS = 18;

function randCell(cols: number, rows: number, exclude: Vec[]): Vec {
  while (true) {
    const c = {
      x: Math.floor(Math.random() * cols),
      y: Math.floor(Math.random() * rows),
    };
    if (!exclude.some((s) => s.x === c.x && s.y === c.y)) return c;
  }
}

export function createSnake(cols = SNAKE_COLS, rows = SNAKE_ROWS): SnakeState {
  const start: Vec[] = [
    { x: Math.floor(cols / 2), y: Math.floor(rows / 2) },
    { x: Math.floor(cols / 2) - 1, y: Math.floor(rows / 2) },
    { x: Math.floor(cols / 2) - 2, y: Math.floor(rows / 2) },
  ];
  return {
    snake: start,
    food: randCell(cols, rows, start),
    dir: { x: 1, y: 0 },
    nextDir: { x: 1, y: 0 },
    score: 0,
    gameOver: false,
    cols,
    rows,
    paused: false,
  };
}

export function inputSnake(state: SnakeState, dir: Vec): SnakeState {
  // disallow 180° reversal
  if (dir.x === -state.dir.x && dir.y === -state.dir.y) return state;
  if (dir.x === state.dir.x && dir.y === state.dir.y) return state;
  return { ...state, nextDir: dir };
}

export function tickSnake(state: SnakeState): SnakeState {
  if (state.gameOver || state.paused) return state;
  const dir = state.nextDir;
  const head = state.snake[0];
  const newHead = { x: head.x + dir.x, y: head.y + dir.y };

  if (
    newHead.x < 0 ||
    newHead.x >= state.cols ||
    newHead.y < 0 ||
    newHead.y >= state.rows ||
    state.snake.some((s) => s.x === newHead.x && s.y === newHead.y)
  ) {
    return { ...state, gameOver: true };
  }

  const ate = newHead.x === state.food.x && newHead.y === state.food.y;
  const newSnake = ate
    ? [newHead, ...state.snake]
    : [newHead, ...state.snake.slice(0, -1)];

  return {
    ...state,
    snake: newSnake,
    dir,
    food: ate ? randCell(state.cols, state.rows, newSnake) : state.food,
    score: ate ? state.score + 10 : state.score,
  };
}

// Auto-pilot for demo mode: greedy step toward food, avoiding self/walls
export function autoPilotDir(state: SnakeState): Vec {
  const head = state.snake[0];
  const candidates: Vec[] = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];

  const isSafe = (d: Vec) => {
    const n = { x: head.x + d.x, y: head.y + d.y };
    if (n.x < 0 || n.x >= state.cols || n.y < 0 || n.y >= state.rows)
      return false;
    if (state.snake.some((s) => s.x === n.x && s.y === n.y)) return false;
    if (d.x === -state.dir.x && d.y === -state.dir.y) return false;
    return true;
  };

  const safe = candidates.filter(isSafe);
  if (safe.length === 0) return state.dir;

  safe.sort((a, b) => {
    const da = Math.hypot(head.x + a.x - state.food.x, head.y + a.y - state.food.y);
    const db = Math.hypot(head.x + b.x - state.food.x, head.y + b.y - state.food.y);
    return da - db;
  });

  return safe[0];
}

export function renderSnake(
  ctx: CanvasRenderingContext2D,
  state: SnakeState,
  w: number,
  h: number,
  time: number,
) {
  // background — soft phosphor dark
  ctx.fillStyle = "#031608";
  ctx.fillRect(0, 0, w, h);

  // subtle grid
  ctx.strokeStyle = "rgba(200,255,61,0.04)";
  ctx.lineWidth = 1;
  const cellW = w / state.cols;
  const cellH = h / state.rows;
  for (let i = 1; i < state.cols; i++) {
    ctx.beginPath();
    ctx.moveTo(i * cellW, 0);
    ctx.lineTo(i * cellW, h);
    ctx.stroke();
  }
  for (let j = 1; j < state.rows; j++) {
    ctx.beginPath();
    ctx.moveTo(0, j * cellH);
    ctx.lineTo(w, j * cellH);
    ctx.stroke();
  }

  // food (pulsing)
  const pulse = 1 + Math.sin(time * 6) * 0.15;
  ctx.fillStyle = "#ff7a3d";
  const fr = (Math.min(cellW, cellH) * 0.45) * pulse;
  ctx.beginPath();
  ctx.arc(
    state.food.x * cellW + cellW / 2,
    state.food.y * cellH + cellH / 2,
    fr,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  // snake
  for (let i = state.snake.length - 1; i >= 0; i--) {
    const s = state.snake[i];
    const alpha = 1 - (i / state.snake.length) * 0.45;
    ctx.fillStyle = i === 0 ? "#c8ff3d" : `rgba(200, 255, 61, ${alpha})`;
    ctx.fillRect(
      s.x * cellW + 1,
      s.y * cellH + 1,
      cellW - 2,
      cellH - 2,
    );
  }

  // HUD
  ctx.fillStyle = "#c8ff3d";
  ctx.font = "700 26px 'Geist Mono', monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("SCORE " + state.score.toString().padStart(3, "0"), 18, 14);

  ctx.textAlign = "right";
  ctx.fillText("CH·01 GAME", w - 18, 14);

  if (state.gameOver) {
    ctx.fillStyle = "rgba(3,22,8,0.7)";
    ctx.fillRect(0, h / 2 - 80, w, 160);
    ctx.fillStyle = "#c8ff3d";
    ctx.font = "700 56px 'Geist Mono', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("GAME OVER", w / 2, h / 2 - 20);
    ctx.font = "500 22px 'Geist Mono', monospace";
    ctx.fillText("PRESS SPACE TO RESTART", w / 2, h / 2 + 30);
  }
}
