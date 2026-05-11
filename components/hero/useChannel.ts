"use client";

import { useEffect, useState } from "react";
import { smoothScrollTo } from "@/lib/scroll";

export const CHANNELS = [
  { label: "GAME", section: null },
  { label: "ABOUT", section: "about" },
  { label: "PROJECTS", section: "projects" },
  { label: "EXPERIENCE", section: "experience" },
  { label: "CONTACT", section: "contact" },
] as const;

let current = 0;
const listeners = new Set<(c: number) => void>();

export function setChannel(c: number) {
  current = ((c % CHANNELS.length) + CHANNELS.length) % CHANNELS.length;
  listeners.forEach((l) => l(current));
  const target = CHANNELS[current].section;
  if (target) {
    smoothScrollTo("#" + target);
  } else {
    smoothScrollTo("top");
  }
}

export function advanceChannel() {
  setChannel(current + 1);
}

export function useChannel() {
  const [c, setC] = useState(current);
  useEffect(() => {
    listeners.add(setC);
    return () => {
      listeners.delete(setC);
    };
  }, []);
  return c;
}
