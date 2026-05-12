"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import {
  autoPilotDir,
  createSnake,
  inputSnake,
  tickSnake,
  type SnakeState,
} from "@/components/hero/snake";

// 5 channels, each takes 20% of the load — index = floor(pct/20), capped at 4
const CHANNELS = [
  { id: "snake", label: "Snake", line: "warming the cathode" },
  { id: "chalk", label: "Chalk", line: "tuning the wires" },
  { id: "graph", label: "Graph", line: "spinning the deck" },
  { id: "deck", label: "Deck", line: "cueing the snake" },
  { id: "brand", label: "Signal", line: "ready" },
] as const;

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
      p += Math.random() * 5 + 4; // ~4.5/tick → ~22 ticks * 95ms = ~2.1s
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

  // ── settle → power off (timers tracked on ref so phase changes don't cancel them) ──
  useEffect(() => {
    if (phase !== "settle") return;
    if (closingRef.current) return;
    closingRef.current = true;
    sessionStorage.setItem("loader-done", "1");
    track(window.setTimeout(() => setPhase("vanishLine"), 480));
    track(window.setTimeout(() => setPhase("vanishDot"), 480 + 220));
    track(window.setTimeout(() => setPhase("done"), 480 + 220 + 180));
    track(window.setTimeout(() => setHidden(true), 480 + 220 + 180 + 150));
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

  // channel index — 0..4 based on pct
  const chIdx = Math.min(CHANNELS.length - 1, Math.floor(pct / (100 / CHANNELS.length)));

  // brief static overlay every time chIdx changes — drives a re-render via
  // a state flag that auto-clears
  const [staticBurst, setStaticBurst] = useState(false);
  const lastChRef = useRef(chIdx);
  useEffect(() => {
    if (chIdx === lastChRef.current) return;
    lastChRef.current = chIdx;
    setStaticBurst(true);
    const t = window.setTimeout(() => setStaticBurst(false), 130);
    return () => window.clearTimeout(t);
  }, [chIdx]);

  const showContent =
    phase === "open" || phase === "loading" || phase === "settle";
  const ch = CHANNELS[chIdx];

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

            {/* moving bright scanline crawl */}
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

            {/* CHANNEL STAGE */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: showContent ? 1 : 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 grid place-items-center px-4 sm:px-6"
            >
              <div className="relative w-full max-w-[640px] aspect-[16/10] sm:aspect-[16/9] rounded-md overflow-hidden border border-foreground/10">
                {/* the active channel — keyed so it remounts each zap */}
                <ChannelRouter
                  key={ch.id}
                  channelId={ch.id}
                  pct={pct}
                />

                {/* per-channel scanlines (denser, darker, on top of channel) */}
                <div
                  aria-hidden
                  className="absolute inset-0 pointer-events-none opacity-25 mix-blend-overlay"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(0deg, rgba(0,0,0,0.5) 0 1px, transparent 1px 2px)",
                  }}
                />
                {/* phosphor vignette */}
                <div
                  aria-hidden
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(120% 80% at 50% 50%, transparent 50%, rgba(0,0,0,0.6) 100%)",
                  }}
                />

                {/* channel ident */}
                <div className="absolute top-3 left-3 right-3 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.25em] pointer-events-none">
                  <span className="text-accent" style={{ textShadow: "0 0 8px rgba(200,255,61,0.7)" }}>
                    CH·{String(chIdx + 1).padStart(2, "0")}
                    <span className="text-foreground/70 ml-2">— {ch.label}</span>
                  </span>
                  <span className="text-foreground/60">
                    {phase === "settle" ? "LOCKED" : "TUNING"}
                  </span>
                </div>

                {/* static burst on channel change */}
                <AnimatePresence>
                  {staticBurst && (
                    <motion.div
                      key="static"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.08 }}
                      className="absolute inset-0 pointer-events-none z-20"
                    >
                      <StaticNoise />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

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
                  scanning
                </span>
              </span>
              <span className="opacity-70 shrink-0">tap to skip ↗</span>
            </motion.div>

            {/* status line — bottom centerish */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: showContent ? 1 : 0 }}
              transition={{ duration: 0.3, delay: 0.08 }}
              className="absolute bottom-6 md:bottom-10 left-0 right-0 flex justify-center px-4 z-30"
            >
              <div className="flex items-center gap-3 font-mono text-[10px] sm:text-xs uppercase tracking-[0.3em] text-muted">
                <span className="text-accent">▸</span>
                <span key={ch.line}>
                  <TypedLine text={ch.line} />
                  {phase !== "settle" && phase !== "done" && (
                    <span className="ml-1 inline-block w-[0.4em] h-[0.85em] bg-accent animate-pulse align-middle" />
                  )}
                </span>
              </div>
            </motion.div>

            {/* bottom thin progress (subtle, shows phase even when channels look the same) */}
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

// ────────────────────────────────────────────────────────────────────────
// Channels
// ────────────────────────────────────────────────────────────────────────

function ChannelRouter({
  channelId,
  pct,
}: {
  channelId: (typeof CHANNELS)[number]["id"];
  pct: number;
}) {
  switch (channelId) {
    case "snake":
      return <SnakeChannel />;
    case "chalk":
      return <ChalkChannel pct={pct} />;
    case "graph":
      return <GraphChannel />;
    case "deck":
      return <DeckChannel />;
    case "brand":
      return <BrandChannel />;
  }
}

// ── snake channel: actual snake game auto-piloting ──────────────────────
function SnakeChannel() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let state: SnakeState = createSnake(16, 11);
    let lastTick = performance.now();
    let raf = 0;

    function draw(now: number) {
      const w = canvas!.width;
      const h = canvas!.height;
      const cellW = w / state.cols;
      const cellH = h / state.rows;

      // bg phosphor
      ctx!.fillStyle = "#031608";
      ctx!.fillRect(0, 0, w, h);

      // grid
      ctx!.strokeStyle = "rgba(200,255,61,0.05)";
      ctx!.lineWidth = 1;
      for (let i = 1; i < state.cols; i++) {
        ctx!.beginPath();
        ctx!.moveTo(i * cellW, 0);
        ctx!.lineTo(i * cellW, h);
        ctx!.stroke();
      }
      for (let j = 1; j < state.rows; j++) {
        ctx!.beginPath();
        ctx!.moveTo(0, j * cellH);
        ctx!.lineTo(w, j * cellH);
        ctx!.stroke();
      }

      // food
      const pulse = 1 + Math.sin(now / 160) * 0.15;
      const fr = Math.min(cellW, cellH) * 0.42 * pulse;
      ctx!.fillStyle = "#ff7a3d";
      ctx!.beginPath();
      ctx!.arc(
        state.food.x * cellW + cellW / 2,
        state.food.y * cellH + cellH / 2,
        fr,
        0,
        Math.PI * 2,
      );
      ctx!.fill();

      // snake
      for (let i = state.snake.length - 1; i >= 0; i--) {
        const s = state.snake[i];
        const a = 1 - (i / state.snake.length) * 0.45;
        ctx!.fillStyle = i === 0 ? "#c8ff3d" : `rgba(200,255,61,${a})`;
        ctx!.fillRect(
          s.x * cellW + 1,
          s.y * cellH + 1,
          cellW - 2,
          cellH - 2,
        );
      }
    }

    function loop(now: number) {
      if (now - lastTick > 110) {
        const dir = autoPilotDir(state);
        state = inputSnake(state, dir);
        state = tickSnake(state);
        if (state.gameOver) state = createSnake(16, 11);
        lastTick = now;
      }
      draw(now);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={ref}
      width={640}
      height={400}
      className="absolute inset-0 w-full h-full"
    />
  );
}

// ── chalk channel: walking character on a chalk path ────────────────────
function ChalkChannel({ pct }: { pct: number }) {
  // map the 5-channel band of pct (20-40 range covers this channel) to 0..1
  const local = Math.min(1, Math.max(0, (pct - 20) / 20));
  return (
    <div className="absolute inset-0 bg-[#070707]">
      {/* chalkboard noise */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(rgba(245,245,245,0.04) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      {/* path baseline */}
      <svg
        viewBox="0 0 640 400"
        className="absolute inset-0 w-full h-full pointer-events-none"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="chalkpath" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(245,245,245,0.4)" />
            <stop offset="100%" stopColor="rgba(200,255,61,0.4)" />
          </linearGradient>
        </defs>
        {/* dim full path */}
        <path
          d="M 30 240 Q 160 180 320 240 T 610 240"
          fill="none"
          stroke="rgba(245,245,245,0.12)"
          strokeWidth={2}
          strokeDasharray="4 6"
        />
        {/* drawn portion grows with progress */}
        <path
          d="M 30 240 Q 160 180 320 240 T 610 240"
          fill="none"
          stroke="url(#chalkpath)"
          strokeWidth={2}
          pathLength={1}
          strokeDasharray={`${local} 1`}
          style={{ filter: "drop-shadow(0 0 4px rgba(200,255,61,0.5))" }}
        />
        {/* end flag */}
        <g transform="translate(610 240)">
          <line x1="0" y1="0" x2="0" y2="-32" stroke="#c8ff3d" strokeWidth="1.5" />
          <polygon points="0,-32 18,-28 0,-22" fill="#c8ff3d" />
        </g>
        {/* start dot */}
        <circle cx="30" cy="240" r="3" fill="rgba(245,245,245,0.5)" />
      </svg>

      {/* the walking character — positioned along path via getPointAtLength */}
      <ChalkWalker progress={local} />
    </div>
  );
}

function ChalkWalker({ progress }: { progress: number }) {
  // Same path as the SVG above, replicated as a hidden DOM element so we
  // can sample getPointAtLength without extra JS path math.
  const pathRef = useRef<SVGPathElement>(null);
  const [pt, setPt] = useState({ x: 30, y: 240 });

  useEffect(() => {
    if (!pathRef.current) return;
    const len = pathRef.current.getTotalLength();
    const p = pathRef.current.getPointAtLength(progress * len);
    setPt({ x: p.x, y: p.y });
  }, [progress]);

  return (
    <>
      <svg
        viewBox="0 0 640 400"
        className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
        preserveAspectRatio="none"
      >
        <path ref={pathRef} d="M 30 240 Q 160 180 320 240 T 610 240" />
      </svg>
      <div
        className="absolute"
        style={{
          left: `${(pt.x / 640) * 100}%`,
          top: `${(pt.y / 400) * 100}%`,
          transform: "translate(-50%, -100%)",
        }}
      >
        <div className="relative" aria-hidden>
          <div className="absolute -inset-3 rounded-full bg-accent/20 blur-md" />
          <div className="relative w-3 h-4 bg-accent rounded-[2px] shadow-[0_0_10px_rgba(200,255,61,0.7)]" />
          <div className="absolute left-[1px] top-4 w-[3px] bg-accent char-leg-a" />
          <div className="absolute left-[8px] top-4 w-[3px] bg-accent char-leg-b" />
        </div>
      </div>
    </>
  );
}

// ── graph channel: constellation of pulsing nodes ───────────────────────
function GraphChannel() {
  const nodes = useMemo(() => {
    const seed = [
      { x: 0.15, y: 0.3, label: "TS" },
      { x: 0.32, y: 0.6, label: "React" },
      { x: 0.5, y: 0.25, label: "Next" },
      { x: 0.65, y: 0.55, label: "R3F" },
      { x: 0.82, y: 0.32, label: "GLSL" },
      { x: 0.42, y: 0.8, label: "Node" },
      { x: 0.78, y: 0.78, label: "Postgres" },
      { x: 0.18, y: 0.78, label: "Python" },
    ];
    return seed;
  }, []);
  const links: [number, number][] = [
    [0, 1], [0, 2], [1, 2], [1, 3], [2, 3], [3, 4], [1, 5], [5, 6], [5, 7], [2, 4],
  ];

  return (
    <div className="absolute inset-0 bg-[#050505]">
      <svg
        viewBox="0 0 640 400"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="none"
      >
        {links.map(([a, b], i) => (
          <motion.line
            key={i}
            x1={nodes[a].x * 640}
            y1={nodes[a].y * 400}
            x2={nodes[b].x * 640}
            y2={nodes[b].y * 400}
            stroke="rgba(200,255,61,0.35)"
            strokeWidth="0.8"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: i * 0.04 }}
          />
        ))}
        {nodes.map((n, i) => (
          <motion.g
            key={i}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 + i * 0.04, type: "spring" }}
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
          >
            <circle
              cx={n.x * 640}
              cy={n.y * 400}
              r={4}
              fill="#c8ff3d"
              style={{ filter: "drop-shadow(0 0 6px rgba(200,255,61,0.7))" }}
            />
            <circle
              cx={n.x * 640}
              cy={n.y * 400}
              r={4}
              fill="none"
              stroke="rgba(200,255,61,0.35)"
              strokeWidth="0.6"
            >
              <animate
                attributeName="r"
                values="4;14;4"
                dur="2.4s"
                repeatCount="indefinite"
                begin={`${i * 0.2}s`}
              />
              <animate
                attributeName="opacity"
                values="0.6;0;0.6"
                dur="2.4s"
                repeatCount="indefinite"
                begin={`${i * 0.2}s`}
              />
            </circle>
            <text
              x={n.x * 640 + 10}
              y={n.y * 400 + 4}
              fill="rgba(245,245,245,0.7)"
              fontSize="10"
              fontFamily='"Geist Mono", monospace'
            >
              {n.label}
            </text>
          </motion.g>
        ))}
      </svg>
    </div>
  );
}

// ── deck channel: project cards fanning + cycling ───────────────────────
function DeckChannel() {
  const cards = ["Rank Matrix", "29.8N", "Presence", "Connect-e-dil", "Inbound"];
  return (
    <div className="absolute inset-0 bg-[#070707] flex items-center justify-center">
      <div className="relative w-[60%] aspect-[4/5] max-w-[200px]">
        {cards.map((title, i) => {
          const t = (cards.length - 1 - i) / cards.length;
          const sign = i % 2 === 0 ? 1 : -1;
          const style: CSSProperties = {
            transform: `translate(${t * 14 * sign}px, ${t * 18}px) rotate(${t * 3 * sign}deg) scale(${1 - t * 0.05})`,
            zIndex: cards.length - i,
            opacity: 1,
          };
          const isAccent = title === "29.8N";
          return (
            <motion.div
              key={title}
              initial={{ y: -40, opacity: 0, rotate: 8 * sign }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                delay: i * 0.08,
                type: "spring",
                damping: 22,
                stiffness: 220,
              }}
              className="absolute inset-0 rounded-lg border bg-card flex flex-col"
              style={{
                ...style,
                borderColor: isAccent
                  ? "rgba(200,255,61,0.5)"
                  : "rgba(255,255,255,0.12)",
                boxShadow: isAccent
                  ? "0 18px 40px -10px rgba(200,255,61,0.3)"
                  : "0 14px 30px -10px rgba(0,0,0,0.5)",
              }}
            >
              <div className="p-3 flex items-baseline justify-between font-mono text-[8px] uppercase tracking-widest text-muted">
                <span>{String(i + 1).padStart(2, "0")} / 05</span>
                <span style={{ color: isAccent ? "#c8ff3d" : undefined }}>
                  {isAccent ? "Game" : "Build"}
                </span>
              </div>
              <div className="flex-1 grid place-items-center px-2 text-center">
                <span
                  className="font-serif italic"
                  style={{
                    fontSize: title.length > 9 ? "1.1rem" : "1.4rem",
                    color: isAccent ? "#c8ff3d" : undefined,
                    lineHeight: 0.95,
                  }}
                >
                  {title}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ── brand channel: final reveal ─────────────────────────────────────────
function BrandChannel() {
  return (
    <div className="absolute inset-0 bg-background grid place-items-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        className="text-center px-6"
      >
        <span className="block font-mono text-[10px] uppercase tracking-[0.5em] text-accent mb-3">
          ✦ signal locked ✦
        </span>
        <h1
          className="font-serif italic leading-[0.88] tracking-tight text-foreground"
          style={{
            fontSize: "clamp(2rem, 8vw, 5.5rem)",
            textShadow:
              "0 0 32px rgba(200,255,61,0.25), 0 0 6px rgba(200,255,61,0.4)",
          }}
        >
          <span className="block">Divyansh</span>
          <span className="block">Agarwal</span>
        </h1>
      </motion.div>
    </div>
  );
}

// ── small bits ──────────────────────────────────────────────────────────

function StaticNoise() {
  // animated checker-noise via CSS — cheap, no canvas needed
  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: `
          repeating-linear-gradient(0deg, rgba(255,255,255,0.18) 0 1px, transparent 1px 2px),
          repeating-linear-gradient(90deg, rgba(255,255,255,0.18) 0 1px, transparent 1px 2px)
        `,
        mixBlendMode: "overlay",
        animation: "noiseShift 80ms steps(2) infinite",
      }}
    />
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
