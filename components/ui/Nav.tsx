"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { smoothScrollTo } from "@/lib/scroll";

const links = [
  { href: "#about", label: "About" },
  { href: "#projects", label: "Projects" },
  { href: "#experience", label: "Experience" },
  { href: "#contact", label: "Contact" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [time, setTime] = useState<string>("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
      );
    };
    tick();
    const id = setInterval(tick, 30 * 1000);
    return () => clearInterval(id);
  }, []);

  // lock body scroll when drawer is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function handleNavClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    e.preventDefault();
    setOpen(false);
    // give the drawer a moment to start closing before the scroll kicks in
    requestAnimationFrame(() => smoothScrollTo(href));
  }

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 md:px-10 py-4 md:py-5 transition-all duration-500 ${
          scrolled || open
            ? "bg-background/80 backdrop-blur-md border-b border-border"
            : ""
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setOpen(false);
              smoothScrollTo("top");
            }}
            aria-label="Divyansh Agarwal — back to top"
            className="block text-accent hover:text-foreground transition-colors duration-300"
          >
            {/* DA mark — inlined (simple variant, no scanlines at this size)
                so it inherits currentColor for the hover swap */}
            <svg
              viewBox="0 0 120 120"
              className="size-8 md:size-9"
              fill="none"
              aria-hidden
            >
              <mask
                id="daCutNav"
                maskUnits="userSpaceOnUse"
                x="0"
                y="0"
                width="120"
                height="120"
              >
                <rect width="120" height="120" fill="#000" />
                <path
                  d="M32 20H58Q88 20 88 60Q88 100 58 100H32Z"
                  fill="#fff"
                />
                <path
                  d="M44 88V46L58 30L72 46V88M44 66H72"
                  stroke="#000"
                  strokeWidth="7"
                />
              </mask>
              <path
                d="M32 20H58Q88 20 88 60Q88 100 58 100H32Z"
                fill="currentColor"
                mask="url(#daCutNav)"
              />
            </svg>
          </a>

          {/* desktop nav */}
          <ul className="hidden md:flex items-center gap-8 text-xs font-mono uppercase tracking-widest">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="text-muted hover:text-foreground transition-colors duration-300"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="hidden md:flex items-center gap-2 text-xs font-mono text-muted">
            <span className="size-1.5 rounded-full bg-accent animate-pulse" />
            <span>{time} IST</span>
          </div>

          {/* mobile hamburger */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="md:hidden relative w-9 h-9 grid place-items-center -mr-2"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            <span
              className={`absolute left-1/2 -translate-x-1/2 w-5 h-px bg-foreground transition-all duration-300 ${
                open ? "rotate-45" : "-translate-y-1.5"
              }`}
            />
            <span
              className={`absolute left-1/2 -translate-x-1/2 w-5 h-px bg-foreground transition-all duration-300 ${
                open ? "-rotate-45" : "translate-y-1.5"
              }`}
            />
          </button>
        </div>
      </nav>

      {/* mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="nav-drawer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur-md pt-20"
            onClick={() => setOpen(false)}
          >
            <motion.ul
              initial={{ y: -12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -8, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
              className="px-6 flex flex-col gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              {links.map((link, i) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={(e) => handleNavClick(e, link.href)}
                    className="flex items-baseline justify-between border-b border-border py-5 font-display font-semibold text-3xl tracking-tight hover:text-accent transition-colors"
                  >
                    <span>{link.label}</span>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                      0{i + 1}
                    </span>
                  </a>
                </li>
              ))}
              <li className="mt-8 flex items-center font-mono text-[11px] uppercase tracking-widest text-muted">
                <span className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-accent animate-pulse" />
                  {time} IST
                </span>
              </li>
            </motion.ul>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
