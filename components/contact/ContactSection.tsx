"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, type Variants } from "motion/react";
import { socials } from "@/content/socials";

const EMAIL = "a.divyansh.25@gmail.com";
// Google Drive direct-download URL (the `uc?export=download&id=...` form
// triggers a download instead of opening Drive's viewer). Swap to
// `/resume.pdf` once a local copy lands in `public/` — local file is
// cleaner UX (instant download, no third-party redirect).
const RESUME_HREF =
  "https://drive.google.com/uc?export=download&id=1LmN7IdIaGeu19aP3AjNrKh3LBXWF_Rru";

const HEADING_WORDS = ["Let's", "build", "something", "good."];

const MARQUEE_PHRASES = [
  "Let's build something good",
  "DM open",
  "Interfaces · Services · Wires",
];

// per-word slide-up from below a clip mask — Olivier-Larose / award-portfolio
// style heading reveal, sequential so the line reads in cadence
const wordReveal: Variants = {
  hidden: { y: "110%" },
  visible: (i: number) => ({
    y: 0,
    transition: {
      duration: 0.85,
      delay: 0.05 + i * 0.09,
      ease: [0.65, 0, 0.35, 1],
    },
  }),
};

// gentle stagger for the things that follow the heading — primary action,
// metadata row, sign-off row. Delay anchored after the heading words finish.
const fadeUp: Variants = {
  hidden: { y: 14, opacity: 0 },
  visible: (i: number) => ({
    y: 0,
    opacity: 1,
    transition: { duration: 0.55, delay: 0.55 + i * 0.1, ease: "easeOut" },
  }),
};

// letter-scramble pool for the email hover — letters cycle through this set
// then settle into the real address. @ and . are preserved so the scramble
// still reads as "an email" mid-animation
const SCRAMBLE_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789#$%&*";

export function ContactSection() {
  const [time, setTime] = useState("");

  const wrapRef = useRef<HTMLDivElement>(null);
  const wrapInView = useInView(wrapRef, { once: true, margin: "-15%" });

  const sigWrapRef = useRef<HTMLDivElement>(null);
  const sigInView = useInView(sigWrapRef, { once: true, margin: "-15%" });

  // email letter-scramble — driven by rAF so we don't pile up React updates,
  // bails out if the user mouses out (resets to clean target)
  const [scrambled, setScrambled] = useState(EMAIL);
  const scrambleRafRef = useRef<number | null>(null);
  const startScramble = () => {
    if (scrambleRafRef.current) cancelAnimationFrame(scrambleRafRef.current);
    const startTime = performance.now();
    const duration = 650;
    const step = () => {
      const t = Math.min(1, (performance.now() - startTime) / duration);
      const reveal = Math.floor(EMAIL.length * t);
      let out = "";
      for (let i = 0; i < EMAIL.length; i++) {
        const c = EMAIL[i];
        if (i < reveal || c === "@" || c === ".") {
          out += c;
        } else {
          out +=
            SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        }
      }
      setScrambled(out);
      if (t < 1) {
        scrambleRafRef.current = requestAnimationFrame(step);
      } else {
        scrambleRafRef.current = null;
      }
    };
    scrambleRafRef.current = requestAnimationFrame(step);
  };
  const resetScramble = () => {
    if (scrambleRafRef.current) cancelAnimationFrame(scrambleRafRef.current);
    scrambleRafRef.current = null;
    setScrambled(EMAIL);
  };

  // magnetic pull on the email — the wrapping zone is bigger than the anchor
  // (negative margin reclaim) so the cursor "catches" before reaching the
  // link. Transform applied directly to DOM to avoid per-frame React renders.
  const magnetZoneRef = useRef<HTMLDivElement>(null);
  const magnetTargetRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const zone = magnetZoneRef.current;
    const target = magnetTargetRef.current;
    if (!zone || !target) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (coarse) return; // touch devices — no magnetic
    const strength = 0.18;
    const onMove = (e: MouseEvent) => {
      const r = target.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      target.style.transform = `translate3d(${(e.clientX - cx) * strength}px, ${
        (e.clientY - cy) * strength
      }px, 0)`;
    };
    const onLeave = () => {
      target.style.transform = "translate3d(0,0,0)";
    };
    zone.addEventListener("mousemove", onMove);
    zone.addEventListener("mouseleave", onLeave);
    return () => {
      zone.removeEventListener("mousemove", onMove);
      zone.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  // live IST time in the eyebrow pill — ticks every 30s
  useEffect(() => {
    const tick = () => {
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "Asia/Kolkata",
        }),
      );
    };
    tick();
    const id = setInterval(tick, 30 * 1000);
    return () => clearInterval(id);
  }, []);

  // cleanup any in-flight scramble on unmount
  useEffect(
    () => () => {
      if (scrambleRafRef.current) cancelAnimationFrame(scrambleRafRef.current);
    },
    [],
  );

  const elsewhere = socials.filter((s) => s.label !== "Email");

  return (
    <section
      id="contact"
      className="relative w-full pt-24 sm:pt-32 md:pt-40 px-4 sm:px-6 md:px-10 thin-divider overflow-hidden"
    >
      {/* drifting phosphor bloom — slow ambient breathing, no frame */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-32 w-[55vw] h-[55vw] max-w-[720px] max-h-[720px] contact-bloom-drift"
        style={{
          background:
            "radial-gradient(closest-side, rgba(200,255,61,0.08), transparent 70%)",
        }}
      />

      <div
        ref={wrapRef}
        className="relative max-w-7xl mx-auto pb-16 sm:pb-20"
      >
        {/* eyebrow — live IST time folded into the status pill */}
        <div className="flex items-baseline justify-between mb-12 sm:mb-16 gap-4">
          <span className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.3em] text-muted">
            04 / Contact
          </span>
          <span className="font-mono text-[10px] sm:text-xs uppercase tracking-widest text-accent flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(200,255,61,0.8)] animate-pulse" />
            Inbox Open <span className="text-muted/60">·</span>{" "}
            <span className="text-muted">{time || "--:--"} IST</span>
          </span>
        </div>

        {/* editorial heading — each word wipes up from a clip mask. The
            italic "something" word keeps its accent phosphor styling. */}
        <h2
          className="font-serif leading-[0.92] tracking-tight max-w-5xl text-foreground"
          style={{ fontSize: "clamp(2.5rem, 9vw, 6.5rem)" }}
        >
          {HEADING_WORDS.map((word, i) => (
            <span
              key={i}
              className="inline-block overflow-hidden align-bottom mr-[0.18em]"
              style={{ paddingBottom: "0.08em" }}
            >
              <motion.span
                className="inline-block"
                custom={i}
                variants={wordReveal}
                initial="hidden"
                animate={wrapInView ? "visible" : "hidden"}
              >
                {word === "something" ? (
                  <em
                    className="italic"
                    style={{
                      color: "#c8ff3d",
                      textShadow:
                        "0 0 28px rgba(200,255,61,0.25), 0 0 4px rgba(200,255,61,0.35)",
                    }}
                  >
                    {word}
                  </em>
                ) : (
                  word
                )}
              </motion.span>
            </span>
          ))}
        </h2>

        {/* primary action: magnetic email + letter-scramble on hover */}
        <motion.div
          className="mt-10 sm:mt-14 flex flex-col gap-6 sm:gap-7"
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate={wrapInView ? "visible" : "hidden"}
        >
          <div
            ref={magnetZoneRef}
            className="-m-6 p-6 w-fit max-w-full"
          >
            <a
              ref={magnetTargetRef}
              href={`mailto:${EMAIL}`}
              onMouseEnter={startScramble}
              onMouseLeave={resetScramble}
              className="group relative inline-flex items-baseline gap-3 sm:gap-5 font-serif italic text-foreground hover:text-accent w-fit max-w-full break-all will-change-transform"
              style={{
                fontSize: "clamp(1.25rem, 4.5vw, 3rem)",
                textShadow:
                  "0 0 26px rgba(200,255,61,0.18), 0 0 4px rgba(200,255,61,0.18)",
                transition:
                  "transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), color 0.2s",
              }}
            >
              <span className="tabular-nums">{scrambled}</span>
              <span
                aria-hidden
                className="inline-block text-accent transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
              >
                ↗
              </span>
              {/* underline that draws in on hover (left-to-right) */}
              <span
                aria-hidden
                className="absolute left-0 -bottom-1 right-0 h-px bg-accent origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out"
                style={{ boxShadow: "0 0 8px rgba(200,255,61,0.7)" }}
              />
            </a>
          </div>

          {/* secondary row — resume pill + ambient metadata */}
          <motion.div
            className="flex flex-wrap items-center gap-x-4 sm:gap-x-5 gap-y-3 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-muted"
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate={wrapInView ? "visible" : "hidden"}
          >
            <a
              href={RESUME_HREF}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border hover:border-accent/60 hover:text-foreground transition-colors"
            >
              <span className="text-accent inline-block transition-transform duration-300 group-hover:translate-y-0.5">
                ↓
              </span>
              <span>Resume</span>
              <span className="text-muted/50 normal-case tracking-normal">
                pdf
              </span>
            </a>
            <span className="text-muted/40">·</span>
            <span>India · UTC+5:30</span>
            <span className="text-muted/40">·</span>
            <span>Reply &lt; 24h</span>
          </motion.div>
        </motion.div>

        {/* signature flourish — italic name + chalk underscore that draws in
            on scroll-into-view with a glowing terminator dot */}
        <div
          ref={sigWrapRef}
          className="mt-20 sm:mt-28 md:mt-32 flex justify-end"
        >
          <div className="relative inline-block text-right">
            <motion.span
              className="block font-serif italic text-xl sm:text-2xl text-foreground/85"
              style={{ textShadow: "0 0 14px rgba(200,255,61,0.12)" }}
              initial={{ opacity: 0, y: 8 }}
              animate={
                sigInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }
              }
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Divyansh
            </motion.span>
            <svg
              aria-hidden
              viewBox="0 0 240 28"
              className="block w-[180px] sm:w-[220px] lg:w-[260px] -mt-1 ml-auto"
              preserveAspectRatio="none"
            >
              <path
                d="M 6 16 C 32 6, 72 24, 118 12 S 196 22, 234 10"
                stroke="rgba(200,255,61,0.18)"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M 6 16 C 32 6, 72 24, 118 12 S 196 22, 234 10"
                stroke="#c8ff3d"
                strokeWidth="1.4"
                fill="none"
                strokeLinecap="round"
                style={{
                  strokeDasharray: 280,
                  strokeDashoffset: sigInView ? 0 : 280,
                  transition:
                    "stroke-dashoffset 1.8s cubic-bezier(0.65, 0, 0.35, 1) 0.4s",
                  filter: "drop-shadow(0 0 6px rgba(200,255,61,0.45))",
                }}
              />
              <circle
                cx="234"
                cy="10"
                r="2"
                fill="#c8ff3d"
                style={{
                  opacity: sigInView ? 1 : 0,
                  transition: "opacity 0.4s ease 2.0s",
                  filter: "drop-shadow(0 0 6px rgba(200,255,61,0.7))",
                }}
              />
            </svg>
          </div>
        </div>

        {/* "Also at" P.S. row — single hairline-bordered inline list */}
        <motion.div
          className="mt-12 sm:mt-16 border-t border-border/60 pt-5 sm:pt-6 flex flex-wrap items-center gap-x-5 sm:gap-x-7 gap-y-3 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-muted"
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate={wrapInView ? "visible" : "hidden"}
        >
          <span>Also at</span>
          {elsewhere.map((s, i) => {
            const isExternal = s.href.startsWith("http");
            return (
              <span
                key={s.label}
                className="flex items-center gap-x-5 sm:gap-x-7"
              >
                {i > 0 && <span className="text-muted/40">·</span>}
                <a
                  href={s.href}
                  target={isExternal ? "_blank" : undefined}
                  rel={isExternal ? "noopener noreferrer" : undefined}
                  className="group inline-flex items-baseline gap-1.5 text-foreground/80 hover:text-accent transition-colors"
                >
                  <span>{s.label}</span>
                  <span className="text-muted/60 normal-case tracking-normal">
                    {s.handle}
                  </span>
                  <span
                    aria-hidden
                    className="text-accent transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  >
                    ↗
                  </span>
                </a>
              </span>
            );
          })}
        </motion.div>
      </div>

      {/* sign-off marquee — endless horizontal scroll, pauses on hover.
          Content is duplicated once so the -50% translate seams perfectly. */}
      <div
        aria-hidden
        className="contact-marquee-track relative w-full overflow-hidden border-t border-border/60 py-6 sm:py-8"
      >
        <div
          className="contact-marquee flex flex-nowrap items-center whitespace-nowrap font-serif italic text-foreground/85"
          style={{
            fontSize: "clamp(1.15rem, 3.5vw, 3rem)",
            textShadow: "0 0 18px rgba(200,255,61,0.12)",
          }}
        >
          {[0, 1].map((dup) => (
            <div
              key={dup}
              className="flex items-center shrink-0"
            >
              {MARQUEE_PHRASES.map((p, i) => (
                <span
                  key={`${dup}-${i}`}
                  className="flex items-center pr-12 sm:pr-16"
                >
                  {p}
                  <span
                    className="text-accent pl-12 sm:pl-16"
                    style={{ textShadow: "0 0 12px rgba(200,255,61,0.6)" }}
                  >
                    ✦
                  </span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
