"use client";

import { useEffect, useRef, useState } from "react";
import s from "./more.module.css";

// Concept AE: pan toss. A pan sizzles over a flame and tosses its
// ingredients every few seconds by itself (the attract mode). Flick the pan
// upward (or click it, or press space) to toss them yourself; a harder
// flick throws them higher. Whatever misses the pan drops away and a fresh
// piece falls in. The counters keep score.

type Kind = "tomato" | "pepper" | "onion" | "chili" | "mushroom";
type Bit = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; r: number; kind: Kind; inPan: boolean; air: number };

const KINDS: Kind[] = ["tomato", "pepper", "onion", "chili", "mushroom", "tomato", "pepper", "onion", "chili"];

export function PanToss() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState({ flips: 0, dropped: 0 });
  const tossRef = useRef<(strength: number) => void>(() => {});

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
    let pan = { x: 0, y: 0, half: 0 };
    let lift = 0; // pan's toss offset
    let liftV = 0;
    let bits: Bit[] = [];
    let lastToss = performance.now();
    let touched = false;
    let userToss = false; // only your own tosses count on the scoreboard
    const steam: { x: number; y: number; a: number }[] = [];

    function layout() {
      const r = canvas!.getBoundingClientRect();
      w = r.width;
      h = r.height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      const mobile = w < 768;
      pan = mobile ? { x: w / 2, y: h * 0.68, half: Math.min(130, w * 0.34) } : { x: w * 0.69, y: h * 0.66, half: Math.min(190, w * 0.13) };
      if (!bits.length) bits = KINDS.map((k, i) => spawn(k, i));
    }

    function spawn(kind: Kind, i = 0): Bit {
      const r = pan.half * (0.13 + Math.random() * 0.05);
      return { x: pan.x - pan.half * 0.6 + ((i * 0.37) % 1) * pan.half * 1.2, y: pan.y - 200 - Math.random() * 200, vx: 0, vy: 0, rot: Math.random() * 6, vr: 0, r, kind, inPan: false, air: 0 };
    }

    // the pan's cooking surface: a shallow curve, lowest in the middle
    const surface = (x: number) => {
      const k = (x - pan.x) / pan.half;
      return pan.y - lift - 10 + k * k * 22;
    };

    function toss(strength: number) {
      userToss = touched;
      liftV = 11 * strength;
      for (const b of bits) {
        if (!b.inPan) continue;
        b.inPan = false;
        b.air = 0;
        b.vy = -(10 + Math.random() * 3) * strength;
        b.vx = (pan.x - b.x) * 0.012 + (Math.random() - 0.5) * 2.4 * strength;
        b.vr = (Math.random() - 0.5) * 0.5 * strength;
      }
      lastToss = performance.now();
    }
    tossRef.current = (st) => {
      touched = true;
      toss(st);
    };

    function drawBit(b: Bit) {
      const c = ctx!;
      c.save();
      c.translate(b.x, b.y);
      c.rotate(b.rot);
      const r = b.r;
      if (b.kind === "tomato") {
        c.fillStyle = "#e5392f";
        c.beginPath();
        c.arc(0, 0, r, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#ffb3a1";
        for (let i = 0; i < 4; i++) {
          c.beginPath();
          c.ellipse(Math.cos(i * 1.57) * r * 0.45, Math.sin(i * 1.57) * r * 0.45, r * 0.18, r * 0.1, i * 1.57, 0, Math.PI * 2);
          c.fill();
        }
      } else if (b.kind === "pepper") {
        c.fillStyle = "#3fb24c";
        c.beginPath();
        c.roundRect(-r * 1.3, -r * 0.35, r * 2.6, r * 0.7, r * 0.35);
        c.fill();
      } else if (b.kind === "onion") {
        c.strokeStyle = "#e9dcf2";
        c.lineWidth = r * 0.28;
        c.beginPath();
        c.arc(0, 0, r * 0.8, 0, Math.PI * 2);
        c.stroke();
      } else if (b.kind === "chili") {
        c.fillStyle = "#c81d1d";
        c.beginPath();
        c.ellipse(0, 0, r * 1.25, r * 0.38, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#3a8a2e";
        c.fillRect(-r * 1.45, -r * 0.12, r * 0.3, r * 0.24);
      } else {
        c.fillStyle = "#c9a37a";
        c.beginPath();
        c.arc(0, -r * 0.1, r * 0.85, Math.PI, 0);
        c.fill();
        c.fillRect(-r * 0.25, -r * 0.1, r * 0.5, r * 0.7);
      }
      c.restore();
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (!visible || !pan.half) return;
      // auto toss while nobody is cooking
      if (!reduce && !touched && now - lastToss > 3600) toss(1);
      if (touched && now - lastToss > 9000) touched = false;

      // the pan jumps up on a toss and drops back under gravity
      lift += liftV;
      liftV -= 2.2;
      if (lift <= 0) {
        lift = 0;
        liftV = 0;
      }

      let flipsNow = 0;
      let dropNow = 0;
      for (const b of bits) {
        if (b.inPan) {
          b.y = surface(b.x) - b.r * 0.6;
          b.x += (pan.x - b.x) * 0.004;
          continue;
        }
        b.vy += 0.5;
        b.x += b.vx;
        b.y += b.vy;
        b.rot += b.vr;
        b.air++;
        const sy = surface(b.x) - b.r * 0.6;
        if (b.vy > 0 && b.y >= sy && Math.abs(b.x - pan.x) < pan.half * 0.95 && b.y < sy + 30) {
          b.y = sy;
          if (b.air > 20) flipsNow++;
          b.inPan = true;
          b.vx = 0;
          b.vy = 0;
          b.vr = 0;
          b.rot = Math.round(b.rot / Math.PI) * Math.PI + (Math.random() - 0.5) * 0.4;
        } else if (b.y > h + 40) {
          dropNow++;
          Object.assign(b, spawn(b.kind));
        }
      }
      if (userToss && (flipsNow || dropNow)) setScore((sc) => ({ flips: sc.flips + flipsNow, dropped: sc.dropped + dropNow }));

      const c = ctx!;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      const bg = c.createRadialGradient(pan.x, pan.y, 0, pan.x, pan.y, Math.max(w, h) * 0.7);
      bg.addColorStop(0, "#2a1810");
      bg.addColorStop(1, "#0d0b0a");
      c.fillStyle = bg;
      c.fillRect(0, 0, w, h);

      // the flame
      const fy = pan.y + 46;
      for (let i = -5; i <= 5; i++) {
        const fx = pan.x + i * pan.half * 0.14;
        const fl = 18 + Math.sin(now / 90 + i * 1.7) * 6;
        const g = c.createLinearGradient(fx, fy, fx, fy - fl);
        g.addColorStop(0, "rgba(80,150,255,0.9)");
        g.addColorStop(1, "rgba(255,170,60,0)");
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(fx - 6, fy);
        c.quadraticCurveTo(fx, fy - fl * 1.4, fx + 6, fy);
        c.fill();
      }
      // burner ring
      c.fillStyle = "#1b1b1d";
      c.fillRect(pan.x - pan.half * 0.9, fy, pan.half * 1.8, 10);

      // steam
      if (!reduce && Math.random() < 0.3) steam.push({ x: pan.x + (Math.random() - 0.5) * pan.half * 1.4, y: pan.y - lift - 20, a: 1 });
      c.strokeStyle = "rgba(255,240,225,0.12)";
      c.lineWidth = 6;
      c.lineCap = "round";
      for (let i = steam.length - 1; i >= 0; i--) {
        const st = steam[i];
        st.y -= 1.2;
        st.a -= 0.012;
        if (st.a <= 0) {
          steam.splice(i, 1);
          continue;
        }
        c.globalAlpha = st.a;
        c.beginPath();
        c.moveTo(st.x + Math.sin(st.y / 20) * 8, st.y);
        c.lineTo(st.x + Math.sin((st.y - 14) / 20) * 8, st.y - 14);
        c.stroke();
      }
      c.globalAlpha = 1;

      // the pan: body, rim, handle (tilts a touch while tossing)
      c.save();
      c.translate(pan.x, pan.y - lift);
      c.rotate(-lift * 0.002);
      c.fillStyle = "#121214";
      c.beginPath();
      c.moveTo(-pan.half, -14);
      c.quadraticCurveTo(-pan.half * 0.9, 34, -pan.half * 0.55, 36);
      c.lineTo(pan.half * 0.55, 36);
      c.quadraticCurveTo(pan.half * 0.9, 34, pan.half, -14);
      c.closePath();
      c.fill();
      c.strokeStyle = "#3b3b40";
      c.lineWidth = 5;
      c.beginPath();
      c.moveTo(-pan.half - 2, -14);
      c.lineTo(pan.half + 2, -14);
      c.stroke();
      c.fillStyle = "#2a1d14";
      c.beginPath();
      c.roundRect(-pan.half - pan.half * 0.95, -18, pan.half * 0.9, 16, 8);
      c.fill();
      c.restore();

      for (const b of bits) drawBit(b);
    }

    // flick: a fast upward drag on the hero tosses, harder flick, higher toss
    let down: { y: number; t: number } | null = null;
    const hero = canvas.closest("section") ?? canvas;
    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest("a,button,input,label")) return;
      down = { y: e.clientY, t: performance.now() };
    };
    const onUp = (e: PointerEvent) => {
      if (!down) return;
      const dy = down.y - e.clientY;
      const dt = Math.max(16, performance.now() - down.t);
      const st = dy > 20 ? Math.min(1.6, 0.7 + (dy / dt) * 0.6) : 1;
      down = null;
      tossRef.current(st);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== " ") return;
      if ((e.target as HTMLElement).closest("a,button,input,textarea,select")) return;
      if (window.scrollY > window.innerHeight * 0.5) return;
      e.preventDefault();
      tossRef.current(1.1);
    };
    let tm = 0;
    const onResize = () => {
      clearTimeout(tm);
      tm = window.setTimeout(layout, 150);
    };
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);
    layout();
    raf = requestAnimationFrame(frame);
    hero.addEventListener("pointerdown", onDown as EventListener);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      hero.removeEventListener("pointerdown", onDown as EventListener);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <>
      <canvas ref={ref} aria-hidden style={{ width: "100%", height: "100%", display: "block", touchAction: "pan-y", cursor: "grab" }} />
      <div className={s.panHud}>
        <button type="button" className={s.panBtn} onClick={() => tossRef.current(1.1)}>
          Toss it
        </button>
        <p className={s.panScore} aria-live="polite">
          <span>{score.flips}</span> clean flips, <span>{score.dropped}</span> on the floor
        </p>
      </div>
    </>
  );
}
