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
  "End of broadcast",
  "Thanks for tuning in",
  "DM open · reply < 24h",
  "Transmission continues on CH·01–05",
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

// gentle stagger for the things that follow the heading — continue row,
// high-score table, player stats. Delay anchored after the heading words.
const fadeUp: Variants = {
  hidden: { y: 14, opacity: 0 },
  visible: (i: number) => ({
    y: 0,
    opacity: 1,
    transition: { duration: 0.55, delay: 0.55 + i * 0.1, ease: "easeOut" },
  }),
};

export function ContactSection() {
  const [time, setTime] = useState("");

  const wrapRef = useRef<HTMLDivElement>(null);
  const wrapInView = useInView(wrapRef, { once: true, margin: "-15%" });

  const sigWrapRef = useRef<HTMLDivElement>(null);
  const sigInView = useInView(sigWrapRef, { once: true, margin: "-15%" });

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

  // high-score table — socials (minus email, which is the press-start CTA)
  // with the resume slotted in, then the YOU easter-egg row
  const elsewhere = socials.filter((s) => s.label !== "Email");
  const scoreRows: {
    label: string;
    handle: string;
    href: string;
    download?: boolean;
  }[] = [
    ...elsewhere.map((s) => ({ label: s.label, handle: s.handle, href: s.href })),
    { label: "Resume", handle: ".pdf", href: RESUME_HREF, download: true },
  ];

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
        {/* viewfinder corner brackets — the arcade screen reads as one unit,
            same treatment as the experience stage */}
        <ScreenCornerBrackets />

        {/* eyebrow — live IST time folded into the status pill */}
        <div className="flex items-baseline justify-between mb-10 sm:mb-14 gap-4">
          <span className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.3em] text-muted">
            04 / Contact
          </span>
          <span className="font-mono text-[10px] sm:text-xs uppercase tracking-widest text-accent flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(200,255,61,0.8)] animate-pulse" />
            Inbox Open <span className="text-muted/60">·</span>{" "}
            <span className="text-muted">{time || "--:--"} IST</span>
          </span>
        </div>

        {/* RUN COMPLETE banner — the page was the game, this is the end card */}
        <motion.div
          className="flex items-center gap-4 sm:gap-6 mb-6 sm:mb-8"
          initial={{ opacity: 0 }}
          animate={wrapInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span aria-hidden className="h-px flex-1 max-w-24 sm:max-w-40 bg-gradient-to-r from-transparent to-accent/50" />
          <span className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.4em] text-accent text-glow">
            Run Complete
          </span>
          <span aria-hidden className="h-px flex-1 bg-gradient-to-l from-transparent to-accent/50" />
        </motion.div>

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

        {/* press-start email */}
        <motion.div
          className="mt-10 sm:mt-14 flex flex-col gap-5 sm:gap-6"
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate={wrapInView ? "visible" : "hidden"}
        >
          {/* primary action: magnetic email (plain text — no scramble) */}
          <div ref={magnetZoneRef} className="-m-6 p-6 w-fit max-w-full">
            <a
              ref={magnetTargetRef}
              href={`mailto:${EMAIL}`}
              className="group relative inline-flex items-baseline gap-3 sm:gap-5 font-serif italic text-foreground hover:text-accent w-fit max-w-full break-all will-change-transform"
              style={{
                fontSize: "clamp(1.25rem, 4.5vw, 3rem)",
                textShadow:
                  "0 0 26px rgba(200,255,61,0.18), 0 0 4px rgba(200,255,61,0.18)",
                transition:
                  "transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), color 0.2s",
              }}
            >
              <span>{EMAIL}</span>
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
        </motion.div>

        {/* OTHER CHANNELS — socials as a channel list, picking up the
            hero TV's CH·01 motif (each link = a channel you can reach me on) */}
        <motion.div
          className="mt-14 sm:mt-20 max-w-2xl"
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate={wrapInView ? "visible" : "hidden"}
        >
          <div className="flex items-center gap-4 mb-4 sm:mb-5">
            <span className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.4em] text-muted">
              Other Channels
            </span>
            <span aria-hidden className="h-px flex-1 bg-border" />
          </div>

          <ol className="flex flex-col">
            {scoreRows.map((row, i) => {
              const isExternal = row.href.startsWith("http");
              return (
                <li key={row.label}>
                  <a
                    href={row.href}
                    target={isExternal ? "_blank" : undefined}
                    rel={isExternal ? "noopener noreferrer" : undefined}
                    download={row.download}
                    className="group flex items-baseline gap-3 sm:gap-5 py-2.5 sm:py-3 border-b border-border/50 font-mono text-[11px] sm:text-xs uppercase tracking-[0.18em] text-foreground/80 hover:text-accent transition-[color,padding] duration-200 hover:pl-2"
                  >
                    <span className="text-accent/70 group-hover:text-accent tabular-nums">
                      CH·{String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-foreground group-hover:text-accent">
                      {row.label}
                    </span>
                    <span className="text-muted/70 normal-case tracking-normal truncate">
                      {row.handle}
                    </span>
                    <span
                      aria-hidden
                      className="ml-auto text-accent transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    >
                      ↗
                    </span>
                  </a>
                </li>
              );
            })}
            {/* the open slot — the channel that's still static, waiting */}
            <li>
              <a
                href={`mailto:${EMAIL}?subject=${encodeURIComponent("Tuning into channel 05")}`}
                className="group flex items-baseline gap-3 sm:gap-5 py-2.5 sm:py-3 font-mono text-[11px] sm:text-xs uppercase tracking-[0.18em] text-muted hover:text-accent transition-[color,padding] duration-200 hover:pl-2"
              >
                <span className="tabular-nums text-muted/60 group-hover:text-accent">
                  CH·{String(scoreRows.length + 1).padStart(2, "0")}
                </span>
                <span className="arcade-blink">You</span>
                <span className="text-muted/50 normal-case tracking-normal">
                  ··· this channel is open
                </span>
                <span
                  aria-hidden
                  className="ml-auto text-accent transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                >
                  ↗
                </span>
              </a>
            </li>
          </ol>
        </motion.div>

        {/* player stats footer line */}
        <motion.div
          className="mt-10 sm:mt-12 flex flex-wrap items-center gap-x-4 sm:gap-x-5 gap-y-2 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-muted"
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate={wrapInView ? "visible" : "hidden"}
        >
          <span>
            Player: <span className="text-foreground">Divyansh</span>
          </span>
          <span className="text-muted/40">·</span>
          <span>Location: India (UTC+5:30)</span>
          <span className="text-muted/40">·</span>
          <span>
            Response: <span className="text-accent">&lt; 24h</span>
          </span>
        </motion.div>

        {/* signature — the handwritten mark (Sacramento + hand-tuned looping
            flourish from the design handoff). The word fades in, then the
            flourish draws itself, ending in the glowing dot. */}
        <div
          ref={sigWrapRef}
          className="mt-16 sm:mt-24 md:mt-28 flex justify-end"
        >
          <SignatureLooped inView={sigInView} />
        </div>
      </div>

      {/* end-of-broadcast ticker — the strip at the bottom of a TV
          transmission. Endless crawl, pauses on hover; content duplicated
          once so the -50% translate seams perfectly. */}
      <div
        aria-hidden
        className="contact-marquee-track relative w-full overflow-hidden border-t border-border/60 py-3.5 sm:py-4"
      >
        <div className="contact-marquee flex flex-nowrap items-center whitespace-nowrap font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.3em] text-muted">
          {[0, 1].map((dup) => (
            <div
              key={dup}
              className="flex items-center shrink-0"
            >
              {MARQUEE_PHRASES.map((p, i) => (
                <span
                  key={`${dup}-${i}`}
                  className="flex items-center pr-10 sm:pr-14"
                >
                  {p}
                  <span
                    className="text-accent pl-10 sm:pl-14"
                    style={{ textShadow: "0 0 10px rgba(200,255,61,0.5)" }}
                  >
                    ▸
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

// Variant A1 from the signature handoff — "Divyansh" in Sacramento with a
// looping underline flourish. Geometry (path d, rotation center, font
// size/x) is hand-tuned to this exact word; do not change the text without
// regenerating the flourish (see design_handoff_signature/README.md).
function SignatureLooped({ inView }: { inView: boolean }) {
  const flourishRef = useRef<SVGPathElement>(null);

  // measure the real path length once so the draw-in covers exactly the
  // stroke (a hardcoded dasharray would distort the animation timing)
  useEffect(() => {
    const p = flourishRef.current;
    if (!p) return;
    const len = p.getTotalLength();
    p.style.strokeDasharray = String(len);
    p.style.strokeDashoffset = inView ? "0" : String(len);
  }, [inView]);

  return (
    <svg
      viewBox="0 0 642.9 240"
      role="img"
      aria-label="Divyansh"
      className="block h-20 sm:h-24 lg:h-28 w-auto overflow-visible"
      style={{
        filter:
          "drop-shadow(0 0 3px rgba(200,255,61,0.55)) drop-shadow(0 0 11px rgba(200,255,61,0.26))",
      }}
    >
      <g transform="rotate(-3.2 318.4 150)">
        <text
          x="26"
          y="150"
          style={{
            fontFamily: "var(--font-signature), cursive",
            fontSize: 132,
            fill: "#c8ff3d",
            opacity: inView ? 1 : 0,
            transition: "opacity 0.7s ease 0.1s",
          }}
        >
          Divyansh
        </text>
        <path
          ref={flourishRef}
          d="M 461.1 156 C 423.1 204, 203.2 210, 88 194 C 14 178, 105.8 172, 247.5 172 C 402.6 172, 572.9 162, 610.9 146"
          fill="none"
          stroke="#c8ff3d"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            // hidden until measured (dasharray > any plausible length)
            strokeDasharray: 2000,
            strokeDashoffset: 2000,
            transition:
              "stroke-dashoffset 1.6s cubic-bezier(0.65, 0, 0.35, 1) 0.5s",
          }}
        />
        <circle
          cx="610.9"
          cy="146"
          r="4.4"
          fill="#c8ff3d"
          style={{
            opacity: inView ? 1 : 0,
            transition: "opacity 0.4s ease 1.9s",
          }}
        />
      </g>
    </svg>
  );
}

function ScreenCornerBrackets() {
  return (
    <div aria-hidden className="absolute -inset-x-2 -inset-y-4 pointer-events-none">
      {(["tl", "tr", "bl", "br"] as const).map((corner) => {
        const isTop = corner[0] === "t";
        const isLeft = corner[1] === "l";
        return (
          <span
            key={corner}
            className="absolute"
            style={{
              top: isTop ? 0 : "auto",
              bottom: !isTop ? 0 : "auto",
              left: isLeft ? 0 : "auto",
              right: !isLeft ? 0 : "auto",
              width: 14,
              height: 14,
              borderStyle: "solid",
              borderColor: "rgba(200,255,61,0.4)",
              borderTopWidth: isTop ? 1 : 0,
              borderBottomWidth: !isTop ? 1 : 0,
              borderLeftWidth: isLeft ? 1 : 0,
              borderRightWidth: !isLeft ? 1 : 0,
            }}
          />
        );
      })}
    </div>
  );
}
