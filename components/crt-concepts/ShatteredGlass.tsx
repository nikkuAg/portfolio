"use client";

import { useEffect, useRef } from "react";
import { paintSubject, ready, stageBox } from "./subject";

// Concept S: the subject etched into a pane of glass. Click (or tap) and it
// shatters from that point into Voronoi shards (small near the impact,
// larger further out) that tumble under gravity; a moment later they fly
// back and the pane is whole again.

type Shard = { poly: [number, number][]; cx: number; cy: number; x: number; y: number; vx: number; vy: number; rot: number; vr: number };
type Pt = [number, number];

/** Clip a convex polygon to the half-plane closer to a than to b. */
function clip(poly: Pt[], a: Pt, b: Pt): Pt[] {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const nx = b[0] - a[0];
  const ny = b[1] - a[1];
  const side = (p: Pt) => (p[0] - mx) * nx + (p[1] - my) * ny;
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const sp = side(p);
    const sq = side(q);
    if (sp <= 0) out.push(p);
    if (sp * sq < 0) {
      const t = sp / (sp - sq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return out;
}

export function ShatteredGlass() {
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
    const pane = document.createElement("canvas");
    let shards: Shard[] = [];
    let state: "whole" | "falling" | "returning" = "whole";
    let since = 0;
    let lastHit = -1e9;
    const t0 = performance.now();
    let demoDone = false;

    function build() {
      const r = canvas!.getBoundingClientRect();
      w = r.width;
      h = r.height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      box = stageBox(w, h);
      pane.width = Math.round(box.w * dpr);
      pane.height = Math.round(box.h * dpr);
      const o = pane.getContext("2d")!;
      o.setTransform(dpr, 0, 0, dpr, 0, 0);
      // the glass
      const g = o.createLinearGradient(0, 0, box.w, box.h);
      g.addColorStop(0, "rgba(160,190,215,0.16)");
      g.addColorStop(0.5, "rgba(120,150,180,0.07)");
      g.addColorStop(1, "rgba(160,190,215,0.14)");
      o.fillStyle = g;
      o.fillRect(0, 0, box.w, box.h);
      // a sheen across it
      const sheen = o.createLinearGradient(box.w * 0.1, 0, box.w * 0.55, box.h);
      sheen.addColorStop(0.45, "rgba(255,255,255,0)");
      sheen.addColorStop(0.5, "rgba(255,255,255,0.07)");
      sheen.addColorStop(0.56, "rgba(255,255,255,0)");
      o.fillStyle = sheen;
      o.fillRect(0, 0, box.w, box.h);
      // the etched subject, as frosted light
      const sub = document.createElement("canvas");
      sub.width = Math.round(box.w * 0.86);
      sub.height = Math.round(box.h * 0.86);
      const so = sub.getContext("2d", { willReadFrequently: true })!;
      paintSubject(so, sub.width, sub.height, portrait);
      const id = so.getImageData(0, 0, sub.width, sub.height);
      for (let i = 0; i < id.data.length; i += 4) {
        const v = id.data[i];
        id.data[i] = 226;
        id.data[i + 1] = 236;
        id.data[i + 2] = 246;
        id.data[i + 3] = v * 0.9;
      }
      so.putImageData(id, 0, 0);
      o.drawImage(sub, box.w * 0.07, box.h * 0.07);
      o.strokeStyle = "rgba(220,235,250,0.35)";
      o.lineWidth = 1.5;
      o.strokeRect(0.75, 0.75, box.w - 1.5, box.h - 1.5);
      state = "whole";
      shards = [];
    }

    function shatter(px: number, py: number) {
      const lx = px - box.x;
      const ly = py - box.y;
      const sites: Pt[] = [];
      for (let i = 0; i < 16; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() ** 1.6 * Math.min(box.w, box.h) * 0.22;
        sites.push([lx + Math.cos(a) * r, ly + Math.sin(a) * r]);
      }
      for (let i = 0; i < 26; i++) sites.push([Math.random() * box.w, Math.random() * box.h]);
      const rect: Pt[] = [
        [0, 0],
        [box.w, 0],
        [box.w, box.h],
        [0, box.h],
      ];
      shards = [];
      for (const s of sites) {
        let poly = rect;
        for (const o of sites) if (o !== s) poly = clip(poly, s, o);
        if (poly.length < 3) continue;
        let cx = 0;
        let cy = 0;
        for (const [x, y] of poly) {
          cx += x;
          cy += y;
        }
        cx /= poly.length;
        cy /= poly.length;
        const dx = cx - lx;
        const dy = cy - ly;
        const d = Math.hypot(dx, dy) || 1;
        const kick = 260 / (40 + d);
        shards.push({
          poly: poly.map(([x, y]) => [x - cx, y - cy]),
          cx,
          cy,
          x: cx,
          y: cy,
          vx: (dx / d) * kick * 3,
          vy: (dy / d) * kick * 3 - 2,
          rot: 0,
          vr: (Math.random() - 0.5) * 0.12,
        });
      }
      state = "falling";
      since = performance.now();
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (!visible || !pane.width) return;
      if (!demoDone && !reduce && now - t0 > 2600) {
        demoDone = true;
        shatter(box.x + box.w * 0.5, box.y + box.h * 0.48);
      }
      if (!reduce && state === "whole" && now - lastHit > 9000 && now - since > 9000 && demoDone) {
        shatter(box.x + box.w * (0.3 + Math.random() * 0.4), box.y + box.h * (0.3 + Math.random() * 0.4));
      }
      const c = ctx!;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.fillStyle = "#0d0f13";
      c.fillRect(0, 0, w, h);

      if (state === "whole") {
        c.drawImage(pane, box.x, box.y, box.w, box.h);
        return;
      }
      const el = now - since;
      if (state === "falling") {
        for (const s of shards) {
          s.vy += 0.35;
          s.vx *= 0.99;
          s.x += s.vx;
          s.y += s.vy;
          s.rot += s.vr;
        }
        if (el > 1900) {
          state = "returning";
          since = now;
          for (const s of shards) {
            s.vx = s.x;
            s.vy = s.y;
            s.vr = s.rot; // remember where each shard was when it turned back
          }
        }
      } else {
        const k = Math.min(1, el / 1100);
        const e = 1 - (1 - k) ** 4;
        for (const s of shards) {
          s.x = s.vx + (s.cx - s.vx) * e;
          s.y = s.vy + (s.cy - s.vy) * e;
          s.rot = s.vr * (1 - e);
        }
        if (k >= 1) {
          state = "whole";
          since = now;
        }
      }
      for (const s of shards) {
        c.save();
        c.translate(box.x + s.x, box.y + s.y);
        c.rotate(s.rot);
        c.beginPath();
        s.poly.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
        c.closePath();
        c.save();
        c.clip();
        c.drawImage(pane, -s.cx, -s.cy, box.w, box.h);
        c.restore();
        c.strokeStyle = "rgba(220,235,250,0.4)";
        c.lineWidth = 1;
        c.stroke();
        c.restore();
      }
    }

    function onDown(e: PointerEvent) {
      if ((e.target as HTMLElement).closest("a,button,input,label")) return;
      if (state !== "whole") return;
      const r = canvas!.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      if (x < box.x || x > box.x + box.w || y < box.y || y > box.y + box.h) return;
      lastHit = performance.now();
      shatter(x, y);
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
    hero.addEventListener("pointerdown", onDown as EventListener);
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      hero.removeEventListener("pointerdown", onDown as EventListener);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={ref} aria-hidden style={{ width: "100%", height: "100%", display: "block", cursor: "crosshair" }} />;
}
