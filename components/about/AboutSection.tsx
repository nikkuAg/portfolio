import { about } from "@/content/about";
import { experience } from "@/content/experience";
import { SkillTree } from "./SkillTree";

export function AboutSection() {
  return (
    <section
      id="about"
      className="relative w-full py-20 sm:py-28 md:py-48 px-4 sm:px-6 md:px-10 thin-divider"
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-baseline justify-between mb-10 sm:mb-14 md:mb-16">
          <span className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.3em] text-muted">
            01 / About
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16">
          <div className="md:col-span-7">
            <h2 className="font-display font-bold text-[2.5rem] sm:text-5xl md:text-7xl leading-[0.95] tracking-tight mb-8 md:mb-10">
              I build the <em className="not-italic text-accent">interfaces</em> and <em className="not-italic text-accent">small worlds</em> that live in browsers.
            </h2>
            <div className="space-y-4 sm:space-y-5 text-base sm:text-lg md:text-xl text-muted max-w-2xl leading-relaxed">
              {about.bio.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>

          <aside className="md:col-span-5 md:pl-10 md:border-l border-border">
            {/* CRT portrait — the operator behind the channels (CH·00),
                phosphor-treated to live on the same screen as the hero TV */}
            <figure className="relative mb-8 max-w-[320px] rounded-xl overflow-hidden border border-border bg-black group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/portrait.jpg"
                alt="Divyansh Agarwal"
                width={900}
                height={900}
                className="block w-full aspect-square object-cover transition-[filter] duration-500 group-hover:brightness-110"
              />
              {/* live scanline sweep */}
              <span aria-hidden className="portrait-scan pointer-events-none absolute inset-0" />
              {/* caption bar — channel ID */}
              <figcaption className="absolute bottom-0 inset-x-0 flex items-center justify-between px-3 py-2 bg-gradient-to-t from-black/85 to-transparent font-mono text-[10px] uppercase tracking-widest">
                <span className="flex items-center gap-1.5 text-accent">
                  <span className="size-1.5 rounded-full bg-accent animate-pulse shadow-[0_0_8px_rgba(200,255,61,0.8)]" />
                  Live
                </span>
                <span className="text-foreground/90">CH·00 · Divyansh</span>
              </figcaption>
              {/* corner ticks */}
              {(["tl", "tr"] as const).map((c) => (
                <span
                  key={c}
                  aria-hidden
                  className="absolute size-2.5"
                  style={{
                    top: 8,
                    left: c === "tl" ? 8 : "auto",
                    right: c === "tr" ? 8 : "auto",
                    borderStyle: "solid",
                    borderColor: "rgba(200,255,61,0.5)",
                    borderTopWidth: 1,
                    borderLeftWidth: c === "tl" ? 1 : 0,
                    borderRightWidth: c === "tr" ? 1 : 0,
                  }}
                />
              ))}
            </figure>

            <div className="mb-5 md:mb-6">
              <p className="font-mono text-[10px] sm:text-xs uppercase tracking-widest text-muted">
                Toolbelt
              </p>
            </div>

            <SkillTree />

            {/* live status panel — current role pulled from experience data */}
            <div className="mt-10 rounded-xl border border-border bg-card/40 p-4 font-mono text-xs">
              <div className="flex items-center gap-2 mb-3 uppercase tracking-[0.25em] text-muted">
                <span className="size-1.5 rounded-full bg-accent animate-pulse shadow-[0_0_8px_rgba(200,255,61,0.8)]" />
                <span>Status</span>
                <span className="text-muted/40">·</span>
                <span className="text-accent">Available</span>
              </div>
              <dl className="space-y-2.5 text-muted">
                <div className="flex justify-between gap-4">
                  <dt className="shrink-0">Now</dt>
                  <dd className="text-foreground text-right">
                    {experience[0].role} · {experience[0].company}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="shrink-0">Based</dt>
                  <dd className="text-foreground text-right">
                    {about.location} · UTC+5:30
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="shrink-0">Open to</dt>
                  <dd className="text-foreground text-right">
                    Product · Game · Motion
                  </dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
