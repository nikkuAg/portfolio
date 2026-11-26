"use client";

import Link from "next/link";
import { RESUME_URL } from "@/lib/site";
import { smoothScrollTo } from "@/lib/scroll";
import { CHANNELS, tv, useTV } from "./tv-store";
import s from "./concepts.module.css";

export type Variant = "broadcast" | "room" | "fear" | "artillery" | "signature" | "terrain" | "level" | "workmap" | "trace" | "eco" | "sky" | "playground" | "flow" | "morph" | "ink" | "sand" | "strings" | "filings" | "glass" | "sparkler" | "harmono" | "mosaic" | "mix" | "lights" | "record" | "select" | "canvas" | "ask" | "race" | "booth" | "pan" | "move" | "controller" | "seq" | "garage" | "world";

/** Real HTML: name, role and the way out, readable before any canvas loads. */
export function HeroCopy({
  placement = "bottom",
  nameHidden = false,
  children,
}: {
  placement?: "bottom" | "top" | "right" | "side";
  // when the canvas itself draws the name, the h1 stays for screen readers
  // and search but isn't painted twice
  nameHidden?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={s.copy} data-placement={placement}>
      <h1 className={nameHidden ? "sr-only" : s.name}>Divyansh Agarwal</h1>
      <p className={s.lede}>
        Full-stack engineer in Bangalore. I build interfaces, the services
        behind them, and small games on the side.
      </p>
      <div className={s.actions}>
        <a className={s.primary} href={RESUME_URL} target="_blank" rel="noreferrer">
          Résumé (PDF)
        </a>
        <a
          className={s.secondary}
          href="#projects"
          onClick={(e) => {
            e.preventDefault();
            smoothScrollTo("#projects");
          }}
        >
          Skip to projects
        </a>
      </div>
      {children}
    </div>
  );
}

/** The accessible twin of the dial on the set. */
export function TVControls() {
  const { channel, sound, power } = useTV();
  const ch = CHANNELS[channel];
  return (
    <>
      <div className={s.tuner} role="group" aria-label="TV controls">
        <button type="button" onClick={() => tv.prev()} aria-label="Previous channel">
          ◂
        </button>
        <span className={s.now} aria-live="polite">
          {power ? `${ch.number} ${ch.name}` : "Off"}
        </span>
        <button type="button" onClick={() => tv.next()} aria-label="Next channel">
          ▸
        </button>
        <button type="button" onClick={() => tv.toggleSound()} aria-pressed={sound}>
          {sound ? "Sound on" : "Sound off"}
        </button>
      </div>
      <p className={s.hint}>Turn the dial on the set, or press 1 to 4.</p>
    </>
  );
}

// Shortlist only. Ruled out (routes and code kept): A desk, B broadcast,
// D 29.8N, F terrain, G level, H work map, I your visit, J ecosystem,
// K Bangalore sky, L playground; O-V (ink, sand, strings, filings, glass,
// sparkler, harmonograph, mosaic) were one idea in eight styles
const LINKS: { id: Variant; label: string }[] = [
  { id: "fear", label: "C · Fear" },
  { id: "signature", label: "E · Signature" },
  { id: "flow", label: "M · Flow" },
  { id: "morph", label: "N · Morph" },
  { id: "mix", label: "W · The mix" },
  { id: "lights", label: "X · Lights out" },
  { id: "record", label: "Y · Side A/B" },
  { id: "select", label: "Z · Player select" },
  { id: "canvas", label: "AA · The canvas" },
  { id: "ask", label: "AB · Ask me" },
  { id: "race", label: "AC · Race me" },
  { id: "booth", label: "AD · The booth" },
  { id: "pan", label: "AE · Pan toss" },
  { id: "move", label: "AF · Your move" },
  { id: "controller", label: "AG · Controller" },
  { id: "seq", label: "AH · Sequencer" },
  { id: "garage", label: "AI · The garage (3D)" },
  { id: "world", label: "AJ · Tiny world (3D)" },
];

export function ConceptSwitcher({ current }: { current: Variant }) {
  return (
    <nav className={s.switcher} aria-label="Hero concepts">
      {LINKS.map((l) => (
        <Link
          key={l.id}
          href={`/crt-concepts/${l.id}?skipintro`}
          aria-current={current === l.id ? "page" : undefined}
        >
          {l.label}
        </Link>
      ))}
      <Link href="/">Live</Link>
    </nav>
  );
}
