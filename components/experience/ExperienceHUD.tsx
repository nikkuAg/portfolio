"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ExperienceItem } from "@/content/experience";
import { typeBadge } from "./experience-tints";

// DOM overlay on top of the 3D canvas — game-HUD style. The layer itself
// ignores the pointer so scroll/drag reaches the page; only the card and
// the gate dots are interactive. Black + accent like the rest of the site —
// per-role color lives inside the 3D gates, not in the chrome.
export function ExperienceHUD({
  roles,
  activeIdx,
  onJump,
}: {
  roles: ExperienceItem[];
  activeIdx: number;
  onJump: (i: number) => void;
}) {
  const role = roles[activeIdx];
  const badge = typeBadge(role.type);
  const isCurrent = role.end === "Present";

  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col p-4 sm:p-6 md:p-10 pt-20 sm:pt-22 md:pt-24">
      {/* viewfinder corner brackets — same treatment as the old chalk stage */}
      <StageCornerBrackets />

      {/* header */}
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] md:text-xs uppercase tracking-[0.3em] text-muted">
          03 / Experience
        </span>
        <span className="font-mono text-[10px] md:text-xs uppercase tracking-widest text-accent">
          {String(activeIdx + 1).padStart(2, "0")} /{" "}
          {String(roles.length).padStart(2, "0")}
        </span>
      </div>

      <h2 className="font-serif text-3xl md:text-5xl leading-[0.95] tracking-tight mt-2">
        Where I&apos;ve <em className="italic">shipped</em>.
      </h2>

      {/* the void owns the middle */}
      <div className="flex-1" />

      {/* card — pinned bottom-left, full width on mobile */}
      <div className="w-full md:max-w-md pointer-events-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${role.company}-${role.start}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
            className="relative rounded-2xl border border-border bg-card/85 backdrop-blur-sm p-4 sm:p-5 md:p-6"
            style={{
              boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            }}
          >
            {/* corner ticks — same motif as the project cards */}
            <CornerTick className="top-2.5 left-2.5" sides="tl" />
            <CornerTick className="top-2.5 right-2.5" sides="tr" />
            <CornerTick className="bottom-2.5 left-2.5" sides="bl" />
            <CornerTick className="bottom-2.5 right-2.5" sides="br" />

            {/* meta row */}
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 font-mono text-[10px] uppercase tracking-widest mb-2">
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

            <h3 className="font-serif text-xl sm:text-2xl md:text-[1.7rem] leading-tight">
              {role.role}
            </h3>
            <p className="font-serif italic text-base md:text-lg text-foreground/80 mb-3">
              {role.company}
            </p>

            <ul className="space-y-1.5 mb-3">
              {role.highlights.map((h, i) => (
                <li
                  key={i}
                  className="text-[13px] md:text-sm text-muted leading-relaxed flex gap-2"
                >
                  <span className="text-accent shrink-0 mt-0.5">▸</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>

            <ul className="flex flex-wrap gap-1.5">
              {role.stack.map((s) => (
                <li
                  key={s}
                  className="font-mono text-[9px] md:text-[10px] uppercase tracking-wider px-2 py-0.5 border border-border rounded-full text-muted"
                >
                  {s}
                </li>
              ))}
            </ul>
          </motion.div>
        </AnimatePresence>

        {/* gate markers — click to jump to that dimension (same bar as the
            Projects deck progress) */}
        <ol className="flex gap-1.5 mt-3 pointer-events-auto">
          {roles.map((r, i) => (
            <li key={`${r.company}-${r.start}`} className="flex-1">
              <button
                type="button"
                onClick={() => onJump(i)}
                aria-label={`Go to ${r.company}, ${r.start}`}
                className="group block w-full h-6 flex items-end"
              >
                <span
                  className={`block w-full rounded-full transition-all duration-300 ${
                    i === activeIdx
                      ? "h-[3px] bg-accent shadow-[0_0_8px_rgba(200,255,61,0.7)]"
                      : i < activeIdx
                        ? "h-px bg-foreground/40"
                        : "h-px bg-border"
                  }`}
                />
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function StageCornerBrackets() {
  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none">
      {(["tl", "tr", "bl", "br"] as const).map((corner) => {
        const isTop = corner[0] === "t";
        const isLeft = corner[1] === "l";
        return (
          <span
            key={corner}
            className="absolute"
            style={{
              top: isTop ? 14 : "auto",
              bottom: !isTop ? 14 : "auto",
              left: isLeft ? 14 : "auto",
              right: !isLeft ? 14 : "auto",
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

function CornerTick({
  className,
  sides,
}: {
  className: string;
  sides: "tl" | "tr" | "bl" | "br";
}) {
  return (
    <span
      aria-hidden
      className={`absolute size-2 ${className}`}
      style={{
        borderStyle: "solid",
        borderColor: "rgba(200,255,61,0.45)",
        borderTopWidth: sides[0] === "t" ? 1 : 0,
        borderBottomWidth: sides[0] === "b" ? 1 : 0,
        borderLeftWidth: sides[1] === "l" ? 1 : 0,
        borderRightWidth: sides[1] === "r" ? 1 : 0,
      }}
    />
  );
}
