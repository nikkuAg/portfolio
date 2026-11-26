"use client";

import { useEffect, useRef } from "react";
import { paintSubject, ready, stageBox } from "./subject";

// Concept R: iron filings. Thousands of tiny needles cover the page; the
// ones over the subject line up along its contours, the way filings
// outline a magnetised shape. The pointer is a bar magnet: needles near it
// swing onto its dipole field lines and get dragged towards it, then fall
// back into the picture when it moves on.

type Needles = {
  n: number;
  hx: Float32Array;
  hy: Float32Array;
  ox: Float32Array;
  oy: Float32Array;
  // orientation kept as a doubled-angle vector so 0 and π are the same needle
  cx: Float32Array;
  cy: Float32Array;
  bx: Float32Array;
  by: Float32Array;
  inside: Uint8Array;
};

export function IronFilings() {
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
    let N: Needles | null = null;
    let L = 6;
    const ptr = { x: -1e4, y: -1e4, at: -1e9 };
    const t0 = performance.now();
    let box = { x: 0, y: 0, w: 0, h: 0 };

    function build() {
      const r = canvas!.getBoundingClientRect();
      w = r.width;
      h = r.height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      box = stageBox(w, h);
      const mobile = w < 768;
      const g = mobile ? 6 : 7;
      L = g * 0.85;
      // a blurred copy of the subject, whose gradient gives the contours
      const c = document.createElement("canvas");
      c.width = Math.round(w);
      c.height = Math.round(h);
      const o = c.getContext("2d", { willReadFrequently: true })!;
      o.fillStyle = "#000";
      o.fillRect(0, 0, c.width, c.height);
      const sub = document.createElement("canvas");
      sub.width = Math.round(box.w);
      sub.height = Math.round(box.h);
      paintSubject(sub.getContext("2d")!, sub.width, sub.height, portrait);
      o.filter = "blur(5px)";
      o.drawImage(sub, box.x, box.y);
      const d = o.getImageData(0, 0, c.width, c.height).data;
      const at = (x: number, y: number) => {
        const xi = Math.max(0, Math.min(c.width - 1, x | 0));
        const yi = Math.max(0, Math.min(c.height - 1, y | 0));
        return d[(yi * c.width + xi) * 4] / 255;
      };
      const cols = Math.ceil(w / g);
      const rows = Math.ceil(h / g);
      const n = cols * rows;
      const nd: Needles = {
        n,
        hx: new Float32Array(n),
        hy: new Float32Array(n),
        ox: new Float32Array(n),
        oy: new Float32Array(n),
        cx: new Float32Array(n),
        cy: new Float32Array(n),
        bx: new Float32Array(n),
        by: new Float32Array(n),
        inside: new Uint8Array(n),
      };
      let i = 0;
      for (let ry = 0; ry < rows; ry++) {
        for (let rx = 0; rx < cols; rx++, i++) {
          const x = rx * g + g / 2 + (Math.random() - 0.5) * g * 0.5;
          const y = ry * g + g / 2 + (Math.random() - 0.5) * g * 0.5;
          nd.hx[i] = x;
          nd.hy[i] = y;
          const v = at(x, y);
          let a: number;
          if (v > 0.18) {
            // along the contour: perpendicular to the ink gradient
            const gx = at(x + 3, y) - at(x - 3, y);
            const gy = at(x, y + 3) - at(x, y - 3);
            a = Math.hypot(gx, gy) > 0.01 ? Math.atan2(gy, gx) + Math.PI / 2 : Math.random() * Math.PI;
            nd.inside[i] = v > 0.45 ? 2 : 1;
          } else a = Math.random() * Math.PI;
          nd.bx[i] = Math.cos(2 * a);
          nd.by[i] = Math.sin(2 * a);
          nd.cx[i] = nd.bx[i];
          nd.cy[i] = nd.by[i];
        }
      }
      N = nd;
    }

    function magnet(now: number) {
      if (now - ptr.at < 2500) return { x: ptr.x, y: ptr.y, s: 1 };
      if (reduce) return null;
      // a slower magnet of its own drifts over the picture when nobody's playing
      const t = (now - t0) / 1000;
      return {
        x: box.x + box.w * (0.5 + 0.38 * Math.sin(t * 0.23)),
        y: box.y + box.h * (0.5 + 0.3 * Math.sin(t * 0.37 + 1)),
        s: 0.7,
      };
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (!visible || !N) return;
      const M = magnet(now);
      const reach = Math.max(120, Math.min(w, h) * 0.22);
      for (let i = 0; i < N.n; i++) {
        let tx = N.bx[i];
        let ty = N.by[i];
        let px = 0;
        let py = 0;
        if (M) {
          const rx = N.hx[i] - M.x;
          const ry = N.hy[i] - M.y;
          const r = Math.hypot(rx, ry) || 1;
          const wgt = Math.exp(-((r / reach) ** 2)) * M.s;
          if (wgt > 0.01) {
            // dipole pointing up: B ∝ 3(m·r̂)r̂ − m
            const ux = rx / r;
            const uy = ry / r;
            const mdot = -uy;
            const fx = 3 * mdot * ux;
            const fy = 3 * mdot * uy + 1;
            const fa = Math.atan2(fy, fx);
            tx = tx * (1 - wgt) + Math.cos(2 * fa) * wgt;
            ty = ty * (1 - wgt) + Math.sin(2 * fa) * wgt;
            px = -ux * wgt * reach * 0.12;
            py = -uy * wgt * reach * 0.12;
          }
        }
        N.cx[i] += (tx - N.cx[i]) * 0.18;
        N.cy[i] += (ty - N.cy[i]) * 0.18;
        N.ox[i] += (px - N.ox[i]) * 0.14;
        N.oy[i] += (py - N.oy[i]) * 0.14;
      }

      const c = ctx!;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.fillStyle = "#0f1114";
      c.fillRect(0, 0, w, h);
      const pass = (want: number, col: string, len: number, lw: number) => {
        c.strokeStyle = col;
        c.lineWidth = lw;
        c.beginPath();
        for (let i = 0; i < N!.n; i++) {
          if (N!.inside[i] !== want) continue;
          const a = Math.atan2(N!.cy[i], N!.cx[i]) / 2;
          const dx = Math.cos(a) * len * 0.5;
          const dy = Math.sin(a) * len * 0.5;
          const x = N!.hx[i] + N!.ox[i];
          const y = N!.hy[i] + N!.oy[i];
          c.moveTo(x - dx, y - dy);
          c.lineTo(x + dx, y + dy);
        }
        c.stroke();
      };
      pass(0, "rgba(140,150,165,0.32)", L * 0.75, 1);
      pass(1, "rgba(190,198,210,0.65)", L, 1.1);
      pass(2, "rgba(232,236,242,0.95)", L * 1.1, 1.3);
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
