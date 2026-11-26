"use client";

import { useEffect, useRef, useState } from "react";
import s from "./race.module.css";

// Concept AC: race me. A red car laps a circuit non-stop with a live lap
// timer, which is the attract mode. Press "Race me" and it becomes a race:
// the cars line up on the grid, the start lights run (five on, a random
// hold, out), the silver car launches at an F1 driver's ~0.2 s reaction
// and the red one launches when you press. Both then run the same lap, so
// the gap at the line is exactly your reaction against a driver's.

const PTS: [number, number][] = [
  [0.14, 0.58], [0.1, 0.32], [0.24, 0.13], [0.46, 0.2], [0.6, 0.1], [0.86, 0.16],
  [0.92, 0.4], [0.74, 0.52], [0.84, 0.78], [0.62, 0.9], [0.4, 0.78], [0.24, 0.88],
];
const SAMPLES = 700;
const LAP = 7.2; // seconds the animated lap takes
const DRIVER = 0.2; // s, per formula1.com

type Phase = "attract" | "grid" | "lights" | "racing" | "done" | "jump";

function catmull(p: [number, number][], n: number) {
  const out: [number, number][] = [];
  for (let i = 0; i < p.length; i++) {
    const p0 = p[(i - 1 + p.length) % p.length];
    const p1 = p[i];
    const p2 = p[(i + 1) % p.length];
    const p3 = p[(i + 2) % p.length];
    const steps = Math.round(n / p.length);
    for (let k = 0; k < steps; k++) {
      const t = k / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([0, 1].map((d) => 0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3)) as [number, number]);
    }
  }
  return out;
}

export function RaceMe() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>("attract");
  const [lit, setLit] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [lapText, setLapText] = useState("");
  const [launched, setLaunched] = useState(false);
  const race = useRef({ phase: "attract" as Phase, outAt: 0, ghostGo: 0, youGo: 0, timers: [] as number[] });

  const go = (p: Phase) => {
    race.current.phase = p;
    setPhase(p);
  };

  function startRace() {
    const r = race.current;
    r.timers.forEach((t) => window.clearTimeout(t));
    r.timers = [];
    setResult(null);
    setLit(0);
    r.youGo = 0;
    setLaunched(false);
    r.ghostGo = 0;
    go("grid");
    for (let i = 1; i <= 5; i++) r.timers.push(window.setTimeout(() => (setLit(i), go("lights")), 600 + i * 800));
    const hold = 200 + Math.random() * 2800;
    r.timers.push(
      window.setTimeout(() => {
        setLit(0);
        r.outAt = performance.now();
        r.ghostGo = r.outAt + DRIVER * 1000;
        go("racing");
      }, 600 + 5 * 800 + hold),
    );
  }

  function press() {
    const r = race.current;
    if (r.phase === "attract" || r.phase === "done" || r.phase === "jump") return startRace();
    if (r.phase === "grid" || r.phase === "lights") {
      r.timers.forEach((t) => window.clearTimeout(t));
      setLit(0);
      setResult("Jump start. In F1 that's a penalty; here it's a restart.");
      go("jump");
      return;
    }
    if (r.phase === "racing" && !r.youGo) {
      r.youGo = performance.now();
      setLaunched(true);
    }
  }

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
    let path: [number, number][] = [];
    // time (s) to reach each sample, slower through tight corners
    let tAt = new Float32Array(0);
    let lapRaw = 1;
    let box = { x: 0, y: 0, w: 0, h: 0 };
    const t0 = performance.now();
    let lastLap = -1;

    function build() {
      const r = canvas!.getBoundingClientRect();
      w = r.width;
      h = r.height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      const mobile = w < 768;
      const b = mobile ? { x: 14, y: h * 0.37, w: w - 28, h: h * 0.33 } : { x: w * 0.46, y: h * 0.12, w: w * 0.48, h: h * 0.56 };
      box = b;
      path = catmull(PTS, SAMPLES).map(([x, y]) => [b.x + x * b.w, b.y + y * b.h]);
      const n = path.length;
      tAt = new Float32Array(n + 1);
      let acc = 0;
      for (let i = 0; i < n; i++) {
        const a = path[(i - 1 + n) % n];
        const p = path[i];
        const c = path[(i + 1) % n];
        const ang = Math.abs(Math.atan2(c[1] - p[1], c[0] - p[0]) - Math.atan2(p[1] - a[1], p[0] - a[0]));
        const turn = Math.min(ang, Math.PI * 2 - ang);
        const v = 1 / (1 + turn * 26); // corners slow you down
        const ds = Math.hypot(c[0] - p[0], c[1] - p[1]);
        tAt[i] = acc;
        acc += ds / v;
      }
      tAt[n] = acc;
      lapRaw = acc;
    }

    /** Position and heading after `sec` seconds of driving from the line. */
    function at(sec: number) {
      const n = path.length;
      const laps = sec / LAP;
      const frac = laps - Math.floor(laps);
      const target = frac * lapRaw;
      let lo = 0;
      let hi = n;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (tAt[mid] <= target) lo = mid;
        else hi = mid;
      }
      const p = path[lo];
      const q = path[(lo + 1) % n];
      const k = (target - tAt[lo]) / Math.max(1e-6, tAt[lo + 1] - tAt[lo]);
      return { x: p[0] + (q[0] - p[0]) * k, y: p[1] + (q[1] - p[1]) * k, a: Math.atan2(q[1] - p[1], q[0] - p[0]), laps };
    }

    function car(x: number, y: number, a: number, body: string, ghost = false) {
      const c = ctx!;
      const L = Math.max(16, Math.min(box.w, box.h) * 0.055);
      c.save();
      c.translate(x, y);
      c.rotate(a);
      c.globalAlpha = ghost ? 0.85 : 1;
      c.fillStyle = "#0a0a0a";
      for (const [wx, wy] of [[0.28, 0.32], [0.28, -0.32], [-0.3, 0.34], [-0.3, -0.34]]) c.fillRect(wx * L - L * 0.1, wy * L - L * 0.08, L * 0.2, L * 0.16);
      c.fillStyle = body;
      c.beginPath();
      c.moveTo(L * 0.55, 0);
      c.lineTo(L * 0.1, L * 0.11);
      c.lineTo(-L * 0.42, L * 0.14);
      c.lineTo(-L * 0.42, -L * 0.14);
      c.lineTo(L * 0.1, -L * 0.11);
      c.closePath();
      c.fill();
      c.fillRect(L * 0.44, -L * 0.3, L * 0.08, L * 0.6); // front wing
      c.fillRect(-L * 0.52, -L * 0.24, L * 0.1, L * 0.48); // rear wing
      c.fillStyle = ghost ? "#2c2f36" : "#ffd23f";
      c.beginPath();
      c.arc(-L * 0.02, 0, L * 0.06, 0, Math.PI * 2); // helmet
      c.fill();
      c.restore();
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (!visible || !path.length) return;
      const c = ctx!;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.fillStyle = "#0d0e10";
      c.fillRect(0, 0, w, h);
      const lw = Math.max(18, Math.min(box.w, box.h) * 0.07);

      // the circuit: run-off, kerbs, asphalt, racing line
      c.lineJoin = "round";
      c.lineCap = "round";
      const trace = () => {
        c.beginPath();
        path.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
        c.closePath();
      };
      trace();
      c.strokeStyle = "#16181b";
      c.lineWidth = lw + 18;
      c.stroke();
      trace();
      c.strokeStyle = "#e8e4da";
      c.lineWidth = lw + 6;
      c.setLineDash([10, 10]);
      c.stroke();
      c.strokeStyle = "#c8141c";
      c.lineDashOffset = 10;
      c.stroke();
      c.setLineDash([]);
      c.lineDashOffset = 0;
      trace();
      c.strokeStyle = "#2a2c31";
      c.lineWidth = lw;
      c.stroke();
      trace();
      c.strokeStyle = "rgba(255,255,255,0.06)";
      c.lineWidth = 1;
      c.setLineDash([2, 10]);
      c.stroke();
      c.setLineDash([]);

      // start/finish line, chequered
      const [sx, sy] = path[0];
      const [nx, ny] = path[1];
      const ang = Math.atan2(ny - sy, nx - sx);
      c.save();
      c.translate(sx, sy);
      c.rotate(ang);
      const sq = lw / 6;
      for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) {
        c.fillStyle = (i + j) % 2 ? "#f3efe6" : "#111";
        c.fillRect(j * sq - sq, -lw / 2 + i * sq, sq, sq);
      }
      c.restore();

      const r = race.current;
      const el = (now - t0) / 1000;
      if (r.phase === "attract" || r.phase === "jump") {
        // attract mode: both cars lap forever, silver a little ahead
        const you = reduce ? at(0) : at(el);
        const gh = reduce ? at(0.6) : at(el + 0.6);
        car(gh.x, gh.y, gh.a, "#c9ccd3", true);
        car(you.x, you.y, you.a, "#d0101a");
        const lap = Math.floor(you.laps) + 1;
        if (lap !== lastLap) {
          lastLap = lap;
          setLapText(`Lap ${lap}`);
        }
      } else {
        const gSec = r.ghostGo && now > r.ghostGo ? (now - r.ghostGo) / 1000 : 0;
        const ySec = r.youGo && now > r.youGo ? (now - r.youGo) / 1000 : 0;
        // the grid: silver on pole, red alongside and a touch behind
        const g = at(Math.min(gSec, LAP));
        const y0 = at(Math.min(ySec, LAP + 0.25) + LAP - 0.25);
        const off = Math.max(10, lw * 0.28);
        car(g.x + Math.sin(g.a) * off, g.y - Math.cos(g.a) * off, g.a, "#c9ccd3", true);
        car(y0.x - Math.sin(y0.a) * off, y0.y + Math.cos(y0.a) * off, y0.a, "#d0101a");
        if (r.phase === "racing") {
          const youDone = r.youGo && ySec >= LAP + 0.25;
          const ghostDone = gSec >= LAP;
          if (ghostDone && (youDone || now - r.outAt > (LAP + 6) * 1000)) {
            if (!r.youGo) setResult("You never left the grid. Press when the lights go out!");
            else {
              const react = (r.youGo - r.outAt) / 1000;
              const gap = react - DRIVER;
              setResult(
                gap <= 0
                  ? `Your reaction: ${react.toFixed(3)} s. You beat the F1 launch by ${(-gap).toFixed(3)} s.`
                  : `Your reaction: ${react.toFixed(3)} s. You crossed the line ${gap.toFixed(3)} s behind an F1 driver.`,
              );
            }
            go("done");
          }
        }
      }
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
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== " " && e.key !== "Enter") return;
      if ((e.target as HTMLElement).closest("a,button,input,textarea,select")) return;
      if (window.scrollY > window.innerHeight * 0.5) return;
      e.preventDefault();
      press();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    const timers = race.current.timers;
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
    // press() only touches refs and state setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const label =
    phase === "attract" ? "Race me" : phase === "racing" ? (launched ? "Flat out" : "Go!") : phase === "done" || phase === "jump" ? "Race again" : "Wait for lights out";

  return (
    <>
      <canvas
        ref={ref}
        aria-hidden
        style={{ width: "100%", height: "100%", display: "block", touchAction: "manipulation" }}
        onPointerDown={() => {
          if (race.current.phase === "racing" || race.current.phase === "lights" || race.current.phase === "grid") press();
        }}
      />
      <div className={s.hud}>
        <div className={s.tower} aria-hidden>
          <span className={s.dot} />
          {phase === "attract" ? lapText : phase === "racing" ? "Racing" : phase === "done" ? "Chequered flag" : "On the grid"}
        </div>
        <div className={s.lights} aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <i key={i} data-on={i < lit || undefined} />
          ))}
        </div>
        <button type="button" className={s.go} data-phase={phase} onClick={press}>
          {label}
        </button>
        <p className={s.result} aria-live="polite">
          {result ?? (phase === "attract" ? "One lap against an F1 driver's start. Press when the five lights go out." : phase === "racing" ? (launched ? "Flat out to the line…" : "Lights out! Tap Go, the track, or space.") : "Five lights on, then a random wait…")}
        </p>
      </div>
    </>
  );
}
