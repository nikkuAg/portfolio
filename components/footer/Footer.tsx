"use client";

import { smoothScrollTo } from "@/lib/scroll";

export function Footer() {
  return (
    <footer className="relative w-full border-t border-border">
      <div className="px-4 sm:px-6 md:px-10 py-5 sm:py-6 flex items-center justify-between gap-4 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-muted">
        <span className="inline-flex items-center gap-3">
          <span>© {new Date().getFullYear()}</span>
          {/* signature handle (variant B1 from the design handoff) — the
              mono @ welded to the cursive name, with the phosphor glow */}
          <span
            className="inline-flex items-baseline leading-none whitespace-nowrap normal-case tracking-normal"
            style={{
              filter:
                "drop-shadow(0 0 3px rgba(200,255,61,0.55)) drop-shadow(0 0 11px rgba(200,255,61,0.26))",
            }}
            aria-label="Divyansh Agarwal"
          >
            <span className="font-mono font-medium text-[12px] text-accent mr-px">
              @
            </span>
            <span
              className="text-accent text-[26px]"
              style={{ fontFamily: "var(--font-signature), cursive" }}
            >
              divyansh
            </span>
          </span>
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
