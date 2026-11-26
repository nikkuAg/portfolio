"use client";

import { useEffect, useRef } from "react";
import { inkGrid, ready, stageBox } from "./subject";

// Concept Q: string art. One thread winds from pin to pin around a ring,
// and the classic greedy algorithm picks each next pin as the one whose
// straight line covers the most ink still missing from the picture. It
// weaves live, a few lines a frame. Sweep across the threads and the ones
// you cross get plucked and ring out.

const PINS = 240;
const S = 220;
const MAX_LINES = 3400;
const THREAD = "rgba(236,230,214,0.16)";

type Pluck = { a: number; b: number; t: number; side: number };

export function StringArt() {
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
    let raf = 0;
    let visible = true;
    let portrait: HTMLImageElement | null = null;
    let cx = 0;
    let cy = 0;
    let R = 0;
    let pins: [number, number][] = [];
    let gpins: [number, number][] = [];
    let residual = new Float32Array(0);
    let seq: number[] = [];
    let done = false;
    let plucks: Pluck[] = [];
    const woven = document.createElement("canvas");
    const wx = woven.getContext("2d")!;
    let last = { x: -1, y: -1, has: false };

    function build() {
      const r = canvas!.getBoundingClientRect();
      w = r.width;
      h = r.height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      const box = stageBox(w, h);
      R = Math.min(box.w, box.h) * 0.48;
      cx = box.x + box.w / 2;
      cy = box.y + box.h / 2;
      pins = [];
      gpins = [];
      for (let i = 0; i < PINS; i++) {
        const a = (i / PINS) * Math.PI * 2 - Math.PI / 2;
        pins.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]);
        gpins.push([S / 2 + Math.cos(a) * (S / 2 - 1), S / 2 + Math.sin(a) * (S / 2 - 1)]);
      }
      const ink = inkGrid(S, S, portrait, { initials: !portrait });
      residual = Float32Array.from(ink.g);
      seq = [0];
      done = false;
      plucks = [];
      woven.width = Math.round(w * dpr);
      woven.height = Math.round(h * dpr);
      wx.setTransform(dpr, 0, 0, dpr, 0, 0);
      wx.clearRect(0, 0, w, h);
      wx.strokeStyle = THREAD;
      wx.lineWidth = 0.6;
      const steps = reduce ? MAX_LINES : 0;
      for (let i = 0; i < steps && !done; i++) weave();
    }

    function lineScore(a: number, b: number, apply: boolean) {
      const [x0, y0] = gpins[a];
      const [x1, y1] = gpins[b];
      const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
      let sum = 0;
      for (let k = 0; k <= n; k++) {
        const x = (x0 + ((x1 - x0) * k) / n) | 0;
        const y = (y0 + ((y1 - y0) * k) / n) | 0;
        const i = y * S + x;
        if (apply) residual[i] = Math.max(0, residual[i] - 0.12);
        else sum += residual[i];
      }
      return sum / n;
    }

    function weave() {
      const a = seq[seq.length - 1];
      let best = -1;
      let bs = 0.06;
      for (let b = 0; b < PINS; b++) {
        const gap = Math.abs(a - b);
        if (Math.min(gap, PINS - gap) < 12) continue;
        const s = lineScore(a, b, false);
        if (s > bs) {
          bs = s;
          best = b;
        }
      }
      if (best < 0 || seq.length >= MAX_LINES) {
        done = true;
        return;
      }
      lineScore(a, best, true);
      seq.push(best);
      wx.beginPath();
      wx.moveTo(pins[a][0], pins[a][1]);
      wx.lineTo(pins[best][0], pins[best][1]);
      wx.stroke();
    }

    const cross = (p: number[], q: number[], r: number[], s: number[]) => {
      const d = (q[0] - p[0]) * (s[1] - r[1]) - (q[1] - p[1]) * (s[0] - r[0]);
      if (!d) return 0;
      const t = ((r[0] - p[0]) * (s[1] - r[1]) - (r[1] - p[1]) * (s[0] - r[0])) / d;
      const u = ((r[0] - p[0]) * (q[1] - p[1]) - (r[1] - p[1]) * (q[0] - p[0])) / d;
      return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? Math.sign(d) : 0;
    };

    function onMove(e: PointerEvent) {
      const r = canvas!.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      if (last.has && !reduce) {
        const now = performance.now();
        for (let i = 1; i < seq.length && plucks.length < 40; i++) {
          const side = cross([last.x, last.y], [x, y], pins[seq[i - 1]], pins[seq[i]]);
          if (side) plucks.push({ a: seq[i - 1], b: seq[i], t: now, side });
        }
      }
      last = { x, y, has: true };
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (!visible || !pins.length) return;
      if (!done) for (let k = 0; k < 9 && !done; k++) weave();
      const c = ctx!;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.fillStyle = "#101114";
      c.fillRect(0, 0, canvas!.width, canvas!.height);
      c.drawImage(woven, 0, 0);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);

      // pins
      c.fillStyle = "rgba(236,230,214,0.45)";
      for (const [x, y] of pins) c.fillRect(x - 0.8, y - 0.8, 1.6, 1.6);

      // the needle: the newest thread, bright
      if (!done && seq.length > 1) {
        const a = pins[seq[seq.length - 2]];
        const b = pins[seq[seq.length - 1]];
        c.strokeStyle = "rgba(255,190,110,0.9)";
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(a[0], a[1]);
        c.lineTo(b[0], b[1]);
        c.stroke();
      }

      // plucked threads swing and ring down
      plucks = plucks.filter((p) => now - p.t < 900);
      c.lineWidth = 1;
      for (const p of plucks) {
        const k = (now - p.t) / 900;
        const [x0, y0] = pins[p.a];
        const [x1, y1] = pins[p.b];
        const len = Math.hypot(x1 - x0, y1 - y0);
        const amp = Math.min(22, len * 0.05) * Math.exp(-k * 4) * Math.cos(k * 40) * p.side;
        const nx = -(y1 - y0) / len;
        const ny = (x1 - x0) / len;
        c.strokeStyle = `rgba(255,170,90,${0.6 * (1 - k)})`;
        c.beginPath();
        c.moveTo(x0, y0);
        c.quadraticCurveTo((x0 + x1) / 2 + nx * amp * 2, (y0 + y1) / 2 + ny * amp * 2, x1, y1);
        c.stroke();
      }
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
    const leave = () => (last.has = false);
    hero.addEventListener("pointerleave", leave);
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      hero.removeEventListener("pointermove", onMove as EventListener);
      hero.removeEventListener("pointerleave", leave);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={ref} aria-hidden style={{ width: "100%", height: "100%", display: "block", touchAction: "pan-y" }} />;
}
