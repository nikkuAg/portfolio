import type Lenis from "lenis";

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

export function smoothScrollTo(target: string | HTMLElement | null) {
  if (typeof window === "undefined") return;
  const el =
    typeof target === "string"
      ? document.querySelector<HTMLElement>(target)
      : target;
  if (!el && target !== "top") return;
  const lenis = window.__lenis;
  if (lenis) {
    if (target === "top") lenis.scrollTo(0);
    else if (el) lenis.scrollTo(el);
  } else {
    if (target === "top") window.scrollTo({ top: 0, behavior: "smooth" });
    else el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}
