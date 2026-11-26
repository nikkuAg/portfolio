"use client";

import { useEffect, useRef } from "react";
import { inkGrid, ready, stageBox } from "./subject";

// Concept P: the subject built from sand. Grains in the picture are held in
// place until the pointer touches them; then they come loose, fall, and
// pile up on the floor like real sand (a cellular automaton). Left alone,
// a breeze lifts grains off the pile and carries them back home.

const BG = [17, 15, 14];
const SHADES = [
  [232, 196, 138],
  [222, 182, 120],
  [240, 210, 160],
  [205, 165, 108],
];

type Flyer = { x0: number; y0: number; x1: number; y1: number; t: number; c: number };

export function FallingSand() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const C = 3;
    let GW = 0;
    let GH = 0;
    let floor = 0;
    let cell = new Uint8Array(0); // 0 empty, 1 held in the picture, 2 loose
    let shade = new Uint8Array(0);
    let home = new Uint8Array(0);
    let img: ImageData | null = null;
    const off = document.createElement("canvas");
    const offx = off.getContext("2d")!;
    let flyers: Flyer[] = [];
    let w = 0;
    let h = 0;
    let dpr = 1;
    let raf = 0;
    let visible = true;
    let portrait: HTMLImageElement | null = null;
    const ptr = { x: -1e4, y: -1e4, at: -1e9, down: false };
    let tick = 0;

    function build() {
      const r = canvas!.getBoundingClientRect();
      w = r.width;
      h = r.height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      GW = Math.ceil(w / C);
      GH = Math.ceil(h / C);
      cell = new Uint8Array(GW * GH);
      shade = new Uint8Array(GW * GH);
      home = new Uint8Array(GW * GH);
      const box = stageBox(w, h);
      floor = Math.min(GH - 1, Math.round((box.y + box.h) / C) + 6);
      const bx = Math.round(box.x / C);
      const by = Math.round(box.y / C);
      const ink = inkGrid(box.w / C, box.h / C, portrait);
      for (let y = 0; y < ink.h; y++) {
        for (let x = 0; x < ink.w; x++) {
          const gx = bx + x;
          const gy = by + y;
          if (gx >= GW || gy >= GH) continue;
          const v = ink.g[y * ink.w + x];
          // a portrait is dithered so its tones survive as grain density
          if (v > (portrait ? Math.random() * 0.9 + 0.1 : 0.5)) {
            const i = gy * GW + gx;
            home[i] = 1;
            cell[i] = 1;
            shade[i] = (Math.random() * SHADES.length) | 0;
          }
        }
      }
      off.width = GW;
      off.height = GH;
      img = offx.createImageData(GW, GH);
      flyers = [];
    }

    const idx = (x: number, y: number) => y * GW + x;

    function fall() {
      const flip = tick++ & 1;
      for (let y = floor - 1; y >= 0; y--) {
        for (let k = 0; k < GW; k++) {
          const x = flip ? k : GW - 1 - k;
          const i = idx(x, y);
          if (cell[i] !== 2) continue;
          const below = i + GW;
          if (!cell[below]) {
            cell[below] = 2;
            shade[below] = shade[i];
            cell[i] = 0;
            continue;
          }
          const dir = Math.random() < 0.5 ? -1 : 1;
          for (const d of [dir, -dir]) {
            const nx = x + d;
            if (nx < 0 || nx >= GW) continue;
            const j = below + d;
            if (!cell[j] && !cell[i + d]) {
              cell[j] = 2;
              shade[j] = shade[i];
              cell[i] = 0;
              break;
            }
          }
        }
      }
    }

    function disturb() {
      const gx = ptr.x / C;
      const gy = ptr.y / C;
      const R = Math.max(10, Math.min(w, h) * 0.035);
      for (let y = Math.max(0, Math.floor(gy - R)); y < Math.min(GH, gy + R); y++) {
        for (let x = Math.max(0, Math.floor(gx - R)); x < Math.min(GW, gx + R); x++) {
          if ((x - gx) ** 2 + (y - gy) ** 2 > R * R) continue;
          const i = idx(x, y);
          if (cell[i] === 1) cell[i] = 2;
        }
      }
    }

    function breeze(now: number) {
      // pair resting loose grains with empty homes and fly them back
      const loose: number[] = [];
      const empty: number[] = [];
      for (let i = 0; i < cell.length; i++) {
        if (cell[i] === 2 && ((i / GW | 0) >= floor - 1 || cell[i + GW])) loose.push(i);
        else if (home[i] && !cell[i]) empty.push(i);
      }
      const n = Math.min(loose.length, empty.length, 70);
      for (let k = 0; k < n; k++) {
        const a = loose.splice((Math.random() * loose.length) | 0, 1)[0];
        const b = empty.splice((Math.random() * empty.length) | 0, 1)[0];
        cell[a] = 0;
        cell[b] = 3; // reserved while its grain is in the air
        flyers.push({ x0: a % GW, y0: (a / GW) | 0, x1: b % GW, y1: (b / GW) | 0, t: now, c: shade[a] });
      }
    }

    function draw(now: number) {
      const d = img!.data;
      for (let i = 0; i < cell.length; i++) {
        const v = cell[i];
        const o = i * 4;
        if (v === 1 || v === 2) {
          const s = SHADES[shade[i]];
          const k = v === 2 ? 0.82 : 1;
          d[o] = s[0] * k;
          d[o + 1] = s[1] * k;
          d[o + 2] = s[2] * k;
        } else {
          d[o] = BG[0];
          d[o + 1] = BG[1];
          d[o + 2] = BG[2];
        }
        d[o + 3] = 255;
      }
      const keep: Flyer[] = [];
      for (const f of flyers) {
        const k = Math.min(1, (now - f.t) / 900);
        const e = 1 - (1 - k) ** 3;
        const x = Math.round(f.x0 + (f.x1 - f.x0) * e);
        const y = Math.round(f.y0 + (f.y1 - f.y0) * e - Math.sin(k * Math.PI) * 18);
        if (k >= 1) {
          const i = idx(f.x1, f.y1);
          cell[i] = 1;
          shade[i] = f.c;
          continue;
        }
        keep.push(f);
        if (x >= 0 && x < GW && y >= 0 && y < GH) {
          const o = idx(x, y) * 4;
          d[o] = 255;
          d[o + 1] = 232;
          d[o + 2] = 190;
        }
      }
      flyers = keep;
      offx.putImageData(img!, 0, 0);
      const c = ctx!;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.imageSmoothingEnabled = false;
      c.drawImage(off, 0, 0, GW * C, GH * C);
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (!visible || !img) return;
      if (now - ptr.at < 120) disturb();
      if (!reduce) {
        fall();
        fall();
        if (now - ptr.at > 1600 && (tick & 3) === 0) breeze(now);
      }
      draw(now);
    }

    function onMove(e: PointerEvent) {
      const r = canvas!.getBoundingClientRect();
      ptr.x = e.clientX - r.left;
      ptr.y = e.clientY - r.top;
      ptr.at = performance.now();
    }

    let tm = 0;
    const onResize = () => {
      clearTimeout(tm);
      tm = window.setTimeout(build, 150);
    };
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);
    ready().then((p) => {
      portrait = p;
      build();
      raf = requestAnimationFrame(frame);
    });
    const hero = canvas.closest("section") ?? canvas;
    hero.addEventListener("pointermove", onMove as EventListener);
    hero.addEventListener("pointerdown", onMove as EventListener);
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      hero.removeEventListener("pointermove", onMove as EventListener);
      hero.removeEventListener("pointerdown", onMove as EventListener);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={ref} aria-hidden style={{ width: "100%", height: "100%", display: "block", touchAction: "pan-y" }} />;
}
