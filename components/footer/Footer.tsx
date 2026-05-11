"use client";

import { useEffect, useState } from "react";

export function Footer() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setTime(
        d.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
          timeZone: "Asia/Kolkata",
        }),
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <footer className="relative w-full border-t border-border overflow-hidden">
      <div className="overflow-hidden py-10 md:py-14 border-b border-border">
        <div className="flex whitespace-nowrap animate-[marquee_30s_linear_infinite] font-serif text-[14vw] md:text-[10vw] leading-none tracking-tight">
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className="px-8 flex items-center gap-8">
              Divyansh Agarwal
              <span className="text-accent">✦</span>
            </span>
          ))}
        </div>
      </div>

      <div className="px-6 md:px-10 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-xs font-mono text-muted">
        <div>
          <span className="block uppercase tracking-widest text-foreground mb-1">
            Local time
          </span>
          {time} IST
        </div>
        <div>
          <span className="block uppercase tracking-widest text-foreground mb-1">
            Made with
          </span>
          Next.js · Three.js · GSAP
        </div>
        <div>
          <span className="block uppercase tracking-widest text-foreground mb-1">
            Last updated
          </span>
          {new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" })}
        </div>
        <div className="text-right md:text-left">
          <span className="block uppercase tracking-widest text-foreground mb-1">
            © {new Date().getFullYear()}
          </span>
          Divyansh Agarwal
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </footer>
  );
}
