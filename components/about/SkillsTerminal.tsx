"use client";

import { useRef } from "react";
import {
  motion,
  useInView,
  useReducedMotion,
  type Variants,
} from "motion/react";

// The toolbelt as a console boot log — matches the site's CRT / terminal
// identity. Skills "load" as [OK] modules grouped by domain, with a
// core/familiar bar, then a ready summary + blinking cursor. Lines reveal
// in sequence on scroll like a real boot sequence.

type Skill = { label: string; core?: boolean };
type Group = { label: string; color: string; skills: Skill[] };

const GROUPS: Group[] = [
  {
    label: "frontend",
    color: "#f5f5f5",
    skills: [
      { label: "TypeScript", core: true },
      { label: "React", core: true },
      { label: "Next.js", core: true },
      { label: "Vue.js" },
      { label: "Tailwind" },
      { label: "GSAP" },
      { label: "Figma" },
    ],
  },
  {
    label: "backend · infra",
    color: "#7aa8ff",
    skills: [
      { label: "Python", core: true },
      { label: "Node.js", core: true },
      { label: "Go" },
      { label: "Java" },
      { label: "Rust" },
      { label: "Django" },
      { label: "Postgres" },
      { label: "Redis" },
      { label: "Airflow" },
      { label: "Docker" },
      { label: "AWS" },
    ],
  },
  {
    label: "games · 3d",
    color: "#c8ff3d",
    skills: [
      { label: "Three.js", core: true },
      { label: "R3F", core: true },
      { label: "WebGL" },
      { label: "GLSL" },
      { label: "Unity" },
      { label: "C#" },
    ],
  },
];

const TOTAL = GROUPS.reduce((n, g) => n + g.skills.length, 0);

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.035, delayChildren: 0.1 } },
};
const lineV: Variants = {
  hidden: { opacity: 0, x: -4 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.18 } },
};

function Bar({ core, color }: { core?: boolean; color: string }) {
  const filled = core ? 5 : 3;
  return (
    <span aria-hidden className="tracking-[1px] shrink-0">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          style={{
            color:
              i < filled
                ? core
                  ? color
                  : "rgba(245,245,245,0.45)"
                : "rgba(255,255,255,0.1)",
          }}
        >
          ▮
        </span>
      ))}
    </span>
  );
}

export function SkillsTerminal() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15%" });
  const reduced = useReducedMotion();
  const state = inView || reduced ? "visible" : "hidden";

  // flat list of lines so the stagger reveals every line in order
  const rows: React.ReactNode[] = [];
  rows.push(
    <motion.div key="cmd" variants={lineV} className="text-foreground/80">
      <span className="text-accent">$</span> ./load --stack
    </motion.div>,
  );
  rows.push(
    <motion.div key="sys" variants={lineV} className="text-muted/60">
      booting toolbelt…
    </motion.div>,
  );
  GROUPS.forEach((g) => {
    rows.push(
      <motion.div
        key={`h-${g.label}`}
        variants={lineV}
        className="uppercase tracking-[0.25em] text-[10px] mt-3 mb-1"
        style={{ color: g.color }}
      >
        ── {g.label}
      </motion.div>,
    );
    g.skills.forEach((s) => {
      rows.push(
        <motion.div
          key={s.label}
          variants={lineV}
          className="flex items-center gap-2"
        >
          <span className="text-accent">[OK]</span>
          <span className="text-foreground/90 flex-1 truncate">{s.label}</span>
          <Bar core={s.core} color={g.color} />
        </motion.div>,
      );
    });
  });
  rows.push(
    <motion.div key="done" variants={lineV} className="text-accent mt-3">
      {TOTAL} modules · ready ✓
    </motion.div>,
  );
  rows.push(
    <motion.div
      key="cursor"
      variants={lineV}
      className="flex items-center gap-1 text-muted"
    >
      <span className="text-accent">$</span>
      <span
        aria-hidden
        className="inline-block w-[7px] h-[14px] bg-accent animate-pulse"
      />
    </motion.div>,
  );

  return (
    <div
      ref={ref}
      className="relative rounded-xl border border-border bg-[#070707] overflow-hidden font-mono text-[12px] leading-relaxed"
    >
      {/* CRT scanlines */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 opacity-[0.05]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, #fff 0 1px, transparent 1px 3px)",
        }}
      />

      {/* title bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card/40">
        <span className="flex gap-1.5">
          <span className="size-2 rounded-full bg-muted/40" />
          <span className="size-2 rounded-full bg-muted/40" />
          <span className="size-2 rounded-full bg-accent/70" />
        </span>
        <span className="ml-1 text-muted/70 text-[10px] uppercase tracking-widest">
          ~/divyansh — toolbelt
        </span>
      </div>

      {/* boot log */}
      <motion.div
        variants={container}
        initial={reduced ? false : "hidden"}
        animate={state}
        className="p-4"
      >
        {rows}
      </motion.div>
    </div>
  );
}
