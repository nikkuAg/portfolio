import { experience } from "@/content/experience";
import { typeBadge } from "./experience-tints";

// Static vertical timeline — the no-3D path. Shown when the user prefers
// reduced motion or WebGL isn't available (and as the SSR/first-paint
// markup before the scene mounts). Lifted from the old mobile timeline.
export function ExperienceFallback() {
  return (
    <div className="px-4 sm:px-6 py-20 sm:py-24">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-baseline justify-between mb-8">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted">
            03 / Experience
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {experience.length} roles
          </span>
        </div>

        <h2 className="font-display font-bold text-4xl sm:text-5xl leading-[0.95] tracking-tight mb-10">
          Where I&apos;ve <em className="not-italic text-accent">shipped</em>.
        </h2>

        <ol className="relative border-l border-border ml-2">
          {experience.map((role) => {
            const badge = typeBadge(role.type);
            const isCurrent = role.end === "Present";
            return (
              <li
                key={`${role.company}-${role.start}`}
                className="relative pl-6 sm:pl-8 pb-10 last:pb-0"
              >
                {/* flag dot on the rail */}
                <span
                  className={`absolute -left-[5px] top-1.5 size-[9px] rounded-sm rotate-45 ${
                    isCurrent
                      ? "bg-accent shadow-[0_0_10px_rgba(200,255,61,0.7)]"
                      : "bg-foreground/40"
                  }`}
                  aria-hidden
                />

                <div className="flex flex-wrap items-baseline gap-2 mb-2 font-mono text-[10px] uppercase tracking-widest">
                  <span className="text-foreground">{role.start}</span>
                  <span className="text-muted/60">→</span>
                  {isCurrent ? (
                    <span className="text-accent">Present</span>
                  ) : (
                    <span className="text-muted">{role.end}</span>
                  )}
                  {role.location && (
                    <>
                      <span className="text-muted/60">·</span>
                      <span className="text-muted">{role.location}</span>
                    </>
                  )}
                  <span
                    className={`inline-flex px-1.5 py-0.5 rounded-full border text-[9px] tracking-widest ${badge.color}`}
                  >
                    {badge.label}
                  </span>
                </div>

                <h3 className="font-display font-semibold uppercase text-2xl sm:text-3xl leading-tight tracking-tight mb-1">
                  {role.role}
                </h3>
                <p className="font-display text-base sm:text-lg text-accent/90 mb-3">
                  {role.company}
                </p>

                <ul className="space-y-1.5 mb-3">
                  {role.highlights.map((h, i) => (
                    <li
                      key={i}
                      className="text-sm text-muted leading-relaxed flex gap-2"
                    >
                      <span className="text-accent shrink-0 mt-1">▸</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>

                <ul className="flex flex-wrap gap-1.5">
                  {role.stack.map((s) => (
                    <li
                      key={s}
                      className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border border-border rounded-full text-muted"
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
