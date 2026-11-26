"use client";

import { useSyncExternalStore } from "react";

// One TV per page. Module-level store so the 3D scene (frame loop reads),
// the HTML controls and keyboard handlers all share the same set.

export type ChannelId = "testcard" | "teletext" | "reel" | "afterhours";

export const CHANNELS: { id: ChannelId; number: number; name: string }[] = [
  { id: "testcard", number: 1, name: "Test card" },
  { id: "teletext", number: 2, name: "Teletext" },
  { id: "reel", number: 3, name: "Now showing" },
  { id: "afterhours", number: 4, name: "After hours" },
];

type TVState = {
  channel: number; // index into CHANNELS
  power: boolean;
  sound: boolean;
  // performance.now() of the last tune — the screen shader reads this to
  // run the static burst + vertical roll
  tunedAt: number;
  // optional project index the reel should start on (cartridge insert)
  reelStart: number;
};

let state: TVState = {
  channel: 0,
  power: true,
  sound: false,
  tunedAt: -1e9,
  reelStart: 0,
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const tv = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  tune(index: number, opts: { reelStart?: number } = {}) {
    const n = CHANNELS.length;
    const channel = ((index % n) + n) % n;
    state = {
      ...state,
      channel,
      power: true,
      tunedAt: performance.now(),
      reelStart: opts.reelStart ?? state.reelStart,
    };
    emit();
  },
  next() {
    tv.tune(state.channel + 1);
  },
  prev() {
    tv.tune(state.channel - 1);
  },
  togglePower() {
    state = { ...state, power: !state.power, tunedAt: performance.now() };
    emit();
  },
  toggleSound() {
    state = { ...state, sound: !state.sound };
    emit();
  },
};

export function useTV() {
  return useSyncExternalStore(tv.subscribe, tv.get, tv.get);
}
