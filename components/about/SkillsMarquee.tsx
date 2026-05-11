"use client";

import { useMemo } from "react";

type Skill = {
  name: string;
  group: "frontend" | "game" | "tool";
  primary?: boolean;
};

// curated, weighted view of the toolbelt — primary = brand-defining
const SKILLS: Skill[] = [
  { name: "TypeScript", group: "frontend", primary: true },
  { name: "React", group: "frontend", primary: true },
  { name: "Next.js", group: "frontend", primary: true },
  { name: "Tailwind", group: "frontend" },
  { name: "Framer Motion", group: "frontend" },
  { name: "GSAP", group: "frontend" },
  { name: "Three.js", group: "game", primary: true },
  { name: "React Three Fiber", group: "game", primary: true },
  { name: "WebGL", group: "game" },
  { name: "GLSL", group: "game" },
  { name: "Shaders", group: "game" },
  { name: "Rapier Physics", group: "game" },
  { name: "Unity", group: "game" },
  { name: "C#", group: "game" },
  { name: "Game Design", group: "game" },
  { name: "Node.js", group: "tool" },
  { name: "Vite", group: "tool" },
  { name: "Figma", group: "tool" },
  { name: "Storybook", group: "tool" },
  { name: "Vercel", group: "tool" },
];

const groupLabel: Record<Skill["group"], string> = {
  frontend: "front",
  game: "game",
  tool: "tool",
};

function Chip({ skill }: { skill: Skill }) {
  return (
    <li
      className={`group/chip relative flex items-center gap-2 px-3 py-2 rounded-full border transition-colors duration-300 cursor-default ${
        skill.primary
          ? "border-foreground/30 text-foreground hover:border-accent hover:text-accent"
          : "border-border text-muted hover:border-accent hover:text-accent"
      }`}
    >
      <span
        className={`size-1.5 rounded-full transition-all duration-300 ${
          skill.group === "game"
            ? "bg-accent"
            : skill.group === "frontend"
              ? "bg-foreground/60"
              : "bg-muted"
        } group-hover/chip:scale-150 group-hover/chip:bg-accent`}
      />
      <span className="font-mono text-[11px] tracking-wide whitespace-nowrap">
        {skill.name}
      </span>
      <span className="font-mono text-[9px] uppercase tracking-widest text-muted/60 ml-auto">
        {groupLabel[skill.group]}
      </span>
    </li>
  );
}

export function SkillsMarquee() {
  // split into two interleaved columns
  const { colA, colB } = useMemo(() => {
    const a: Skill[] = [];
    const b: Skill[] = [];
    SKILLS.forEach((s, i) => (i % 2 === 0 ? a.push(s) : b.push(s)));
    return { colA: a, colB: b };
  }, []);

  return (
    <div
      className="marquee-track relative h-[460px] grid grid-cols-2 gap-2 overflow-hidden"
      style={{
        maskImage:
          "linear-gradient(180deg, transparent 0%, black 12%, black 88%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(180deg, transparent 0%, black 12%, black 88%, transparent 100%)",
      }}
      aria-label="Toolbelt"
    >
      <ul className="marquee-up flex flex-col gap-2 will-change-transform">
        {[...colA, ...colA].map((s, i) => (
          <Chip key={`a-${i}`} skill={s} />
        ))}
      </ul>
      <ul className="marquee-down flex flex-col gap-2 will-change-transform">
        {[...colB, ...colB].map((s, i) => (
          <Chip key={`b-${i}`} skill={s} />
        ))}
      </ul>

      {/* hover hint */}
      <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 font-mono text-[9px] uppercase tracking-widest text-muted/60">
        hover to pause
      </div>
    </div>
  );
}
