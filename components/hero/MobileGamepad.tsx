"use client";

import { useEffect, useState } from "react";

// Touch controls for the snake game inside the CRT. Talks to CRTScreen via
// a window CustomEvent so we don't have to thread state through the R3F tree.
//
// Visible only on coarse-pointer devices, and only after the typewriter
// overlay has been dismissed (CRTScreen dispatches `crt-typedone` then
// `crt-dismissed` to unlock the controls).

export type SnakeInputDir = "up" | "down" | "left" | "right";
export type SnakeInputDetail =
  | { kind: "dir"; dir: SnakeInputDir }
  | { kind: "pause" };

export function MobileGamepad() {
  const [coarse, setCoarse] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setCoarse(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  useEffect(() => {
    if (!coarse) return;
    function onTypeDone() {
      setActive(true);
    }
    window.addEventListener("crt-typedone", onTypeDone);
    return () => window.removeEventListener("crt-typedone", onTypeDone);
  }, [coarse]);

  if (!coarse) return null;

  function press(detail: SnakeInputDetail) {
    if (!active) return;
    window.dispatchEvent(new CustomEvent("snake-input", { detail }));
  }

  return (
    <div
      className={`md:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-30 transition-opacity duration-500 ${
        active ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      aria-hidden={!active}
    >
      {/* sized so each face is ~52px (well above the 44px iOS thumb target),
          with the D-pad at 168×168 and a generous pause column. */}
      <div className="flex items-center gap-3 bg-card/85 backdrop-blur-md border border-border rounded-2xl p-3 shadow-[0_10px_28px_rgba(0,0,0,0.55)]">
        {/* D-pad */}
        <div className="grid grid-cols-3 grid-rows-3 gap-1.5 w-[168px] h-[168px]">
          <span />
          <Btn label="↑" onPress={() => press({ kind: "dir", dir: "up" })} />
          <span />
          <Btn label="←" onPress={() => press({ kind: "dir", dir: "left" })} />
          <span className="grid place-items-center">
            <span className="size-2 rounded-full bg-accent/70 shadow-[0_0_6px_rgba(200,255,61,0.6)]" />
          </span>
          <Btn label="→" onPress={() => press({ kind: "dir", dir: "right" })} />
          <span />
          <Btn label="↓" onPress={() => press({ kind: "dir", dir: "down" })} />
          <span />
        </div>

        {/* pause / restart — full-height column next to the D-pad */}
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            press({ kind: "pause" });
          }}
          aria-label="Pause / restart"
          className="w-14 h-[168px] rounded-xl border border-border bg-background/60 active:bg-accent/20 active:border-accent transition-colors font-mono text-xl text-foreground/85 active:text-accent flex items-center justify-center touch-manipulation"
        >
          ⏯
        </button>
      </div>
    </div>
  );
}

function Btn({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      // pointerdown so direction registers immediately, no 300ms tap delay
      onPointerDown={(e) => {
        e.preventDefault();
        onPress();
      }}
      className="rounded-md border border-border bg-background/60 active:bg-accent/20 active:border-accent transition-colors font-mono text-xl text-foreground/85 active:text-accent grid place-items-center select-none touch-manipulation"
    >
      {label}
    </button>
  );
}
