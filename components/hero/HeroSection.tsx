"use client";

import dynamic from "next/dynamic";
import { about } from "@/content/about";
import { CHANNELS, useChannel } from "./useChannel";

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

export function HeroSection() {
  const channel = useChannel();
  const ch = CHANNELS[channel];
  return (
    <section
      id="top"
      className="relative w-full min-h-screen overflow-hidden bg-dots"
    >
      {/* 3D CRT scene */}
      <div className="absolute inset-0">
        <CRTScene />
      </div>

      {/* overlay — non-interactive UI text. The hero name + tagline live INSIDE
           the CRT screen now (typewriter), so this overlay just gives context. */}
      <div className="relative z-10 pointer-events-none w-full h-screen flex flex-col justify-between px-6 md:px-10 py-28 md:py-32">
        {/* top label */}
        <div className="flex items-start justify-between font-mono text-[10px] uppercase tracking-[0.3em] text-muted">
          <div className="flex flex-col gap-1">
            <span className="text-foreground">Divyansh Agarwal</span>
            <span>Portfolio · {new Date().getFullYear()}</span>
          </div>
          <div className="hidden md:flex flex-col items-end gap-1">
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
            <span className="text-foreground">Controls</span> · Arrows/WASD ·
            Space to pause · Click knob to switch channel
          </div>

          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted text-right hidden md:block">
            <span className="block text-foreground">{about.title}</span>
            <span className="italic">{about.tagline}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
