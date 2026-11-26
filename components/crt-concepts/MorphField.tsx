"use client";

import { useEffect, useRef, useState } from "react";
import s from "./concepts.module.css";

// Concept N: one swarm of ink threads that keeps drawing who I am. The
// threads drift on a slow current (as in M), then gather into a picture:
// my name, a game controller, a predator/prey orbit, a code bracket, and
// my face when a portrait is available. They hold it for a few seconds,
// let go, and drift into the next. The pointer is a predator (as in C):
// threads near it panic, scatter and glow, then find their way back.

type Scene = { id: string; caption: string; draw: (o: CanvasRenderingContext2D, w: number, h: number) => void; image?: boolean };

const BG: [number, number, number] = [12, 13, 18];
const CALM = "rgba(236,232,220,0.9)";
const WARM = "rgba(255,170,90,0.95)";
const HOT = "rgba(255,90,54,1)";

const FORM = 2600;
const HOLD = 4800;
const DRIFT = 2200;

function identFont() {
  const host = document.querySelector("[data-tv-fonts]") ?? document.documentElement;
  return getComputedStyle(host).getPropertyValue("--font-ident").trim() || "sans-serif";
}

function hash(x: number, y: number) {
  const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return v - Math.floor(v);
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

const name: Scene = {
  id: "name",
  caption: "my name",
  draw(o, w, h) {
    const fs = Math.min(w * 0.2, h * 0.36);
    o.fontStretch = "expanded";
    o.font = `800 ${fs}px ${identFont()}`;
    o.textAlign = "center";
    o.textBaseline = "middle";
    o.fillText("Divyansh", w / 2, h / 2 - fs * 0.5);
    o.fillText("Agarwal", w / 2, h / 2 + fs * 0.5);
  },
};

const gamepad: Scene = {
  id: "games",
  caption: "the small games I make",
  draw(o, w, h) {
    const s = Math.min(w / 1.7, h / 1.05);
    o.save();
    o.translate(w / 2, h / 2);
    o.scale(s / 100, s / 100);
    o.beginPath();
    o.moveTo(-34, -20);
    o.lineTo(34, -20);
    o.bezierCurveTo(52, -20, 60, -8, 64, 14);
    o.bezierCurveTo(68, 34, 60, 44, 50, 42);
    o.bezierCurveTo(40, 40, 34, 22, 22, 18);
    o.lineTo(-22, 18);
    o.bezierCurveTo(-34, 22, -40, 40, -50, 42);
    o.bezierCurveTo(-60, 44, -68, 34, -64, 14);
    o.bezierCurveTo(-60, -8, -52, -20, -34, -20);
    o.fill();
    o.globalCompositeOperation = "destination-out";
    o.fillRect(-42, -4, 20, 6);
    o.fillRect(-35, -11, 6, 20);
    for (const [x, y] of [[34, -9], [44, 0], [34, 9], [24, 0]]) {
      o.beginPath();
      o.arc(x, y, 3.6, 0, Math.PI * 2);
      o.fill();
    }
    o.restore();
  },
};

const orbits: Scene = {
  id: "maths",
  caption: "the maths I play with",
  draw(o, w, h) {
    // predator/prey (Lotka-Volterra) orbits: closed loops around one point
    const a = 1;
    const b = 0.6;
    const c = 1;
    const d = 0.5;
    const s = Math.min(w, h) * 0.24;
    o.lineWidth = Math.max(3, s * 0.045);
    o.lineCap = "round";
    o.strokeStyle = "#fff";
    for (const x0 of [2.6, 3.4, 4.4, 5.6]) {
      let x = x0;
      let y = a / b;
      o.beginPath();
      for (let i = 0; i < 4000; i++) {
        const dt = 0.004;
        const dx = (a * x - b * x * y) * dt;
        const dy = (d * x * y - c * y) * dt;
        x += dx;
        y += dy;
        const px = w / 2 + (x - c / d) * s * 0.42;
        const py = h / 2 - (y - a / b) * s * 0.42;
        if (i) o.lineTo(px, py);
        else o.moveTo(px, py);
      }
      o.stroke();
    }
  },
};

const code: Scene = {
  id: "code",
  caption: "the code I write",
  draw(o, w, h) {
    const fs = Math.min(w * 0.36, h * 0.7);
    o.font = `800 ${fs}px ${identFont()}`;
    o.textAlign = "center";
    o.textBaseline = "middle";
    o.fillText("</>", w / 2, h / 2);
  },
};

const face: Scene = { id: "face", caption: "my face", image: true, draw() {} };

/** Turn a scene into exactly n target points inside the box. */
function sample(scene: Scene, n: number, bw: number, bh: number, img: HTMLImageElement | null) {
  const c = document.createElement("canvas");
  c.width = Math.max(2, Math.round(bw));
  c.height = Math.max(2, Math.round(bh));
  const o = c.getContext("2d", { willReadFrequently: true })!;
  o.fillStyle = "#fff";
  if (scene.image && img) {
    // fit the portrait, then stipple: darker pixels get more threads
    const k = Math.min(c.width / img.width, c.height / img.height);
    const iw = img.width * k;
    const ih = img.height * k;
    o.drawImage(img, (c.width - iw) / 2, (c.height - ih) / 2, iw, ih);
  } else scene.draw(o, c.width, c.height);
  const d = o.getImageData(0, 0, c.width, c.height).data;
  const xs: number[] = [];
  const ys: number[] = [];
  const ws: number[] = [];
  for (let y = 0; y < c.height; y += 2) {
    for (let x = 0; x < c.width; x += 2) {
      const i = (y * c.width + x) * 4;
      if (d[i + 3] < 128) continue;
      let wgt = 1;
      if (scene.image) {
        const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
        wgt = Math.pow(1 - lum, 1.6);
        if (wgt < 0.02) continue;
      }
      xs.push(x);
      ys.push(y);
      ws.push(wgt);
    }
  }
  const tx = new Float32Array(n);
  const ty = new Float32Array(n);
  if (!xs.length) return null;
  const maxW = Math.max(...ws);
  for (let i = 0; i < n; i++) {
    let j = 0;
    for (let tries = 0; tries < 30; tries++) {
      j = (Math.random() * xs.length) | 0;
      if (Math.random() * maxW <= ws[j]) break;
    }
    tx[i] = xs[j] + Math.random() * 2;
    ty[i] = ys[j] + Math.random() * 2;
  }
  return { tx, ty };
}

export function MorphField() {
  const ref = useRef<HTMLCanvasElement>(null);
  const ctl = useRef({ jump: -1, paused: false });
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

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
    let x = new Float32Array(0);
    let y = new Float32Array(0);
    let vx = new Float32Array(0);
    let vy = new Float32Array(0);
    let fear = new Float32Array(0);
    // about a third of the threads never join a picture: they keep the whole
    // screen inked while the rest gather. Each joiner also has its own small
    // delay, so a picture streams in from everywhere instead of snapping
    let ambient = new Uint8Array(0);
    let delay = new Float32Array(0);
    let targets: ({ tx: Float32Array; ty: Float32Array } | null)[] = [];
    let list: Scene[] = [name, gamepad, orbits, code];
    let portrait: HTMLImageElement | null = null;
    let box = { x: 0, y: 0, w: 0, h: 0 };
    let sceneIdx = 0;
    let phaseStart = performance.now();
    const pointer = { x: -1e4, y: -1e4, at: -1e9 };

    function layout() {
      const r = canvas!.getBoundingClientRect();
      w = r.width;
      h = r.height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      const mobile = w < 768;
      box = mobile ? { x: 6, y: h * 0.33, w: w - 12, h: h * 0.55 } : { x: w * 0.36, y: h * 0.07, w: w * 0.62, h: h * 0.86 };
      const shape = Math.min(mobile ? 2600 : 5200, (box.w * box.h) / (mobile ? 40 : 55));
      const count = Math.round(shape / 0.6);
      if (count !== n) {
        n = count;
        x = new Float32Array(n);
        y = new Float32Array(n);
        vx = new Float32Array(n);
        vy = new Float32Array(n);
        fear = new Float32Array(n);
        ambient = new Uint8Array(n);
        delay = new Float32Array(n);
        for (let i = 0; i < n; i++) {
          x[i] = Math.random() * w;
          y[i] = Math.random() * h;
          ambient[i] = i % 25 < 10 ? 1 : 0;
          delay[i] = Math.random() * 0.45;
        }
      }
      targets = list.map((sc) => {
        const t = sample(sc, n, box.w, box.h, portrait);
        if (!t) return null;
        for (let i = 0; i < n; i++) {
          t.tx[i] += box.x;
          t.ty[i] += box.y;
        }
        return t;
      });
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.fillStyle = `rgb(${BG.join(",")})`;
      ctx!.fillRect(0, 0, w, h);
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (!visible || !n) return;
      const c = ctx!;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);

      // scene clock: form, hold, drift, next
      if (ctl.current.jump >= 0) {
        sceneIdx = ctl.current.jump;
        ctl.current.jump = -1;
        phaseStart = now;
        setCurrent(sceneIdx);
      }
      let el = now - phaseStart;
      if (ctl.current.paused || reduce) el = Math.min(el, FORM + 1);
      else if (el > FORM + HOLD + DRIFT) {
        sceneIdx = (sceneIdx + 1) % list.length;
        phaseStart = now;
        el = 0;
        setCurrent(sceneIdx);
      }
      const tgt = targets[sceneIdx];
      // pull: 0 while drifting, rises while forming, full while holding
      let pull: number;
      if (el < FORM) pull = Math.pow(el / FORM, 2);
      else if (el < FORM + HOLD) pull = 1;
      else pull = Math.max(0, 1 - (el - FORM - HOLD) / 500);

      c.fillStyle = `rgba(${BG.join(",")},${0.07 + pull * 0.1})`;
      c.fillRect(0, 0, w, h);

      const t = now / 1000;
      const stir = now - pointer.at < 2500;
      const R = Math.max(70, Math.min(w, h) * 0.12);
      const R2 = R * R;
      const ns = 0.0022;

      const px = new Float32Array(n);
      const py = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        px[i] = x[i];
        py[i] = y[i];
        let ax = 0;
        let ay = 0;
        // this thread's own pull: never for ambient ones; staggered for the rest
        let pi = 0;
        if (!ambient[i]) {
          if (el < FORM) {
            const kk = Math.min(1, Math.max(0, (el / FORM - delay[i]) / 0.55));
            pi = kk * kk * (3 - 2 * kk);
          } else if (el < FORM + HOLD) pi = 1;
          else {
            const rel = Math.min(1, Math.max(0, ((el - FORM - HOLD) / 900 - delay[i] * 0.6) / 0.5));
            pi = 1 - rel * rel * (3 - 2 * rel);
          }
        }
        const fi = 1 - pi;
        if (fi > 0.01) {
          const a = noise(x[i] * ns + t * 0.05, y[i] * ns - t * 0.04) * Math.PI * 4;
          ax += Math.cos(a) * 0.35 * fi;
          ay += Math.sin(a) * 0.35 * fi;
        }
        if (tgt && pi > 0) {
          const k = 0.012 + pi * 0.05;
          ax += (tgt.tx[i] - x[i]) * k * pi;
          ay += (tgt.ty[i] - y[i]) * k * pi;
        }
        let f = fear[i] * 0.95;
        if (stir) {
          const dx = x[i] - pointer.x;
          const dy = y[i] - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < R2 && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const near = 1 - d / R;
            ax += (dx / d) * near * near * 9;
            ay += (dy / d) * near * near * 9;
            f = Math.max(f, near);
          }
        }
        fear[i] = f;
        const damp = 0.82 - fi * 0.06;
        vx[i] = (vx[i] + ax) * damp;
        vy[i] = (vy[i] + ay) * damp;
        x[i] += vx[i];
        y[i] += vy[i];
        // threads that drift off one side come back on the other
        if (x[i] < -10) x[i] += w + 20;
        else if (x[i] > w + 10) x[i] -= w + 20;
        if (y[i] < -10) y[i] += h + 20;
        else if (y[i] > h + 10) y[i] -= h + 20;
      }

      // ink: each thread draws the step it just took, plus a dot where it is
      const bands: [string, number, number][] = [
        [CALM, -1, 0.2],
        [WARM, 0.2, 0.55],
        [HOT, 0.55, 9],
      ];
      c.lineWidth = 1;
      // the ambient ink first, quieter, so the pictures read on top of it
      c.strokeStyle = "rgba(236,232,220,0.5)";
      c.lineWidth = 1.2;
      c.beginPath();
      for (let i = 0; i < n; i++) {
        if (!ambient[i] || fear[i] > 0.2) continue;
        if (Math.abs(x[i] - px[i]) > 40 || Math.abs(y[i] - py[i]) > 40) continue;
        c.moveTo(px[i], py[i]);
        c.lineTo(x[i], y[i]);
      }
      c.stroke();
      c.lineWidth = 1;
      for (const [col, lo, hi] of bands) {
        c.strokeStyle = col;
        c.fillStyle = col;
        c.beginPath();
        for (let i = 0; i < n; i++) {
          const f = fear[i];
          if (f <= lo || f > hi) continue;
          if (ambient[i] && f <= 0.2) continue;
          if (Math.abs(x[i] - px[i]) > 40 || Math.abs(y[i] - py[i]) > 40) continue;
          c.moveTo(px[i], py[i]);
          c.lineTo(x[i], y[i]);
        }
        c.stroke();
        if (pull > 0.6) {
          for (let i = 0; i < n; i++) {
            const f = fear[i];
            if (f <= lo || f > hi || ambient[i]) continue;
            c.fillRect(x[i] - 0.7, y[i] - 0.7, 1.4, 1.4);
          }
        }
      }
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
      tm = window.setTimeout(layout, 150);
    };
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);

    const start = () => {
      layout();
      setScenes(list);
      raf = requestAnimationFrame(frame);
    };
    // the face scene joins only if a portrait has been added to /public
    const img = new Image();
    img.onload = () => {
      portrait = img;
      list = [name, face, gamepad, orbits, code];
      document.fonts.ready.then(start);
    };
    img.onerror = () => document.fonts.ready.then(start);
    img.src = "/portrait.jpg";

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

  return (
    <>
      <canvas ref={ref} aria-hidden style={{ width: "100%", height: "100%", display: "block", touchAction: "pan-y" }} />
      {scenes.length > 0 && (
        <div className={s.morphBar}>
          <span className={s.morphNow}>Now drawing {scenes[current]?.caption}</span>
          <div className={s.morphDots} role="group" aria-label="Pictures">
            {scenes.map((sc, i) => (
              <button
                key={sc.id}
                type="button"
                aria-label={`Draw ${sc.caption}`}
                aria-pressed={i === current}
                onClick={() => {
                  ctl.current.jump = i;
                }}
              />
            ))}
          </div>
          <button
            type="button"
            className={s.morphPause}
            aria-pressed={paused}
            onClick={() => {
              ctl.current.paused = !ctl.current.paused;
              setPaused(ctl.current.paused);
            }}
          >
            {paused ? "Play" : "Pause"}
          </button>
        </div>
      )}
    </>
  );
}
