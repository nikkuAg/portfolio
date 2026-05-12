"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";

const STATUS_LINES = [
  "warming the cathode",
  "tuning the wires",
  "spinning the deck",
  "cueing the snake",
  "ready",
];

const BOOT_LINES = [
  "init -- portfolio.sys v1.0",
  "load fonts/geist · instrument-serif",
  "wire skill graph forces",
  "tune chalkboard timeline",
  "ready",
];

type Phase =
  | "boot"
  | "line"
  | "open"
  | "loading"
  | "settle"
  | "vanishLine"
  | "vanishDot"
  | "done";

const screenVariants: Variants = {
  boot: {
    scaleX: 0.005,
    scaleY: 0.005,
    opacity: 1,
    transition: { duration: 0 },
  },
  line: {
    scaleX: 1,
    scaleY: 0.005,
    opacity: 1,
    transition: { duration: 0.18, ease: [0.6, 0, 0.4, 1] },
  },
  open: {
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    transition: { duration: 0.32, ease: [0.5, 0, 0.3, 1] },
  },
  loading: {
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    transition: { duration: 0 },
  },
  settle: {
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    transition: { duration: 0 },
  },
  vanishLine: {
    scaleX: 1,
    scaleY: 0.005,
    opacity: 1,
    transition: { duration: 0.22, ease: [0.6, 0, 0.4, 1] },
  },
  vanishDot: {
    scaleX: 0.005,
    scaleY: 0.005,
    opacity: 1,
    transition: { duration: 0.18, ease: [0.6, 0, 0.4, 1] },
  },
  done: {
    scaleX: 0.005,
    scaleY: 0.005,
    opacity: 0,
    transition: { duration: 0.15 },
  },
};

export function Loader() {
  const [hidden, setHidden] = useState(false);
  const [pct, setPct] = useState(0);
  const [phase, setPhase] = useState<Phase>("boot");
  const startedRef = useRef(false);
  const closingRef = useRef(false);
  // ALL pending timers — owned at component scope so they survive effect
  // re-runs caused by phase changes (the previous version put close timers
  // inside a phase-keyed effect, which meant scheduling vanishLine fired its
  // re-run cleanup and cancelled vanishDot/done/setHidden — that's the
  // "stall on a thin black line forever" first-load bug)
  const timersRef = useRef<number[]>([]);

  function track(id: number) {
    timersRef.current.push(id);
    return id;
  }

  // ── mount: skip if already loaded / reduced motion; otherwise boot in ──
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("loader-done") === "1") {
      setHidden(true);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      sessionStorage.setItem("loader-done", "1");
      setHidden(true);
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;

    track(window.setTimeout(() => setPhase("line"), 90));
    track(window.setTimeout(() => setPhase("open"), 320));
    track(window.setTimeout(() => setPhase("loading"), 680));
  }, []);

  // ── count progress while loading ──
  useEffect(() => {
    if (phase !== "loading") return;
    let p = 0;
    const id = window.setInterval(() => {
      p += Math.random() * 7 + 4;
      if (p >= 100) {
        p = 100;
        window.clearInterval(id);
        setPct(100);
        setPhase("settle");
      } else {
        setPct(Math.floor(p));
      }
    }, 95);
    return () => window.clearInterval(id);
  }, [phase]);

  // ── once we reach settle, schedule the entire close chain ONCE ──
  // The chain lives on timersRef, so re-renders triggered by setPhase
  // calls inside the chain don't cancel pending steps.
  useEffect(() => {
    if (phase !== "settle") return;
    if (closingRef.current) return;
    closingRef.current = true;
    sessionStorage.setItem("loader-done", "1");
    track(window.setTimeout(() => setPhase("vanishLine"), 420));
    track(window.setTimeout(() => setPhase("vanishDot"), 420 + 220));
    track(window.setTimeout(() => setPhase("done"), 420 + 220 + 180));
    track(window.setTimeout(() => setHidden(true), 420 + 220 + 180 + 150));
  }, [phase]);

  // ── unmount: cancel any in-flight timers ──
  useEffect(() => {
    return () => {
      for (const id of timersRef.current) window.clearTimeout(id);
      timersRef.current = [];
    };
  }, []);

  function skip() {
    if (closingRef.current) return;
    setPct(100);
    setPhase("settle");
  }

  const lineIdx = Math.min(
    STATUS_LINES.length - 1,
    Math.floor((pct / 100) * STATUS_LINES.length),
  );
  const bootIdx = Math.min(
    BOOT_LINES.length - 1,
    Math.floor((pct / 100) * BOOT_LINES.length),
  );

  const showContent =
    phase === "open" || phase === "loading" || phase === "settle";

  return (
    <AnimatePresence>
      {!hidden && (
        <motion.div
          key="loader-root"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[100] bg-black"
          onClick={skip}
          aria-hidden
        >
          {/* the CRT screen — scales open on boot, contracts on close */}
          <motion.div
            className="absolute inset-0 origin-center bg-background overflow-hidden"
            variants={screenVariants}
            initial="boot"
            animate={phase}
          >
            {/* phosphor center glow */}
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(60% 50% at 50% 50%, rgba(200,255,61,0.07), transparent 70%)",
              }}
            />
            {/* static scanlines */}
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none opacity-30"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 3px)",
              }}
            />
            {/* moving bright scanline (CRT crawl) */}
            {showContent && (
              <motion.div
                aria-hidden
                className="absolute left-0 right-0 h-[2px] pointer-events-none"
                style={{
                  background:
                    "linear-gradient(180deg, transparent, rgba(200,255,61,0.35), transparent)",
                  filter: "blur(0.5px)",
                }}
                initial={{ y: "-2vh" }}
                animate={{ y: ["-2vh", "102vh"] }}
                transition={{
                  duration: 2.6,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            )}

            {/* corner brand */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: showContent ? 1 : 0 }}
              transition={{ duration: 0.3 }}
              className="absolute top-4 md:top-10 left-4 md:left-10 right-4 md:right-10 flex items-baseline justify-between gap-3 font-mono text-[10px] md:text-[11px] uppercase tracking-widest text-muted"
            >
              <span className="flex items-center gap-2 truncate">
                <span className="size-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(200,255,61,0.8)] animate-pulse shrink-0" />
                <span className="truncate">
                  CH·01 ·{" "}
                  <span className="hidden sm:inline">portfolio.sys</span>
                  <span className="sm:hidden">v1.0</span>
                </span>
              </span>
              <span className="opacity-70 shrink-0">tap to skip ↗</span>
            </motion.div>

            {/* CENTER — liquid-fill brand mark IS the progress indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: showContent ? 1 : 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
              className="absolute inset-0 grid place-items-center pointer-events-none px-6"
            >
              <div className="flex flex-col items-center gap-6 md:gap-8 text-center">
                {/* tiny eyebrow */}
                <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.5em] text-muted/70">
                  Now Tuning
                </span>

                {/* THE brand — fills bottom-up with lime as pct advances */}
                <LiquidBrand pct={pct} />

                {/* status line — small, just enough texture */}
                <div className="h-4 flex items-center">
                  <span
                    key={STATUS_LINES[lineIdx]}
                    className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.3em] text-muted inline-flex items-center"
                  >
                    <TypedLine text={STATUS_LINES[lineIdx]} />
                    {phase !== "settle" && phase !== "done" && (
                      <span className="ml-1 inline-block w-[0.4em] h-[0.9em] bg-accent animate-pulse" />
                    )}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* boot terminal feed (left bottom) — desktop only */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: showContent ? 1 : 0 }}
              transition={{ duration: 0.3, delay: 0.12 }}
              className="hidden sm:block absolute bottom-10 md:bottom-14 left-4 md:left-10 font-mono text-[10px] uppercase tracking-widest text-muted/70 leading-relaxed max-w-[14rem] md:max-w-xs"
            >
              {BOOT_LINES.slice(0, bootIdx + 1).map((l, i) => (
                <div key={l} className="flex items-baseline gap-2">
                  <span className="text-accent">{">"}</span>
                  <span>
                    {l}
                    {i === bootIdx && phase === "loading" && (
                      <span className="text-accent animate-pulse">_</span>
                    )}
                  </span>
                </div>
              ))}
            </motion.div>

          </motion.div>

          {/* lingering phosphor dot during the contract */}
          <motion.div
            aria-hidden
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-1 rounded-full bg-accent pointer-events-none"
            style={{ boxShadow: "0 0 16px rgba(200,255,61,0.9)" }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={
              phase === "vanishDot"
                ? { opacity: [0, 1, 0], scale: [1, 1.1, 0.2] }
                : phase === "done"
                  ? { opacity: 0, scale: 0.2 }
                  : { opacity: 0, scale: 0.8 }
            }
            transition={{ duration: 0.32, ease: [0.5, 0, 0.4, 1] }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// "Liquid" brand mark — italic-serif name rendered twice on top of each other:
// 1) bottom layer is a faint outline (always visible, gives the vessel shape)
// 2) top layer is solid lime, clipped from below via a CSS gradient mask
//    whose stop position is driven by `pct` — so the name fills bottom-up
//    with phosphor as load progresses
function LiquidBrand({ pct }: { pct: number }) {
  // small overshoot so the very last sliver fully fills (gradients with two
  // stops at the same %% can leave a 1px seam in some browsers)
  const fill = Math.min(100, pct + 0.5);
  // glow scales with completion so the brand "warms up"
  const glow = (pct / 100).toFixed(2);

  const sharedStyle: React.CSSProperties = {
    fontSize: "clamp(2.75rem, 10vw, 8rem)",
    lineHeight: 0.88,
    letterSpacing: "-0.01em",
  };

  return (
    <div className="relative" aria-label="Divyansh Agarwal">
      {/* layer 1 — outline (always visible; the "vessel") */}
      <h1
        aria-hidden
        className="font-serif text-foreground/15 select-none"
        style={sharedStyle}
      >
        <span className="block italic">Divyansh</span>
        <span className="block italic">Agarwal</span>
      </h1>

      {/* layer 2 — lime fill clipped from below by a hard-stop gradient */}
      <h1
        aria-hidden
        className="font-serif select-none absolute inset-0"
        style={{
          ...sharedStyle,
          // gradient: lime up to `fill` from bottom, transparent above
          backgroundImage: `linear-gradient(to top,
            #c8ff3d 0%,
            #c8ff3d ${fill}%,
            transparent ${fill}%,
            transparent 100%)`,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          WebkitTextFillColor: "transparent",
          // phosphor halo intensifies as fill grows
          filter: `drop-shadow(0 0 ${(pct * 0.18).toFixed(1)}px rgba(200,255,61,${glow})) drop-shadow(0 0 4px rgba(200,255,61,${(Number(glow) * 0.5).toFixed(2)}))`,
          transition: "filter 0.18s linear",
        }}
      >
        <span className="block italic">Divyansh</span>
        <span className="block italic">Agarwal</span>
      </h1>

      {/* the moving fill line — a thin lime hairline at the boundary */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 right-0 h-[1.5px]"
        style={{
          bottom: `${pct}%`,
          background:
            "linear-gradient(90deg, transparent, rgba(200,255,61,0.7), transparent)",
          boxShadow: "0 0 8px rgba(200,255,61,0.6)",
          opacity: pct > 0 && pct < 100 ? 1 : 0,
          transition: "opacity 0.2s linear",
        }}
      />
    </div>
  );
}

// Typewriter for the cycling status line — re-mounted via key when text changes
function TypedLine({ text }: { text: string }) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    setShown("");
    let i = 0;
    const id = window.setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, 30);
    return () => window.clearInterval(id);
  }, [text]);
  return <span>{shown}</span>;
}
