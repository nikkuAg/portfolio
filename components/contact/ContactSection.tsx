import { socials } from "@/content/socials";

export function ContactSection() {
  return (
    <section
      id="contact"
      className="relative w-full py-32 md:py-48 px-6 md:px-10 thin-divider"
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-baseline justify-between mb-16">
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted">
            04 / Contact
          </span>
          <span className="font-mono text-xs uppercase tracking-widest text-accent">
            Inbox open
          </span>
        </div>

        <h2 className="font-serif text-6xl md:text-[9rem] leading-[0.9] tracking-tight max-w-5xl">
          Let&apos;s build <em className="italic">something</em> good.
        </h2>

        <a
          href="mailto:a.divyansh.25@gmail.com"
          className="inline-flex items-center gap-3 mt-12 font-mono text-sm uppercase tracking-widest text-foreground border-b border-foreground hover:text-accent hover:border-accent transition-colors duration-300"
        >
          a.divyansh.25@gmail.com
          <span aria-hidden>↗</span>
        </a>

        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6">
          {socials.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target={s.href.startsWith("http") ? "_blank" : undefined}
              rel={s.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="group block py-6 border-t border-border hover:border-accent transition-colors"
            >
              <span className="block font-mono text-[10px] uppercase tracking-widest text-muted mb-2">
                {s.label}
              </span>
              <span className="block font-serif text-2xl text-foreground group-hover:text-accent transition-colors">
                {s.handle} <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
