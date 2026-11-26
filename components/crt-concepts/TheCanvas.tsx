"use client";

import { useEffect, useRef, useState } from "react";
import { RESUME_URL } from "@/lib/site";
import { smoothScrollTo } from "@/lib/scroll";
import s from "./canvas.module.css";

// Concept AA: the hero is a design file being put together in front of you.
// The pieces start scattered on a dotted canvas; my cursor (with its name
// tag, as in a multiplayer editor) picks each one up and drops it into
// place, with a selection box and its size. Once it's built, every layer
// stays draggable, so the visitor can rearrange my hero.

type Layer = { id: string; label: string };
const LAYERS: Layer[] = [
  { id: "name", label: "Heading" },
  { id: "lede", label: "Intro" },
  { id: "cta", label: "Buttons" },
  { id: "f1", label: "Sticker · F1" },
  { id: "vinyl", label: "Sticker · DJ" },
  { id: "pan", label: "Sticker · Cooking" },
  { id: "die", label: "Sticker · Board games" },
  { id: "pad", label: "Sticker · Games" },
];

type Pt = { x: number; y: number; r: number };

function targets(w: number, h: number): Record<string, Pt> {
  const m = w < 768;
  if (m)
    return {
      name: { x: 16, y: 84, r: 0 },
      lede: { x: 16, y: 190, r: 0 },
      cta: { x: 16, y: 280, r: 0 },
      f1: { x: w * 0.04, y: h * 0.45, r: -4 },
      vinyl: { x: w * 0.52, y: h * 0.44, r: 5 },
      pad: { x: w * 0.05, y: h * 0.6, r: 3 },
      pan: { x: w * 0.53, y: h * 0.6, r: -3 },
      die: { x: w * 0.28, y: h * 0.75, r: -6 },
    };
  return {
    name: { x: w * 0.06, y: h * 0.3, r: 0 },
    lede: { x: w * 0.06, y: h * 0.3 + 160, r: 0 },
    cta: { x: w * 0.06, y: h * 0.3 + 262, r: 0 },
    f1: { x: w * 0.55, y: h * 0.17, r: -5 },
    vinyl: { x: w * 0.77, y: h * 0.22, r: 6 },
    pad: { x: w * 0.57, y: h * 0.44, r: 3 },
    pan: { x: w * 0.79, y: h * 0.5, r: -4 },
    die: { x: w * 0.66, y: h * 0.68, r: -8 },
  };
}

function scatter(w: number, h: number, i: number): Pt {
  const a = i * 2.39996;
  return { x: w * (0.5 + Math.cos(a) * 0.32) - 60, y: h * (0.5 + Math.sin(a) * 0.3) - 40, r: ((i * 37) % 30) - 15 };
}

const GRAB = 520; // ms to reach a layer
const MOVE = 720; // ms to carry it
const PER = GRAB + MOVE + 180;

export function TheCanvas() {
  const root = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [now, setNow] = useState(0);
  const [moved, setMoved] = useState<Record<string, Pt>>({});
  const start = useRef(0);
  const drag = useRef<{ id: string; dx: number; dy: number; r: number } | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const measure = () => {
      const r = root.current?.getBoundingClientRect();
      if (r) setSize({ w: r.width, h: r.height });
    };
    measure();
    let raf = 0;
    const tick = (t: number) => {
      if (!start.current) start.current = t + 500;
      setNow(reduce ? 1e9 : t - start.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, []);

  const { w, h } = size;
  const T = w ? targets(w, h) : null;
  const ease = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

  // where each layer is, and where the ghost cursor is, at this moment
  const pos: Record<string, Pt> = {};
  let ghost = { x: w * 0.5, y: h * 0.9 };
  let active = -1;
  if (T) {
    LAYERS.forEach((l, i) => {
      const from = scatter(w, h, i);
      const to = T[l.id];
      const t0 = i * PER;
      const k = Math.min(1, Math.max(0, (now - t0 - GRAB) / MOVE));
      const e = ease(k);
      pos[l.id] = moved[l.id] ?? { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, r: from.r + (to.r - from.r) * e };
      if (now >= t0 && now < t0 + GRAB + MOVE) active = i;
    });
    if (active >= 0) {
      const l = LAYERS[active];
      const t0 = active * PER;
      const p = pos[l.id];
      const prev = active > 0 ? T[LAYERS[active - 1].id] : { x: w * 0.5, y: h * 0.9 };
      if (now < t0 + GRAB) {
        const k = ease((now - t0) / GRAB);
        const from = active > 0 ? prev : { x: w * 0.5, y: h * 0.9 };
        const at = scatter(w, h, active);
        ghost = { x: from.x + (at.x + 20 - from.x) * k, y: from.y + (at.y + 20 - from.y) * k };
      } else ghost = { x: p.x + 20, y: p.y + 20 };
    } else if (now >= LAYERS.length * PER) {
      // finished: the cursor idles near the work
      const t = now / 1000;
      ghost = { x: w * (w < 768 ? 0.5 : 0.62) + Math.sin(t * 0.7) * 60, y: h * 0.45 + Math.sin(t * 1.1) * 40 };
    }
  }
  const done = now >= LAYERS.length * PER;

  const onDown = (id: string) => (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("a,button")) return;
    const p = pos[id];
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id, dx: e.clientX - p.x, dy: e.clientY - p.y, r: p.r };
    setDragging(id);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    setMoved((m) => ({ ...m, [d.id]: { x: e.clientX - d.dx, y: e.clientY - d.dy, r: d.r } }));
  };
  const onUp = () => {
    drag.current = null;
    setDragging(null);
  };

  const layer = (id: string, children: React.ReactNode, extra = "") => {
    const p = pos[id];
    if (!p) return null;
    const sel = dragging === id || (!done && LAYERS[active]?.id === id);
    return (
      <div
        key={id}
        className={`${s.layer} ${extra}`}
        data-sel={sel || undefined}
        style={{ transform: `translate(${p.x}px, ${p.y}px) rotate(${p.r}deg)` }}
        onPointerDown={onDown(id)}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {children}
        {sel && <span className={s.tag}>{LAYERS.find((l) => l.id === id)!.label}</span>}
      </div>
    );
  };

  return (
    <div ref={root} className={s.canvas}>
      <div className={s.rulerX} aria-hidden />
      <div className={s.rulerY} aria-hidden />
      {layer("name", <h1 className={s.name}>Divyansh Agarwal</h1>)}
      {layer("lede", <p className={s.lede}>Full-stack engineer in Bangalore. I build interfaces, the services behind them, and small games on the side.</p>)}
      {layer(
        "cta",
        <div className={s.ctas}>
          <a className={s.primary} href={RESUME_URL} target="_blank" rel="noreferrer">
            Résumé (PDF)
          </a>
          <a
            className={s.secondary}
            href="#projects"
            onClick={(e) => {
              e.preventDefault();
              smoothScrollTo("#projects");
            }}
          >
            Skip to projects
          </a>
        </div>,
      )}
      {layer(
        "f1",
        <div className={s.sticker} style={{ ["--c" as string]: "#e8222a" }}>
          <span className={s.lights}>
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
          <b>Lights out</b>
          <small>Ferrari, every race</small>
        </div>,
      )}
      {layer(
        "vinyl",
        <div className={s.sticker} style={{ ["--c" as string]: "#b48cff" }}>
          <span className={s.vinyl} />
          <b>Now spinning</b>
          <small>DJing, newest habit</small>
        </div>,
      )}
      {layer(
        "pan",
        <div className={s.sticker} style={{ ["--c" as string]: "#ffad42" }}>
          <svg viewBox="0 0 64 40" width="64" height="40" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden>
            <ellipse cx="24" cy="26" rx="18" ry="8" />
            <path d="M42 26h18M14 12c0-3 3-3 3-7M24 12c0-3 3-3 3-7M34 12c0-3 3-3 3-7" />
          </svg>
          <b>Mise en place</b>
          <small>Cooking for friends</small>
        </div>,
      )}
      {layer(
        "die",
        <div className={s.sticker} style={{ ["--c" as string]: "#8be07a" }}>
          <span className={s.die}>
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
          <b>Board night</b>
          <small>The longer the game, the better</small>
        </div>,
      )}
      {layer(
        "pad",
        <div className={s.sticker} style={{ ["--c" as string]: "#4aa8ff" }}>
          <svg viewBox="0 0 64 40" width="64" height="40" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M18 6h28c8 0 12 8 13 18s-6 12-10 6l-4-6H19l-4 6c-4 6-11 4-10-6S10 6 18 6Z" />
            <path d="M19 14v8M15 18h8" />
          </svg>
          <b>Player one</b>
          <small>PS5, and games I make</small>
        </div>,
      )}
      <div className={s.ghost} style={{ transform: `translate(${ghost.x}px, ${ghost.y}px)` }} aria-hidden>
        <svg width="18" height="22" viewBox="0 0 18 22">
          <path d="M1 1l15 9-7 1.5L6 20z" fill="#ff5d8f" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
        <span>Divyansh</span>
      </div>
      {done && <p className={s.hint}>Built. Now it&rsquo;s yours: drag anything around.</p>}
    </div>
  );
}
