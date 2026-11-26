"use client";

import { useEffect, useRef, useState } from "react";
import { smoothScrollTo } from "@/lib/scroll";

// Concept D: a nod to 29.8N, his 3v3 artillery game. The hero is one
// artillery range at dusk: drag back from the cannon and let go, the shell
// follows a real parabola (with wind), and hitting a flag takes you to that
// section. Idle visitors see the cannon take practice shots on its own.

const SKY_TOP = "#120f24";
const SKY_LOW = "#3b2b60";
const FAR = "#271f45";
const NEAR = "#17122b";
const RIM = "#a78bfa";
const SHELL = "#ffb347";
const INK = "#efe9ff";

const TARGETS = [
  { label: "About", section: "about", at: 0.5 },
  { label: "Projects", section: "projects", at: 0.64 },
  { label: "Work", section: "experience", at: 0.78 },
  { label: "Contact", section: "contact", at: 0.92 },
] as const;

type Shell = { x: number; y: number; vx: number; vy: number; demo: boolean } | null;
type Spark = { x: number; y: number; vx: number; vy: number; life: number; col: string };

export function Artillery() {
  const ref = useRef<HTMLCanvasElement>(null);
  const grip = useRef<HTMLButtonElement>(null);
  const [status, setStatus] = useState("Aim with the arrow keys, fire with Enter.");

  useEffect(() => {
    const canvas = ref.current;
    const gripEl = grip.current;
    if (!canvas || !gripEl) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let scale = 1;
    let raf = 0;
    let visible = true;
    let last = performance.now();
    let lastUser = -1e9;
    let nextDemo = performance.now() + 2200;
    let wind = 0;
    let shell: Shell = null;
    const sparks: Spark[] = [];
    const down = TARGETS.map(() => 0); // 0 standing → 1 knocked flat
    let aim = { angle: -0.8, power: 0.62 }; // radians from +x, 0..1
    let drag: { x: number; y: number } | null = null;

    const ground = (x: number) =>
      h * 0.8 + Math.sin(x * 0.0042 + 0.6) * h * 0.045 + Math.sin(x * 0.012 + 2) * h * 0.016;
    const cannon = () => {
      const x = w < 768 ? w * 0.1 : w * 0.09;
      return { x, y: ground(x) - 14 * scale };
    };
    const maxSpeed = () => Math.sqrt(h * 2.4) * 30 * Math.min(1.25, Math.max(0.75, w / 1200));
    const gravity = () => 980 * scale;

    function resize() {
      const r = canvas!.getBoundingClientRect();
      w = r.width;
      h = r.height;
      scale = h / 900;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      const c = cannon();
      gripEl!.style.left = `${c.x}px`;
      gripEl!.style.top = `${c.y}px`;
    }

    function newWind() {
      wind = (Math.random() - 0.5) * 140 * scale;
    }
    newWind();

    function fire(demo: boolean) {
      if (shell) return;
      const c = cannon();
      const v = maxSpeed() * (0.25 + aim.power * 0.75);
      const barrel = 34 * scale;
      shell = {
        x: c.x + Math.cos(aim.angle) * barrel,
        y: c.y + Math.sin(aim.angle) * barrel,
        vx: Math.cos(aim.angle) * v,
        vy: Math.sin(aim.angle) * v,
        demo,
      };
      burst(shell.x, shell.y, "#ffd9a0", 10, 120);
    }

    function burst(x: number, y: number, col: string, n: number, speed: number) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = speed * (0.3 + Math.random()) * scale;
        sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60 * scale, life: 1, col });
      }
    }

    // solve for a demo shot at a target, with a little human error
    function demoAim() {
      const i = Math.floor(Math.random() * TARGETS.length);
      const c = cannon();
      const tx = w * TARGETS[i].at;
      const ty = ground(tx) - 40 * scale;
      let best = aim;
      let bestErr = Infinity;
      for (let a = -1.35; a < -0.25; a += 0.05) {
        for (let p = 0.2; p <= 1; p += 0.05) {
          const v = maxSpeed() * (0.25 + p * 0.75);
          const vx = Math.cos(a) * v;
          const vy = Math.sin(a) * v;
          // time to reach tx horizontally (ignoring wind for the solve)
          const t = (tx - c.x) / Math.max(1, vx);
          const y = c.y + vy * t + 0.5 * gravity() * t * t;
          const err = Math.abs(y - ty);
          if (t > 0 && err < bestErr) {
            bestErr = err;
            best = { angle: a, power: p };
          }
        }
      }
      aim = { angle: best.angle + (Math.random() - 0.5) * 0.05, power: best.power };
    }

    function step(dt: number) {
      const g = gravity();
      if (shell) {
        shell.vx += wind * dt;
        shell.vy += g * dt;
        shell.x += shell.vx * dt;
        shell.y += shell.vy * dt;
        // flags
        for (let i = 0; i < TARGETS.length; i++) {
          if (down[i] > 0.01) continue;
          const tx = w * TARGETS[i].at;
          const base = ground(tx);
          const top = base - 92 * scale;
          if (Math.abs(shell.x - tx) < 34 * scale && shell.y > top && shell.y < base) {
            down[i] = 0.02;
            burst(shell.x, shell.y, SHELL, 34, 260);
            const userShot = !shell.demo;
            shell = null;
            newWind();
            if (userShot) {
              setStatus(`Direct hit on ${TARGETS[i].label}. Heading there.`);
              window.setTimeout(() => smoothScrollTo(`#${TARGETS[i].section}`), 650);
            }
            break;
          }
        }
        if (shell && (shell.y > ground(shell.x) || shell.x < -50 || shell.x > w + 50)) {
          burst(shell.x, Math.min(shell.y, ground(shell.x)), "#c9b8ff", 16, 140);
          if (!shell.demo) setStatus("Missed. The wind moved, try again.");
          shell = null;
          newWind();
        }
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.vy += g * 0.6 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.life -= dt * 1.6;
        if (s.life <= 0) sparks.splice(i, 1);
      }
      for (let i = 0; i < down.length; i++) {
        if (down[i] > 0) down[i] = Math.min(1, down[i] + dt * 3);
        // flags stand back up after a while
        if (down[i] >= 1) down[i] = -2.2;
        if (down[i] < 0) down[i] = Math.min(0, down[i] + dt);
      }
    }

    function draw(now: number) {
      const c2 = ctx!;
      c2.setTransform(dpr, 0, 0, dpr, 0, 0);
      const sky = c2.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, SKY_TOP);
      sky.addColorStop(0.85, SKY_LOW);
      c2.fillStyle = sky;
      c2.fillRect(0, 0, w, h);

      // far ridge
      c2.fillStyle = FAR;
      c2.beginPath();
      c2.moveTo(0, h);
      for (let x = 0; x <= w; x += 8) c2.lineTo(x, h * 0.66 + Math.sin(x * 0.006) * h * 0.04 + Math.sin(x * 0.017 + 1) * h * 0.015);
      c2.lineTo(w, h);
      c2.fill();

      // near ground + rim light
      c2.fillStyle = NEAR;
      c2.beginPath();
      c2.moveTo(0, h);
      for (let x = 0; x <= w; x += 6) c2.lineTo(x, ground(x));
      c2.lineTo(w, h);
      c2.fill();
      c2.strokeStyle = RIM;
      c2.globalAlpha = 0.55;
      c2.lineWidth = 2;
      c2.beginPath();
      c2.moveTo(0, ground(0));
      for (let x = 6; x <= w; x += 6) c2.lineTo(x, ground(x));
      c2.stroke();
      c2.globalAlpha = 1;

      // flags
      const f = getComputedStyle(canvas!).getPropertyValue("--font-ident").trim() || "sans-serif";
      TARGETS.forEach((t, i) => {
        const x = w * t.at;
        const base = ground(x);
        const tilt = down[i] > 0 ? down[i] * 1.45 : 0;
        c2.save();
        c2.translate(x, base);
        c2.rotate(tilt);
        c2.strokeStyle = INK;
        c2.lineWidth = 2;
        c2.beginPath();
        c2.moveTo(0, 0);
        c2.lineTo(0, -64 * scale);
        c2.stroke();
        const wave = Math.sin(now / 260 + i) * 3 * scale;
        c2.fillStyle = RIM;
        c2.beginPath();
        c2.moveTo(0, -64 * scale);
        c2.lineTo(26 * scale, -56 * scale + wave);
        c2.lineTo(0, -48 * scale);
        c2.fill();
        c2.restore();
        // label plate
        if (down[i] <= 0) {
          c2.font = `700 ${w < 768 ? 12 : Math.max(12, 15 * scale)}px ${f}`;
          c2.textAlign = "center";
          c2.textBaseline = "bottom";
          c2.fillStyle = INK;
          // stagger labels on narrow screens so neighbours never touch
          const lift = w < 768 && i % 2 ? 20 : 0;
          c2.fillText(t.label, x, base - (72 + lift) * scale);
        }
      });

      // cannon
      const c = cannon();
      c2.save();
      c2.translate(c.x, c.y);
      c2.rotate(aim.angle);
      c2.fillStyle = "#cfc6ee";
      c2.fillRect(0, -6 * scale, 38 * scale, 12 * scale);
      c2.restore();
      c2.fillStyle = "#cfc6ee";
      c2.beginPath();
      c2.arc(c.x, c.y, 13 * scale, 0, Math.PI * 2);
      c2.fill();
      c2.fillStyle = NEAR;
      c2.beginPath();
      c2.arc(c.x, c.y, 5 * scale, 0, Math.PI * 2);
      c2.fill();

      // trajectory preview while aiming
      if (drag || document.activeElement === gripEl) {
        const v = maxSpeed() * (0.25 + aim.power * 0.75);
        let x = c.x + Math.cos(aim.angle) * 34 * scale;
        let y = c.y + Math.sin(aim.angle) * 34 * scale;
        let vx = Math.cos(aim.angle) * v;
        let vy = Math.sin(aim.angle) * v;
        c2.fillStyle = INK;
        for (let i = 0; i < 26; i++) {
          for (let k = 0; k < 4; k++) {
            const dt = 1 / 60;
            vx += wind * dt;
            vy += gravity() * dt;
            x += vx * dt;
            y += vy * dt;
          }
          if (y > ground(x)) break;
          c2.globalAlpha = 1 - i / 26;
          c2.fillRect(x - 2, y - 2, 4, 4);
        }
        c2.globalAlpha = 1;
      }

      // wind sock
      c2.font = `600 ${Math.max(11, 13 * scale)}px ${f}`;
      c2.fillStyle = "rgba(239,233,255,0.7)";
      c2.textAlign = "left";
      c2.textBaseline = "top";
      const wv = Math.round((wind / scale) / 7);
      c2.fillText(`Wind ${wv === 0 ? "calm" : (wv < 0 ? "← " : "→ ") + Math.abs(wv)}`, c.x - 10, ground(c.x) + 14 * scale);

      // shell + sparks
      if (shell) {
        c2.fillStyle = SHELL;
        c2.beginPath();
        c2.arc(shell.x, shell.y, 5 * scale + 1, 0, Math.PI * 2);
        c2.fill();
      }
      for (const s of sparks) {
        c2.globalAlpha = Math.max(0, s.life);
        c2.fillStyle = s.col;
        c2.fillRect(s.x - 2, s.y - 2, 4, 4);
      }
      c2.globalAlpha = 1;
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (!visible) {
        last = now;
        return;
      }
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      if (!reduce && !drag && !shell && now > nextDemo && now - lastUser > 6000) {
        demoAim();
        fire(true);
        nextDemo = now + 3200;
      }
      step(dt);
      draw(now);
    }

    // ── input: drag back from the cannon (slingshot) ──
    function onDown(e: PointerEvent) {
      e.preventDefault();
      gripEl!.setPointerCapture(e.pointerId);
      drag = { x: e.clientX, y: e.clientY };
      lastUser = performance.now();
    }
    function onMove(e: PointerEvent) {
      if (!drag) return;
      const dx = drag.x - e.clientX;
      const dy = drag.y - e.clientY;
      const len = Math.hypot(dx, dy);
      if (len > 6) {
        // pointing up-right only, like a real range
        aim.angle = Math.max(-1.45, Math.min(-0.12, Math.atan2(dy, dx)));
        aim.power = Math.min(1, len / (160 * Math.max(0.7, scale)));
      }
      lastUser = performance.now();
    }
    function onUp() {
      if (!drag) return;
      drag = null;
      fire(false);
      lastUser = performance.now();
    }
    function onKey(e: KeyboardEvent) {
      const k = e.key;
      if (k === "ArrowUp") aim.angle = Math.max(-1.45, aim.angle - 0.04);
      else if (k === "ArrowDown") aim.angle = Math.min(-0.12, aim.angle + 0.04);
      else if (k === "ArrowRight") aim.power = Math.min(1, aim.power + 0.03);
      else if (k === "ArrowLeft") aim.power = Math.max(0.05, aim.power - 0.03);
      else if (k === "Enter" || k === " ") fire(false);
      else return;
      e.preventDefault();
      lastUser = performance.now();
    }

    gripEl.addEventListener("pointerdown", onDown);
    gripEl.addEventListener("pointermove", onMove);
    gripEl.addEventListener("pointerup", onUp);
    gripEl.addEventListener("pointercancel", onUp);
    gripEl.addEventListener("keydown", onKey);
    let rt = 0;
    const onResize = () => {
      clearTimeout(rt);
      rt = window.setTimeout(resize, 120);
    };
    window.addEventListener("resize", onResize);
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);
    document.fonts.ready.then(() => {
      resize();
      raf = requestAnimationFrame(frame);
    });
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", onResize);
      gripEl.removeEventListener("pointerdown", onDown);
      gripEl.removeEventListener("pointermove", onMove);
      gripEl.removeEventListener("pointerup", onUp);
      gripEl.removeEventListener("pointercancel", onUp);
      gripEl.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <canvas ref={ref} aria-hidden style={{ width: "100%", height: "100%", display: "block" }} />
      <button
        ref={grip}
        type="button"
        aria-label="Cannon. Arrow keys aim, Enter fires. Drag back from it and let go to fire."
        aria-describedby="artillery-status"
        style={{
          position: "absolute",
          width: 120,
          height: 120,
          marginLeft: -60,
          marginTop: -60,
          borderRadius: "50%",
          border: "1px dashed rgba(239,233,255,0.35)",
          background: "transparent",
          touchAction: "none",
          zIndex: 4,
        }}
      />
      <p id="artillery-status" className="sr-only" aria-live="polite">
        {status}
      </p>
    </div>
  );
}
