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
            {/* DA monogram — inlined with currentColor so it inherits the
                accent and swaps to white on hover. Tight square viewBox
                frames the centered mark. */}
            <svg
              viewBox="134 134 756 756"
              className="size-8 md:size-9"
              fill="currentColor"
              aria-hidden
            >
              <path d="M602.553 224.64C645.706 224.996 688.237 234.953 727.066 253.787C795.647 286.769 848.301 345.662 873.416 417.488C898.509 490.952 895.568 565.445 861.057 635.534C829.411 701.224 774.034 752.48 706.095 778.961C690.399 785.177 676.462 787.519 660.878 792.83C654.078 785.26 646.447 770.411 641.165 761.075L607.573 702.241C601.536 691.507 587.119 664.428 579.84 656.282C608.396 658.031 636.474 656.706 662.793 644.31C685.17 633.773 701.891 622.207 717.145 602.459C735.018 578.841 747.49 549.843 748.762 520.013C750.595 480.533 736.762 441.927 710.263 412.602C689.015 389.519 662.217 376.744 632.022 369.442C615.115 365.351 590.119 366.281 571.917 366.24L503.733 366.296L333.366 366.406C294.112 366.436 254.101 367.03 214.924 365.453C207.475 353.877 201.1 341.72 194.168 329.83L134.042 224.999C178.517 224.313 224.579 225.038 269.218 225.092L602.553 224.64Z" />
              <path d="M381.547 381.756C387.181 386.279 402.861 416.456 407.456 424.684L441.814 485.743C447.545 495.941 453.443 507.657 459.525 517.328C456.308 522.121 452.145 530.826 449.206 536.17C443.349 546.601 437.362 556.958 431.248 567.24L344.01 717.883C335.243 733.293 326.308 748.59 317.567 764.015C311.284 775.101 305.53 786.958 298.67 797.64C273.638 798.994 244.197 797.797 218.251 798.582C192.764 798.65 165.209 798.321 139.791 799.36C147.797 787.047 154.261 774.765 161.439 761.965C171.681 743.638 182.079 725.393 192.631 707.246C213.689 671.22 234.538 635.072 255.177 598.807C274.057 566.356 292.876 535.194 311.464 502.347L358.206 421.434C364.649 410.338 374.417 391.201 381.547 381.756Z" />
              <path d="M302.333 515.5C353.856 515.652 407.219 516.216 458.693 515.38C464.225 522.896 565.156 700.536 569.899 708.525C577.088 720.651 618.745 789.935 618.812 798.784C611.869 798.044 604.089 797.834 597.101 797.954C553.485 798.732 509.179 797.513 465.641 798.695C460.598 792.972 445.137 764.673 440.37 756.31L302.333 515.5Z" />
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

          {/* right cluster — live time (desktop), hamburger */}
          <div className="flex items-center gap-2 sm:gap-3">
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
