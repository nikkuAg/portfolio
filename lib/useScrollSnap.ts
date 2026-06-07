"use client";

import { useEffect } from "react";
import type { MotionValue } from "motion/react";

// Snap-to-step for pinned scroll sections (Projects deck, Experience gates).
//
// A pinned section maps scrollYProgress → a discrete "step" (card / gate)
// via `pos = ((progress - leadIn) / span) * (steps - 1)`. This hook makes
// the page settle onto whole steps: when scrolling pauses mid-transition
// inside the pinned range, it glides to the nearest step. It also returns
// `jumpTo(i)` for progress dots / clickable markers.
//
// Lenis-aware: Lenis owns the scroll position on desktop — a native
// window.scrollTo gets overwritten on its next raf, so we route through
// window.__lenis when present (typed in lib/scroll.ts) and fall back to
// native smooth scroll (touch / reduced-motion, where Lenis is skipped).
type ScrollSnapOptions = {
  scrollYProgress: MotionValue<number>;
  sectionRef: React.RefObject<HTMLElement | null>;
  /** number of discrete steps (cards / gates) */
  steps: number;
  /** progress value where step 0 sits (lead-in dead zone before it) */
  leadIn?: number;
  /** progress span covering steps 0..steps-1 (lead-out dead zone after) */
  span?: number;
  /** evaluated at snap time — return false to suppress snapping */
  enabled?: () => boolean;
  /** quiet time after the last meaningful scroll before snapping */
  settleMs?: number;
};

export function useScrollSnap({
  scrollYProgress,
  sectionRef,
  steps,
  leadIn = 0.07,
  span = 0.84,
  enabled,
  settleMs = 90,
}: ScrollSnapOptions) {
  function jumpTo(targetIdx: number) {
    const section = sectionRef.current;
    if (!section) return;
    const rect = section.getBoundingClientRect();
    const sectionTop = window.scrollY + rect.top;
    const sectionScroll = section.offsetHeight - window.innerHeight;
    const e = steps === 1 ? 0 : targetIdx / (steps - 1);
    const latest = e * span + leadIn;
    const top = sectionTop + latest * sectionScroll;
    // duration scales with distance: short settles are quick (~0.35s),
    // multi-step jumps from progress markers get a longer glide
    const lenis = window.__lenis;
    const duration = Math.min(0.9, 0.3 + Math.abs(top - window.scrollY) / 3000);
    if (lenis) lenis.scrollTo(top, { duration });
    else window.scrollTo({ top, behavior: "smooth" });
  }

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastY = 0;
    const snap = () => {
      if (enabled && !enabled()) return;
      const latest = scrollYProgress.get();
      // entering/exiting the section — let the user pass through freely
      if (latest <= leadIn || latest >= leadIn + span) return;
      const pos = ((latest - leadIn) / span) * (steps - 1);
      const nearest = Math.round(pos);
      if (Math.abs(pos - nearest) < 0.02) return; // already settled
      jumpTo(nearest);
    };
    const onScroll = () => {
      const y = window.scrollY;
      const moved = Math.abs(y - lastY);
      lastY = y;
      // Lenis's ease-out emits scroll events for a long sub-pixel tail —
      // only meaningful movement re-arms the timer, so the snap kicks in
      // once the scroll has *effectively* stopped, not fully stopped
      if (moved < 2) return;
      clearTimeout(timer);
      timer = setTimeout(snap, settleMs);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollYProgress, steps, leadIn, span, settleMs]);

  return { jumpTo };
}
