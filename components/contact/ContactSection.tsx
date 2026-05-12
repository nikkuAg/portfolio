import { socials } from "@/content/socials";

export function ContactSection() {
  return (
    <section
      id="contact"
      className="relative w-full py-24 sm:py-32 md:py-48 px-4 sm:px-6 md:px-10 thin-divider"
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-baseline justify-between mb-10 sm:mb-16 gap-4">
          <span className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.3em] text-muted">
            04 / Contact
          </span>
          <span className="font-mono text-[10px] sm:text-xs uppercase tracking-widest text-accent">
            Inbox open
          </span>
        </div>

        <h2
          className="font-serif leading-[0.9] tracking-tight max-w-5xl"
          style={{ fontSize: "clamp(2.5rem, 11vw, 9rem)" }}
        >
          Let&apos;s build <em className="italic">something</em> good.
        </h2>

        <a
          href="mailto:a.divyansh.25@gmail.com"
          className="inline-flex items-center gap-3 mt-8 sm:mt-12 font-mono text-xs sm:text-sm uppercase tracking-widest text-foreground border-b border-foreground hover:text-accent hover:border-accent transition-colors duration-300 break-all"
        >
          a.divyansh.25@gmail.com
          <span aria-hidden>↗</span>
        </a>

        <div className="mt-12 sm:mt-20 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-6">
          {socials.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target={s.href.startsWith("http") ? "_blank" : undefined}
              rel={s.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="group block py-5 sm:py-6 border-t border-border hover:border-accent transition-colors"
            >
              <span className="block font-mono text-[10px] uppercase tracking-widest text-muted mb-2">
                {s.label}
              </span>
              <span className="block font-serif text-xl sm:text-2xl text-foreground group-hover:text-accent transition-colors break-all">
                {s.handle}{" "}
                <span className="inline-block transition-transform group-hover:translate-x-1">
                  →
                </span>
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
