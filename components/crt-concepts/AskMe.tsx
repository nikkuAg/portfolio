"use client";

import { useEffect, useRef, useState } from "react";
import { RESUME_URL } from "@/lib/site";
import { smoothScrollTo } from "@/lib/scroll";
import s from "./ask.module.css";

// Concept AB: the hero talks. Instead of a picture, the right side is me
// answering questions in big type, typed out as if I'm replying. Pick a
// question or type your own; a small keyword matcher picks the answer
// (no AI, no network). It asks itself a couple on arrival.
// NOTE: the answers are draft copy for Divyansh to rewrite in his own words.

type QA = { q: string; a: string; keys: string[]; cta?: boolean };
const QAS: QA[] = [
  { q: "What do you do?", a: "I'm a full-stack engineer in Bangalore. I build interfaces, the services behind them, and the plumbing in between.", keys: ["do", "work", "job", "engineer", "build"] },
  { q: "What are you into?", a: "Ferrari and F1, my PS5, board games, cooking, and lately DJing. And making small games of my own.", keys: ["into", "hobby", "hobbies", "fun", "like", "love"] },
  { q: "Ferrari, really?", a: "Every race weekend, through the good strategy calls and the painful ones.", keys: ["ferrari", "f1", "formula", "race", "racing"] },
  { q: "What's cooking?", a: "Usually something for friends. Cooking is how I switch off after a day of code.", keys: ["cook", "food", "kitchen", "eat", "recipe"] },
  { q: "You DJ?", a: "I've just started. Right now it's mostly me at home, practising the transitions.", keys: ["dj", "music", "mix", "decks"] },
  { q: "Games?", a: "PS5 for playing. Unity and Godot for making. Board games when there are enough people.", keys: ["game", "games", "ps5", "play", "board", "unity"] },
  { q: "Can I hire you?", a: "Here's my résumé, and my inbox is open at the bottom of the page.", keys: ["hire", "hiring", "contact", "email", "resume", "cv", "available"], cta: true },
];
const FALLBACK = "I haven't written an answer for that one yet. Ask me directly; my contact details are at the bottom of the page.";

function match(text: string): QA | null {
  const t = text.toLowerCase();
  let best: QA | null = null;
  let score = 0;
  for (const qa of QAS) {
    const k = qa.keys.filter((key) => new RegExp(`\\b${key}`).test(t)).length;
    if (k > score) {
      score = k;
      best = qa;
    }
  }
  return best;
}

export function AskMe() {
  const [asked, setAsked] = useState("What do you do?");
  const [answer, setAnswer] = useState<QA | null>(QAS[0]);
  const [shown, setShown] = useState(0);
  const [draft, setDraft] = useState("");
  const typing = useRef(0);
  const touched = useRef(false);

  const ask = (q: string, qa: QA | null) => {
    setAsked(q);
    setAnswer(qa);
    setShown(0);
  };

  const full = answer ? answer.a : FALLBACK;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.clearInterval(typing.current);
    if (reduce) {
      typing.current = window.setTimeout(() => setShown(full.length), 0);
      return;
    }
    typing.current = window.setInterval(() => {
      setShown((n) => {
        if (n >= full.length) {
          window.clearInterval(typing.current);
          return n;
        }
        return n + 1;
      });
    }, 26);
    return () => window.clearInterval(typing.current);
  }, [full]);

  // on arrival it asks itself a second question, unless someone beats it to it
  useEffect(() => {
    const id = window.setTimeout(() => {
      if (!touched.current) ask(QAS[1].q, QAS[1]);
    }, 6500);
    return () => window.clearTimeout(id);
  }, []);

  const done = shown >= full.length;

  return (
    <div className={s.talk}>
      <p className={s.q}>
        <span className={s.you}>You asked</span> {asked}
      </p>
      <p className={s.a} aria-live="polite">
        {full.slice(0, shown)}
        <span className={s.caret} data-done={done || undefined} aria-hidden />
      </p>
      {answer?.cta && done && (
        <div className={s.ctaRow}>
          <a href={RESUME_URL} target="_blank" rel="noreferrer">
            Résumé (PDF)
          </a>
          <a
            href="#contact"
            onClick={(e) => {
              e.preventDefault();
              smoothScrollTo("#contact");
            }}
          >
            Contact
          </a>
        </div>
      )}
      <div className={s.chips} role="group" aria-label="Questions you can ask">
        {QAS.map((qa) => (
          <button
            key={qa.q}
            type="button"
            aria-pressed={asked === qa.q}
            onClick={() => {
              touched.current = true;
              ask(qa.q, qa);
            }}
          >
            {qa.q}
          </button>
        ))}
      </div>
      <form
        className={s.form}
        onSubmit={(e) => {
          e.preventDefault();
          const q = draft.trim();
          if (!q) return;
          touched.current = true;
          ask(q, match(q));
          setDraft("");
        }}
      >
        <label className="sr-only" htmlFor="ask-input">
          Ask your own question
        </label>
        <input id="ask-input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Or ask your own…" autoComplete="off" maxLength={120} />
        <button type="submit">Ask</button>
      </form>
    </div>
  );
}
