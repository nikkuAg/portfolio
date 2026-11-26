"use client";

import { useEffect, useRef } from "react";

// Concept C: the name is a herd. Thousands of prey settle into the letters
// of his name; the cursor is a predator and they scatter from it, then
// drift back. How hard they run is the "fear" term from his prey/predator
// research — the slider in the copy changes it live. When nobody is
// steering, a predator of its own wanders through so the field stays alive
// on phones and for idle visitors.

import { fearParams } from "./fear-params";

const BG = "#0f1d1a"; // night grass
const CALM = "#e9e2cf";
const UNEASY = "#f2b950";
const ALARMED = "#ff5a36";

type Herd = {
  n: number;
  x: Float32Array;
  y: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  hx: Float32Array;
  hy: Float32Array;
  fear: Float32Array;
  size: number;
};

function identFont() {
  const host = document.querySelector("[data-tv-fonts]") ?? document.documentElement;
  return getComputedStyle(host).getPropertyValue("--font-ident").trim() || "sans-serif";
}

function buildHerd(w: number, h: number): Herd {
  const mobile = w < 768;
  const fs = mobile ? Math.min(w * 0.17, 96) : Math.min(w * 0.115, h * 0.2, 190);
  const left = mobile ? 16 : Math.max(24, w * 0.05);
  const top = mobile ? h * 0.2 : h * 0.17;

  // rasterise the name offscreen, then sample its filled pixels
  const off = document.createElement("canvas");
  off.width = Math.ceil(w);
  off.height = Math.ceil(h);
  const o = off.getContext("2d", { willReadFrequently: true });
  const homes: number[] = [];
  const step = Math.max(3, Math.round(fs / 24));
  if (o) {
    o.fillStyle = "#fff";
    o.fontStretch = "expanded";
    o.font = `800 ${fs}px ${identFont()}`;
    o.textBaseline = "top";
    o.fillText("Divyansh", left, top);
    o.fillText("Agarwal", left, top + fs * 0.98);
    const d = o.getImageData(0, 0, off.width, off.height).data;
    for (let y = 0; y < off.height; y += step) {
      for (let x = 0; x < off.width; x += step) {
        if (d[(y * off.width + x) * 4 + 3] > 128) homes.push(x, y);
      }
    }
  }
  // a loose scatter of strays around the field
  const strays = mobile ? 60 : 160;
  for (let i = 0; i < strays; i++) homes.push(Math.random() * w, Math.random() * h);

  const n = homes.length / 2;
  const herd: Herd = {
    n,
    x: new Float32Array(n),
    y: new Float32Array(n),
    vx: new Float32Array(n),
    vy: new Float32Array(n),
    hx: new Float32Array(n),
    hy: new Float32Array(n),
    fear: new Float32Array(n),
    size: Math.max(2, step * 0.62),
  };
  for (let i = 0; i < n; i++) {
    herd.hx[i] = homes[i * 2];
    herd.hy[i] = homes[i * 2 + 1];
    // arrive from the edges of the field
    const a = Math.random() * Math.PI * 2;
    const r = Math.max(w, h) * (0.55 + Math.random() * 0.3);
    herd.x[i] = w / 2 + Math.cos(a) * r;
    herd.y[i] = h / 2 + Math.sin(a) * r;
  }
  return herd;
}

export function FearField() {
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
    let herd: Herd | null = null;
    let raf = 0;
    let visible = true;
    const start = performance.now();
    const pointer = { x: -1e4, y: -1e4, at: -1e9 };
    const trail: { x: number; y: number }[] = [];

    function resize() {
      const r = canvas!.getBoundingClientRect();
      w = r.width;
      h = r.height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      herd = buildHerd(w, h);
      if (reduce && herd) {
        herd.x.set(herd.hx);
        herd.y.set(herd.hy);
      }
    }

    function predator(now: number) {
      if (now - pointer.at < 2500) return { x: pointer.x, y: pointer.y, own: false };
      if (reduce || now - start < 1800) return null;
      // its own predator: a slow figure-eight through the letters
      const t = (now - start) / 1000;
      const mobile = w < 768;
      return {
        x: w * (mobile ? 0.5 : 0.32) + Math.sin(t * 0.37) * w * (mobile ? 0.42 : 0.3),
        y: h * (mobile ? 0.32 : 0.33) + Math.sin(t * 0.74) * h * 0.14,
        own: true,
      };
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (!visible || !herd) return;
      const H = herd;
      const p = predator(now);
      const k = fearParams.k;
      const R = Math.max(90, Math.min(w, h) * 0.17) * (0.6 + k * 0.8);
      const R2 = R * R;

      for (let i = 0; i < H.n; i++) {
        let ax = (H.hx[i] - H.x[i]) * 0.014;
        let ay = (H.hy[i] - H.y[i]) * 0.014;
        let f = H.fear[i] * 0.955;
        if (p) {
          const dx = H.x[i] - p.x;
          const dy = H.y[i] - p.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < R2 && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const near = 1 - d / R;
            const push = near * near * (4 + k * 22);
            ax += (dx / d) * push;
            ay += (dy / d) * push;
            f = Math.max(f, near * (0.4 + k));
          }
        }
        H.fear[i] = f;
        H.vx[i] = (H.vx[i] + ax) * 0.84;
        H.vy[i] = (H.vy[i] + ay) * 0.84;
        H.x[i] += H.vx[i];
        H.y[i] += H.vy[i];
      }

      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.fillStyle = BG;
      ctx!.fillRect(0, 0, w, h);
      const s = H.size;
      // three passes, one per fear band — far cheaper than per-dot colours
      const bands: [string, number, number][] = [
        [CALM, -1, 0.18],
        [UNEASY, 0.18, 0.5],
        [ALARMED, 0.5, 99],
      ];
      for (const [col, lo, hi] of bands) {
        ctx!.fillStyle = col;
        for (let i = 0; i < H.n; i++) {
          const f = H.fear[i];
          if (f > lo && f <= hi) ctx!.fillRect(H.x[i] - s / 2, H.y[i] - s / 2, s, s);
        }
      }

      if (p) {
        trail.push({ x: p.x, y: p.y });
        if (trail.length > 22) trail.shift();
        ctx!.strokeStyle = "rgba(255,255,255,0.18)";
        ctx!.lineWidth = 1.5;
        ctx!.beginPath();
        trail.forEach((t, i) => (i ? ctx!.lineTo(t.x, t.y) : ctx!.moveTo(t.x, t.y)));
        ctx!.stroke();
        ctx!.strokeStyle = "rgba(255,255,255,0.85)";
        ctx!.lineWidth = 2;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, 9, 0, Math.PI * 2);
        ctx!.stroke();
      } else trail.length = 0;
    }

    function onMove(e: PointerEvent) {
      const r = canvas!.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      pointer.at = performance.now();
    }

    let resizeTimer = 0;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 150);
    };
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);

    // sample the name only once the display face has loaded
    document.fonts.ready.then(() => {
      resize();
      raf = requestAnimationFrame(frame);
    });
    // listen on the whole hero so the copy layer doesn't block steering
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
