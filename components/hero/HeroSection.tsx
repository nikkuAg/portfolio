"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { about } from "@/content/about";
import { CHANNELS, useChannel } from "./useChannel";
import { MobileGamepad } from "./MobileGamepad";
import { HERO_NAME, HERO_TAGLINE } from "./hero-overlay";

const CRTScene = dynamic(
  () => import("./CRTScene").then((m) => m.CRTScene),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="font-mono text-xs uppercase tracking-widest text-muted">
          Booting CRT…
        </div>
      </div>
    ),
  },
);

// Phones skip the 3D CRT entirely — typewriter intro only. The Three.js
// bundle never loads, no snake game, no D-pad navigation. Returns null
// until the breakpoint check resolves (matches SSR empty state).
function useIsDesktop(): boolean | null {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isDesktop;
}

export function HeroSection() {
  const isDesktop = useIsDesktop();
  if (isDesktop === null) {
    return (
      <section
        id="top"
        className="relative w-full min-h-screen bg-background"
      />
    );
  }
  return isDesktop ? <DesktopHero /> : <MobileHero />;
}

function DesktopHero() {
  const channel = useChannel();
  const ch = CHANNELS[channel];
  return (
    <section
      id="top"
      className="relative w-full min-h-screen overflow-hidden bg-dots"
    >
      {/* stage vignette — soft dark radial centered on the TV so the dot-grid
          fades toward the center, giving the CRT a clean backdrop instead of
          a busy dotted plane to compete with. Sits BELOW the canvas. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(45% 55% at 50% 50%, rgba(7,7,7,0.95), rgba(7,7,7,0) 70%)",
        }}
      />
      {/* floor glow — faint accent wash beneath the TV stand so it reads as a
          light source touching the ground (extends the in-scene phosphor cue
          out into the page) */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(28% 14% at 50% 78%, rgba(200,255,61,0.08), transparent 70%)",
        }}
      />

      {/* 3D CRT scene */}
      <div className="absolute inset-0">
        <CRTScene />
      </div>

      <div className="relative z-10 pointer-events-none w-full h-screen flex flex-col justify-between px-4 sm:px-6 md:px-8 lg:px-10 py-16 sm:py-20 md:py-28 lg:py-32">
        {/* top label */}
        <div className="flex items-start justify-between font-mono text-[10px] uppercase tracking-[0.3em] text-muted gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-foreground">Divyansh Agarwal</span>
            <span>Portfolio · {new Date().getFullYear()}</span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="flex items-center gap-2 text-foreground">
              <span className="size-1.5 rounded-full bg-accent animate-pulse" />
              Live · CH·{String(channel + 1).padStart(2, "0")}
            </span>
            <span>Channel: {ch.label}</span>
          </div>
        </div>

        {/* center — empty, CRT owns the stage */}
        <div className="flex-1" />

        {/* bottom row */}
        <div className="flex items-end justify-between gap-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted max-w-xs leading-relaxed">
            <span className="text-foreground">Controls</span>
            <span>
              {" "}· Turn the knob to play · Arrows/WASD to steer · Space pause
            </span>
          </div>

          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted text-right">
            <span className="block text-foreground">{about.title}</span>
            <span className="italic">{about.tagline}</span>
          </div>
        </div>
      </div>

      {/* self-checks pointer type internally — safe to include */}
      <MobileGamepad />
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// MobileHero — typewriter intro only. Mirrors the CRT typewriter's
// look (mono uppercase name + smaller tagline, phosphor accent glow, blinking
// cursor, soft scanlines + dot grain) without any of the 3D / game cost.
// ─────────────────────────────────────────────────────────────────────────

function MobileHero() {
  const [namePhase, setNamePhase] = useState(0);
  const [taglinePhase, setTaglinePhase] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // even with reduced motion we still type — just much faster — so the
    // typewriter identity isn't lost. Previously this branch jumped to the
    // full text instantly which looked static.
    const initialDelay = reduce ? 150 : 500;
    const nameTick = reduce ? 25 : 110;
    const tagTick = reduce ? 10 : 36;
    const pauseBetween = reduce ? 200 : 480;

    let cancelled = false;
    const timers: number[] = [];
    const schedule = (cb: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        if (!cancelled) cb();
      }, ms);
      timers.push(id);
    };

    const typeChar = (
      text: string,
      idx: number,
      tick: number,
      setter: (n: number) => void,
      onDone?: () => void,
    ) => {
      setter(idx);
      if (idx < text.length) {
        schedule(
          () => typeChar(text, idx + 1, tick, setter, onDone),
          tick,
        );
      } else if (onDone) {
        onDone();
      }
    };

    // lead-in delay so the cursor visibly blinks BEFORE typing starts
    // (otherwise the typewriter kicks in the instant the page mounts and
    // can be missed entirely in the first frame)
    schedule(() => {
      typeChar(HERO_NAME, 1, nameTick, setNamePhase, () => {
        schedule(() => {
          typeChar(HERO_TAGLINE, 1, tagTick, setTaglinePhase);
        }, pauseBetween);
      });
    }, initialDelay);

    return () => {
      cancelled = true;
      for (const id of timers) window.clearTimeout(id);
    };
  }, []);

  const nameDone = namePhase >= HERO_NAME.length;
  const taglineDone = taglinePhase >= HERO_TAGLINE.length;

  return (
    <section
      id="top"
      className="relative w-full min-h-screen overflow-hidden bg-background"
    >
      {/* phosphor glow + scanlines + dot grain — the CRT identity without
          paying for an actual canvas */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(70% 55% at 50% 45%, rgba(200,255,61,0.06), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.045) 0 1px, transparent 1px 3px)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      <div className="relative z-10 w-full min-h-screen flex flex-col px-5 sm:px-7 pt-7 pb-12">
        {/* eyebrow — section index + on-air pill. The name itself used to
            live here too but it overlapped visually with the h1 typewriter
            below (both mono uppercase, both at the left edge), so we keep
            just the index + status pill and let the typewriter own the name */}
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.3em] text-muted">
          <span>00 / Hero</span>
          <span className="flex items-center gap-2 text-accent">
            <span className="size-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(200,255,61,0.8)] animate-pulse" />
            On Air
          </span>
        </div>

        {/* center — typewriter. Generous top margin so the eyebrow row has
            clear separation from the large heading and they can't collide */}
        <div className="flex-1 flex flex-col justify-center gap-6 mt-20">
          <h1
            className="font-mono font-bold uppercase leading-[1.05] text-accent tracking-[0.04em]"
            style={{
              fontSize: "clamp(2rem, 9vw, 3.25rem)",
              textShadow:
                "0 0 22px rgba(200,255,61,0.4), 0 0 4px rgba(200,255,61,0.5)",
              // reserve two lines so the layout doesn't reflow as letters appear
              minHeight: "2.1em",
            }}
          >
            {HERO_NAME.slice(0, namePhase)}
            {!nameDone && <Cursor />}
          </h1>

          {/* separator rule — appears once the name has finished typing */}
          <div
            className={`h-px bg-accent/50 transition-all duration-500 ${
              nameDone ? "w-[40%]" : "w-0"
            }`}
            style={{ boxShadow: "0 0 6px rgba(200,255,61,0.4)" }}
          />

          {/* tagline — appears after the pause */}
          <p
            className="font-mono text-accent/85 leading-snug max-w-[26rem]"
            style={{
              fontSize: "clamp(1.05rem, 4.5vw, 1.4rem)",
              textShadow: "0 0 12px rgba(200,255,61,0.18)",
              // reserve three lines (tagline is ~50 chars at this size)
              minHeight: "4.2em",
            }}
          >
            {HERO_TAGLINE.slice(0, taglinePhase)}
            {nameDone && !taglineDone && <Cursor small />}
          </p>
        </div>

        {/* scroll cue — appears once the typewriter is fully done */}
        <div
          className={`flex flex-col items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.3em] text-muted/80 transition-opacity duration-700 ${
            taglineDone ? "opacity-100" : "opacity-0"
          }`}
        >
          <span className="text-accent text-base animate-bounce">↓</span>
          <span>scroll to explore</span>
        </div>
      </div>
    </section>
  );
}

function Cursor({ small }: { small?: boolean } = {}) {
  return (
    <span
      aria-hidden
      className={`inline-block bg-accent ml-1 align-middle animate-pulse ${
        small ? "w-[0.4em] h-[0.85em]" : "w-[0.5em] h-[0.9em]"
      }`}
      style={{ boxShadow: "0 0 6px rgba(200,255,61,0.7)" }}
    />
  );
}
