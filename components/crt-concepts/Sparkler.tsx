"use client";

import { useEffect, useRef } from "react";
import { tracePath } from "./Signature";
import { stageBox } from "./subject";

// Concept T: light painting. As in a long-exposure photo, a sparkler writes
// the signature in light, throwing sparks as it goes; the light lingers and
// slowly fades, then it writes again. The visitor's pointer is a sparkler
// too, so they can paint over it.

const BG = "rgb(9,9,12)";

type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number };

export function Sparkler() {
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
    const exp = document.createElement("canvas"); // the "exposure"
    const ex = exp.getContext("2d")!;
    let px = new Float32Array(0);
    let py = new Float32Array(0);
    let lift: Uint8Array = new Uint8Array(0);
    let n = 0;
    let pen = 0;
    let penStart = performance.now();
    let sparks: Spark[] = [];
    const ptr = { x: 0, y: 0, has: false, at: -1e9 };
    let raw: { x: Float32Array; y: Float32Array; n: number; lift: Uint8Array } | null = null;
    const WRITE = 7000;
    const REST = 3500;

    function layout() {
      const r = canvas!.getBoundingClientRect();
      w = r.width;
      h = r.height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      exp.width = canvas!.width;
      exp.height = canvas!.height;
      ex.setTransform(dpr, 0, 0, dpr, 0, 0);
      ex.fillStyle = BG;
      ex.fillRect(0, 0, w, h);
      if (!raw) raw = tracePath();
      const box = stageBox(w, h);
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
      const k = Math.min((box.w * 0.96) / (maxX - minX), (box.h * 0.7) / (maxY - minY));
      n = raw.n;
      px = new Float32Array(n);
      py = new Float32Array(n);
      lift = raw.lift;
      for (let i = 0; i < n; i++) {
        px[i] = box.x + box.w / 2 + (raw.x[i] - (minX + maxX) / 2) * k;
        py[i] = box.y + box.h / 2 + (raw.y[i] - (minY + maxY) / 2) * k;
      }
      pen = 0;
      penStart = performance.now();
      if (reduce) {
        lightStroke(0, n);
      }
    }

    function lightStroke(from: number, to: number) {
      ex.globalCompositeOperation = "lighter";
      ex.lineCap = "round";
      ex.lineJoin = "round";
      for (const [lw, col] of [
        [7, "rgba(255,150,60,0.05)"],
        [3.2, "rgba(255,190,110,0.22)"],
        [1.3, "rgba(255,244,220,0.85)"],
      ] as [number, string][]) {
        ex.lineWidth = lw;
        ex.strokeStyle = col;
        ex.beginPath();
        for (let i = Math.max(1, from); i < to; i++) {
          if (lift[i]) continue;
          ex.moveTo(px[i - 1], py[i - 1]);
          ex.lineTo(px[i], py[i]);
        }
        ex.stroke();
      }
      ex.globalCompositeOperation = "source-over";
    }

    function emit(x: number, y: number, count: number) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 1.5 + Math.random() * 4.5;
        const max = 0.25 + Math.random() * 0.5;
        sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, life: max, max });
      }
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (!visible || !n) return;
      const dt = 1 / 60;
      // the exposure fades very slowly
      const sinceStart = now - penStart;
      ex.fillStyle = `rgba(9,9,12,${reduce || sinceStart < WRITE + 1500 ? 0.0015 : 0.035})`;
      ex.fillRect(0, 0, w, h);

      if (!reduce) {
        const el = now - penStart;
        const target = Math.min(n, Math.floor((el / WRITE) * n));
        if (target > pen) {
          lightStroke(pen, target + 1);
          pen = target;
          if (pen < n && !lift[pen]) emit(px[pen], py[pen], 5);
        }
        if (el > WRITE + REST) {
          pen = 0;
          penStart = now;
        }
      }

      const c = ctx!;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.drawImage(exp, 0, 0);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);

      // the sparkler heads
      const heads: [number, number][] = [];
      if (!reduce && pen < n) heads.push([px[pen], py[pen]]);
      if (now - ptr.at < 120) heads.push([ptr.x, ptr.y]);
      for (const [x, y] of heads) {
        const g = c.createRadialGradient(x, y, 0, x, y, 26);
        g.addColorStop(0, "rgba(255,240,200,0.95)");
        g.addColorStop(0.25, "rgba(255,170,80,0.35)");
        g.addColorStop(1, "rgba(255,120,40,0)");
        c.fillStyle = g;
        c.fillRect(x - 26, y - 26, 52, 52);
      }

      c.globalCompositeOperation = "lighter";
      c.lineWidth = 1.2;
      c.beginPath();
      c.strokeStyle = "rgba(255,210,140,0.9)";
      const alive: Spark[] = [];
      for (const s of sparks) {
        s.life -= dt;
        if (s.life <= 0) continue;
        s.vy += 0.12;
        s.vx *= 0.97;
        s.vy *= 0.97;
        c.moveTo(s.x, s.y);
        s.x += s.vx;
        s.y += s.vy;
        c.lineTo(s.x, s.y);
        // sparks fork once, like the real thing
        if (Math.random() < 0.015 && s.life > s.max * 0.4) {
          alive.push({ ...s, vx: s.vy, vy: -s.vx, life: s.life * 0.6 });
        }
        alive.push(s);
      }
      c.stroke();
      c.globalCompositeOperation = "source-over";
      sparks = alive.length > 900 ? alive.slice(-900) : alive;
    }

    function onMove(e: PointerEvent) {
      const r = canvas!.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      if (ptr.has && !reduce) {
        ex.globalCompositeOperation = "lighter";
        ex.lineCap = "round";
        for (const [lw, col] of [
          [8, "rgba(120,170,255,0.05)"],
          [2.6, "rgba(170,205,255,0.25)"],
          [1.1, "rgba(235,245,255,0.8)"],
        ] as [number, string][]) {
          ex.lineWidth = lw;
          ex.strokeStyle = col;
          ex.beginPath();
          ex.moveTo(ptr.x, ptr.y);
          ex.lineTo(x, y);
          ex.stroke();
        }
        ex.globalCompositeOperation = "source-over";
        emit(x, y, 3);
      }
      ptr.x = x;
      ptr.y = y;
      ptr.has = true;
      ptr.at = performance.now();
    }

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
    hero.addEventListener("pointermove", onMove as EventListener);
    const leave = () => (ptr.has = false);
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
