import { about } from "@/content/about";
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
            <div className="mb-5 md:mb-6">
              <p className="font-mono text-[10px] sm:text-xs uppercase tracking-widest text-muted">
                Toolbelt
              </p>
            </div>

            <SkillTree />

            <div className="mt-10 space-y-3 font-mono text-xs text-muted">
              <div className="flex justify-between">
                <span>Based in</span>
                <span className="text-foreground">{about.location}</span>
              </div>
              <div className="flex justify-between">
                <span>Open to</span>
                <span className="text-foreground">Product · Game · Motion</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
