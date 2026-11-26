import { projects } from "@/content/projects";
import { experience } from "@/content/experience";
import type { SnakeState } from "@/components/hero/snake";

export const SCREEN_W = 1024;
export const SCREEN_H = 768;

export type Fonts = { ident: string; mono: string; sans: string };

export type SectionId = "about" | "projects" | "experience" | "contact";

// ─────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────

function istNow() {
  const d = new Date();
  const time = d.toLocaleTimeString("en-GB", {
    timeZone: "Asia/Kolkata",
    hour12: false,
  });
  const day = d.toLocaleDateString("en-GB", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
  return { time, day };
}

function readableOn(hex: string) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#0d0d0d" : "#f7f5ee";
}

// station bug in the corner — every broadcast channel carries one
function bug(ctx: CanvasRenderingContext2D, f: Fonts, n: number, ink = "#ffffff") {
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = ink;
  ctx.font = `800 26px ${f.ident}`;
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillText(`DA·TV ${n}`, SCREEN_W - 48, 40);
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────
// CH 1 — test card. Built like the old electronic test cards (grid,
// castellations, central circle with bars / ident / gratings / wedge /
// clock), but every band carries something of his.
// ─────────────────────────────────────────────────────────────────────────

const BARS = [
  "#ebe6d2",
  "#e3c442",
  "#52c1bf",
  "#62b548",
  "#b84a98",
  "#c33f39",
  "#3047ad",
  "#121212",
];

export function drawTestCard(ctx: CanvasRenderingContext2D, f: Fonts) {
  const W = SCREEN_W;
  const H = SCREEN_H;
  ctx.fillStyle = "#6f706c";
  ctx.fillRect(0, 0, W, H);

  // grid
  ctx.strokeStyle = "#eeeeea";
  ctx.lineWidth = 3;
  for (let x = 32; x < W; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // castellations along the edges
  for (let x = 0; x < W; x += 64) {
    ctx.fillStyle = (x / 64) % 2 ? "#0f0f0f" : "#f2f2ee";
    ctx.fillRect(x, 0, 64, 22);
    ctx.fillStyle = (x / 64) % 2 ? "#f2f2ee" : "#0f0f0f";
    ctx.fillRect(x, H - 22, 64, 22);
  }
  for (let y = 0; y < H; y += 64) {
    ctx.fillStyle = (y / 64) % 2 ? "#0f0f0f" : "#f2f2ee";
    ctx.fillRect(0, y, 22, 64);
    ctx.fillStyle = (y / 64) % 2 ? "#f2f2ee" : "#0f0f0f";
    ctx.fillRect(W - 22, y, 22, 64);
  }

  // central circle
  const cx = W / 2;
  const cy = H / 2;
  const R = 318;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();

  const top = cy - R;
  // band 1 — colour bars
  const barW = (2 * R) / BARS.length;
  BARS.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(cx - R + i * barW, top, barW + 1, 150);
  });

  // band 2 — the ident
  ctx.fillStyle = "#0b0b0b";
  ctx.fillRect(cx - R, top + 150, 2 * R, 120);
  ctx.fillStyle = "#f4f3ee";
  ctx.font = `800 92px ${f.ident}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("DA·TV", cx, top + 212);

  // band 3 — who
  ctx.fillStyle = "#f4f3ee";
  ctx.fillRect(cx - R, top + 270, 2 * R, 130);
  ctx.fillStyle = "#0b0b0b";
  ctx.font = `700 50px ${f.sans}`;
  ctx.fillText("Divyansh Agarwal", cx, top + 318);
  ctx.font = `500 27px ${f.sans}`;
  ctx.fillStyle = "#3b3b38";
  ctx.fillText("Full-stack engineer in Bangalore", cx, top + 366);

  // band 4 — frequency gratings (stands in for "resolution")
  const gTop = top + 400;
  const blocks = 6;
  const bw = (2 * R) / blocks;
  for (let b = 0; b < blocks; b++) {
    const period = 22 - b * 3.5;
    for (let x = 0; x < bw; x += period) {
      ctx.fillStyle = "#f4f3ee";
      ctx.fillRect(cx - R + b * bw + x, gTop, period / 2, 80);
      ctx.fillStyle = "#0b0b0b";
      ctx.fillRect(cx - R + b * bw + x + period / 2, gTop, period / 2, 80);
    }
  }

  // band 5 — grey wedge
  const wTop = gTop + 80;
  for (let i = 0; i < 6; i++) {
    const v = Math.round(16 + (i * 230) / 5);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(cx - R + (i * 2 * R) / 6, wTop, (2 * R) / 6 + 1, 70);
  }

  // band 6 — clock
  ctx.fillStyle = "#0b0b0b";
  ctx.fillRect(cx - R, wTop + 70, 2 * R, 200);
  const { time } = istNow();
  ctx.fillStyle = "#f4f3ee";
  ctx.font = `600 40px ${f.mono}`;
  ctx.fillText(`${time} IST`, cx, wTop + 108);
  ctx.restore();

  ctx.strokeStyle = "#f4f3ee";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();
}

// ─────────────────────────────────────────────────────────────────────────
// CH 2 — teletext. Rendered on a real 40×25 character grid at low
// resolution and blown up with smoothing off, so it's genuinely blocky.
// The coloured fastext keys along the bottom jump to sections.
// ─────────────────────────────────────────────────────────────────────────

const TT = {
  black: "#000000",
  white: "#ffffff",
  yellow: "#ffff00",
  cyan: "#00ffff",
  green: "#00ff00",
  red: "#ff0000",
  blue: "#0000ff",
  magenta: "#ff00ff",
};
const COLS = 40;
const ROWS = 25;
const CW = 9;
const CH = 14;
let ttCanvas: HTMLCanvasElement | null = null;

const TT_INDEX: { label: string; page: number; section: SectionId; row: number }[] =
  [
    { label: "Who runs this channel", page: 201, section: "about", row: 8 },
    { label: "Projects", page: 300, section: "projects", row: 10 },
    { label: "Where I've worked", page: 400, section: "experience", row: 12 },
    { label: "Get in touch", page: 500, section: "contact", row: 14 },
  ];
const TT_FASTEXT: { label: string; color: string; section: SectionId }[] = [
  { label: "About", color: TT.red, section: "about" },
  { label: "Projects", color: TT.green, section: "projects" },
  { label: "Work", color: TT.yellow, section: "experience" },
  { label: "Contact", color: TT.cyan, section: "contact" },
];

export function teletextHit(u: number, v: number): SectionId | null {
  // u,v in 0..1 with v=0 at the top
  const row = Math.floor(v * ROWS);
  const col = Math.floor(u * COLS);
  const idx = TT_INDEX.find((i) => i.row === row);
  if (idx) return idx.section;
  if (row >= 23) return TT_FASTEXT[Math.min(3, Math.floor(col / 10))].section;
  return null;
}

export function drawTeletext(
  ctx: CanvasRenderingContext2D,
  f: Fonts,
  sinceTune: number,
) {
  if (!ttCanvas) {
    ttCanvas = document.createElement("canvas");
    ttCanvas.width = COLS * CW;
    ttCanvas.height = ROWS * CH;
  }
  const t = ttCanvas.getContext("2d");
  if (!t) return;
  t.fillStyle = TT.black;
  t.fillRect(0, 0, ttCanvas.width, ttCanvas.height);
  t.textBaseline = "top";
  t.font = `700 14px ${f.mono}`;

  const put = (col: number, row: number, text: string, fg: string, bg?: string) => {
    if (bg) {
      t.fillStyle = bg;
      t.fillRect(col * CW, row * CH, text.length * CW, CH);
    }
    t.fillStyle = fg;
    for (let i = 0; i < text.length; i++) {
      t.fillText(text[i], (col + i) * CW + 0.5, row * CH + 1);
    }
  };
  // double-height text: draw at 2x vertical scale across two rows
  const putTall = (col: number, row: number, text: string, fg: string) => {
    t.save();
    t.translate(0, row * CH);
    t.scale(1, 2);
    t.fillStyle = fg;
    for (let i = 0; i < text.length; i++) {
      t.fillText(text[i], (col + i) * CW + 0.5, 0.5);
    }
    t.restore();
  };

  const { time, day } = istNow();
  // header: while "searching", the page counter rolls like a real decoder
  const searching = sinceTune < 900;
  const rolling = 100 + Math.floor((sinceTune / 900) * 100);
  const pageNo = searching ? String(Math.min(199, rolling)) : "200";
  put(0, 0, `P200  DA·TEXT ${pageNo}`, searching ? TT.green : TT.white);
  put(21, 0, `${day.replace(",", "")}`, TT.white);
  put(32, 0, time, TT.yellow);

  if (searching) {
    ctx.drawImage(ttCanvas, 0, 0, SCREEN_W, SCREEN_H);
    return;
  }

  // banner
  t.fillStyle = TT.blue;
  t.fillRect(0, 2 * CH, COLS * CW, 3 * CH);
  putTall(2, 2.5, "DIVYANSH AGARWAL", TT.yellow);
  put(2, 5, "Full-stack engineer, Bangalore", TT.cyan);

  // mosaic rule — teletext block graphics
  for (let c = 0; c < COLS; c++) {
    t.fillStyle = c % 2 ? TT.magenta : TT.blue;
    t.fillRect(c * CW, 6 * CH + 4, CW, 4);
  }

  // index
  TT_INDEX.forEach((i) => {
    const dots = ".".repeat(Math.max(2, 31 - i.label.length));
    put(2, i.row, i.label, TT.white);
    put(2 + i.label.length + 1, i.row, dots, TT.white);
    put(35, i.row, String(i.page), TT.yellow);
  });

  // latest
  const current = experience[0];
  const playable = projects.filter((p) => p.playable).length;
  put(2, 16, "LATEST", TT.black, TT.green);
  put(2, 17, `Now at ${current.company}`, TT.green);
  put(2, 18, `${projects.length} projects, ${playable} playable games`, TT.green);
  put(2, 19, `${experience.length} roles since 2022, GSoC twice`, TT.green);
  // blinking cursor-ish attribute on the newest line
  if (Math.floor(sinceTune / 600) % 2 === 0) put(2, 21, "Press a colour key", TT.white);

  // fastext
  TT_FASTEXT.forEach((k, i) => {
    put(i * 10, 24, ` ${k.label}`.padEnd(10, " "), TT.black, k.color);
  });

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(ttCanvas, 0, 0, SCREEN_W, SCREEN_H);
  ctx.imageSmoothingEnabled = true;
}

// ─────────────────────────────────────────────────────────────────────────
// CH 3 — now showing. One project per slot, full-field colour, with a
// broadcast lower third and a slot progress bar.
// ─────────────────────────────────────────────────────────────────────────

export const REEL_SLOT_MS = 5200;

export function drawReel(
  ctx: CanvasRenderingContext2D,
  f: Fonts,
  sinceTune: number,
  start: number,
) {
  const slot = Math.floor(sinceTune / REEL_SLOT_MS);
  const p = projects[(start + slot) % projects.length];
  const local = (sinceTune % REEL_SLOT_MS) / REEL_SLOT_MS;
  const color = p.color ?? "#c8ff3d";
  const ink = readableOn(color);

  ctx.fillStyle = color;
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  // soft studio falloff so the field isn't flat
  const g = ctx.createRadialGradient(330, 260, 40, 512, 384, 760);
  g.addColorStop(0, "rgba(255,255,255,0.18)");
  g.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

  // title slides in on each slot change
  const ease = 1 - Math.pow(1 - Math.min(1, local * 5), 3);
  ctx.save();
  ctx.translate((1 - ease) * -60, 0);
  ctx.globalAlpha = ease;
  ctx.fillStyle = ink;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `800 ${p.title.length > 11 ? 104 : 132}px ${f.ident}`;
  ctx.fillText(p.title, 72, 330);
  ctx.font = `500 32px ${f.sans}`;
  wrap(ctx, p.tagline, 72, 392, 820, 42);
  ctx.restore();

  ctx.fillStyle = ink;
  ctx.globalAlpha = 0.7;
  ctx.font = `600 26px ${f.mono}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(p.year, 72, 70);
  ctx.globalAlpha = 1;

  // lower third
  const y = SCREEN_H - 170;
  ctx.fillStyle = "rgba(8,8,8,0.88)";
  ctx.fillRect(56, y, SCREEN_W - 112, 92);
  ctx.fillStyle = color;
  ctx.fillRect(56, y, 14, 92);
  ctx.fillStyle = "#f4f3ee";
  ctx.font = `700 28px ${f.sans}`;
  ctx.textBaseline = "middle";
  ctx.fillText("Now showing", 96, y + 30);
  ctx.fillStyle = "#b9b8b1";
  ctx.font = `500 24px ${f.mono}`;
  ctx.fillText(p.tech.join("  /  "), 96, y + 64);
  // slot progress
  ctx.fillStyle = "rgba(244,243,238,0.18)";
  ctx.fillRect(56, y + 92, SCREEN_W - 112, 6);
  ctx.fillStyle = color;
  ctx.fillRect(56, y + 92, (SCREEN_W - 112) * local, 6);

  bug(ctx, f, 3, ink);
}

function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  max: number,
  lh: number,
) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > max && line) {
      ctx.fillText(line, x, yy);
      line = w;
      yy += lh;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, yy);
}

// ─────────────────────────────────────────────────────────────────────────
// CH 4 — after hours. Snake, playable, with a demo loop when idle.
// ─────────────────────────────────────────────────────────────────────────

export function drawAfterHours(
  ctx: CanvasRenderingContext2D,
  f: Fonts,
  s: SnakeState,
  demo: boolean,
  time: number,
) {
  const W = SCREEN_W;
  const H = SCREEN_H;
  ctx.fillStyle = "#040806";
  ctx.fillRect(0, 0, W, H);

  const top = 110;
  const pad = 64;
  const cell = Math.min((W - pad * 2) / s.cols, (H - top - 60) / s.rows);
  const ox = (W - cell * s.cols) / 2;
  const oy = top;

  ctx.strokeStyle = "rgba(200,255,61,0.35)";
  ctx.lineWidth = 3;
  ctx.strokeRect(ox - 6, oy - 6, cell * s.cols + 12, cell * s.rows + 12);

  // food
  const pulse = 0.8 + Math.sin(time * 6) * 0.2;
  ctx.fillStyle = "#ff8a3d";
  ctx.fillRect(
    ox + s.food.x * cell + cell * (0.5 - pulse * 0.35),
    oy + s.food.y * cell + cell * (0.5 - pulse * 0.35),
    cell * pulse * 0.7,
    cell * pulse * 0.7,
  );

  s.snake.forEach((seg, i) => {
    const a = 1 - (i / s.snake.length) * 0.5;
    ctx.fillStyle = i === 0 ? "#e8ffb0" : `rgba(200,255,61,${a})`;
    ctx.fillRect(ox + seg.x * cell + 2, oy + seg.y * cell + 2, cell - 4, cell - 4);
  });

  ctx.fillStyle = "#c8ff3d";
  ctx.font = `700 34px ${f.ident}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("After hours", ox, 58);
  ctx.textAlign = "right";
  ctx.font = `600 30px ${f.mono}`;
  ctx.fillText(`Score ${String(s.score).padStart(3, "0")}`, ox + cell * s.cols, 58);

  if (demo && Math.floor(time * 1.6) % 2 === 0) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#f4f3ee";
    ctx.font = `600 28px ${f.sans}`;
    ctx.fillText("Demo. Press an arrow key to play.", W / 2, H - 34);
  }
  if (s.gameOver) {
    ctx.fillStyle = "rgba(4,8,6,0.82)";
    ctx.fillRect(0, H / 2 - 90, W, 180);
    ctx.textAlign = "center";
    ctx.fillStyle = "#c8ff3d";
    ctx.font = `800 64px ${f.ident}`;
    ctx.fillText("Game over", W / 2, H / 2 - 18);
    ctx.fillStyle = "#f4f3ee";
    ctx.font = `500 28px ${f.sans}`;
    ctx.fillText("Space to play again", W / 2, H / 2 + 42);
  } else if (s.paused) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#f4f3ee";
    ctx.font = `700 44px ${f.ident}`;
    ctx.fillText("Paused", W / 2, H / 2);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// average screen colour — drives the light the tube throws into the room
// ─────────────────────────────────────────────────────────────────────────

let probe: HTMLCanvasElement | null = null;
export function averageColor(src: HTMLCanvasElement): [number, number, number] {
  if (!probe) {
    probe = document.createElement("canvas");
    probe.width = 8;
    probe.height = 6;
  }
  const p = probe.getContext("2d", { willReadFrequently: true });
  if (!p) return [0, 0, 0];
  p.drawImage(src, 0, 0, 8, 6);
  const d = p.getImageData(0, 0, 8, 6).data;
  let r = 0;
  let g = 0;
  let b = 0;
  for (let i = 0; i < d.length; i += 4) {
    r += d[i];
    g += d[i + 1];
    b += d[i + 2];
  }
  const n = d.length / 4;
  return [r / n / 255, g / n / 255, b / n / 255];
}
