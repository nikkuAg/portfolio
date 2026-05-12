"use client";

import { useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
} from "motion/react";
import { projects, type Project } from "@/content/projects";

const N = projects.length;

const CATEGORY_LABEL: Record<Project["category"], string> = {
  build: "Build",
  game: "Game",
  research: "Research",
};

// each category has its own phosphor — used for border, glow, gradient
// tint, category label, and the centered title on the card face
const CATEGORY_TINT: Record<Project["category"], string> = {
  build: "#ff9b3d", // warm amber
  game: "#c8ff3d", // phosphor lime
  research: "#7aa8ff", // cool blue
};

// rgb tuple form for rgba() — alpha varies per usage
const CATEGORY_RGB: Record<Project["category"], string> = {
  build: "255,155,61",
  game: "200,255,61",
  research: "122,168,255",
};

export function ProjectsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [deckPos, setDeckPos] = useState(0); // float 0..N-1

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const eased = Math.min(1, Math.max(0, (latest - 0.07) / 0.84));
    setDeckPos(eased * (N - 1));
  });

  // active card stays on the leaving card until it's ~70% flung off,
  // so the visible front-most card always matches the detail panel + "tap" label
  const topIdx = Math.min(N - 1, Math.max(0, Math.floor(deckPos + 0.3)));
  const activeProject = projects[topIdx];

  function jumpTo(targetIdx: number) {
    const section = sectionRef.current;
    if (!section) return;
    const rect = section.getBoundingClientRect();
    const sectionTop = window.scrollY + rect.top;
    const sectionScroll = section.offsetHeight - window.innerHeight;
    const e = N === 1 ? 0 : targetIdx / (N - 1);
    const latest = e * 0.84 + 0.07;
    window.scrollTo({
      top: sectionTop + latest * sectionScroll,
      behavior: "smooth",
    });
  }

  return (
    <section
      ref={sectionRef}
      id="projects"
      className="relative w-full thin-divider md:[height:360vh] [height:280vh]"
    >
      <div className="sticky top-0 h-screen flex items-center px-4 sm:px-6 md:px-10 py-10 md:py-12 overflow-hidden">
        <div className="max-w-7xl mx-auto w-full flex flex-col gap-4 md:grid md:grid-cols-12 md:gap-12 md:items-start">
          {/* LEFT (md+) / BOTTOM (mobile) — header + active project detail */}
          <div className="order-2 md:order-1 md:col-span-5 flex flex-col gap-3 md:gap-6">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.3em] text-muted">
                02 / Projects
              </span>
              <span className="font-mono text-[10px] sm:text-xs uppercase tracking-widest text-accent">
                {String(topIdx + 1).padStart(2, "0")} /{" "}
                {String(N).padStart(2, "0")}
              </span>
            </div>

            <h2 className="hidden md:block font-serif text-3xl md:text-[2.6rem] leading-[0.95] tracking-tight">
              Things I&apos;ve <em className="italic">shipped</em>, broken, and
              rebuilt.
            </h2>

            <ActiveProjectInfo project={activeProject} />

            <DeckProgress topIdx={topIdx} total={N} onJump={jumpTo} />
          </div>

          {/* RIGHT (md+) / TOP (mobile) — deck */}
          <div className="order-1 md:order-2 md:col-span-7 relative h-[36vh] sm:h-[44vh] md:h-[68vh] flex items-center justify-center">
            <div className="relative w-[200px] sm:w-[260px] md:w-[360px] aspect-[4/5]">
              {projects.map((p, i) => (
                <DeckCard
                  key={p.slug}
                  project={p}
                  index={i}
                  deckPos={deckPos}
                  isOnTop={i === topIdx}
                  onBehindClick={() => jumpTo(i)}
                />
              ))}

              {/* deck shadow base */}
              <div
                aria-hidden
                className="absolute left-1/2 -translate-x-1/2 -bottom-6 w-[80%] h-3 rounded-full bg-black/60 blur-md"
              />
            </div>
          </div>
        </div>
      </div>

      {/* a11y / fallback */}
      <ul className="sr-only" aria-label="All projects (text list)">
        {projects.map((p) => (
          <li key={p.slug}>
            {p.title} — {p.tagline}
            {p.href && (
              <>
                {" · "}
                <a href={p.href}>Live</a>
              </>
            )}
            {p.github && (
              <>
                {" · "}
                <a href={p.github}>Source</a>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function getDeckStyle(offset: number, index: number) {
  // offset = index - deckPos
  // offset === 0  → on top
  // offset > 0    → stacked behind
  // offset < 0    → discarded (flying off-screen)
  if (offset <= 0) {
    // 0 → 1 as card flies off (offset goes 0 → -1)
    const t = Math.min(1.4, -offset);
    return {
      x: t * 520,
      y: -t * 60,
      rotate: t * 32,
      scale: Math.max(0.86, 1 - t * 0.08),
      opacity: Math.max(0, 1 - t * 1.1),
      // discarded cards stay above the rising stack so the throw is visible
      // — most-recently-discarded sits highest, older discards fall below it
      zIndex: 400 - Math.round(t * 20),
    };
  }
  // stacked behind
  const sign = index % 2 === 0 ? 1 : -1;
  return {
    x: offset * 14 * sign,
    y: offset * 22,
    rotate: offset * 2.5 * sign,
    scale: Math.max(0.82, 1 - offset * 0.05),
    opacity: offset > 4 ? 0 : 1,
    zIndex: Math.max(0, 200 - Math.round(offset * 10)),
  };
}

function DeckCard({
  project,
  index,
  deckPos,
  isOnTop,
  onBehindClick,
}: {
  project: Project;
  index: number;
  deckPos: number;
  isOnTop: boolean;
  onBehindClick: () => void;
}) {
  const offset = index - deckPos;
  const style = getDeckStyle(offset, index);
  // only behind cards are tappable — front card is "the active project,
  // already shown in detail panel" so a tap-to-open would be redundant
  const isJumpable = !isOnTop && offset > 0.5;

  return (
    <motion.div
      className={`absolute inset-0 origin-center select-none ${
        isJumpable ? "cursor-pointer" : "pointer-events-none"
      }`}
      animate={style}
      transition={{
        type: "spring",
        damping: 28,
        stiffness: 220,
        mass: 0.6,
      }}
      onClick={() => {
        if (isJumpable) onBehindClick();
      }}
    >
      <CardFace project={project} index={index} />
    </motion.div>
  );
}

function CardFace({
  project,
  index,
}: {
  project: Project;
  index: number;
}) {
  const tint = CATEGORY_TINT[project.category];
  const rgb = CATEGORY_RGB[project.category];

  return (
    <div
      className="relative w-full h-full rounded-2xl overflow-hidden border bg-card"
      style={{
        borderColor: `rgba(${rgb}, 0.5)`,
        boxShadow: `0 30px 80px -20px rgba(${rgb}, 0.28), 0 12px 28px rgba(0,0,0,0.55)`,
      }}
    >
      {/* category-tinted gradient — top-left bloom + dark vertical */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(120% 80% at 0% 0%, rgba(${rgb},0.22), transparent 60%), radial-gradient(80% 60% at 100% 100%, rgba(${rgb},0.08), transparent 60%), linear-gradient(180deg, #0d0d0d 0%, #060606 100%)`,
        }}
      />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      />

      <div className="relative h-full flex flex-col p-6 md:p-7">
        {/* top row */}
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted">
            {String(index + 1).padStart(2, "0")} /{" "}
            {String(N).padStart(2, "0")}
          </span>
          <span
            className="font-mono text-[10px] uppercase tracking-widest"
            style={{
              color: tint,
              textShadow: `0 0 8px rgba(${rgb}, 0.5)`,
            }}
          >
            {CATEGORY_LABEL[project.category]}
          </span>
        </div>

        {/* center title — uses the category tint with a soft glow */}
        <div className="flex-1 flex items-center justify-center text-center px-2">
          <h3
            className={`font-serif italic leading-[0.92] tracking-tight ${
              project.title.length > 14
                ? "text-[2.1rem] md:text-4xl"
                : project.title.length > 9
                  ? "text-4xl md:text-5xl"
                  : "text-5xl md:text-6xl"
            }`}
            style={{
              color: tint,
              textShadow: `0 0 26px rgba(${rgb}, 0.35), 0 0 4px rgba(${rgb}, 0.25)`,
            }}
          >
            {project.title}
          </h3>
        </div>

        {/* bottom row */}
        <div className="flex items-end justify-between gap-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {project.year}
          </span>
          <span
            className="font-mono text-[10px] uppercase tracking-[0.25em]"
            style={{ color: `rgba(${rgb}, 0.65)` }}
          >
            {project.tech[0]}
          </span>
        </div>

        {/* corner ticks — also colored per category for consistency */}
        <CornerTick className="top-2 left-2" sides="tl" rgb={rgb} />
        <CornerTick className="top-2 right-2" sides="tr" rgb={rgb} />
        <CornerTick className="bottom-2 left-2" sides="bl" rgb={rgb} />
        <CornerTick className="bottom-2 right-2" sides="br" rgb={rgb} />
      </div>
    </div>
  );
}

function CornerTick({
  className,
  sides,
  rgb,
}: {
  className: string;
  sides: "tl" | "tr" | "bl" | "br";
  rgb: string;
}) {
  return (
    <span
      aria-hidden
      className={`absolute size-2 ${className}`}
      style={{
        borderColor: `rgba(${rgb}, 0.45)`,
        borderTopWidth: sides[0] === "t" ? 1 : 0,
        borderBottomWidth: sides[0] === "b" ? 1 : 0,
        borderLeftWidth: sides[1] === "l" ? 1 : 0,
        borderRightWidth: sides[1] === "r" ? 1 : 0,
      }}
    />
  );
}

function ActiveProjectInfo({ project }: { project: Project }) {
  const tint = CATEGORY_TINT[project.category];
  const hasLinks = Boolean(project.href || project.github);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={project.slug}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
        className="flex flex-col gap-2 md:gap-3 mt-1 md:mt-2"
      >
        <div className="flex flex-wrap items-center gap-2 md:gap-3 font-mono text-[10px] uppercase tracking-widest">
          <span style={{ color: tint }}>
            {CATEGORY_LABEL[project.category]}
          </span>
          <span className="text-muted/40">·</span>
          <span className="text-muted">{project.year}</span>
          {project.playable && (
            <>
              <span className="text-muted/40">·</span>
              <span className="text-accent">▶ Playable</span>
            </>
          )}
        </div>

        <h3 className="font-serif italic text-2xl sm:text-3xl md:text-[3rem] leading-[0.95] tracking-tight">
          {project.title}
        </h3>

        <p className="font-serif text-base sm:text-lg md:text-xl text-foreground/85 leading-snug">
          {project.tagline}
        </p>

        {/* full description: desktop only — mobile is space-constrained */}
        <p className="hidden md:block text-sm md:text-[15px] text-muted leading-relaxed">
          {project.description}
        </p>

        <ul className="flex flex-wrap gap-1.5 mt-1">
          {project.tech.slice(0, 4).map((t) => (
            <li
              key={t}
              className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 border border-border rounded-full text-muted"
            >
              {t}
            </li>
          ))}
          {project.tech.length > 4 && (
            <li className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 text-muted/60 md:hidden">
              +{project.tech.length - 4}
            </li>
          )}
        </ul>

        {hasLinks && (
          <div className="flex flex-wrap gap-2 md:gap-3 mt-1 md:mt-2">
            {project.href && (
              <a
                href={project.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-accent text-background font-mono text-[10px] sm:text-[11px] uppercase tracking-widest hover:opacity-90 transition-opacity"
              >
                Live <span aria-hidden>↗</span>
              </a>
            )}
            {project.github && (
              <a
                href={project.github}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-border font-mono text-[10px] sm:text-[11px] uppercase tracking-widest text-foreground hover:border-accent hover:text-accent transition-colors"
              >
                Source <span aria-hidden>↗</span>
              </a>
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function DeckProgress({
  topIdx,
  total,
  onJump,
}: {
  topIdx: number;
  total: number;
  onJump: (i: number) => void;
}) {
  return (
    <div className="mt-auto pt-6 flex items-center gap-4">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
        Deck
      </span>
      <ol className="flex-1 flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <li key={i} className="flex-1">
            <button
              onClick={() => onJump(i)}
              aria-label={`Jump to project ${i + 1}`}
              className={`block w-full h-px transition-all duration-200 ${
                i === topIdx
                  ? "h-[3px] bg-accent"
                  : i < topIdx
                    ? "bg-foreground/40"
                    : "bg-border"
              }`}
            />
          </li>
        ))}
      </ol>
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted whitespace-nowrap">
        scroll ↓
      </span>
    </div>
  );
}
