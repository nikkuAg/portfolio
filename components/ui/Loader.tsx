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

            {/* CENTER — brand-forward (no number counter) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: showContent ? 1 : 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
              className="absolute inset-0 grid place-items-center pointer-events-none px-6"
            >
              <div className="flex flex-col items-center gap-5 md:gap-7 text-center">
                {/* tiny eyebrow tag */}
                <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.5em] text-muted/70">
                  Now Tuning
                </span>

                {/* the brand — italic serif */}
                <BrandMark />

                {/* phosphor divider with star */}
                <div className="flex items-center gap-3 text-accent">
                  <span
                    className="h-px w-12 sm:w-16"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent, rgba(200,255,61,0.7))",
                    }}
                  />
                  <span
                    className="text-[10px] sm:text-xs"
                    style={{
                      textShadow: "0 0 10px rgba(200,255,61,0.7)",
                    }}
                  >
                    ✦
                  </span>
                  <span
                    className="h-px w-12 sm:w-16"
                    style={{
                      background:
                        "linear-gradient(270deg, transparent, rgba(200,255,61,0.7))",
                    }}
                  />
                </div>

                {/* status typewriter (cycles as % advances) */}
                <div className="h-5 flex items-center">
                  <span
                    key={STATUS_LINES[lineIdx]}
                    className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.3em] text-foreground/85 inline-flex items-center"
                  >
                    <span className="text-accent mr-2">{">"}</span>
                    <TypedLine text={STATUS_LINES[lineIdx]} />
                    {phase !== "settle" && phase !== "done" && (
                      <span className="ml-0.5 inline-block w-[0.45em] h-[1em] -mb-[0.1em] bg-accent animate-pulse" />
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

            {/* full-width thin progress bar at the very bottom (no number) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: showContent ? 1 : 0 }}
              transition={{ duration: 0.3, delay: 0.08 }}
              className="absolute bottom-0 left-0 right-0 h-[2px] bg-border/40 overflow-hidden"
            >
              <motion.div
                className="absolute left-0 top-0 h-full w-full origin-left"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(200,255,61,0.35) 0%, #c8ff3d 100%)",
                  boxShadow: "0 0 14px rgba(200,255,61,0.75)",
                }}
                animate={{ scaleX: pct / 100 }}
                transition={{ duration: 0.2, ease: "linear" }}
              />
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

function BrandMark() {
  return (
    <h1
      className="font-serif leading-[0.88] tracking-tight text-foreground"
      style={{
        fontSize: "clamp(2.5rem, 9vw, 7rem)",
        textShadow:
          "0 0 38px rgba(200,255,61,0.16), 0 0 8px rgba(200,255,61,0.16)",
      }}
    >
      <span className="block italic">Divyansh</span>
      <span className="block italic">Agarwal</span>
    </h1>
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
