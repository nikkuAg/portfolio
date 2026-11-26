"use client";

import { useFrame } from "@react-three/fiber";
import type { Glow } from "./TVScreen";

/** Pushes the screen's light colour into CSS so the page is lit by it. */
export function GlowToDom({
  glow,
  target,
}: {
  glow: React.RefObject<Glow>;
  target: React.RefObject<HTMLElement | null>;
}) {
  useFrame(() => {
    const el = target.current;
    const g = glow.current;
    if (!el || !g) return;
    const r = Math.round(g.color.r * 255);
    const gg = Math.round(g.color.g * 255);
    const b = Math.round(g.color.b * 255);
    el.style.setProperty("--glow", `${r} ${gg} ${b}`);
    el.style.setProperty("--glow-a", Math.min(1, g.intensity).toFixed(3));
  });
  return null;
}
