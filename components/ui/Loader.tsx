"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";

const STATUS_LINES = [
  "warming the cathode",
  "tuning the carrier",
  "phasing the array",
  "binding particles",
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
  loading: { scaleX: 1, scaleY: 1, opacity: 1, transition: { duration: 0 } },
  settle: { scaleX: 1, scaleY: 1, opacity: 1, transition: { duration: 0 } },
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
  const timersRef = useRef<number[]>([]);

  function track(id: number) {
    timersRef.current.push(id);
    return id;
  }

  // ── boot in (or skip if loaded / reduced motion) ──
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

  // ── progress while loading ──
  useEffect(() => {
    if (phase !== "loading") return;
    let p = 0;
    const id = window.setInterval(() => {
      p += Math.random() * 5 + 4; // ~22 ticks * 95ms ≈ 2.1s
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

  // ── settle → power off (timers tracked on ref so phase changes can't cancel) ──
  useEffect(() => {
    if (phase !== "settle") return;
    if (closingRef.current) return;
    closingRef.current = true;
    sessionStorage.setItem("loader-done", "1");
    track(window.setTimeout(() => setPhase("vanishLine"), 520));
    track(window.setTimeout(() => setPhase("vanishDot"), 520 + 220));
    track(window.setTimeout(() => setPhase("done"), 520 + 220 + 180));
    track(window.setTimeout(() => setHidden(true), 520 + 220 + 180 + 150));
  }, [phase]);

  // ── unmount: clean any pending timers ──
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

  const showContent =
    phase === "open" || phase === "loading" || phase === "settle";
  const collapsing = phase === "settle";

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
          {/* CRT screen — opens / closes via variants */}
          <motion.div
            className="absolute inset-0 origin-center bg-background overflow-hidden"
            variants={screenVariants}
            initial="boot"
            animate={phase}
          >
            {/* phosphor radial — intensifies as pct → 100 */}
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(60% 50% at 50% 50%, rgba(200,255,61,${(0.04 + pct * 0.0014).toFixed(3)}), transparent 70%)`,
              }}
            />
            {/* static scanlines */}
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none opacity-25"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 3px)",
              }}
            />

            {/* THE SWARM — lives behind everything else */}
            {showContent && (
              <ParticleSwarm pct={pct} collapsing={collapsing} />
            )}

            {/* moving bright scanline — sits over the swarm */}
            {showContent && (
              <motion.div
                aria-hidden
                className="absolute left-0 right-0 h-[2px] pointer-events-none z-10"
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

            {/* corner brackets — viewfinder feel around the whole screen */}
            {showContent && <CornerBrackets />}

            {/* left + right HUD columns — telemetry around the swarm so
                the screen reads as instrumented, not empty. Hidden on
                small mobile where they would crowd the centerpiece. */}
            {showContent && (
              <>
                <LeftHud pct={pct} />
                <RightHud pct={pct} />
              </>
            )}

            {/* corner brand */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: showContent ? 1 : 0 }}
              transition={{ duration: 0.3 }}
              className="absolute top-4 md:top-10 left-4 md:left-10 right-4 md:right-10 flex items-baseline justify-between gap-3 font-mono text-[10px] md:text-[11px] uppercase tracking-widest text-muted z-30"
            >
              <span className="flex items-center gap-2 truncate">
                <span className="size-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(200,255,61,0.8)] animate-pulse shrink-0" />
                <span className="truncate">
                  <span className="hidden sm:inline">portfolio.sys · </span>
                  acquiring signal
                </span>
              </span>
              <span className="opacity-70 shrink-0">tap to skip ↗</span>
            </motion.div>

            {/* status line — bottom centered */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: showContent ? 1 : 0 }}
              transition={{ duration: 0.3, delay: 0.08 }}
              className="absolute bottom-7 md:bottom-12 left-0 right-0 flex justify-center px-4 z-30"
            >
              <div className="flex items-center gap-3 font-mono text-[10px] sm:text-xs uppercase tracking-[0.3em] text-muted">
                <span className="text-accent">▸</span>
                <span key={STATUS_LINES[lineIdx]}>
                  <TypedLine text={STATUS_LINES[lineIdx]} />
                  {phase !== "settle" && phase !== "done" && (
                    <span className="ml-1 inline-block w-[0.4em] h-[0.85em] bg-accent animate-pulse align-middle" />
                  )}
                </span>
              </div>
            </motion.div>

            {/* thin accent hairline at the very bottom */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: showContent ? 1 : 0 }}
              transition={{ duration: 0.3 }}
              className="absolute bottom-0 left-0 right-0 h-px bg-foreground/10 overflow-hidden z-30"
            >
              <motion.div
                className="h-full origin-left bg-accent"
                style={{ boxShadow: "0 0 8px rgba(200,255,61,0.7)" }}
                animate={{ scaleX: pct / 100 }}
                transition={{ duration: 0.18, ease: "linear" }}
              />
            </motion.div>
          </motion.div>

          {/* lingering phosphor dot during the contract (continues from the swarm collapse point) */}
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

// ────────────────────────────────────────────────────────────────────────
// Particle swarm — canvas-rendered phosphor dots driven by pct
// ────────────────────────────────────────────────────────────────────────

// halved on coarse-pointer / compact devices — 320 dots @ 60fps stutters on
// iPhone SE-class hardware (A13, 2GB RAM). Resolved at module-eval time so
// every code path uses the same count.
const PARTICLE_COUNT =
  typeof window !== "undefined" &&
  window.matchMedia("(max-width: 768px), (pointer: coarse)").matches
    ? 180
    : 320;

function ParticleSwarm({
  pct,
  collapsing,
}: {
  pct: number;
  collapsing: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  // rAF reads from refs so we don't tear down/spin up the loop on prop change
  const pctRef = useRef(pct);
  const collapsingRef = useRef(collapsing);
  pctRef.current = pct;
  collapsingRef.current = collapsing;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);

    function size() {
      const rect = canvas!.getBoundingClientRect();
      canvas!.width = Math.floor(rect.width * dpr);
      canvas!.height = Math.floor(rect.height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size();
    const ro = new ResizeObserver(size);
    ro.observe(canvas);

    type Particle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      hue: number; // 0 = accent, 1 = white sparkle
      seed: number;
    };
    const particles: Particle[] = [];

    function init() {
      const rect = canvas!.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const spread = Math.max(rect.width, rect.height) * 0.55;
      particles.length = 0;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = Math.random() * spread;
        particles.push({
          x: cx + Math.cos(a) * d,
          y: cy + Math.sin(a) * d,
          vx: (Math.random() - 0.5) * 1.8,
          vy: (Math.random() - 0.5) * 1.8,
          r: 0.5 + Math.random() * Math.random() * 2.4,
          hue: Math.random() < 0.06 ? 1 : 0, // ~6% white sparkles
          seed: Math.random() * 1000,
        });
      }
    }
    init();

    let raf = 0;
    function loop(now: number) {
      const rect = canvas!.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const cx = w / 2;
      const cy = h / 2;

      const t = now / 1000;
      const p = pctRef.current / 100;
      const isCollapsing = collapsingRef.current;

      // pull is gentle early, strong late, max during settle/collapse
      const pull = isCollapsing
        ? 0.085
        : 0.001 + Math.pow(p, 1.5) * 0.012;
      const damping = isCollapsing ? 0.78 : 0.972 - p * 0.04;
      const noise = isCollapsing ? 0 : (1 - p) * 0.7;

      // paint a translucent veil so old particle positions linger as a brief
      // motion trail — softer than a hard clear, more "phosphor"
      ctx!.fillStyle = "rgba(7,7,7,0.22)";
      ctx!.fillRect(0, 0, w, h);

      for (const part of particles) {
        // attraction toward center
        const dx = cx - part.x;
        const dy = cy - part.y;
        part.vx += dx * pull;
        part.vy += dy * pull;

        // perlin-ish wandering — sin field on x and y, scrolls with time
        if (noise > 0) {
          part.vx +=
            Math.sin(part.y * 0.012 + t * 0.6 + part.seed) * noise * 0.06;
          part.vy +=
            Math.cos(part.x * 0.012 + t * 0.6 + part.seed * 1.3) *
            noise *
            0.06;
        }

        part.vx *= damping;
        part.vy *= damping;
        part.x += part.vx;
        part.y += part.vy;

        // draw — a small core dot + a soft halo (additive feel via opacity layering)
        const twinkle = 0.7 + Math.sin(t * 2.8 + part.seed) * 0.3;
        const baseAlpha = (0.55 + 0.45 * p) * twinkle;
        if (part.hue === 1) {
          ctx!.fillStyle = `rgba(255,255,255,${baseAlpha.toFixed(2)})`;
        } else {
          ctx!.fillStyle = `rgba(200,255,61,${baseAlpha.toFixed(2)})`;
        }
        ctx!.beginPath();
        ctx!.arc(part.x, part.y, part.r, 0, Math.PI * 2);
        ctx!.fill();

        // soft outer halo (cheap "glow" without filter)
        ctx!.fillStyle =
          part.hue === 1
            ? `rgba(255,255,255,${(baseAlpha * 0.18).toFixed(2)})`
            : `rgba(200,255,61,${(baseAlpha * 0.22).toFixed(2)})`;
        ctx!.beginPath();
        ctx!.arc(part.x, part.y, part.r * 2.6, 0, Math.PI * 2);
        ctx!.fill();
      }

      // central singularity — grows in brightness as particles converge
      // at full pct it's a bright phosphor dot that hands off to the CRT
      // power-off dot
      const coreAlpha = Math.min(1, Math.pow(p, 2.5) * 1.3);
      if (coreAlpha > 0.01) {
        const grad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, 60);
        grad.addColorStop(0, `rgba(200,255,61,${coreAlpha.toFixed(2)})`);
        grad.addColorStop(0.4, `rgba(200,255,61,${(coreAlpha * 0.4).toFixed(2)})`);
        grad.addColorStop(1, "rgba(200,255,61,0)");
        ctx!.fillStyle = grad;
        ctx!.beginPath();
        ctx!.arc(cx, cy, 60, 0, Math.PI * 2);
        ctx!.fill();
      }

      raf = requestAnimationFrame(loop);
    }

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}

// ────────────────────────────────────────────────────────────────────────
// HUD frame — corner brackets + side telemetry
// ────────────────────────────────────────────────────────────────────────

function CornerBrackets() {
  // 4 accent L-shaped marks at the screen corners. Sized in vw so they scale.
  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none z-20">
      {(["tl", "tr", "bl", "br"] as const).map((corner) => {
        const isTop = corner[0] === "t";
        const isLeft = corner[1] === "l";
        return (
          <span
            key={corner}
            className="absolute"
            style={{
              top: isTop ? "12px" : "auto",
              bottom: !isTop ? "12px" : "auto",
              left: isLeft ? "12px" : "auto",
              right: !isLeft ? "12px" : "auto",
              width: 14,
              height: 14,
              borderColor: "rgba(200,255,61,0.55)",
              borderTopWidth: isTop ? 1 : 0,
              borderBottomWidth: !isTop ? 1 : 0,
              borderLeftWidth: isLeft ? 1 : 0,
              borderRightWidth: !isLeft ? 1 : 0,
              borderStyle: "solid",
              boxShadow: "0 0 6px rgba(200,255,61,0.35)",
            }}
          />
        );
      })}
    </div>
  );
}

function LeftHud({ pct }: { pct: number }) {
  // freq/dBm tick on a slow timer so the readouts feel "alive" without
  // distracting from the swarm
  const [freq, setFreq] = useState("108.5");
  const [dbm, setDbm] = useState("-47");
  useEffect(() => {
    const id = window.setInterval(() => {
      setFreq((108.4 + Math.random() * 0.3).toFixed(1));
      setDbm(String(-Math.floor(45 + Math.random() * 6)));
    }, 380);
    return () => window.clearInterval(id);
  }, []);

  // density readout — particles feel "active" as pct grows
  const active = Math.floor((pct / 100) * PARTICLE_COUNT);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: 0.2 }}
      className="hidden md:flex absolute left-4 md:left-10 top-1/2 -translate-y-1/2 flex-col gap-7 z-30 font-mono text-[10px] uppercase tracking-[0.25em] text-muted/80 pointer-events-none"
    >
      <HudReadout label="signal">
        <span className="text-foreground">{freq}</span>
        <span className="text-muted/50"> MHz</span>
      </HudReadout>
      <HudReadout label="carrier">
        <span className="text-foreground">{dbm}</span>
        <span className="text-muted/50"> dBm</span>
      </HudReadout>
      <HudReadout label="density">
        <span className="text-foreground">{String(active).padStart(3, "0")}</span>
        <span className="text-muted/50"> / {PARTICLE_COUNT}</span>
      </HudReadout>
      <HudReadout label="band">
        <span className="text-accent">phosphor</span>
      </HudReadout>
    </motion.div>
  );
}

function RightHud({ pct }: { pct: number }) {
  // three bars that fill at slightly different rates so they read as
  // "subsystems acquiring lock" rather than copies of the same progress
  const lock = Math.min(1, pct / 100);
  const focus = Math.min(1, Math.max(0, (pct - 10) / 80));
  const conv = Math.min(1, Math.max(0, (pct - 30) / 65));

  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: 0.2 }}
      className="hidden md:flex absolute right-4 md:right-10 top-1/2 -translate-y-1/2 flex-col gap-6 z-30 font-mono text-[10px] uppercase tracking-[0.25em] text-muted/80 pointer-events-none w-[120px] md:w-[140px]"
    >
      <HudBar label="lock" value={lock} />
      <HudBar label="focus" value={focus} />
      <HudBar label="conv" value={conv} />
      <div className="flex items-baseline justify-between pt-3 border-t border-border/60">
        <span>ch·01</span>
        <span className="text-accent flex items-center gap-1">
          <span className="size-1 rounded-full bg-accent animate-pulse" />
          live
        </span>
      </div>
    </motion.div>
  );
}

function HudReadout({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 min-w-[100px]">
      <span className="text-[9px] tracking-[0.3em] text-muted/50">{label}</span>
      <span className="text-[12px] tracking-[0.15em]">{children}</span>
    </div>
  );
}

function HudBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-[9px] tracking-[0.3em] text-muted/60">
        <span>{label}</span>
        <span className="text-foreground/80">
          {String(pct).padStart(3, "0")}
        </span>
      </div>
      <div className="relative h-px bg-foreground/10 overflow-hidden">
        <motion.div
          className="absolute left-0 top-0 h-full w-full origin-left bg-accent"
          style={{ boxShadow: "0 0 6px rgba(200,255,61,0.6)" }}
          animate={{ scaleX: value }}
          transition={{ duration: 0.2, ease: "linear" }}
        />
      </div>
    </div>
  );
}

// Typewriter for status line — re-mounted via key when text changes
function TypedLine({ text }: { text: string }) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    setShown("");
    let i = 0;
    const id = window.setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, 28);
    return () => window.clearInterval(id);
  }, [text]);
  return <span>{shown}</span>;
}
