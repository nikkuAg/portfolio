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

  // mount: skip if already loaded or reduced motion; otherwise start boot timeline
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

    const t1 = window.setTimeout(() => setPhase("line"), 90);
    const t2 = window.setTimeout(() => setPhase("open"), 320);
    const t3 = window.setTimeout(() => setPhase("loading"), 680);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, []);

  // count up while loading
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

  // settle → power-off sequence
  useEffect(() => {
    if (phase !== "settle") return;
    sessionStorage.setItem("loader-done", "1");
    const t1 = window.setTimeout(() => setPhase("vanishLine"), 420);
    const t2 = window.setTimeout(() => setPhase("vanishDot"), 420 + 220);
    const t3 = window.setTimeout(() => setPhase("done"), 420 + 220 + 180);
    const t4 = window.setTimeout(
      () => setHidden(true),
      420 + 220 + 180 + 150,
    );
    return () => {
      [t1, t2, t3, t4].forEach(window.clearTimeout);
    };
  }, [phase]);

  function skip() {
    if (
      phase === "settle" ||
      phase === "vanishLine" ||
      phase === "vanishDot" ||
      phase === "done"
    ) {
      return;
    }
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
                  <span className="hidden sm:inline">Divyansh Agarwal · </span>
                  <span className="sm:hidden">DA · </span>
                  Portfolio
                </span>
              </span>
              <span className="opacity-70 shrink-0">tap to skip ↗</span>
            </motion.div>

            {/* center counter + status */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: showContent ? 1 : 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
              className="absolute inset-0 grid place-items-center pointer-events-none"
            >
              <div className="flex flex-col items-center gap-3 md:gap-5 -mt-2 px-4 text-center">
                <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.4em] sm:tracking-[0.5em] text-muted">
                  {STATUS_LINES[lineIdx]}
                </span>
                <span
                  className="font-serif italic leading-[0.85] tracking-tight text-foreground"
                  style={{
                    fontSize: "clamp(80px, 18vw, 240px)",
                    textShadow:
                      "0 0 36px rgba(200,255,61,0.18), 0 0 6px rgba(200,255,61,0.18)",
                  }}
                >
                  {pct.toString().padStart(3, "0")}
                </span>
                <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.4em] sm:tracking-[0.5em] text-muted/60">
                  / 100
                </span>
              </div>
            </motion.div>

            {/* boot terminal feed (left bottom) — hidden on small phones to
                avoid colliding with the progress bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: showContent ? 1 : 0 }}
              transition={{ duration: 0.3, delay: 0.12 }}
              className="hidden sm:block absolute bottom-6 md:bottom-10 left-4 md:left-10 font-mono text-[10px] uppercase tracking-widest text-muted/70 leading-relaxed max-w-[14rem] md:max-w-xs"
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

            {/* progress bar (right bottom) — full-width on mobile, fixed on desktop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: showContent ? 1 : 0 }}
              transition={{ duration: 0.3, delay: 0.08 }}
              className="absolute bottom-6 md:bottom-10 right-4 md:right-10 left-4 sm:left-auto sm:w-44 md:w-56"
            >
              <div className="flex items-baseline justify-between mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
                <span>load</span>
                <span>{pct.toString().padStart(3, "0")}%</span>
              </div>
              <div className="relative h-px w-full bg-border overflow-hidden">
                <motion.div
                  className="absolute left-0 top-0 h-full w-full origin-left"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(200,255,61,0.4) 0%, #c8ff3d 100%)",
                    boxShadow: "0 0 10px rgba(200,255,61,0.55)",
                  }}
                  animate={{ scaleX: pct / 100 }}
                  transition={{ duration: 0.18, ease: "linear" }}
                />
              </div>
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
