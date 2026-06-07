"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";
import { experience, type ExperienceItem } from "@/content/experience";
import { useScrollSnap } from "@/lib/useScrollSnap";
import { ExperienceFallback } from "./ExperienceFallback";
import { ExperienceHUD } from "./ExperienceHUD";

// the 3D portal scene pulls in three.js — load it only on the client, and
// only once the section is near the viewport (see the mount observer below)
const ExperienceScene = dynamic(
  () => import("./ExperienceScene").then((m) => m.ExperienceScene),
  { ssr: false },
);

// newest first (resume convention) — gate 01 is the current role, and the
// flight travels backwards through time toward the earliest internship
const ROLES: ExperienceItem[] = experience;
const N = ROLES.length;

// scroll mapping: lead-in dead zone frames gate 0 before motion starts,
// lead-out lets the last role dwell before the section unpins. Shared by
// the progress easing AND the snap hook so they agree by construction.
const LEAD_IN = 0.06;
const SPAN = 0.86;

export function ExperienceSection() {
  const sectionRef = useRef<HTMLElement>(null);
  // eased 0..1 progress, read by the scene every frame — never React state,
  // so scrolling re-renders nothing
  const progressRef = useRef(0);
  const activeIdxRef = useRef(0);
  const [activeIdx, setActiveIdx] = useState(0);

  // "loading" is also the SSR markup — the fallback timeline renders first
  // paint (SEO + no-JS), then the scene takes over once capabilities are
  // known. "fallback" sticks for reduced-motion / no-WebGL.
  const [mode, setMode] = useState<"loading" | "scene" | "fallback">(
    "loading",
  );
  const modeRef = useRef(mode);
  const [compact, setCompact] = useState(false);
  const [mounted, setMounted] = useState(false); // 3D mounts near viewport
  const [active, setActive] = useState(false); // frameloop runs in viewport

  // capability detection — same compact query as the hero CRT scene
  useEffect(() => {
    const decide = () => {
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      let webgl = false;
      try {
        const c = document.createElement("canvas");
        webgl = !!(c.getContext("webgl2") || c.getContext("webgl"));
      } catch {
        webgl = false;
      }
      const decided = reduce || !webgl ? "fallback" : "scene";
      modeRef.current = decided;
      setMode(decided);
    };
    decide();

    const mq = window.matchMedia("(max-width: 768px), (pointer: coarse)");
    const update = () => setCompact(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  // mount the canvas during idle time right after page load — the chunk
  // fetch, WebGL context init, and label textures all happen while the
  // visitor is still on the hero, so the scene is ready before they ever
  // scroll here. It never unmounts; the frameloop gate below keeps the
  // off-screen cost at ~zero.
  useEffect(() => {
    if (mode !== "scene") return;
    const mount = () => setMounted(true);
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(mount, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const t = setTimeout(mount, 1500);
    return () => clearTimeout(t);
  }, [mode]);

  // frameloop gate — the scene only renders while the section is on screen
  useEffect(() => {
    if (mode !== "scene" || !sectionRef.current) return;
    const activeObs = new IntersectionObserver(
      ([e]) => setActive(e.isIntersecting),
      { rootMargin: "80px 0px" },
    );
    activeObs.observe(sectionRef.current);
    return () => activeObs.disconnect();
  }, [mode]);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const eased = Math.min(1, Math.max(0, (latest - LEAD_IN) / SPAN));
    progressRef.current = eased;
    // HUD state flips only on whole-gate changes — ≤N renders per traversal
    const idx = Math.min(N - 1, Math.round(eased * (N - 1)));
    if (idx !== activeIdxRef.current) {
      activeIdxRef.current = idx;
      setActiveIdx(idx);
    }
  });

  // settle onto whole gates when scrolling pauses; jumpTo powers the HUD
  // gate markers. Active on mobile too (the 3D runs there) — disabled only
  // in fallback mode, where nothing is pinned.
  const { jumpTo } = useScrollSnap({
    scrollYProgress,
    sectionRef,
    steps: N,
    leadIn: LEAD_IN,
    span: SPAN,
    enabled: () => modeRef.current === "scene",
  });

  const isScene = mode === "scene";

  return (
    <section
      ref={sectionRef}
      id="experience"
      // tall pinned-scroll range, sized by role count (~one viewport-ish of
      // scroll per gate; shorter per-gate on mobile where touch scroll
      // covers ground faster). Fallback mode is plain auto-height flow.
      className={`relative w-full thin-divider ${
        isScene ? "h-[var(--exp-h)] md:h-[var(--exp-h-md)]" : ""
      }`}
      style={
        isScene
          ? ({
              "--exp-h": `${(N + 1) * 55}vh`,
              "--exp-h-md": `${(N + 1) * 70}vh`,
            } as React.CSSProperties)
          : undefined
      }
    >
      {isScene ? (
        <div className="sticky top-0 h-screen overflow-hidden bg-[#070707]">
          {/* the void — mounts when the section is within ~800px */}
          <div className="absolute inset-0" aria-hidden>
            {mounted && (
              <ExperienceScene
                progressRef={progressRef}
                compact={compact}
                active={active}
              />
            )}
          </div>

          <ExperienceHUD roles={ROLES} activeIdx={activeIdx} onJump={jumpTo} />
        </div>
      ) : (
        <ExperienceFallback />
      )}

      {/* a11y — full content for screen readers in every mode */}
      <ol className="sr-only">
        {experience.map((r) => (
          <li key={`${r.company}-${r.start}`}>
            <strong>
              {r.role} at {r.company}
            </strong>{" "}
            ({r.start} – {r.end}
            {r.location ? `, ${r.location}` : ""}): {r.highlights.join(" ")}
          </li>
        ))}
      </ol>
    </section>
  );
}
