"use client";

import { useEffect, useRef, useState } from "react";
import s from "./record.module.css";

// Concept Y: side A, side B. A record on a turntable whose tracklist is the
// things I love. Pick a track and the tonearm swings to its groove and the
// room takes on its colour. Grab the record to scratch it; let go and it
// spins back up to 33⅓. With no one at the controls it plays through the
// tracklist on its own.

type Track = { n: string; title: string; about: string; color: string };
const TRACKS: Track[] = [
  { n: "A1", title: "Lights Out", about: "Ferrari, F1, every race weekend", color: "#e8222a" },
  { n: "A2", title: "Respawn", about: "PS5, one more match", color: "#4aa8ff" },
  { n: "A3", title: "Mise en Place", about: "Cooking, mostly for friends", color: "#ffad42" },
  { n: "B1", title: "Roll for It", about: "Board games, the longer the better", color: "#8be07a" },
  { n: "B2", title: "Build, Ship, Repeat", about: "Making games, and the code under them", color: "#c8ff3d" },
  { n: "B3", title: "Back to Back", about: "DJing, my newest thing", color: "#b48cff" },
];

const RPM = 100 / 3;

export function SideAB() {
  const [cur, setCur] = useState(0);
  const disc = useRef<HTMLDivElement>(null);
  const state = useRef({ angle: 0, speed: (RPM / 60) * 360, dragging: false, lastA: 0, touched: false, lastT: 0 });

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let last = performance.now();
    const target = (RPM / 60) * 360;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const st = state.current;
      if (!st.dragging && !reduce) {
        st.speed += (target - st.speed) * Math.min(1, dt * 3); // motor brings it back up to speed
        st.angle += st.speed * dt;
      }
      if (disc.current) disc.current.style.transform = `rotate(${st.angle}deg)`;
    };
    raf = requestAnimationFrame(tick);
    // play through the tracklist until someone picks one
    const auto = window.setInterval(() => {
      if (!state.current.touched && !reduce) setCur((c) => (c + 1) % TRACKS.length);
    }, 6000);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(auto);
    };
  }, []);

  const pointerAngle = (e: React.PointerEvent) => {
    const r = disc.current!.getBoundingClientRect();
    return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
  };

  const t = TRACKS[cur];
  // the arm rests outside the record and moves inward track by track
  const arm = -6 + cur * 4.2;

  return (
    <div className={s.deck} style={{ ["--tc" as string]: t.color }}>
      <div className={s.platter}>
        <div
          ref={disc}
          className={s.disc}
          role="img"
          aria-label={`A record, now playing ${t.n}: ${t.title}`}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            const st = state.current;
            st.dragging = true;
            st.touched = true;
            st.lastA = pointerAngle(e);
            st.lastT = performance.now();
          }}
          onPointerMove={(e) => {
            const st = state.current;
            if (!st.dragging) return;
            const a = pointerAngle(e);
            let d = a - st.lastA;
            if (d > 180) d -= 360;
            if (d < -180) d += 360;
            const now = performance.now();
            st.angle += d;
            st.speed = (d / Math.max(1, now - st.lastT)) * 1000;
            st.lastA = a;
            st.lastT = now;
          }}
          onPointerUp={() => (state.current.dragging = false)}
          onPointerCancel={() => (state.current.dragging = false)}
        >
          <div className={s.label}>
            <span className={s.labelName}>Divyansh Agarwal</span>
            <span className={s.labelSide}>Side {t.n[0]}</span>
            <span className={s.hole} />
          </div>
        </div>
        <div className={s.arm} style={{ transform: `rotate(${arm}deg)` }} aria-hidden>
          <span className={s.armHead} />
        </div>
      </div>
      <div className={s.list}>
        <p className={s.now}>
          Now playing <strong>{t.n}</strong>
        </p>
        <ol className={s.tracks}>
          {TRACKS.map((tr, i) => (
            <li key={tr.n}>
              <button
                type="button"
                aria-current={i === cur || undefined}
                onClick={() => {
                  state.current.touched = true;
                  setCur(i);
                }}
              >
                <span className={s.tn}>{tr.n}</span>
                <span className={s.tt}>{tr.title}</span>
                <span className={s.ta}>{tr.about}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
