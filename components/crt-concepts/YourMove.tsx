"use client";

import { useEffect, useRef, useState } from "react";
import s from "./more.module.css";

// Concept AF: your move. A board game whose spaces are the things I love.
// Roll the two dice, the meeple hops round the board space by space, and
// the card in the middle flips to tell you something about that space.
// Doubles roll again. While nobody plays, a ghost player takes turns.
// NOTE: the card texts are draft copy for Divyansh to rewrite.

type Cat = "start" | "f1" | "games" | "cook" | "board" | "dj" | "code" | "chance";
const META: Record<Cat, { label: string; color: string }> = {
  start: { label: "Start", color: "#f3efe6" },
  f1: { label: "F1", color: "#e8222a" },
  games: { label: "Games", color: "#4aa8ff" },
  cook: { label: "Cook", color: "#ffad42" },
  board: { label: "Board", color: "#8be07a" },
  dj: { label: "DJ", color: "#b48cff" },
  code: { label: "Code", color: "#c8ff3d" },
  chance: { label: "Chance", color: "#ff7ab6" },
};
const SPACES: Cat[] = ["start", "f1", "code", "games", "cook", "chance", "board", "dj", "f1", "code", "cook", "chance", "games", "board", "dj", "code"];
const CARDS: Record<Cat, string[]> = {
  start: ["Back at the start. The résumé button is right by my name."],
  f1: ["Ferrari, through every strategy call, the good ones and the painful ones.", "Five red lights and I still hold my breath."],
  games: ["PS5 for playing. Unity and Godot for making my own.", "One more match is never one more match."],
  cook: ["Cooking is how I switch off after a day of code.", "I cook for friends. I taste everything twice."],
  board: ["The longer and more scheming the board game, the better.", "Yes, I read the whole rulebook."],
  dj: ["Newest hobby: DJing. Still learning to beatmatch.", "Two decks, one crossfader, a lot of practice."],
  code: ["Full-stack: the interface, the services behind it, and the plumbing in between.", "TypeScript, Python and Go, most days."],
  chance: ["Chance: say hi through the contact form at the bottom.", "Chance: scroll down, there's a whole site under this."],
};

// ring of 16 cells round a 5×5 grid, clockwise from the bottom-left corner
const RING: [number, number][] = [
  [5, 1], [5, 2], [5, 3], [5, 4], [5, 5], [4, 5], [3, 5], [2, 5], [1, 5], [1, 4], [1, 3], [1, 2], [1, 1], [2, 1], [3, 1], [4, 1],
];
const FACE: Record<number, [number, number]> = { 1: [0, 0], 6: [0, 180], 3: [0, -90], 4: [0, 90], 5: [-90, 0], 2: [90, 0] };
const PIPS: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

function Die({ value, spin }: { value: number; spin: number }) {
  const [rx, ry] = FACE[value];
  return (
    <div className={s.die3d}>
      <div className={s.cube} style={{ transform: `rotateX(${rx + spin * 720}deg) rotateY(${ry + spin * 720}deg)` }}>
        {[1, 6, 3, 4, 5, 2].map((f) => (
          <div key={f} className={s.face} data-f={f}>
            {Array.from({ length: 9 }, (_, i) => (
              <i key={i} data-on={PIPS[f].includes(i) || undefined} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function YourMove() {
  const [pos, setPos] = useState(0);
  const [dice, setDice] = useState<[number, number]>([3, 4]);
  const [spin, setSpin] = useState(0);
  const [card, setCard] = useState<{ cat: Cat; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("Roll the dice to take a turn.");
  const touched = useRef(false);
  const posRef = useRef(0);
  const busyRef = useRef(false);
  const timers = useRef<number[]>([]);

  const roll = (byYou: boolean) => {
    if (busyRef.current) return;
    if (byYou) touched.current = true;
    busyRef.current = true;
    setBusy(true);
    setCard(null);
    const a = 1 + Math.floor(Math.random() * 6);
    const b = 1 + Math.floor(Math.random() * 6);
    setDice([a, b]);
    setSpin((x) => x + 1);
    setNote(byYou ? "Rolling…" : "The ghost player rolls…");
    const steps = a + b;
    const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
    for (let i = 1; i <= steps; i++) {
      later(() => {
        posRef.current = (posRef.current + 1) % SPACES.length;
        setPos(posRef.current);
      }, 900 + i * 230);
    }
    later(() => {
      const cat = SPACES[posRef.current];
      const deck = CARDS[cat];
      setCard({ cat, text: deck[Math.floor(Math.random() * deck.length)] });
      setNote(a === b ? `Doubles! ${a} and ${b}, roll again.` : `${a} + ${b} = ${steps}. Landed on ${META[cat].label}.`);
      busyRef.current = false;
      setBusy(false);
    }, 900 + steps * 230 + 250);
  };

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const auto = window.setInterval(() => {
      if (!touched.current && !reduce) roll(false);
    }, 6500);
    const first = window.setTimeout(() => !reduce && !touched.current && roll(false), 1200);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== " " && e.key !== "Enter") return;
      if ((e.target as HTMLElement).closest("a,button,input,textarea,select")) return;
      if (window.scrollY > window.innerHeight * 0.5) return;
      e.preventDefault();
      roll(true);
    };
    window.addEventListener("keydown", onKey);
    const ts = timers.current;
    return () => {
      window.clearInterval(auto);
      window.clearTimeout(first);
      ts.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const [mr, mc] = RING[pos];

  return (
    <div className={s.boardWrap}>
      <div className={s.board}>
        {SPACES.map((cat, i) => {
          const [r, c] = RING[i];
          return (
            <div key={i} className={s.space} data-here={i === pos || undefined} style={{ gridRow: r, gridColumn: c, ["--sc" as string]: META[cat].color }}>
              <span>{META[cat].label}</span>
            </div>
          );
        })}
        <svg className={s.meeple} style={{ left: `${(mc - 0.5) * 20}%`, top: `${(mr - 0.5) * 20}%` }} viewBox="0 0 64 64" aria-hidden>
          <path d="M32 6c6 0 9 4 9 9 0 3-2 6-4 7l15 7c3 2 3 7-1 7H40l7 18H17l7-18H13c-4 0-4-5-1-7l15-7c-2-1-4-4-4-7 0-5 3-9 9-9Z" fill="#f3efe6" stroke="#111" strokeWidth="2" />
        </svg>
        <div className={s.middle}>
          <button type="button" className={s.diceBtn} onClick={() => roll(true)} disabled={busy} aria-label={`Roll the dice. Last roll ${dice[0]} and ${dice[1]}`}>
            <Die value={dice[0]} spin={spin} />
            <Die value={dice[1]} spin={spin} />
          </button>
          <div className={s.card} data-flip={card ? true : undefined} style={{ ["--sc" as string]: card ? META[card.cat].color : "#555" }}>
            <div className={s.cardBack}>Your move</div>
            <div className={s.cardFront}>
              <b>{card ? META[card.cat].label : ""}</b>
              <p>{card?.text}</p>
            </div>
          </div>
          <p className={s.note} aria-live="polite">
            {note}
          </p>
        </div>
      </div>
    </div>
  );
}
