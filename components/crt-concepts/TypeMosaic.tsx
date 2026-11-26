"use client";

import { useEffect, useRef } from "react";
import { inkGrid, ready, stageBox } from "./subject";

// Concept V: a portrait set in type. The subject is built from one sentence
// about me, letter after letter, each set brighter where the picture has
// more ink. The pointer is a lens: letters under it bulge outward and
// scramble into random glyphs, then settle back into the sentence.

const LINE = "DivyanshAgarwalBuildsInterfacesTheServicesBehindThemAndSmallGamesOnTheSide";
const GLYPHS = "!<>-_\\/[]{}=+*^?#$%&@0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const BG = "#0e0f12";

export function TypeMosaic() {
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
    let box = { x: 0, y: 0, w: 0, h: 0 };
    let cols = 0;
    let rows = 0;
    let cw = 9;
    let ch = 13;
    let ink = new Float32Array(0);
    let heat = new Float32Array(0);
    let chars: string[] = [];
    const still = document.createElement("canvas");
    const so = still.getContext("2d")!;
    const ptr = { x: -1e4, y: -1e4, at: -1e9 };
    let font = "";

    const colorFor = (v: number) => (v < 0.3 ? `rgba(236,232,220,${0.035 + v * 0.1})` : `rgba(240,236,224,${0.4 + v * 0.6})`);

    function build() {
      const r = canvas!.getBoundingClientRect();
      w = r.width;
      h = r.height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      box = stageBox(w, h);
      const mobile = w < 768;
      cw = mobile ? 5.5 : 7;
      ch = mobile ? 8 : 10;
      cols = Math.floor(box.w / cw);
      rows = Math.floor(box.h / ch);
      const g = inkGrid(cols, rows, portrait);
      ink = g.g;
      heat = new Float32Array(cols * rows);
      chars = [];
      for (let i = 0; i < cols * rows; i++) chars.push(LINE[i % LINE.length]);
      const mono = getComputedStyle(document.documentElement).getPropertyValue("--font-geist-mono").trim() || "monospace";
      font = `700 ${Math.round(ch * 0.9)}px ${mono}`;
      still.width = canvas!.width;
      still.height = canvas!.height;
      so.setTransform(dpr, 0, 0, dpr, 0, 0);
      so.fillStyle = BG;
      so.fillRect(0, 0, w, h);
      so.font = font;
      so.textBaseline = "top";
      // a faint wash of ink behind the bright cells, so the shapes read as solid
      for (let i = 0; i < cols * rows; i++) {
        if (ink[i] < 0.3) continue;
        so.fillStyle = `rgba(240,236,224,${ink[i] * 0.13})`;
        so.fillRect(box.x + (i % cols) * cw, box.y + Math.floor(i / cols) * ch, cw, ch);
      }
      // batch by brightness band so the static layer draws quickly
      for (let band = 0; band < 6; band++) {
        so.fillStyle = colorFor(band / 5);
        for (let i = 0; i < cols * rows; i++) {
          if (Math.min(5, Math.round(ink[i] * 5)) !== band) continue;
          so.fillText(chars[i], box.x + (i % cols) * cw, box.y + Math.floor(i / cols) * ch);
        }
      }
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (!visible || !cols) return;
      const c = ctx!;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.drawImage(still, 0, 0);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduce) return;
      const active = now - ptr.at < 1200;
      const R = Math.max(70, Math.min(w, h) * 0.13);
      // clear the lens area, then redraw every cell that is warm or under it
      if (active) {
        c.fillStyle = BG;
        c.beginPath();
        c.arc(ptr.x, ptr.y, R * 1.45, 0, Math.PI * 2);
        c.fill();
      }
      c.font = font;
      c.textBaseline = "top";
      const lx = (ptr.x - box.x) / cw;
      const ly = (ptr.y - box.y) / ch;
      const reach = Math.ceil((R * 1.5) / cw);
      const x0 = active ? Math.max(0, Math.floor(lx - reach)) : 0;
      const x1 = active ? Math.min(cols, Math.ceil(lx + reach)) : 0;
      const y0 = active ? Math.max(0, Math.floor(ly - reach * (cw / ch))) : 0;
      const y1 = active ? Math.min(rows, Math.ceil(ly + reach * (cw / ch))) : 0;
      for (let i = 0; i < heat.length; i++) {
        const gx = i % cols;
        const gy = (i / cols) | 0;
        const inLens = gx >= x0 && gx < x1 && gy >= y0 && gy < y1;
        if (!inLens && heat[i] < 0.02) continue;
        const hx = box.x + gx * cw;
        const hy = box.y + gy * ch;
        let x = hx;
        let y = hy;
        let hot = heat[i] * 0.94;
        if (active) {
          const dx = hx + cw / 2 - ptr.x;
          const dy = hy + ch / 2 - ptr.y;
          const d = Math.hypot(dx, dy);
          if (d < R) {
            const k = 1 - d / R;
            const bulge = 1 + k * 0.55;
            x = ptr.x + dx * bulge - cw / 2;
            y = ptr.y + dy * bulge - ch / 2;
            hot = Math.max(hot, k);
          }
        }
        heat[i] = hot;
        if (!inLens) {
          c.fillStyle = BG;
          c.fillRect(hx, hy, cw, ch);
        }
        const scrambled = hot > 0.15 && Math.random() < hot;
        const glyph = scrambled ? GLYPHS[(Math.random() * GLYPHS.length) | 0] : chars[i];
        c.fillStyle = hot > 0.15 ? `rgba(255,${170 + 60 * (1 - hot)},90,${0.35 + hot * 0.65})` : colorFor(ink[i]);
        c.fillText(glyph, x, y);
      }
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
