"use client";

import { useEffect, useRef, useState } from "react";
import { smoothScrollTo } from "@/lib/scroll";
import s from "./select.module.css";

// Concept Z: player select. A console-style character select where every
// character is a different version of me: the engineer, the DJ, the cook,
// the armchair race engineer, the gamer, the board-game strategist. Move
// along the row (arrow keys, click, swipe), and the backdrop takes on that
// character's colour. "Start" goes into the site.

type P = { id: string; name: string; line: string; color: string; stats: [string, number][]; icon: React.ReactNode };

const I = (d: React.ReactNode) => (
  <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {d}
  </svg>
);

const PLAYERS: P[] = [
  {
    id: "eng",
    name: "The Engineer",
    line: "Builds the interface and the services behind it.",
    color: "#c8ff3d",
    stats: [["TypeScript", 9], ["Debugging", 8], ["Coffee", 7]],
    icon: I(<path d="M22 20 10 32l12 12M42 20l12 12-12 12M36 14 28 50" />),
  },
  {
    id: "dj",
    name: "The DJ",
    line: "Newest skill unlocked. Still learning the transitions.",
    color: "#b48cff",
    stats: [["Beatmatching", 5], ["Crate digging", 7], ["Volume", 9]],
    icon: I(
      <>
        <circle cx="21" cy="34" r="12" />
        <circle cx="21" cy="34" r="2" />
        <circle cx="45" cy="34" r="12" />
        <circle cx="45" cy="34" r="2" />
        <path d="M8 18h48" />
      </>,
    ),
  },
  {
    id: "chef",
    name: "The Cook",
    line: "Cooks for friends. Tastes everything twice.",
    color: "#ffad42",
    stats: [["Spice", 8], ["Plating", 6], ["Clean-up", 4]],
    icon: I(
      <>
        <ellipse cx="28" cy="38" rx="18" ry="8" />
        <path d="M46 38h12M18 22c0-4 4-4 4-8M28 22c0-4 4-4 4-8M38 22c0-4 4-4 4-8" />
      </>,
    ),
  },
  {
    id: "f1",
    name: "The Tifoso",
    line: "Ferrari, every race weekend, every strategy call.",
    color: "#e8222a",
    stats: [["Loyalty", 10], ["Hope", 9], ["Strategy takes", 8]],
    icon: I(
      <>
        <circle cx="32" cy="32" r="20" />
        <circle cx="32" cy="32" r="5" />
        <path d="M12 32h15M37 32h15M32 37v15" />
      </>,
    ),
  },
  {
    id: "gamer",
    name: "The Gamer",
    line: "PS5, and making small games of my own.",
    color: "#4aa8ff",
    stats: [["Reflexes", 7], ["Completionism", 8], ["Rage quits", 3]],
    icon: I(
      <>
        <path d="M20 22h24c8 0 12 8 13 18s-6 12-10 6l-4-6H21l-4 6c-4 6-11 4-10-6s5-18 13-18Z" />
        <path d="M21 30v8M17 34h8" />
        <circle cx="42" cy="31" r="1.5" />
        <circle cx="47" cy="36" r="1.5" />
      </>,
    ),
  },
  {
    id: "board",
    name: "The Strategist",
    line: "Board games, the longer and the more scheming the better.",
    color: "#8be07a",
    stats: [["Planning", 9], ["Bluffing", 6], ["Sore loser", 2]],
    icon: I(<path d="M32 10c5 0 8 3 8 8 0 3-2 5-3 6l13 6c3 1 3 6-1 6H40l6 16H18l6-16h-9c-4 0-4-5-1-6l13-6c-1-1-3-3-3-6 0-5 3-8 8-8Z" />),
  },
];

export function PlayerSelect() {
  const [cur, setCur] = useState(0);
  const row = useRef<HTMLDivElement>(null);
  const p = PLAYERS[cur];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (window.scrollY > window.innerHeight * 0.5) return;
      if ((e.target as HTMLElement).closest("input,textarea,select")) return;
      if (e.key === "ArrowRight") setCur((c) => (c + 1) % PLAYERS.length);
      else if (e.key === "ArrowLeft") setCur((c) => (c - 1 + PLAYERS.length) % PLAYERS.length);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // keep the chosen card in view by scrolling the row only, never the page
  useEffect(() => {
    const r = row.current;
    const card = r?.querySelector<HTMLElement>(`[data-i="${cur}"]`);
    if (r && card) r.scrollTo({ left: card.offsetLeft - r.clientWidth / 2 + card.clientWidth / 2, behavior: "smooth" });
  }, [cur]);

  return (
    <div className={s.screen} style={{ ["--pc" as string]: p.color }}>
      <div className={s.glow} aria-hidden />
      <p className={s.kicker}>Choose your Divyansh</p>
      <div ref={row} className={s.row} role="radiogroup" aria-label="Choose a version of me">
        {PLAYERS.map((pl, i) => (
          <button
            key={pl.id}
            type="button"
            role="radio"
            aria-checked={i === cur}
            data-i={i}
            className={s.card}
            style={{ ["--c" as string]: pl.color }}
            onClick={() => setCur(i)}
          >
            <span className={s.icon}>{pl.icon}</span>
            <span className={s.cardName}>{pl.name}</span>
          </button>
        ))}
      </div>
      <div className={s.detail} aria-live="polite">
        <h2 className={s.pname}>{p.name}</h2>
        <p className={s.pline}>{p.line}</p>
        <dl className={s.stats}>
          {p.stats.map(([k, v]) => (
            <div key={k} className={s.stat}>
              <dt>{k}</dt>
              <dd>
                <span className={s.bar} style={{ width: `${v * 10}%` }} />
                <span className="sr-only">{v} out of 10</span>
              </dd>
            </div>
          ))}
        </dl>
        <button type="button" className={s.start} onClick={() => smoothScrollTo("#about")}>
          Start
        </button>
      </div>
    </div>
  );
}
