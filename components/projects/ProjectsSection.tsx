"use client";

import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
} from "motion/react";
import { projects, type Project } from "@/content/projects";
import { useScrollSnap } from "@/lib/useScrollSnap";

const N = projects.length;

const CATEGORY_LABEL: Record<Project["category"], string> = {
  fullstack: "Full Stack",
  backend: "Backend",
  research: "Research",
  gamedev: "Game Dev",
};

// each category has its own phosphor — used for border, glow, gradient
// tint, category label, and the centered title on the card face. Any
// project may override these via its own `color` hex on Project.
const CATEGORY_TINT: Record<Project["category"], string> = {
  fullstack: "#ff9b3d", // warm amber — the "builder" cluster
  backend: "#7aa8ff", // cool blue — engineering / infra
  research: "#b87aff", // violet — academic / sophisticated
  gamedev: "#c8ff3d", // phosphor lime — playful
};

// rgb tuple form for rgba() — alpha varies per usage
const CATEGORY_RGB: Record<Project["category"], string> = {
  fullstack: "255,155,61",
  backend: "122,168,255",
  research: "184,122,255",
  gamedev: "200,255,61",
};

// "#ff5dc8" → "255,93,200" — used to interpolate a per-project hex into
// the same rgba() pattern the category colors use
function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const v = h.length === 3
    ? h.split("").map((c) => c + c).join("")
    : h;
  const m = v.match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return "200,255,61"; // safe fallback to accent
  return [
    parseInt(m[1], 16),
    parseInt(m[2], 16),
    parseInt(m[3], 16),
  ].join(",");
}

// pick black-vs-white text for a given tint, based on perceived brightness
// (YIQ). Used on the Live button where the tint is the background — bright
// tints (lime, yellow, amber) keep dark text, darker tints (blues, deep
// violets) flip to white so the label stays readable.
function textOnTint(hex: string): "dark" | "light" {
  const h = hex.replace("#", "");
  const v = h.length === 3
    ? h.split("").map((c) => c + c).join("")
    : h;
  const m = v.match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return "dark";
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  // YIQ perceived brightness on 0..255. 150 threshold puts the cool blues
  // (#6096fc ≈ 145) on white text, keeps the warm/light hues on dark.
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? "dark" : "light";
}

// project's own `color` wins; otherwise fall back to its category's color
function resolveTint(project: Project): { tint: string; rgb: string } {
  if (project.color) {
    return { tint: project.color, rgb: hexToRgb(project.color) };
  }
  return {
    tint: CATEGORY_TINT[project.category],
    rgb: CATEGORY_RGB[project.category],
  };
}

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

  // snap-to-card — when scrolling pauses mid-transition inside the pinned
  // range, glide to the nearest whole card so the deck never rests with a
  // card half-flung and the detail panel out of sync. Desktop only (the
  // mobile carousel has its own native CSS snap). jumpTo also powers the
  // deck progress bar + click-a-card-behind.
  const { jumpTo } = useScrollSnap({
    scrollYProgress,
    sectionRef,
    steps: N,
    leadIn: 0.07,
    span: 0.84,
    enabled: () => window.matchMedia("(min-width: 768px)").matches,
  });

  return (
    <section
      ref={sectionRef}
      id="projects"
      // tall on md+ for the desktop pinned card-deck animation. Mobile is
      // auto height — the inner block is one viewport tall and snaps as one
      // unit via the global mobile scroll-snap in globals.css.
      className="relative w-full thin-divider md:[height:360vh]"
    >
      {/* DESKTOP — pinned-scroll deck (unchanged) */}
      <div className="hidden md:flex sticky top-0 h-screen items-center px-4 sm:px-6 md:px-10 py-10 md:py-12 overflow-hidden">
        <div className="max-w-7xl mx-auto w-full grid grid-cols-12 gap-10 lg:gap-12 items-start">
          <div className="col-span-5 lg:col-span-6 flex flex-col gap-6">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted">
                02 / Projects
              </span>
              <span className="font-mono text-xs uppercase tracking-widest text-accent">
                {String(topIdx + 1).padStart(2, "0")} /{" "}
                {String(N).padStart(2, "0")}
              </span>
            </div>

            <h2 className="font-serif text-3xl md:text-[2.6rem] leading-[0.95] tracking-tight">
              Things I&apos;ve <em className="italic">shipped</em>, broken, and
              rebuilt.
            </h2>

            <ActiveProjectInfo project={activeProject} />

            <DeckProgress topIdx={topIdx} total={N} onJump={jumpTo} />
          </div>

          <div className="col-span-7 lg:col-span-6 relative h-[68vh] flex items-center justify-center">
            <div className="relative w-[320px] lg:w-[380px] aspect-[4/5]">
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

              <div
                aria-hidden
                className="absolute left-1/2 -translate-x-1/2 -bottom-6 w-[80%] h-3 rounded-full bg-black/60 blur-md"
              />
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE — section snaps into view as one block (via the global
          mobile scroll-snap in globals.css). Inside, a horizontal swipe
          carousel lets the user browse cards left/right. Scroll vertically
          again to exit to Experience. */}
      <div className="md:hidden">
        <ProjectsMobileCarousel />
      </div>

      <ul className="sr-only" aria-label="All projects (text list)">
        {projects.map((p) => (
          <li key={p.slug}>
            {p.title}: {p.tagline}
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

function ProjectsMobileCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  // sync the header counter with whichever card the horizontal snap landed
  // on. clientWidth is the carousel viewport width; scrollLeft / width gives
  // the float index — round to land on the nearest card.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const w = el.clientWidth;
        if (!w) return;
        const idx = Math.round(el.scrollLeft / w);
        setActiveIdx(Math.max(0, Math.min(N - 1, idx)));
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  function jumpTo(i: number) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }

  return (
    // snap-start + min-h-screen makes the page-level mobile scroll-snap
    // (defined in globals.css) land on this section as one block. User
    // snaps in vertically → swipes horizontally to browse cards → scrolls
    // vertically again to exit to Experience.
    <div className="snap-start min-h-screen flex flex-col px-4 sm:px-6 pt-8 pb-6">
      {/* header */}
      <div className="flex items-baseline justify-between mb-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted">
          02 / Projects
        </span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-accent">
          {String(activeIdx + 1).padStart(2, "0")} /{" "}
          {String(N).padStart(2, "0")}
        </span>
      </div>

      <h2 className="font-serif text-3xl sm:text-4xl leading-[0.95] tracking-tight mb-5">
        Things I&apos;ve <em className="italic">shipped</em>, broken, and
        rebuilt.
      </h2>

      {/* horizontal swipe carousel — flex-1 so it fills the vertical space
          between the heading and the dots. Each card is full-viewport-width
          (minus the section's horizontal padding). Native CSS scroll-snap
          on the x axis handles per-card snap on swipe. */}
      <div
        ref={scrollRef}
        className="flex-1 flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory -mx-4 sm:-mx-6 px-4 sm:px-6 gap-4 scrollbar-hide"
      >
        {projects.map((p, i) => (
          <div
            key={p.slug}
            className="w-full flex-shrink-0 snap-center flex"
          >
            <MobileProjectCard project={p} index={i} />
          </div>
        ))}
      </div>

      {/* page dots — tap to jump. Active dot grows wide + glows accent. */}
      <div className="mt-4 flex items-center justify-center gap-2">
        {projects.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => jumpTo(i)}
            aria-label={`Go to project ${i + 1}`}
            className="group relative h-8 flex items-center justify-center px-1"
          >
            <span
              className={`block h-[3px] rounded-full transition-all duration-300 ${
                i === activeIdx
                  ? "w-7 bg-accent shadow-[0_0_8px_rgba(200,255,61,0.7)]"
                  : i < activeIdx
                    ? "w-2 bg-foreground/40"
                    : "w-2 bg-border"
              }`}
            />
          </button>
        ))}
      </div>

    </div>
  );
}

function MobileProjectCard({
  project,
  index,
}: {
  project: Project;
  index: number;
}) {
  const { tint, rgb } = resolveTint(project);
  const hasLinks = Boolean(project.href || project.github);

  return (
    // h-full + flex makes the card fill the carousel's vertical space
    // exactly, so the snapped projects section fits everything in one
    // viewport (heading on top, card body in the middle, dots/hint at bottom)
    <article
      className="relative w-full h-full rounded-2xl overflow-hidden border bg-card flex flex-col"
      style={{
        borderColor: `rgba(${rgb}, 0.4)`,
        boxShadow: `0 20px 50px -15px rgba(${rgb}, 0.22), 0 8px 20px rgba(0,0,0,0.45)`,
      }}
    >
      {/* category-tinted gradient + dot grain */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(120% 80% at 0% 0%, rgba(${rgb},0.2), transparent 60%), radial-gradient(80% 60% at 100% 100%, rgba(${rgb},0.08), transparent 60%), linear-gradient(180deg, #0d0d0d 0%, #060606 100%)`,
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      />

      <div className="relative flex flex-col gap-4 p-6 sm:p-7 flex-1 overflow-y-auto">
        {/* top row */}
        <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-widest">
          <span className="text-muted">
            {String(index + 1).padStart(2, "0")} /{" "}
            {String(N).padStart(2, "0")}
          </span>
          <span
            style={{
              color: tint,
              textShadow: `0 0 8px rgba(${rgb}, 0.5)`,
            }}
          >
            {CATEGORY_LABEL[project.category]}
          </span>
        </div>

        {/* title — sized down vs desktop so long titles stay one line */}
        <h3
          className={`font-serif italic leading-[0.95] tracking-tight ${
            project.title.length > 14
              ? "text-[2rem]"
              : project.title.length > 9
                ? "text-4xl"
                : "text-5xl"
          }`}
          style={{
            color: tint,
            textShadow: `0 0 22px rgba(${rgb}, 0.3), 0 0 4px rgba(${rgb}, 0.2)`,
          }}
        >
          {project.title}
        </h3>

        {/* meta line */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted">
          <span className="text-foreground">{project.year}</span>
          <span className="text-muted/40">·</span>
          <span>{project.tech[0]}</span>
          {project.playable && (
            <>
              <span className="text-muted/40">·</span>
              <span className="text-accent">▶ Playable</span>
            </>
          )}
        </div>

        {/* tagline */}
        <p className="font-serif text-lg text-foreground/85 leading-snug">
          {project.tagline}
        </p>

        {/* full description — included on mobile (carousel cards have room) */}
        <p className="text-sm text-muted leading-relaxed flex-1">
          {project.description}
        </p>

        {/* tech tags */}
        <ul className="flex flex-wrap gap-1.5">
          {project.tech.slice(0, 6).map((t) => (
            <li
              key={t}
              className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 border border-border rounded-full text-muted"
            >
              {t}
            </li>
          ))}
        </ul>

        {/* links — 44px tall for thumb-friendly tap targets. Live uses the
            project's tint as bg, Source uses tint on hover via a CSS var */}
        {hasLinks && (
          <div className="flex gap-2 mt-1">
            {project.href && (
              <a
                href={project.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  backgroundColor: tint,
                  color:
                    textOnTint(tint) === "dark"
                      ? "var(--color-background)"
                      : "#ffffff",
                }}
                className="inline-flex items-center gap-2 px-4 h-11 rounded-full font-mono text-[11px] uppercase tracking-widest"
              >
                Live <span aria-hidden>↗</span>
              </a>
            )}
            {project.github && (
              <a
                href={project.github}
                target="_blank"
                rel="noopener noreferrer"
                style={{ "--tint": tint } as React.CSSProperties}
                className="inline-flex items-center gap-2 px-4 h-11 rounded-full border border-border font-mono text-[11px] uppercase tracking-widest text-foreground hover:[border-color:var(--tint)] hover:[color:var(--tint)] transition-colors"
              >
                Source <span aria-hidden>↗</span>
              </a>
            )}
          </div>
        )}

        {/* corner ticks, same as desktop card */}
        <CornerTick className="top-3 left-3" sides="tl" rgb={rgb} />
        <CornerTick className="top-3 right-3" sides="tr" rgb={rgb} />
        <CornerTick className="bottom-3 left-3" sides="bl" rgb={rgb} />
        <CornerTick className="bottom-3 right-3" sides="br" rgb={rgb} />
      </div>
    </article>
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
  const { tint, rgb } = resolveTint(project);

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
  const { tint } = resolveTint(project);
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
                style={{
                  backgroundColor: tint,
                  color:
                    textOnTint(tint) === "dark"
                      ? "var(--color-background)"
                      : "#ffffff",
                }}
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-mono text-[10px] sm:text-[11px] uppercase tracking-widest hover:opacity-90 transition-opacity"
              >
                Live <span aria-hidden>↗</span>
              </a>
            )}
            {project.github && (
              <a
                href={project.github}
                target="_blank"
                rel="noopener noreferrer"
                style={{ "--tint": tint } as React.CSSProperties}
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-border font-mono text-[10px] sm:text-[11px] uppercase tracking-widest text-foreground hover:[border-color:var(--tint)] hover:[color:var(--tint)] transition-colors"
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
