"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useInView,
  useReducedMotion,
  type Variants,
} from "motion/react";

// A game-style skill tree: a glowing trunk with three branch nodes
// (FRONT / INFRA / GAME), each fanning into tiered skill chips. The tree
// "boots up" on scroll (trunk draws down, a scan sweep passes, chips
// stagger in), pulses travel the trunk, and a cursor-proximity field
// lights chips in their branch color as you sweep over them — so it reads
// as crafted as the CRT / portal / arcade sections, not a static list.

type Skill = { label: string; primary?: boolean };
type Branch = {
  id: string;
  label: string;
  color: string;
  rgb: string;
  skills: Skill[];
};

const BRANCHES: Branch[] = [
  {
    id: "front",
    label: "Frontend",
    color: "#f5f5f5",
    rgb: "245,245,245",
    skills: [
      { label: "TypeScript", primary: true },
      { label: "React", primary: true },
      { label: "Next.js", primary: true },
      { label: "Vue.js" },
      { label: "Tailwind" },
      { label: "GSAP" },
      { label: "Figma" },
    ],
  },
  {
    id: "infra",
    label: "Backend · Infra",
    color: "#7aa8ff",
    rgb: "122,168,255",
    skills: [
      { label: "Python", primary: true },
      { label: "Node.js", primary: true },
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
    id: "game",
    label: "Games · 3D",
    color: "#c8ff3d",
    rgb: "200,255,61",
    skills: [
      { label: "Three.js", primary: true },
      { label: "R3F", primary: true },
      { label: "WebGL" },
      { label: "GLSL" },
      { label: "Unity" },
      { label: "C#" },
    ],
  },
];

const MAX_SKILLS = Math.max(...BRANCHES.map((b) => b.skills.length));

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
};
const branchV: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: [0.2, 0.8, 0.2, 1] },
  },
};
const chipRow: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.035 } },
};
const chipV: Variants = {
  hidden: { opacity: 0, y: 6, scale: 0.92 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3 } },
};

type ChipRef = {
  el: HTMLLIElement;
  rgb: string;
  baseBorder: number;
  primary: boolean;
};

export function SkillTree() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15%" });
  const reduced = useReducedMotion();
  const [active, setActive] = useState<string | null>(null);

  // cursor-proximity field — chips glow in their branch color as the
  // pointer sweeps near them (radar feel). DOM-direct, no re-renders.
  const chipRefs = useRef<ChipRef[]>([]);
  useEffect(() => {
    if (reduced) return;
    const root = ref.current;
    if (!root) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let raf = 0;
    let mx = -9999;
    let my = -9999;
    const RADIUS = 130;

    const apply = () => {
      for (const c of chipRefs.current) {
        if (!c?.el) continue;
        const r = c.el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const d = Math.hypot(mx - cx, my - cy);
        const g = Math.max(0, 1 - d / RADIUS); // 0..1 intensity
        c.el.style.borderColor = `rgba(${c.rgb},${c.baseBorder + g * 0.5})`;
        c.el.style.boxShadow =
          g > 0.02 ? `0 0 ${g * 16}px rgba(${c.rgb},${g * 0.4})` : "none";
        c.el.style.color =
          g > 0.55 ? "#f5f5f5" : c.primary ? "#f5f5f5" : "";
      }
    };
    const onMove = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(apply);
    };
    const onLeave = () => {
      mx = my = -9999;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(apply);
    };
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    return () => {
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  const animateState = inView || reduced ? "visible" : "hidden";
  let chipIdx = 0;

  return (
    <div ref={ref} className="relative pt-2">
      {/* HUD corner brackets — same viewfinder motif as the other sections */}
      <CornerBrackets />

      {/* one-time scan sweep on reveal */}
      {!reduced && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute left-0 right-0 h-px z-10"
          style={{
            background:
              "linear-gradient(to right, transparent, rgba(200,255,61,0.6), transparent)",
            boxShadow: "0 0 10px rgba(200,255,61,0.5)",
          }}
          initial={{ top: "0%", opacity: 0 }}
          animate={
            inView ? { top: ["0%", "100%"], opacity: [0, 1, 1, 0] } : undefined
          }
          transition={{ duration: 1.1, ease: "easeInOut", delay: 0.1 }}
        />
      )}

      {/* trunk — a phosphor line the branches hang off; draws down on reveal */}
      <motion.span
        aria-hidden
        className="absolute left-[4px] top-3 bottom-2 w-px origin-top"
        style={{
          background:
            "linear-gradient(to bottom, rgba(200,255,61,0.6), var(--color-border) 45%, transparent)",
        }}
        initial={reduced ? false : { scaleY: 0 }}
        animate={inView ? { scaleY: 1 } : undefined}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
      {/* pulse traveling down the trunk */}
      {!reduced && (
        <motion.span
          aria-hidden
          className="absolute left-[2.5px] size-1 rounded-full bg-accent z-10"
          style={{ boxShadow: "0 0 8px rgba(200,255,61,0.9)" }}
          initial={{ top: "5%", opacity: 0 }}
          animate={
            inView
              ? { top: ["5%", "92%"], opacity: [0, 1, 1, 0] }
              : undefined
          }
          transition={{
            duration: 2.4,
            ease: "easeIn",
            repeat: Infinity,
            repeatDelay: 1.6,
            delay: 1.1,
          }}
        />
      )}

      {/* root node */}
      <div className="relative pl-6 mb-7">
        <span
          aria-hidden
          className="absolute left-0 top-1 size-2.5 rotate-45 bg-accent"
          style={{ boxShadow: "0 0 10px rgba(200,255,61,0.8)" }}
        />
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted">
          Build
        </div>
        <div className="font-display font-bold uppercase text-sm tracking-wide text-foreground">
          Full-Stack Engineer
        </div>
      </div>

      <motion.div
        variants={container}
        initial={reduced ? false : "hidden"}
        animate={animateState}
        className="flex flex-col gap-7"
      >
        {BRANCHES.map((b) => {
          const dimmed = active !== null && active !== b.id;
          const fill = Math.round((b.skills.length / MAX_SKILLS) * 100);
          return (
            <motion.div
              key={b.id}
              variants={branchV}
              onMouseEnter={() => setActive(b.id)}
              onMouseLeave={() => setActive((a) => (a === b.id ? null : a))}
              className="relative pl-6 transition-opacity duration-300"
              style={{ opacity: dimmed ? 0.3 : 1 }}
            >
              {/* branch node on the trunk */}
              <span
                aria-hidden
                className="absolute left-[1px] top-[5px] size-2 rounded-full transition-shadow duration-300"
                style={{
                  background: b.color,
                  boxShadow: `0 0 ${active === b.id ? 12 : 7}px rgba(${b.rgb},0.7)`,
                }}
              />

              {/* branch header + count-based mastery bar */}
              <div className="flex items-center gap-2 mb-2 font-mono text-[11px] uppercase tracking-[0.25em]">
                <span style={{ color: b.color }}>{b.label}</span>
                <span className="text-muted/40">·</span>
                <span className="text-muted/60">{b.skills.length}</span>
                <span
                  aria-hidden
                  className="ml-1 h-px flex-1 max-w-[70px] rounded-full overflow-hidden bg-border"
                >
                  <motion.span
                    className="block h-full origin-left"
                    style={{ background: b.color }}
                    initial={reduced ? false : { scaleX: 0 }}
                    animate={inView ? { scaleX: fill / 100 } : undefined}
                    transition={{ duration: 0.7, ease: "easeOut", delay: 0.5 }}
                  />
                </span>
              </div>

              {/* skill chips — primary are the bright tier-1 unlocks */}
              <motion.ul variants={chipRow} className="flex flex-wrap gap-1.5">
                {b.skills.map((s) => {
                  const i = chipIdx++;
                  const baseBorder = s.primary ? 0.4 : 0.14;
                  return (
                    <motion.li
                      key={s.label}
                      variants={chipV}
                      ref={(el) => {
                        if (el)
                          chipRefs.current[i] = {
                            el,
                            rgb: b.rgb,
                            baseBorder,
                            primary: !!s.primary,
                          };
                      }}
                      className={`font-mono text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                        s.primary ? "text-foreground" : "text-muted"
                      }`}
                      style={{
                        borderColor: `rgba(${b.rgb},${baseBorder})`,
                      }}
                    >
                      {s.label}
                    </motion.li>
                  );
                })}
              </motion.ul>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

function CornerBrackets() {
  return (
    <div aria-hidden className="pointer-events-none absolute -inset-x-3 -inset-y-2">
      {(["tl", "tr", "bl", "br"] as const).map((c) => {
        const top = c[0] === "t";
        const left = c[1] === "l";
        return (
          <span
            key={c}
            className="absolute size-2.5"
            style={{
              top: top ? 0 : "auto",
              bottom: !top ? 0 : "auto",
              left: left ? 0 : "auto",
              right: !left ? 0 : "auto",
              borderStyle: "solid",
              borderColor: "rgba(200,255,61,0.4)",
              borderTopWidth: top ? 1 : 0,
              borderBottomWidth: !top ? 1 : 0,
              borderLeftWidth: left ? 1 : 0,
              borderRightWidth: !left ? 1 : 0,
            }}
          />
        );
      })}
    </div>
  );
}
