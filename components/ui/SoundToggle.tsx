"use client";

import { useSyncExternalStore } from "react";
import { sound } from "@/lib/sound";

// Mute-by-default sound toggle. Reads the singleton engine's state via
// useSyncExternalStore so it stays in sync without effects. Toggling also
// unlocks the AudioContext (first user gesture).
export function SoundToggle() {
  const enabled = useSyncExternalStore(
    sound.subscribe,
    () => sound.enabled,
    () => false, // SSR: muted
  );

  return (
    <button
      type="button"
      onClick={() => sound.toggle()}
      aria-pressed={enabled}
      aria-label={enabled ? "Mute sound" : "Enable sound"}
      className="group inline-flex items-center justify-center size-8 rounded-full text-muted hover:text-accent transition-colors"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        {/* speaker body */}
        <path
          d="M3 6h2.5L8.5 3.5v9L5.5 10H3z"
          fill="currentColor"
        />
        {enabled ? (
          // sound waves
          <>
            <path
              d="M10.5 5.5a3.5 3.5 0 0 1 0 5"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
            <path
              d="M12.3 4a6 6 0 0 1 0 8"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </>
        ) : (
          // muted X
          <path
            d="M10.5 6l3 4M13.5 6l-3 4"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        )}
      </svg>
    </button>
  );
}
