"use client";

import { useEffect, useRef } from "react";
import { ecoControl, fearParams } from "./fear-params";

// Concept J: a living ecosystem, from the prey/predator research with a
// fear factor. Prey graze, breed and run; predators hunt, breed when fed
// and starve when not. Fear makes prey flee earlier but breed less, which
// is the model's point. The chart traces both populations as they cycle.
// Visitors can drop in a predator (click/tap the field) or turn the fear
// up and watch the cycle change.



const BG = "#0e1512";
const PREY = "#e9e2cf";
const PRED = "#ff6a3d";

type A = { x: number; y: number; vx: number; vy: number; e: number };

export function Ecosystem() {
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
    let box = { x: 0, y: 0, w: 0, h: 0 };
    let prey: A[] = [];
    let preds: A[] = [];
    const hist: [number, number][] = [];
    let histT = 0;
    let noPredT = 0;
    let raf = 0;
    let visible = true;
    let last = performance.now();
    let mobile = false;

    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const inBox = (): A => ({ x: rnd(box.x, box.x + box.w), y: rnd(box.y, box.y + box.h), vx: rnd(-1, 1), vy: rnd(-1, 1), e: 1 });

    function resize() {
      const r = canvas!.getBoundingClientRect();
      w = r.width;
      h = r.height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      mobile = w < 768;
      // the herd lives beside the copy on desktop and under it on phones
      box = mobile ? { x: 8, y: h * 0.42, w: w - 16, h: h * 0.34 } : { x: w * 0.44, y: h * 0.12, w: w * 0.54, h: h * 0.62 };
      if (!prey.length) {
        prey = Array.from({ length: mobile ? 70 : 140 }, inBox);
        preds = Array.from({ length: 3 }, () => ({ ...inBox(), e: 1.2 }));
      }
    }

    function addPredator(x?: number, y?: number) {
      const a = inBox();
      if (x != null && y != null) {
        a.x = x;
        a.y = y;
      }
      a.e = 1.3;
      preds.push(a);
    }
    ecoControl.addPredator = () => addPredator();

    function keepIn(a: A) {
      const m = 6;
      if (a.x < box.x + m) a.vx += 0.3;
      if (a.x > box.x + box.w - m) a.vx -= 0.3;
      if (a.y < box.y + m) a.vy += 0.3;
      if (a.y > box.y + box.h - m) a.vy -= 0.3;
    }

    function clampIn(a: A) {
      if (a.x < box.x) { a.x = box.x; a.vx = Math.abs(a.vx); }
      if (a.x > box.x + box.w) { a.x = box.x + box.w; a.vx = -Math.abs(a.vx); }
      if (a.y < box.y) { a.y = box.y; a.vy = Math.abs(a.vy); }
      if (a.y > box.y + box.h) { a.y = box.y + box.h; a.vy = -Math.abs(a.vy); }
    }

    function step(dt: number) {
      const k = fearParams.k;
      const cap = Math.round((box.w * box.h) / (mobile ? 1500 : 2100));
      const fleeR = 40 + k * 110;
      // prey: wander, flee, breed (fear suppresses breeding)
      const born: A[] = [];
      for (const p of prey) {
        p.vx += rnd(-0.12, 0.12);
        p.vy += rnd(-0.12, 0.12);
        let scared = false;
        for (const q of preds) {
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < fleeR * fleeR && d2 > 0.01) {
            const d = Math.sqrt(d2);
            p.vx += (dx / d) * 0.5 * (1 - d / fleeR);
            p.vy += (dy / d) * 0.5 * (1 - d / fleeR);
            scared = true;
          }
        }
        keepIn(p);
        const sp = Math.hypot(p.vx, p.vy);
        const max = scared ? 1.45 + k * 0.5 : 0.8;
        if (sp > max) {
          p.vx *= max / sp;
          p.vy *= max / sp;
        }
        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;
        clampIn(p);
        // e: how recently this one was frightened, for its colour
        p.e = scared ? 1 : Math.max(0, p.e - dt * 0.4);
        const birth = 0.32 * (1 - 0.8 * k) * Math.max(0, 1 - prey.length / cap);
        if (Math.random() < birth * dt) born.push({ x: p.x + rnd(-4, 4), y: p.y + rnd(-4, 4), vx: 0, vy: 0, e: 0 });
      }
      prey.push(...born);

      // predators: chase the nearest prey, eat, starve, split when fed
      const eaten = new Set<A>();
      const kids: A[] = [];
      for (const q of preds) {
        let best: A | null = null;
        let bd = 180 * 180;
        for (const p of prey) {
          if (eaten.has(p)) continue;
          const d2 = (p.x - q.x) ** 2 + (p.y - q.y) ** 2;
          if (d2 < bd) {
            bd = d2;
            best = p;
          }
        }
        if (best) {
          const d = Math.sqrt(bd) || 1;
          q.vx += ((best.x - q.x) / d) * 0.26;
          q.vy += ((best.y - q.y) / d) * 0.26;
          if (d < 10) {
            eaten.add(best);
            q.e += 0.42;
          }
        } else {
          q.vx += rnd(-0.1, 0.1);
          q.vy += rnd(-0.1, 0.1);
        }
        keepIn(q);
        const sp = Math.hypot(q.vx, q.vy);
        if (sp > 2.4) {
          q.vx *= 2.4 / sp;
          q.vy *= 2.4 / sp;
        }
        q.x += q.vx * dt * 60;
        q.y += q.vy * dt * 60;
        clampIn(q);
        q.e -= dt * 0.13;
        if (q.e > 2 && preds.length + kids.length < 40) {
          q.e /= 2;
          kids.push({ ...q, vx: -q.vx, vy: -q.vy });
        }
      }
      if (eaten.size) prey = prey.filter((p) => !eaten.has(p));
      preds = preds.filter((q) => q.e > 0).concat(kids);

      // keep the world from emptying out for good
      if (prey.length < 10 && Math.random() < dt * 4) prey.push(inBox());
      noPredT = preds.length ? 0 : noPredT + dt;
      if (noPredT > 4) {
        addPredator();
        noPredT = 0;
      }

      histT += dt;
      if (histT > 0.25) {
        histT = 0;
        hist.push([prey.length, preds.length]);
        if (hist.length > 240) hist.shift();
      }
    }

    function draw() {
      const c = ctx!;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.fillStyle = BG;
      c.fillRect(0, 0, w, h);

      // the field's edge, faint, so it reads as a place
      c.strokeStyle = "rgba(233,226,207,0.08)";
      c.setLineDash([2, 6]);
      c.strokeRect(box.x + 0.5, box.y + 0.5, box.w, box.h);
      c.setLineDash([]);

      for (const p of prey) {
        c.fillStyle = p.e > 0.5 ? "#f2b950" : PREY;
        c.fillRect(p.x - 2, p.y - 2, 4, 4);
      }
      c.fillStyle = PRED;
      for (const q of preds) {
        const a = Math.atan2(q.vy, q.vx);
        c.beginPath();
        c.moveTo(q.x + Math.cos(a) * 10, q.y + Math.sin(a) * 10);
        c.lineTo(q.x + Math.cos(a + 2.5) * 7, q.y + Math.sin(a + 2.5) * 7);
        c.lineTo(q.x + Math.cos(a - 2.5) * 7, q.y + Math.sin(a - 2.5) * 7);
        c.closePath();
        c.fill();
      }

      // population chart under the field
      const cw = mobile ? w - 32 : Math.min(360, box.w * 0.6);
      const ch = mobile ? 56 : 84;
      const cx = mobile ? 16 : box.x + box.w - cw;
      const cy = box.y + box.h + (mobile ? 14 : 22);
      c.font = `500 ${mobile ? 11 : 12}px system-ui, sans-serif`;
      c.fillStyle = "rgba(233,226,207,0.55)";
      c.fillText(`Prey ${prey.length}`, cx, cy - 6);
      c.fillStyle = PRED;
      c.fillText(`Predators ${preds.length}`, cx + 76, cy - 6);
      c.strokeStyle = "rgba(233,226,207,0.12)";
      c.beginPath();
      c.moveTo(cx, cy + ch + 0.5);
      c.lineTo(cx + cw, cy + ch + 0.5);
      c.stroke();
      if (hist.length > 1) {
        const maxPrey = Math.max(40, ...hist.map((v) => v[0]));
        const maxPred = Math.max(8, ...hist.map((v) => v[1]));
        const line = (idx: 0 | 1, col: string, max: number) => {
          c.strokeStyle = col;
          c.lineWidth = 1.5;
          c.beginPath();
          hist.forEach((v, i) => {
            const x = cx + (i / 239) * cw;
            const y = cy + ch - (v[idx] / max) * ch;
            if (i) c.lineTo(x, y);
            else c.moveTo(x, y);
          });
          c.stroke();
        };
        line(0, PREY, maxPrey);
        line(1, PRED, maxPred);
      }
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!visible) return;
      if (!reduce) step(dt);
      draw();
    }

    function onDown(e: PointerEvent) {
      if ((e.target as HTMLElement).closest("a,button,input,label")) return;
      const r = canvas!.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      if (x < box.x || x > box.x + box.w || y < box.y || y > box.y + box.h) return;
      addPredator(x, y);
    }

    let t = 0;
    const onResize = () => {
      clearTimeout(t);
      t = window.setTimeout(resize, 150);
    };
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);
    resize();
    // run a few simulated seconds up front so the chart has a shape on arrival
    if (!reduce) for (let i = 0; i < 300; i++) step(1 / 30);
    raf = requestAnimationFrame(frame);
    const hero = canvas.closest("section") ?? canvas;
    hero.addEventListener("pointerdown", onDown as EventListener);
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ecoControl.addPredator = null;
      hero.removeEventListener("pointerdown", onDown as EventListener);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={ref} aria-hidden style={{ width: "100%", height: "100%", display: "block", touchAction: "manipulation" }} />;
}
