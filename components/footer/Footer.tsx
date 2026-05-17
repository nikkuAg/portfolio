"use client";

import { smoothScrollTo } from "@/lib/scroll";

export function Footer() {
  return (
    <footer className="relative w-full border-t border-border">
      <div className="px-4 sm:px-6 md:px-10 py-5 sm:py-6 flex items-center justify-between gap-4 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-muted">
        <span>
          © {new Date().getFullYear()}{" "}
          <span className="text-foreground">Divyansh Agarwal</span>
        </span>
        <button
          type="button"
          onClick={() => smoothScrollTo("top")}
          className="group inline-flex items-center gap-2 text-muted hover:text-accent transition-colors"
        >
          <span>Back to top</span>
          <span
            aria-hidden
            className="inline-block text-accent transition-transform group-hover:-translate-y-0.5"
          >
            ↑
          </span>
        </button>
      </div>
    </footer>
  );
}
