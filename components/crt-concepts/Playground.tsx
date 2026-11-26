"use client";

import { useRef, useState } from "react";
import p from "./playground.module.css";

// Concept L: a tray of hand-built controls. Nothing here is a library
// widget; each one is small, keyboard-usable, and exists to feel good:
// a theme switch whose knob is a little sky, a button that ripples from
// where you press it, a dial with detents, and a slider whose thumb
// stretches with speed. The switch really does re-theme the tray.

function SkySwitch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label="Night mode"
      className={p.sky}
      data-on={on || undefined}
      onClick={() => onChange(!on)}
    >
      <span className={p.skyStars} aria-hidden>
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className={p.skyClouds} aria-hidden>
        <i />
        <i />
      </span>
      <span className={p.knob} aria-hidden>
        <span className={p.sun} />
        <span className={p.moon}>
          <i />
          <i />
          <i />
        </span>
      </span>
    </button>
  );
}

function RippleButton() {
  const [n, setN] = useState(0);
  const [rips, setRips] = useState<{ id: number; x: number; y: number }[]>([]);
  const id = useRef(0);
  return (
    <div className={p.stack}>
      <button
        type="button"
        className={p.press}
        onPointerDown={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const rip = { id: id.current++, x: e.clientX - r.left, y: e.clientY - r.top };
          setRips((rs) => [...rs, rip]);
          window.setTimeout(() => setRips((rs) => rs.filter((q) => q.id !== rip.id)), 700);
        }}
        onClick={() => setN((v) => v + 1)}
      >
        {rips.map((r) => (
          <span key={r.id} className={p.ripple} style={{ left: r.x, top: r.y }} aria-hidden />
        ))}
        <span className={p.pressLabel}>Press me</span>
      </button>
      <span className={p.caption} aria-live="polite">
        {n === 0 ? "Not pressed yet" : `Pressed ${n} ${n === 1 ? "time" : "times"}`}
      </span>
    </div>
  );
}

const STEPS = 11;
const SWEEP = 270;

function Dial() {
  const [v, setV] = useState(4);
  const ref = useRef<HTMLDivElement>(null);
  const angle = -SWEEP / 2 + (v / (STEPS - 1)) * SWEEP;
  const fromPointer = (x: number, y: number) => {
    const r = ref.current!.getBoundingClientRect();
    let a = (Math.atan2(x - (r.left + r.width / 2), -(y - (r.top + r.height / 2))) * 180) / Math.PI;
    a = Math.max(-SWEEP / 2, Math.min(SWEEP / 2, a));
    setV(Math.round(((a + SWEEP / 2) / SWEEP) * (STEPS - 1)));
  };
  return (
    <div className={p.stack}>
      <div className={p.dialWrap}>
        {Array.from({ length: STEPS }, (_, i) => (
          <span
            key={i}
            className={p.tick}
            data-on={i <= v || undefined}
            style={{ transform: `rotate(${-SWEEP / 2 + (i / (STEPS - 1)) * SWEEP}deg)` }}
            aria-hidden
          />
        ))}
        <div
          ref={ref}
          className={p.dial}
          role="slider"
          tabIndex={0}
          aria-label="Dial"
          aria-valuemin={0}
          aria-valuemax={STEPS - 1}
          aria-valuenow={v}
          style={{ transform: `rotate(${angle}deg)` }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            fromPointer(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) fromPointer(e.clientX, e.clientY);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowUp") setV((x) => Math.min(STEPS - 1, x + 1));
            else if (e.key === "ArrowLeft" || e.key === "ArrowDown") setV((x) => Math.max(0, x - 1));
            else return;
            e.preventDefault();
          }}
        >
          <span className={p.notch} aria-hidden />
        </div>
      </div>
      <span className={p.caption}>Turned to {v}</span>
    </div>
  );
}

function StretchSlider() {
  const [v, setV] = useState(0.35);
  const [stretch, setStretch] = useState(1);
  const track = useRef<HTMLDivElement>(null);
  const last = useRef<{ x: number; t: number } | null>(null);
  const settle = useRef(0);
  const move = (x: number) => {
    const r = track.current!.getBoundingClientRect();
    setV(Math.max(0, Math.min(1, (x - r.left) / r.width)));
    const now = performance.now();
    if (last.current) {
      const speed = Math.abs(x - last.current.x) / Math.max(1, now - last.current.t);
      setStretch(1 + Math.min(0.9, speed * 0.6));
    }
    last.current = { x, t: now };
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => setStretch(1), 90);
  };
  return (
    <div className={p.stack}>
      <div
        ref={track}
        className={p.track}
        role="slider"
        tabIndex={0}
        aria-label="Stretchy slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(v * 100)}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          last.current = null;
          move(e.clientX);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) move(e.clientX);
        }}
        onPointerUp={() => setStretch(1)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowUp") setV((x) => Math.min(1, x + 0.05));
          else if (e.key === "ArrowLeft" || e.key === "ArrowDown") setV((x) => Math.max(0, x - 0.05));
          else return;
          e.preventDefault();
        }}
      >
        <span className={p.fill} style={{ width: `${v * 100}%` }} aria-hidden />
        <span className={p.thumb} style={{ left: `${v * 100}%`, transform: `translate(-50%, -50%) scale(${stretch}, ${1 / Math.sqrt(stretch)})` }} aria-hidden />
      </div>
      <span className={p.caption}>Drag it fast</span>
    </div>
  );
}

export function Playground() {
  const [night, setNight] = useState(true);
  return (
    <div className={p.tray} data-theme={night ? "night" : "day"}>
      <div className={p.bay}>
        <SkySwitch on={night} onChange={setNight} />
        <span className={p.caption}>{night ? "Night" : "Day"}, it re-themes this tray</span>
      </div>
      <div className={p.bay}>
        <RippleButton />
      </div>
      <div className={p.bay}>
        <Dial />
      </div>
      <div className={p.bay}>
        <StretchSlider />
      </div>
    </div>
  );
}
