"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import {
  experience,
  type ExperienceItem,
  type ExperienceType,
} from "@/content/experience";

// chronological — oldest leftmost on the path, character walks toward present
const ORDEACCENT: ExperienceItem[] = [...experience].reverse();

export function ExperienceSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  // pathRef is the geometry source used for position math (kept invisible).
  // drawnPathRef is the bright accent "freshly chalked" overlay whose
  // stroke-dashoffset shrinks with scroll, so the path appears to be
  // drawn IN by the character as it walks.
  const pathRef = useRef<SVGPathElement>(null);
  const drawnPathRef = useRef<SVGPathElement>(null);
  const characterRef = useRef<HTMLDivElement>(null);
  const dustRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [activeIdx, setActiveIdx] = useState(0);
  const [stage, setStage] = useState({ width: 1200, height: 360 });

  // scroll progress through the section — section is taller than viewport,
  // card pins inside it via sticky positioning
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  // track the path stage's actual size so SVG units = pixels
  useEffect(() => {
    if (!stageRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const e = entries[0];
      setStage({
        width: Math.round(e.contentRect.width),
        height: Math.round(e.contentRect.height),
      });
    });
    ro.observe(stageRef.current);
    return () => ro.disconnect();
  }, []);

  const W = stage.width;
  const H = stage.height;

  // flag positions along a wavy horizontal curve
  const flags = useMemo(() => {
    const padX = Math.max(48, W * 0.06);
    const usable = W - padX * 2;
    const baseY = H * 0.55;
    const amp = H * 0.22;
    return ORDEACCENT.map((role, i) => {
      const t = ORDEACCENT.length === 1 ? 0.5 : i / (ORDEACCENT.length - 1);
      const x = padX + t * usable;
      // alternating wavy y — sin pattern with slight stagger so adjacent flags differ
      const phase = i * 0.95;
      const y = baseY + Math.sin(phase) * amp;
      return { x, y, role };
    });
  }, [W, H]);

  // smooth path through the flags using Catmull-Rom-ish quadratic bezier
  const pathD = useMemo(() => {
    if (flags.length === 0) return "";
    const padX = Math.max(48, W * 0.06);
    let d = `M ${padX * 0.5} ${H * 0.55}`;
    // approach to first flag
    d += ` Q ${(padX * 0.5 + flags[0].x) / 2} ${flags[0].y - 30}, ${flags[0].x} ${flags[0].y}`;
    for (let i = 1; i < flags.length; i++) {
      const prev = flags[i - 1];
      const curr = flags[i];
      const cx = (prev.x + curr.x) / 2;
      const cy = (prev.y + curr.y) / 2 - 18;
      d += ` Q ${cx} ${cy}, ${curr.x} ${curr.y}`;
    }
    // tail off the last flag
    const last = flags[flags.length - 1];
    d += ` Q ${last.x + 40} ${last.y}, ${W - padX * 0.4} ${H * 0.55}`;
    return d;
  }, [flags, W, H]);

  // drive character + chalk-drawing-in + dust trail from scroll progress
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (!pathRef.current || !characterRef.current) return;
    // clamp + ease scroll progress so the path completes a bit before scroll ends
    // (gives time to read the last role before the section unpins)
    const eased = Math.min(1, Math.max(0, (latest - 0.05) / 0.85));
    const length = pathRef.current.getTotalLength();
    const charDist = eased * length;
    const point = pathRef.current.getPointAtLength(charDist);
    characterRef.current.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -100%)`;

    // chalk path "draws in" — bright stroke reveals from start
    if (drawnPathRef.current) {
      drawnPathRef.current.style.strokeDashoffset = String(length - charDist);
    }

    // dust trail — 3 small fading accent puffs lagging behind the character
    // along the path itself (so they sit on the freshly drawn chalk line,
    // not floating in space)
    for (let i = 0; i < 3; i++) {
      const el = dustRefs.current[i];
      if (!el) continue;
      const lagDist = (i + 1) * 14;
      const dustAt = Math.max(0, charDist - lagDist);
      const dp = pathRef.current.getPointAtLength(dustAt);
      el.style.transform = `translate(${dp.x}px, ${dp.y}px) translate(-50%, -50%)`;
      // dimmer + smaller the further back
      const alpha = Math.max(0, 0.55 - i * 0.18);
      el.style.opacity = charDist < 10 ? "0" : String(alpha);
    }

    // active flag = the one closest to (and not after) the character's x
    let nearest = 0;
    for (let i = 0; i < flags.length; i++) {
      if (point.x >= flags[i].x - 18) nearest = i;
    }
    setActiveIdx(nearest);
  });

  // initial render — place character at start + init the drawn-path mask
  useEffect(() => {
    if (!pathRef.current || !characterRef.current) return;
    const length = pathRef.current.getTotalLength();
    const point = pathRef.current.getPointAtLength(0);
    characterRef.current.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -100%)`;
    // set dasharray + dashoffset on the bright overlay so it's hidden
    // initially and gets revealed by the scroll handler above
    if (drawnPathRef.current) {
      drawnPathRef.current.style.strokeDasharray = String(length);
      drawnPathRef.current.style.strokeDashoffset = String(length);
    }
  }, [pathD]);

  const activeRole = ORDEACCENT[activeIdx];

  return (
    <section
      ref={sectionRef}
      id="experience"
      // tall (260vh) on md+ for the pinned chalk experience; auto height on
      // mobile where we render a static vertical timeline instead
      className="relative w-full thin-divider md:[height:260vh]"
    >
      {/* MOBILE — vertical timeline. The chalk path doesn't work with 11 flags
          on a 320px-wide screen (tap targets get too small). */}
      <div className="md:hidden px-4 sm:px-6 py-20 sm:py-24">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-baseline justify-between mb-8">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted">
              03 / Experience
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
              {ORDEACCENT.length} roles
            </span>
          </div>

          <h2 className="font-serif text-4xl sm:text-5xl leading-[0.95] tracking-tight mb-10">
            Where I&apos;ve <em className="italic">shipped</em>.
          </h2>

          <ol className="relative border-l border-border ml-2">
            {experience.map((role) => {
              const badge = typeBadge(role.type);
              const isCurrent = role.end === "Present";
              return (
                <li
                  key={`${role.company}-${role.start}`}
                  className="relative pl-6 sm:pl-8 pb-10 last:pb-0"
                >
                  {/* flag dot on the rail */}
                  <span
                    className={`absolute -left-[5px] top-1.5 size-[9px] rounded-sm rotate-45 ${
                      isCurrent
                        ? "bg-accent shadow-[0_0_10px_rgba(200,255,61,0.7)]"
                        : "bg-foreground/40"
                    }`}
                    aria-hidden
                  />

                  <div className="flex flex-wrap items-baseline gap-2 mb-2 font-mono text-[10px] uppercase tracking-widest">
                    <span className="text-foreground">{role.start}</span>
                    <span className="text-muted/60">→</span>
                    {isCurrent ? (
                      <span className="text-accent">Present</span>
                    ) : (
                      <span className="text-muted">{role.end}</span>
                    )}
                    {role.location && (
                      <>
                        <span className="text-muted/60">·</span>
                        <span className="text-muted">{role.location}</span>
                      </>
                    )}
                    <span
                      className={`inline-flex px-1.5 py-0.5 rounded-full border text-[9px] tracking-widest ${badge.color}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <h3 className="font-serif italic text-2xl sm:text-3xl leading-tight tracking-tight mb-1">
                    {role.role}
                  </h3>
                  <p className="font-serif text-base sm:text-lg text-foreground/85 mb-3">
                    {role.company}
                  </p>

                  <ul className="space-y-1.5 mb-3">
                    {role.highlights.map((h, i) => (
                      <li
                        key={i}
                        className="text-sm text-muted leading-relaxed flex gap-2"
                      >
                        <span className="text-accent shrink-0 mt-1">▸</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>

                  <ul className="flex flex-wrap gap-1.5">
                    {role.stack.map((s) => (
                      <li
                        key={s}
                        className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border border-border rounded-full text-muted"
                      >
                        {s}
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* DESKTOP — pinned chalkboard with curved path + walking character */}
      <div className="hidden md:flex sticky top-0 h-screen items-center px-6 md:px-10 py-12">
        <div className="max-w-7xl mx-auto w-full flex flex-col gap-6">
          {/* header */}
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted">
              03 / Experience
            </span>
            <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-muted">
              <span>
                {String(activeIdx + 1).padStart(2, "0")} / {ORDEACCENT.length}
              </span>
              <span className="text-muted/40">·</span>
              <span>scroll to walk →</span>
            </div>
          </div>

          <div className="flex items-baseline justify-between gap-8">
            <h2 className="font-serif text-3xl md:text-5xl leading-[0.95] tracking-tight">
              Where I&apos;ve <em className="italic">shipped</em>.
            </h2>
            <p className="hidden md:block font-mono text-xs text-muted/70 max-w-xs text-right">
              The character walks the path as you scroll. Hover any flag to jump.
            </p>
          </div>

          {/* the chalk card */}
          <div className="rounded-2xl border border-border bg-[#070707] overflow-hidden">
            {/* path stage */}
            <div
              ref={stageRef}
              className="relative w-full h-[40vh] md:h-[42vh] lg:h-[46vh] min-h-[300px]"
            >
              {/* sparse chalkboard noise */}
              <NoiseDots />

              {/* chalk path — three layers stacked:
                  1. soft glow underlay (the chalkboard "smudge" under the line)
                  2. faint dashed template (the ahead/un-drawn portion)
                  3. bright solid chalk that draws in with scroll
                  pathRef is the invisible geometry source for position math */}
              <svg
                width={W}
                height={H}
                className="absolute inset-0 pointer-events-none"
              >
                <defs>
                  <linearGradient id="path-grad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="rgba(200,255,61,0.55)" />
                    <stop offset="100%" stopColor="rgba(200,255,61,0.95)" />
                  </linearGradient>
                </defs>
                {/* soft glow underlay */}
                <path
                  d={pathD}
                  stroke="rgba(245,245,245,0.05)"
                  strokeWidth={10}
                  fill="none"
                  strokeLinecap="round"
                />
                {/* faint dashed template — the path the character WILL walk */}
                <path
                  ref={pathRef}
                  d={pathD}
                  stroke="rgba(245,245,245,0.18)"
                  strokeWidth={1.5}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray="3 6"
                />
                {/* freshly chalked overlay — draws in via stroke-dashoffset
                    (updated each scroll frame) so the path appears to be
                    drawn by the character as it walks */}
                <path
                  ref={drawnPathRef}
                  d={pathD}
                  stroke="url(#path-grad)"
                  strokeWidth={2.4}
                  fill="none"
                  strokeLinecap="round"
                  style={{
                    filter: "drop-shadow(0 0 3px rgba(200,255,61,0.55))",
                  }}
                />
              </svg>

              {/* flags as HTML so they're crisp + interactive. Alternate
                  label position above/below the pole so adjacent flags
                  don't stack their labels into each other when the path
                  clusters them horizontally. */}
              {flags.map((f, i) => (
                <Flag
                  key={`${f.role.company}-${f.role.start}`}
                  x={f.x}
                  y={f.y}
                  role={f.role}
                  reached={i <= activeIdx}
                  isCurrent={i === activeIdx}
                  index={i}
                  labelPosition={i % 2 === 0 ? "above" : "below"}
                  onHover={() => setActiveIdx(i)}
                />
              ))}

              {/* dust trail — small accent puffs trailing on the path */}
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  ref={(el) => {
                    dustRefs.current[i] = el;
                  }}
                  aria-hidden
                  className="absolute top-0 left-0 z-[15] pointer-events-none rounded-full bg-accent will-change-transform"
                  style={{
                    width: 4 - i,
                    height: 4 - i,
                    boxShadow: "0 0 6px rgba(200,255,61,0.6)",
                    opacity: 0,
                  }}
                />
              ))}

              {/* walking character */}
              <div
                ref={characterRef}
                className="absolute top-0 left-0 z-20 will-change-transform pointer-events-none"
              >
                <Character />
              </div>

              {/* corner brackets — viewfinder treatment around the path stage */}
              <StageCornerBrackets />

              {/* progress bar at bottom of stage */}
              <ScrollProgress progress={scrollYProgress} />
            </div>

            {/* active role detail */}
            <div className="border-t border-border p-5 md:p-7 bg-card/30 min-h-[180px]">
              <ActiveRoleInfo
                role={activeRole}
                index={activeIdx + 1}
                total={ORDEACCENT.length}
              />
            </div>
          </div>
        </div>
      </div>

      {/* a11y / fallback list (sr-only — full content for screen readers) */}
      <ol className="sr-only">
        {experience.map((r) => (
          <li key={`${r.company}-${r.start}`}>
            <strong>
              {r.role} at {r.company}
            </strong>{" "}
            ({r.start} – {r.end}, {r.location ?? "—"}): {r.highlights.join(" ")}
          </li>
        ))}
      </ol>
    </section>
  );
}

function NoiseDots() {
  return (
    <div
      className="absolute inset-0 opacity-50 pointer-events-none"
      style={{
        backgroundImage:
          "radial-gradient(rgba(245,245,245,0.025) 1px, transparent 1px)",
        backgroundSize: "26px 26px",
      }}
    />
  );
}

function Character() {
  return (
    <div className="relative" aria-hidden>
      <div className="absolute -inset-4 rounded-full bg-accent/20 blur-md pointer-events-none" />
      <div className="absolute left-1/2 -translate-x-1/2 top-[26px] w-[22px] h-[3px] rounded-full bg-accent/25 blur-[1px]" />
      <div className="relative w-[18px] h-[20px] bg-accent rounded-[2px] shadow-[0_0_14px_rgba(200,255,61,0.7)]">
        <div className="absolute top-0 right-0 w-[3px] h-full bg-black/25 rounded-r-[2px]" />
        <div className="absolute top-[5px] right-[3.5px] w-[3.5px] h-[3.5px] bg-background" />
      </div>
      <div className="absolute left-[3px] top-[20px] w-[4px] bg-accent char-leg-a" />
      <div className="absolute left-[11px] top-[20px] w-[4px] bg-accent char-leg-b" />
    </div>
  );
}

// small glyph per role type — quick visual encoding inside the flag label
const TYPE_GLYPH: Record<ExperienceType, string> = {
  fulltime: "◆",
  internship: "▸",
  gsoc: "✦",
  leadership: "▲",
};

function Flag({
  x,
  y,
  role,
  reached,
  isCurrent,
  index,
  labelPosition,
  onHover,
}: {
  x: number;
  y: number;
  role: ExperienceItem;
  reached: boolean;
  isCurrent: boolean;
  index: number;
  labelPosition: "above" | "below";
  onHover: () => void;
}) {
  // shorten company for the pole label
  const shortCompany = role.company
    .replace(", IIT Roorkee", "")
    .split(" ")
    .slice(0, 2)
    .join(" ");
  const year = role.start.split(" ").pop();
  const glyph = TYPE_GLYPH[role.type];

  const labelColorClass = isCurrent
    ? "text-accent scale-110"
    : reached
      ? "text-foreground/80"
      : "text-muted/55";

  // 2-line compact label — index + glyph + year on top, company on bottom
  const label = (
    <div
      className={`text-center transition-all duration-300 ${labelColorClass} group-hover:text-accent`}
    >
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] leading-none mb-1 flex items-center justify-center gap-1.5">
        <span className="opacity-70">{String(index + 1).padStart(2, "0")}</span>
        <span
          className={isCurrent ? "text-accent" : reached ? "text-accent/80" : "text-muted/50"}
        >
          {glyph}
        </span>
        <span className="opacity-70">{year}</span>
      </div>
      <div className="font-mono text-[10.5px] font-bold whitespace-nowrap leading-tight">
        {shortCompany}
      </div>
    </div>
  );

  return (
    <div
      className="absolute z-10 cursor-pointer group"
      style={{
        left: x,
        top: y,
        transform: "translate(-50%, -100%)",
      }}
      onMouseEnter={onHover}
      onPointerDown={onHover}
    >
      {/* invisible hover hitbox that covers both pole and label slot */}
      <div className="absolute -inset-x-4 -top-12 -bottom-16" />

      {/* label ABOVE pole (default) */}
      {labelPosition === "above" && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5">
          {label}
        </div>
      )}

      {/* pole + flag — drawn as SVG */}
      <svg
        width={28}
        height={36}
        className="overflow-visible"
        style={{ marginLeft: -1 }}
      >
        {/* concentric pulse rings on the active flag — two staggered for
            a slower, more deliberate "you are here" beacon */}
        {isCurrent && (
          <>
            <circle
              cx={1}
              cy={36}
              r={9}
              fill="none"
              stroke="rgba(200,255,61,0.55)"
              strokeWidth={1}
              className="animate-ping"
            />
            <circle
              cx={1}
              cy={36}
              r={5}
              fill="rgba(200,255,61,0.35)"
            />
          </>
        )}
        <line
          x1={1}
          y1={0}
          x2={1}
          y2={36}
          stroke={reached ? "#c8ff3d" : "rgba(245,245,245,0.4)"}
          strokeWidth={1.6}
          className="transition-colors"
          style={{
            filter: reached
              ? "drop-shadow(0 0 2px rgba(200,255,61,0.6))"
              : undefined,
          }}
        />
        <polygon
          points="1,0 22,5 1,12"
          fill={reached ? "#c8ff3d" : "rgba(245,245,245,0.4)"}
          className="transition-colors group-hover:fill-accent"
          style={{
            filter: reached
              ? "drop-shadow(0 0 4px rgba(200,255,61,0.6))"
              : undefined,
          }}
        />
        {/* base nub */}
        <rect
          x={-4}
          y={36}
          width={10}
          height={2.5}
          fill={reached ? "#c8ff3d" : "rgba(245,245,245,0.4)"}
        />
      </svg>

      {/* label BELOW pole — appears under the path */}
      {labelPosition === "below" && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2.5">
          {label}
        </div>
      )}
    </div>
  );
}

function StageCornerBrackets() {
  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none z-[5]">
      {(["tl", "tr", "bl", "br"] as const).map((corner) => {
        const isTop = corner[0] === "t";
        const isLeft = corner[1] === "l";
        return (
          <span
            key={corner}
            className="absolute"
            style={{
              top: isTop ? 10 : "auto",
              bottom: !isTop ? 10 : "auto",
              left: isLeft ? 10 : "auto",
              right: !isLeft ? 10 : "auto",
              width: 14,
              height: 14,
              borderStyle: "solid",
              borderColor: "rgba(200,255,61,0.4)",
              borderTopWidth: isTop ? 1 : 0,
              borderBottomWidth: !isTop ? 1 : 0,
              borderLeftWidth: isLeft ? 1 : 0,
              borderRightWidth: !isLeft ? 1 : 0,
            }}
          />
        );
      })}
    </div>
  );
}

function ScrollProgress({ progress }: { progress: ReturnType<typeof useScroll>["scrollYProgress"] }) {
  const ref = useRef<HTMLDivElement>(null);
  useMotionValueEvent(progress, "change", (latest) => {
    if (!ref.current) return;
    ref.current.style.transform = `scaleX(${Math.min(1, Math.max(0, latest))})`;
  });
  return (
    <div className="absolute bottom-0 left-0 right-0 h-px bg-border">
      <div
        ref={ref}
        className="h-full bg-gradient-to-r from-accent/40 to-accent origin-left"
        style={{ transform: "scaleX(0)" }}
      />
    </div>
  );
}

function typeBadge(type: ExperienceType) {
  switch (type) {
    case "fulltime":
      return { label: "Full-time", color: "text-accent border-accent/40" };
    case "internship":
      return { label: "Internship", color: "text-muted border-border" };
    case "gsoc":
      return { label: "GSoC", color: "text-foreground border-foreground/30" };
    case "leadership":
      return { label: "Leadership", color: "text-muted border-border" };
  }
}

function ActiveRoleInfo({
  role,
  index,
  total,
}: {
  role: ExperienceItem | undefined;
  index: number;
  total: number;
}) {
  if (!role) {
    return (
      <div className="text-center text-muted font-mono text-sm py-4">
        Scroll to begin walking the timeline...
      </div>
    );
  }

  const badge = typeBadge(role.type);
  const isCurrent = role.end === "Present";

  return (
    <motion.div
      key={`${role.company}-${role.start}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
      className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 items-start"
    >
      {/* left: meta */}
      <div className="md:col-span-3">
        <div className="font-mono text-[10px] uppercase tracking-widest text-accent mb-2">
          {String(index).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </div>
        <div className="font-mono text-[11px] uppercase tracking-widest text-foreground mb-1">
          {role.start}{" "}
          <span className="text-muted">→</span>{" "}
          {isCurrent ? (
            <span className="text-accent">Present</span>
          ) : (
            role.end
          )}
        </div>
        {role.location && (
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-2">
            {role.location}
          </div>
        )}
        <span
          className={`inline-flex px-2 py-0.5 rounded-full border font-mono text-[9px] uppercase tracking-widest ${badge.color}`}
        >
          {badge.label}
        </span>
      </div>

      {/* center: role + highlights */}
      <div className="md:col-span-6">
        <h3 className="font-serif text-2xl md:text-[1.6rem] leading-tight mb-1">
          {role.role}
        </h3>
        <p className="font-serif italic text-base md:text-lg text-foreground/80 mb-3">
          {role.company}
        </p>
        <ul className="space-y-1.5">
          {role.highlights.map((h, i) => (
            <li
              key={i}
              className="text-sm text-muted leading-relaxed flex gap-2"
            >
              <span className="text-accent shrink-0 mt-1">▸</span>
              <span>{h}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* right: stack */}
      <div className="md:col-span-3">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-2">
          Stack
        </div>
        <ul className="flex flex-wrap gap-1.5">
          {role.stack.map((s) => (
            <li
              key={s}
              className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 border border-border rounded-full text-muted"
            >
              {s}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
