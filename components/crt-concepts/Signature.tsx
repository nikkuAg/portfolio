"use client";

import { useEffect, useRef } from "react";
import { sigParams } from "./fear-params";

// Concept E: the signature, drawn by a Fourier series. The pen is the tip
// of a chain of rotating circles; few circles give a wobbly scrawl, a few
// hundred give the real thing. The slider in the copy sets how many.

const BG = "#121417";
const GRID = "rgba(255,255,255,0.035)";
const INK = "#f1ede4";
const RING = "rgba(150,190,255,0.16)";
const ARM = "rgba(150,190,255,0.42)";
const PERIOD = 11000; // ms for the pen to go round once

type Term = { f: number; re: number; im: number; amp: number };

function sigFont() {
  return getComputedStyle(document.documentElement).getPropertyValue("--font-signature").trim() || "cursive";
}

/** Sample the signature's ink, then order it into one pen path. */
export function tracePath(text = "Divyansh Agarwal"): { x: Float32Array; y: Float32Array; n: number; lift: Uint8Array } {
  const fs = 72;
  const c = document.createElement("canvas");
  c.width = 900;
  c.height = 160;
  const o = c.getContext("2d", { willReadFrequently: true })!;
  o.font = `${fs}px ${sigFont()}`;
  o.textBaseline = "middle";
  o.fillStyle = "#fff";
  o.fillText(text, 10, 80);
  const d = o.getImageData(0, 0, c.width, c.height).data;
  const W = c.width;
  const H = c.height;
  const img = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) img[i] = d[i * 4 + 3] > 100 ? 1 : 0;
  thin(img, W, H);
  const px: number[] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) if (img[y * W + x]) px.push(x, y);
  }
  // greedy nearest neighbour from the leftmost ink: a quick pen route
  const m = px.length / 2;
  const used = new Uint8Array(m);
  let cur = 0;
  for (let i = 1; i < m; i++) if (px[i * 2] < px[cur * 2]) cur = i;
  const ox: number[] = [];
  const oy: number[] = [];
  for (let s = 0; s < m; s++) {
    used[cur] = 1;
    ox.push(px[cur * 2]);
    oy.push(px[cur * 2 + 1]);
    let best = -1;
    let bd = Infinity;
    const cx = px[cur * 2];
    const cy = px[cur * 2 + 1];
    for (let j = 0; j < m; j++) {
      if (used[j]) continue;
      const dx = px[j * 2] - cx;
      const dy = px[j * 2 + 1] - cy;
      const dd = dx * dx + dy * dy;
      if (dd < bd) {
        bd = dd;
        best = j;
      }
    }
    if (best < 0) break;
    cur = best;
  }
  // keep at most ~1000 points; a long hop between two of them is where
  // the pen lifts off the paper
  const stride = Math.max(1, Math.ceil(ox.length / 1000));
  const n = Math.floor(ox.length / stride);
  const x = new Float32Array(n);
  const y = new Float32Array(n);
  const lift = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    x[i] = ox[i * stride];
    y[i] = oy[i * stride];
    if (i && Math.hypot(x[i] - x[i - 1], y[i] - y[i - 1]) > stride * 3) lift[i] = 1;
  }
  lift[0] = 1; // the closing hop back to the start
  // soften the pixel stair-steps, one pen stroke at a time
  const sx = Float32Array.from(x);
  const sy = Float32Array.from(y);
  for (let i = 0; i < n; i++) {
    let ax = 0;
    let ay = 0;
    let c = 0;
    for (let j = i - 3; j <= i + 3; j++) {
      if (j < 0 || j >= n) continue;
      // stop at a pen lift on either side
      let broken = false;
      for (let q = Math.min(i, j) + 1; q <= Math.max(i, j); q++) if (lift[q]) broken = true;
      if (broken) continue;
      ax += x[j];
      ay += y[j];
      c++;
    }
    sx[i] = ax / c;
    sy[i] = ay / c;
  }
  return { x: sx, y: sy, n, lift };
}

/** Zhang–Suen thinning: shrink the ink to one-pixel-wide pen strokes. */
function thin(img: Uint8Array, W: number, H: number) {
  const del: number[] = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (let pass = 0; pass < 2; pass++) {
      del.length = 0;
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          const i = y * W + x;
          if (!img[i]) continue;
          const p2 = img[i - W], p3 = img[i - W + 1], p4 = img[i + 1], p5 = img[i + W + 1];
          const p6 = img[i + W], p7 = img[i + W - 1], p8 = img[i - 1], p9 = img[i - W - 1];
          const b = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
          if (b < 2 || b > 6) continue;
          const seq = [p2, p3, p4, p5, p6, p7, p8, p9, p2];
          let a = 0;
          for (let k = 0; k < 8; k++) if (!seq[k] && seq[k + 1]) a++;
          if (a !== 1) continue;
          if (pass === 0 ? p2 * p4 * p6 || p4 * p6 * p8 : p2 * p4 * p8 || p2 * p6 * p8) continue;
          del.push(i);
        }
      }
      if (del.length) changed = true;
      for (const i of del) img[i] = 0;
    }
  }
}

function dft(x: Float32Array, y: Float32Array, n: number): Term[] {
  const out: Term[] = [];
  const half = Math.floor(n / 2);
  for (let k = -half; k < n - half; k++) {
    let re = 0;
    let im = 0;
    for (let t = 0; t < n; t++) {
      const a = (-2 * Math.PI * k * t) / n;
      const c = Math.cos(a);
      const s = Math.sin(a);
      re += x[t] * c - y[t] * s;
      im += x[t] * s + y[t] * c;
    }
    re /= n;
    im /= n;
    out.push({ f: k, re, im, amp: Math.hypot(re, im) });
  }
  // the constant term first (it only places the drawing), then by size
  out.sort((a, b) => (a.f === 0 ? -1 : b.f === 0 ? 1 : b.amp - a.amp));
  return out;
}

export function Signature() {
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
    let terms: Term[] = [];
    let scale = 1;
    let cx = 0;
    let cy = 0;
    let curveK = -1;
    let builtAt = -1e9;
    let N = 1;
    let curve = new Float32Array(2);
    let lifts: Uint8Array = new Uint8Array(1);
    const start = performance.now();

    function setup() {
      const p = tracePath();
      // centre the path on the origin so the series is about its middle
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (let i = 0; i < p.n; i++) {
        minX = Math.min(minX, p.x[i]);
        maxX = Math.max(maxX, p.x[i]);
        minY = Math.min(minY, p.y[i]);
        maxY = Math.max(maxY, p.y[i]);
      }
      const mx = (minX + maxX) / 2;
      const my = (minY + maxY) / 2;
      for (let i = 0; i < p.n; i++) {
        p.x[i] -= mx;
        p.y[i] -= my;
      }
      terms = dft(p.x, p.y, p.n);
      N = p.n;
      curve = new Float32Array(N * 2);
      lifts = p.lift;
      sigParams.max = Math.min(700, terms.length);
      return maxX - minX;
    }

    let pathW = 1;
    function resize() {
      const r = canvas!.getBoundingClientRect();
      w = r.width;
      h = r.height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      const mobile = w < 768;
      scale = (mobile ? w * 0.94 : Math.min(w * 0.78, 1150)) / pathW;
      cx = w / 2;
      cy = mobile ? h * 0.3 : h * 0.4;
      curveK = -1;
    }

    function at(t: number, k: number) {
      let x = 0;
      let y = 0;
      for (let i = 0; i < k; i++) {
        const T = terms[i];
        const a = 2 * Math.PI * T.f * t;
        const c = Math.cos(a);
        const s = Math.sin(a);
        x += T.re * c - T.im * s;
        y += T.re * s + T.im * c;
      }
      return [x, y];
    }

    function buildCurve(k: number) {
      for (let i = 0; i < N; i++) {
        const [x, y] = at(i / N, k);
        curve[i * 2] = x;
        curve[i * 2 + 1] = y;
      }
      curveK = k;
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (!visible || !terms.length) return;
      const el = now - start;
      // on arrival the circle count climbs on its own, so the scrawl
      // visibly resolves into the signature; the slider takes over after
      if (!sigParams.touched && !reduce) {
        const ramp = Math.min(1, Math.max(0, (el - 600) / 5200));
        sigParams.k = Math.round(4 + (sigParams.max - 4) * ramp * ramp);
      }
      const k = Math.max(1, Math.min(sigParams.k, terms.length));
      // rebuilding is N×k work: during the opening ramp do it a few times a second
      if (k !== curveK && (curveK < 0 || sigParams.touched || now - builtAt > 140 || k === sigParams.max)) {
        buildCurve(k);
        builtAt = now;
      }
      const t = reduce ? 0 : (el % PERIOD) / PERIOD;
      const drawn = reduce ? 1 : Math.min(1, el / PERIOD);

      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.fillStyle = BG;
      ctx!.fillRect(0, 0, w, h);
      // graph paper
      ctx!.strokeStyle = GRID;
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      const g = w < 768 ? 24 : 32;
      for (let x = (cx % g) + 0.5; x < w; x += g) {
        ctx!.moveTo(x, 0);
        ctx!.lineTo(x, h);
      }
      for (let y = (cy % g) + 0.5; y < h; y += g) {
        ctx!.moveTo(0, y);
        ctx!.lineTo(w, y);
      }
      ctx!.stroke();

      ctx!.save();
      ctx!.translate(cx, cy);
      ctx!.scale(scale, scale);

      // the signature, as far as the pen has got on its first lap
      const upto = Math.floor(drawn * N);
      ctx!.strokeStyle = INK;
      ctx!.lineWidth = 2.1 / scale;
      ctx!.lineJoin = "round";
      ctx!.lineCap = "round";
      ctx!.beginPath();
      for (let i = 0; i < upto; i++) {
        const x = curve[i * 2];
        const y = curve[i * 2 + 1];
        if (lifts[i]) ctx!.moveTo(x, y);
        else ctx!.lineTo(x, y);
      }
      ctx!.stroke();

      if (!reduce) {
        // the circles, biggest first; tiny ones are invisible anyway
        let x = 0;
        let y = 0;
        const show = Math.min(k, 120);
        for (let i = 0; i < show; i++) {
          const T = terms[i];
          const a = 2 * Math.PI * T.f * t;
          const nx = x + T.re * Math.cos(a) - T.im * Math.sin(a);
          const ny = y + T.re * Math.sin(a) + T.im * Math.cos(a);
          if (i > 0) {
            ctx!.strokeStyle = RING;
            ctx!.lineWidth = 1 / scale;
            ctx!.beginPath();
            ctx!.arc(x, y, T.amp, 0, Math.PI * 2);
            ctx!.stroke();
            ctx!.strokeStyle = ARM;
            ctx!.beginPath();
            ctx!.moveTo(x, y);
            ctx!.lineTo(nx, ny);
            ctx!.stroke();
          }
          x = nx;
          y = ny;
        }
        const [px, py] = at(t, k);
        ctx!.fillStyle = "#ffd36b";
        ctx!.beginPath();
        ctx!.arc(px, py, 3.2 / scale, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.restore();
    }

    let resizeTimer = 0;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 150);
    };
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);
    // the script face isn't used elsewhere above the fold: ask for it
    document.fonts
      .load(`72px ${sigFont()}`)
      .catch(() => {})
      .then(() => document.fonts.ready)
      .then(() => {
      pathW = setup();
      if (reduce) sigParams.k = sigParams.max;
      resize();
      raf = requestAnimationFrame(frame);
    });
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={ref} aria-hidden style={{ width: "100%", height: "100%", display: "block" }} />;
}
