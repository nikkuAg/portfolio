"use client";

import { useEffect, useRef } from "react";
import { tracePath } from "./Signature";
import { stageBox } from "./subject";

// Concept U: a harmonograph, the Victorian drawing machine. Four damped
// pendulums drive one pen; their swinging curves loop and decay, and as
// they die down the pen is drawn onto my initials, so the chaos resolves
// into "DA" in my handwriting. Drag sideways to retune the pendulums and
// it draws again.

const RATIOS: [number, number][] = [
  [2, 3],
  [3, 4],
  [1, 2],
  [3, 5],
  [4, 5],
  [2, 5],
  [5, 6],
];
const DRAW = 11000;
const HOLD = 3500;
const FADE = 1400;

export function Harmonograph() {
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
    const paper = document.createElement("canvas");
    const po = paper.getContext("2d")!;
    let box = { x: 0, y: 0, w: 0, h: 0 };
    let ix = new Float32Array(0);
    let iy = new Float32Array(0);
    let ilift: Uint8Array = new Uint8Array(0);
    let ni = 0;
    let ratio = RATIOS[0];
    let ph = [0, 0, 0, 0];
    let start = performance.now();
    let lastT = 0;
    let prev: [number, number] | null = null;
    let raw: ReturnType<typeof tracePath> | null = null;

    function seedRun(r: [number, number]) {
      ratio = r;
      ph = [Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28];
      start = performance.now();
      lastT = 0;
      prev = null;
      po.setTransform(dpr, 0, 0, dpr, 0, 0);
      po.fillStyle = "#0e0e10";
      po.fillRect(0, 0, w, h);
    }

    function layout() {
      const r = canvas!.getBoundingClientRect();
      w = r.width;
      h = r.height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      paper.width = canvas!.width;
      paper.height = canvas!.height;
      box = stageBox(w, h);
      if (!raw) raw = tracePath("DA");
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (let i = 0; i < raw.n; i++) {
        minX = Math.min(minX, raw.x[i]);
        maxX = Math.max(maxX, raw.x[i]);
        minY = Math.min(minY, raw.y[i]);
        maxY = Math.max(maxY, raw.y[i]);
      }
      const k = (Math.min(box.w, box.h) * 0.62) / Math.max(maxX - minX, maxY - minY);
      ni = raw.n;
      ix = new Float32Array(ni);
      iy = new Float32Array(ni);
      ilift = raw.lift;
      for (let i = 0; i < ni; i++) {
        ix[i] = box.x + box.w / 2 + (raw.x[i] - (minX + maxX) / 2) * k;
        iy[i] = box.y + box.h / 2 + (raw.y[i] - (minY + maxY) / 2) * k;
      }
      seedRun(ratio);
      if (reduce) drawTo(1);
    }

    /** Pen position at u ∈ [0,1] of the run. */
    function penAt(u: number): [number, number, boolean] {
      const t = u * 60;
      const d = Math.exp(-u * 3.2);
      const A = Math.min(box.w, box.h) * 0.42;
      const [a, b] = ratio;
      const hx = A * d * (Math.sin(a * t * 0.5 + ph[0]) * 0.6 + Math.sin((a * 1.003) * t * 0.5 + ph[1]) * 0.4);
      const hy = A * d * (Math.sin(b * t * 0.5 + ph[2]) * 0.6 + Math.sin((b * 0.997) * t * 0.5 + ph[3]) * 0.4);
      const cx = box.x + box.w / 2 + hx;
      const cy = box.y + box.h / 2 + hy;
      // in the second half of the run the pen is led onto the initials
      const k = Math.min(1, Math.max(0, (u - 0.45) / 0.4));
      const e = k * k * (3 - 2 * k);
      if (e <= 0) return [cx, cy, false];
      const j = Math.min(ni - 1, Math.floor(((u - 0.45) / 0.55) * ni * 2) % ni);
      return [cx + (ix[j] - cx) * e, cy + (iy[j] - cy) * e, e > 0.6 && ilift[j] === 1];
    }

    function drawTo(u: number) {
      po.setTransform(dpr, 0, 0, dpr, 0, 0);
      po.lineCap = "round";
      po.lineJoin = "round";
      const steps = Math.max(1, Math.ceil((u - lastT) * 9000));
      po.beginPath();
      for (let s = 1; s <= steps; s++) {
        const uu = lastT + ((u - lastT) * s) / steps;
        const [x, y, jump] = penAt(uu);
        if (!prev || jump) po.moveTo(x, y);
        else {
          po.moveTo(prev[0], prev[1]);
          po.lineTo(x, y);
        }
        prev = [x, y];
      }
      // the line darkens into ink as it settles onto the letters
      const settle = Math.min(1, Math.max(0, (u - 0.5) / 0.4));
      po.strokeStyle = settle > 0.5 ? "rgba(255,214,150,0.85)" : "rgba(226,222,210,0.38)";
      po.lineWidth = settle > 0.5 ? 1.6 : 0.7;
      po.stroke();
      lastT = u;
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (!visible || !ni) return;
      const el = now - start;
      if (!reduce) {
        if (el < DRAW) drawTo(el / DRAW);
        else if (el > DRAW + HOLD) {
          po.setTransform(dpr, 0, 0, dpr, 0, 0);
          po.fillStyle = "rgba(14,14,16,0.12)";
          po.fillRect(0, 0, w, h);
          if (el > DRAW + HOLD + FADE) seedRun(RATIOS[(RATIOS.indexOf(ratio) + 1) % RATIOS.length]);
        }
      }
      const c = ctx!;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.drawImage(paper, 0, 0);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.font = "500 12px system-ui, sans-serif";
      c.fillStyle = "rgba(226,222,210,0.5)";
      c.textAlign = "right";
      c.fillText(`Pendulums tuned ${ratio[0]}:${ratio[1]}`, box.x + box.w, box.y + box.h + 18);
      c.textAlign = "left";
    }

    // drag sideways to pick a tuning and start again
    let drag = false;
    function onDown(e: PointerEvent) {
      if ((e.target as HTMLElement).closest("a,button,input,label")) return;
      drag = true;
      retune(e);
    }
    function retune(e: PointerEvent) {
      const r = canvas!.getBoundingClientRect();
      const fx = Math.max(0, Math.min(0.999, (e.clientX - r.left - box.x) / box.w));
      const pick = RATIOS[Math.floor(fx * RATIOS.length)];
      if (pick !== ratio || !drag) seedRun(pick);
    }
    function onMove(e: PointerEvent) {
      if (drag) retune(e);
    }
    const onUp = () => (drag = false);

    let tm = 0;
    const onResize = () => {
      clearTimeout(tm);
      tm = window.setTimeout(layout, 150);
    };
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);
    document.fonts
      .load(`72px ${getComputedStyle(document.documentElement).getPropertyValue("--font-signature").trim() || "cursive"}`)
      .catch(() => {})
      .then(() => document.fonts.ready)
      .then(() => {
        layout();
        raf = requestAnimationFrame(frame);
      });
    const hero = canvas.closest("section") ?? canvas;
    hero.addEventListener("pointerdown", onDown as EventListener);
    hero.addEventListener("pointermove", onMove as EventListener);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      hero.removeEventListener("pointerdown", onDown as EventListener);
      hero.removeEventListener("pointermove", onMove as EventListener);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={ref} aria-hidden style={{ width: "100%", height: "100%", display: "block", touchAction: "pan-y" }} />;
}
