"use client";

import { useEffect, useRef } from "react";

// Concept M: pure atmosphere. Thousands of ink threads drift along a slowly
// turning noise field and leave fading trails, like marbled paper being
// drawn. The pointer stirs the water: threads curl around it. No meaning,
// just a mood the rest of the site can carry.

const BG: [number, number, number] = [12, 13, 18];
const INKS = ["rgba(236,232,220,0.5)", "rgba(255,150,96,0.55)", "rgba(132,170,255,0.45)"];

function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function FlowField() {
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
    let n = 0;
    let px = new Float32Array(0);
    let py = new Float32Array(0);
    let life = new Float32Array(0);
    let ink = new Uint8Array(0);
    const pointer = { x: -1e4, y: -1e4, at: -1e9 };
    const t0 = performance.now();

    function seed(i: number) {
      px[i] = Math.random() * w;
      py[i] = Math.random() * h;
      life[i] = 60 + Math.random() * 240;
    }

    function build() {
      const r = canvas!.getBoundingClientRect();
      w = r.width;
      h = r.height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      n = Math.round(Math.min(2600, (w * h) / 520));
      px = new Float32Array(n);
      py = new Float32Array(n);
      life = new Float32Array(n);
      ink = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        seed(i);
        // mostly paper-white, a few warm and cool threads
        const r2 = Math.random();
        ink[i] = r2 < 0.78 ? 0 : r2 < 0.9 ? 1 : 2;
      }
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.fillStyle = `rgb(${BG.join(",")})`;
      ctx!.fillRect(0, 0, w, h);
      if (reduce) for (let k = 0; k < 160; k++) step(k * 16);
    }

    function step(now: number) {
      const c = ctx!;
      const t = (now - t0) / 1000;
      // fade old trails a little each frame
      c.fillStyle = `rgba(${BG.join(",")},0.06)`;
      c.fillRect(0, 0, w, h);
      const scale = 0.0021;
      const stir = now - pointer.at < 2500;
      c.lineWidth = 1;
      for (let k = 0; k < 3; k++) {
        c.strokeStyle = INKS[k];
        c.beginPath();
        for (let i = 0; i < n; i++) {
          if (ink[i] !== k) continue;
          const x = px[i];
          const y = py[i];
          let a = noise(x * scale + t * 0.04, y * scale - t * 0.03) * Math.PI * 4;
          if (stir) {
            const dx = x - pointer.x;
            const dy = y - pointer.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < 40000) {
              // swirl around the pointer
              a = a * (d2 / 40000) + Math.atan2(dy, dx) + Math.PI / 2 * (1 - d2 / 40000);
            }
          }
          const nx = x + Math.cos(a) * 1.4;
          const ny = y + Math.sin(a) * 1.4;
          c.moveTo(x, y);
          c.lineTo(nx, ny);
          px[i] = nx;
          py[i] = ny;
          life[i] -= 1;
          if (life[i] < 0 || nx < -5 || nx > w + 5 || ny < -5 || ny > h + 5) seed(i);
        }
        c.stroke();
      }
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (!visible || reduce) return;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      step(now);
    }

    function onMove(e: PointerEvent) {
      const r = canvas!.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      pointer.at = performance.now();
    }

    let tm = 0;
    const onResize = () => {
      clearTimeout(tm);
      tm = window.setTimeout(build, 150);
    };
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);
    build();
    raf = requestAnimationFrame(frame);
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
