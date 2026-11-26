"use client";

import { useEffect, useRef, useState } from "react";
import s from "./lights.module.css";

// Concept X: lights out. The F1 start gantry: five red lights come on one
// by one, hold for a random moment, and go out together, and that's when
// the race starts. The page plays one start on arrival, then it's the
// visitor's turn: press when the lights go out and see your reaction time
// against a driver's (about 0.2 s, per formula1.com). Go early and it's a
// jump start.

type Phase = "intro" | "ready" | "lighting" | "hold" | "go" | "result" | "jump";

export function LightsOut() {
  const [lit, setLit] = useState(0);
  const [phase, setPhase] = useState<Phase>("intro");
  const [time, setTime] = useState<number | null>(null);
  const [best, setBest] = useState<number | null>(null);
  const timers = useRef<number[]>([]);
  const outAt = useRef(0);
  const phaseRef = useRef<Phase>("intro");

  const set = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };
  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  function sequence(measure: boolean) {
    clear();
    setLit(0);
    setTime(null);
    set(measure ? "lighting" : "intro");
    for (let i = 1; i <= 5; i++) later(() => setLit(i), i * 1000);
    // the real procedure: a random hold of 0.2 to 3 s after the fifth light
    const hold = 200 + Math.random() * 2800;
    later(() => {
      if (measure) set("hold");
    }, 5000);
    later(() => {
      setLit(0);
      outAt.current = performance.now();
      set(measure ? "go" : "ready");
    }, 5000 + hold);
  }

  function press() {
    const p = phaseRef.current;
    if (p === "lighting" || p === "hold") {
      clear();
      setLit(0);
      set("jump");
      return;
    }
    if (p === "go") {
      const ms = Math.round(performance.now() - outAt.current);
      setTime(ms);
      set("result");
      setBest((b) => {
        const nb = b == null ? ms : Math.min(b, ms);
        try {
          localStorage.setItem("lights-out-best", String(nb));
        } catch {}
        return nb;
      });
      return;
    }
    if (p === "intro") return;
    sequence(true);
  }

  useEffect(() => {
    try {
      const b = Number(localStorage.getItem("lights-out-best"));
      if (b > 0) timers.current.push(window.setTimeout(() => setBest(b), 0));
    } catch {}
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // one start plays by itself so the page arrives with a moment
    if (reduce) timers.current.push(window.setTimeout(() => set("ready"), 0));
    else timers.current.push(window.setTimeout(() => sequence(false), 700));
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== " " && e.key !== "Enter") return;
      const t = e.target as HTMLElement;
      if (t.closest("a,button,input,textarea,select")) return;
      if (window.scrollY > window.innerHeight * 0.5) return;
      e.preventDefault();
      press();
    };
    window.addEventListener("keydown", onKey);
    const ts = timers.current;
    return () => {
      ts.forEach((x) => window.clearTimeout(x));
      window.removeEventListener("keydown", onKey);
    };
    // the handlers read refs; run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verdict =
    time == null
      ? null
      : time < 150
        ? "Suspiciously quick. Were you guessing?"
        : time <= 220
          ? "That's an F1 driver's launch."
          : time <= 300
            ? "Quicker than most people. Not quite pole."
            : "Still in the garage. Go again.";

  const prompt: Record<Phase, string> = {
    intro: "Lights out and away we go.",
    ready: "Your turn. Press when the lights go out.",
    lighting: "Wait for it…",
    hold: "Wait for it…",
    go: "Go!",
    result: `${time} ms`,
    jump: "Jump start. That's a penalty.",
  };

  return (
    <div className={s.wrap}>
      <button
        type="button"
        className={s.gantry}
        data-phase={phase}
        onClick={press}
        aria-label={phase === "go" ? "Go! Press now" : "Start lights. Press to start, then press again when the lights go out"}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className={s.pod}>
            <span className={s.lamp} />
            <span className={s.lamp} data-on={i < lit || undefined} />
            <span className={s.lamp} data-on={i < lit || undefined} />
          </span>
        ))}
      </button>
      <p className={s.readout} aria-live="polite" data-phase={phase}>
        {prompt[phase]}
      </p>
      <p className={s.sub}>
        {phase === "result" && verdict}
        {phase === "result" && " "}
        {(phase === "result" || phase === "jump" || phase === "ready") && "F1 drivers launch in about 0.2 s. Press space or tap the lights to go again."}
        {best != null && (phase === "result" || phase === "ready") && <span className={s.best}> Your best: {best} ms</span>}
      </p>
    </div>
  );
}
