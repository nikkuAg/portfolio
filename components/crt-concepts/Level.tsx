"use client";

import { useEffect, useRef } from "react";

// Concept G: the name is the level. Its letters are built from blocks, a
// small runner plays through them on its own, and the visitor can take
// over: click or tap somewhere to send the runner there, or use the arrow
// keys and space. Head-butting a block bumps it; gems sit on the letters.

const SKY_TOP = "#0e0c26";
const SKY_LOW = "#2a1f55";
const BLOCK = "#e8d6a3";
const BLOCK_HI = "#fff4d2";
const BLOCK_LO = "#ad9260";
const GROUND = "#4a3b80";
const GROUND_HI = "#7d6bc4";
const RUNNER = "#5ef2c2";
const SCARF = "#ff6b6b";
const GEM = "#ffd447";

const G = 64; // tiles / s²
const JUMP = Math.sqrt(2 * G * 9.2); // clears ~9 tiles
const RUN = 9.5;
const AUTO_RUN = 7;
const PW = 1.3;
const PH = 1.8;

type Gem = { x: number; y: number; got: boolean; at: number };

function identFont() {
  const host = document.querySelector("[data-tv-fonts]") ?? document.documentElement;
  return getComputedStyle(host).getPropertyValue("--font-ident").trim() || "sans-serif";
}

// 6×8 runner, two frames; 1 body, 2 eye, 3 scarf
const SPRITE = [
  [
    "011110",
    "112121",
    "111111",
    "333331",
    "011110",
    "011110",
    "010010",
    "110011",
  ],
  [
    "011110",
    "112121",
    "111111",
    "333331",
    "011110",
    "011110",
    "001100",
    "011000",
  ],
];

export function Level() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let T = 12;
    let cols = 0;
    let rows = 0;
    let groundRow = 0;
    let tiles = new Uint8Array(0); // 0 air, 1 letter, 2 ground
    const bumps = new Map<number, number>();
    let gems: Gem[] = [];
    let stars: [number, number, number][] = [];
    let raf = 0;
    let visible = true;
    let last = performance.now();

    const p = { x: 2, y: 0, vx: 0, vy: 0, ground: false, jumps: 2, face: 1, run: 0 };
    const input = { left: false, right: false, target: null as number | null, lastAt: -1e9, engaged: false };

    function build() {
      const r = canvas!.getBoundingClientRect();
      w = r.width;
      h = r.height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      const mobile = w < 768;
      T = mobile ? w / 64 : Math.max(10, Math.min(16, w / 100));
      cols = Math.ceil(w / T);
      rows = Math.ceil(h / T);
      groundRow = Math.floor((mobile ? h * 0.47 : h * 0.56) / T);

      // rasterise the name one pixel per tile
      const low = document.createElement("canvas");
      low.width = cols;
      low.height = rows;
      const o = low.getContext("2d", { willReadFrequently: true })!;
      o.fontStretch = "expanded";
      const room = mobile ? cols - 4 : cols * 0.62;
      let fs = 12;
      for (; fs > 6; fs--) {
        o.font = `800 ${fs}px ${identFont()}`;
        if (o.measureText("DIVYANSH").width <= room) break;
      }
      const cap = Math.round(fs * 0.72);
      const left = mobile ? 2 : Math.round(cols * 0.05);
      o.fillStyle = "#fff";
      o.textBaseline = "alphabetic";
      o.fillText("AGARWAL", left, groundRow);
      o.fillText("DIVYANSH", left, groundRow - cap - 4);
      const d = o.getImageData(0, 0, cols, rows).data;
      tiles = new Uint8Array(cols * rows);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (y >= groundRow && y < groundRow + 2) tiles[y * cols + x] = 2;
          else if (y < groundRow && d[(y * cols + x) * 4 + 3] > 110) tiles[y * cols + x] = 1;
        }
      }

      // gems on the tops of letters, a few columns apart
      gems = [];
      let lastCol = -9;
      for (let x = 0; x < cols; x++) {
        for (let y = 1; y < groundRow; y++) {
          if (tiles[y * cols + x] === 1 && !tiles[(y - 1) * cols + x]) {
            if (x - lastCol >= 4 && !tiles[(y - 2) * cols + x] && !tiles[(y - 3) * cols + x]) {
              gems.push({ x: x + 0.5, y: y - 1.6, got: false, at: 0 });
              lastCol = x;
            }
            break;
          }
        }
      }
      stars = Array.from({ length: Math.round((w * h) / 9000) }, () => [
        Math.random() * w,
        Math.random() * groundRow * T * 0.95,
        Math.random(),
      ]);
      spawn();
    }

    function spawn() {
      p.x = 1;
      p.y = groundRow - PH - 0.01;
      p.vx = 0;
      p.vy = 0;
    }

    const solid = (cx: number, cy: number) => {
      if (cy < 0 || cy >= rows) return false;
      const x = ((cx % cols) + cols) % cols;
      return tiles[cy * cols + x] > 0;
    };

    function hits(x: number, y: number) {
      for (let cy = Math.floor(y); cy <= Math.floor(y + PH - 0.001); cy++)
        for (let cx = Math.floor(x); cx <= Math.floor(x + PW - 0.001); cx++) if (solid(cx, cy)) return true;
      return false;
    }

    function jump(now: number) {
      if (p.ground) {
        p.vy = -JUMP;
        p.jumps = 1;
      } else if (p.jumps > 0) {
        p.vy = -JUMP * 0.82;
        p.jumps = 0;
      }
      void now;
    }

    function step(dt: number, now: number) {
      const auto = now - input.lastAt > 4500;
      let dir = 0;
      if (auto) {
        dir = 1;
        // blocked ahead: hop, and hop again at the top if that wasn't enough
        const ahead = hits(p.x + 0.35, p.y);
        if (ahead && (p.ground || (p.vy > -6 && p.jumps > 0))) jump(now);
      } else if (input.left || input.right) {
        dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      } else if (input.target != null) {
        const dx = input.target - (p.x + PW / 2);
        if (Math.abs(dx) > 0.4) dir = Math.sign(dx);
        else input.target = null;
        if (dir && hits(p.x + dir * 0.35, p.y) && (p.ground || (p.vy > -6 && p.jumps > 0))) jump(now);
      }
      const speed = auto ? AUTO_RUN : RUN;
      p.vx += (dir * speed - p.vx) * Math.min(1, dt * 14);
      if (dir) p.face = dir;
      p.vy = Math.min(p.vy + G * dt, 40);

      // x then y, each resolved against the tile grid
      let nx = p.x + p.vx * dt;
      if (hits(nx, p.y)) {
        nx = p.vx > 0 ? Math.floor(nx + PW) - PW - 0.001 : Math.floor(nx) + 1.001;
        if (hits(nx, p.y)) nx = p.x;
        p.vx = 0;
      }
      p.x = nx;
      let ny = p.y + p.vy * dt;
      p.ground = false;
      if (hits(p.x, ny)) {
        if (p.vy > 0) {
          ny = Math.floor(ny + PH) - PH - 0.001;
          p.ground = true;
          p.jumps = 2;
        } else {
          const row = Math.floor(ny);
          ny = row + 1.001;
          // bump whatever was overhead
          for (let cx = Math.floor(p.x); cx <= Math.floor(p.x + PW - 0.001); cx++) {
            const x = ((cx % cols) + cols) % cols;
            if (tiles[row * cols + x] === 1) bumps.set(row * cols + x, now);
          }
        }
        if (hits(p.x, ny)) ny = p.y;
        p.vy = 0;
      }
      p.y = ny;
      // the level wraps sideways; falling out respawns
      if (p.x > cols) p.x -= cols + PW;
      if (p.x < -PW) p.x += cols + PW;
      if (p.y > rows) spawn();
      p.run += Math.abs(p.vx) * dt;

      for (const g of gems) {
        if (g.got) continue;
        if (Math.abs(g.x - (p.x + PW / 2)) < 1 && Math.abs(g.y - (p.y + PH / 2)) < 1.3) {
          g.got = true;
          g.at = now;
        }
      }
    }

    function draw(now: number) {
      const c = ctx!;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      const sky = c.createLinearGradient(0, 0, 0, groundRow * T);
      sky.addColorStop(0, SKY_TOP);
      sky.addColorStop(1, SKY_LOW);
      c.fillStyle = sky;
      c.fillRect(0, 0, w, h);
      for (const [x, y, k] of stars) {
        const tw = reduce ? 0.6 : 0.4 + 0.4 * Math.sin(now / 700 + k * 40);
        c.fillStyle = `rgba(255,255,255,${tw * 0.7})`;
        const s = k > 0.85 ? 2 : 1;
        c.fillRect(Math.round(x), Math.round(y), s, s);
      }
      // below ground the page just goes dark, for the copy
      c.fillStyle = "#0b0a18";
      c.fillRect(0, (groundRow + 2) * T, w, h);

      const e = Math.max(1, Math.round(T / 6));
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const v = tiles[y * cols + x];
          if (!v) continue;
          const px = x * T;
          let py = y * T;
          const b = bumps.get(y * cols + x);
          if (b != null) {
            const k = (now - b) / 260;
            if (k >= 1) bumps.delete(y * cols + x);
            else py -= Math.sin(k * Math.PI) * T * 0.4;
          }
          if (v === 2) {
            c.fillStyle = GROUND;
            c.fillRect(px, py, T + 0.5, T + 0.5);
            if (y === groundRow) {
              c.fillStyle = GROUND_HI;
              c.fillRect(px, py, T + 0.5, e);
            }
          } else {
            c.fillStyle = BLOCK;
            c.fillRect(px, py, T + 0.5, T + 0.5);
            if (!tiles[(y - 1) * cols + x]) {
              c.fillStyle = BLOCK_HI;
              c.fillRect(px, py, T + 0.5, e);
            }
            if (!tiles[(y + 1) * cols + x]) {
              c.fillStyle = BLOCK_LO;
              c.fillRect(px, py + T - e, T + 0.5, e);
            }
          }
        }
      }

      for (const g of gems) {
        let gy = g.y;
        let a = 1;
        if (g.got) {
          const k = (now - g.at) / 400;
          if (k >= 1) continue;
          gy -= k * 2;
          a = 1 - k;
        } else if (!reduce) gy += Math.sin(now / 300 + g.x) * 0.15;
        const sx = reduce ? 1 : Math.abs(Math.cos(now / 400 + g.x * 0.7));
        c.globalAlpha = a;
        c.fillStyle = GEM;
        c.beginPath();
        c.moveTo(g.x * T, (gy - 0.55) * T);
        c.lineTo((g.x + 0.42 * sx) * T, gy * T);
        c.lineTo(g.x * T, (gy + 0.55) * T);
        c.lineTo((g.x - 0.42 * sx) * T, gy * T);
        c.closePath();
        c.fill();
        c.globalAlpha = 1;
      }

      // the runner, pixel by pixel
      const frame = p.ground && Math.abs(p.vx) > 0.5 ? Math.floor(p.run * 1.6) % 2 : 0;
      const spr = SPRITE[frame];
      const sw = (PW * T) / 6;
      const sh = (PH * T) / 8;
      for (let ry = 0; ry < 8; ry++) {
        for (let rx = 0; rx < 6; rx++) {
          const ch = spr[ry][p.face > 0 ? rx : 5 - rx];
          if (ch === "0") continue;
          c.fillStyle = ch === "1" ? RUNNER : ch === "2" ? "#0e0c26" : SCARF;
          c.fillRect(p.x * T + rx * sw, p.y * T + ry * sh, sw + 0.4, sh + 0.4);
        }
      }

      const got = gems.filter((g) => g.got).length;
      c.font = `600 ${w < 768 ? 12 : 13}px ui-monospace, monospace`;
      c.textAlign = "right";
      c.fillStyle = GEM;
      c.fillText(`${got} / ${gems.length} gems`, w - (w < 768 ? 16 : 32), (groundRow + 2) * T + 24);
      c.textAlign = "left";
    }

    function frameLoop(now: number) {
      raf = requestAnimationFrame(frameLoop);
      if (!visible) {
        last = now;
        return;
      }
      let dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!reduce) {
        while (dt > 0) {
          const s = Math.min(dt, 1 / 120);
          step(s, now);
          dt -= s;
        }
      }
      draw(now);
    }

    function onDown(e: PointerEvent) {
      // only clicks on the open sky/level, not on the copy's buttons
      if ((e.target as HTMLElement).closest("a,button,input,label")) return;
      const r = canvas!.getBoundingClientRect();
      const tx = (e.clientX - r.left) / T;
      const ty = (e.clientY - r.top) / T;
      if (ty > groundRow + 2) return;
      input.target = tx;
      input.lastAt = performance.now();
      if (ty < p.y - 1) jump(input.lastAt);
    }

    function onKey(e: KeyboardEvent, down: boolean) {
      const k = e.key;
      const isMove = k === "ArrowLeft" || k === "ArrowRight" || k === "a" || k === "d";
      const isJump = k === "ArrowUp" || k === "w" || k === " ";
      if (!visible || !(isMove || isJump)) return;
      if ((e.target as HTMLElement).closest?.("input,textarea,select")) return;
      // space only belongs to the game once someone has started playing
      if (k === " " && !input.engaged) return;
      if (isMove) input.engaged = true;
      e.preventDefault();
      input.lastAt = performance.now();
      input.target = null;
      if (k === "ArrowLeft" || k === "a") input.left = down;
      if (k === "ArrowRight" || k === "d") input.right = down;
      if (isJump && down && !e.repeat) jump(input.lastAt);
    }
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);

    let resizeTimer = 0;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(build, 150);
    };
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0.3 });
    io.observe(canvas);
    document.fonts.ready.then(() => {
      build();
      raf = requestAnimationFrame(frameLoop);
    });
    const hero = canvas.closest("section") ?? canvas;
    hero.addEventListener("pointerdown", onDown as EventListener);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      hero.removeEventListener("pointerdown", onDown as EventListener);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={ref} aria-hidden style={{ width: "100%", height: "100%", display: "block", touchAction: "manipulation" }} />;
}
