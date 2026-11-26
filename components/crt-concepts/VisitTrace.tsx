"use client";

import { useEffect, useRef, useState } from "react";
import s from "./concepts.module.css";

// Concept I: "your visit, traced". The route a request takes to put this
// page on the visitor's screen, drawn as a line of stops, with the real
// timings of *their* page load read from the browser's Navigation Timing
// API. Nothing is simulated; zero means the step was skipped (a cached
// address, a reused connection).

type Stop = { name: string; did: string; ms: number | null };

function measure(): Stop[] {
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  const fcp = performance.getEntriesByName("first-contentful-paint")[0];
  const d = (a?: number, b?: number) => (a != null && b != null && b >= a ? Math.round(b - a) : null);
  return [
    { name: "Your browser", did: "asked for this page", ms: 0 },
    { name: "Name lookup", did: "found the server's address", ms: d(nav?.domainLookupStart, nav?.domainLookupEnd) },
    { name: "Handshake", did: "opened a secure connection", ms: d(nav?.connectStart, nav?.connectEnd) },
    { name: "Server", did: "built the page for you", ms: d(nav?.requestStart, nav?.responseStart) },
    { name: "Delivery", did: "sent the HTML back", ms: d(nav?.responseStart, nav?.responseEnd) },
    { name: "Your screen", did: "painted the first pixels", ms: d(nav?.responseEnd, fcp?.startTime) },
  ];
}

export function VisitTrace() {
  const [stops, setStops] = useState<Stop[] | null>(null);
  const [run, setRun] = useState(0);
  const [lit, setLit] = useState(-1);
  const packet = useRef<HTMLSpanElement>(null);
  const line = useRef<HTMLOListElement>(null);

  // first paint may not be recorded yet on mount: read the timings a beat later
  useEffect(() => {
    const t = window.setTimeout(() => setStops(measure()), 600);
    return () => window.clearTimeout(t);
  }, []);

  // walk the packet down the route; each leg's time is the real time,
  // stretched so the slowest leg still reads (log scale, ~4 s in all)
  useEffect(() => {
    if (!stops || !line.current || !packet.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const items = Array.from(line.current.querySelectorAll<HTMLElement>("[data-stop]"));
    const ys = items.map((el) => el.offsetTop + 9);
    let raf = 0;
    if (reduce) {
      packet.current.style.transform = `translateY(${ys[ys.length - 1]}px)`;
      raf = requestAnimationFrame(() => setLit(stops.length - 1));
      return () => cancelAnimationFrame(raf);
    }
    const legs = stops.slice(1).map((st) => 350 + Math.log10(1 + (st.ms ?? 0)) * 260);
    let leg = 0;
    let t0 = -1;
    const tick = (now: number) => {
      if (t0 < 0) {
        t0 = now;
        setLit(0);
      }
      const k = Math.min(1, (now - t0) / legs[leg]);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      packet.current!.style.transform = `translateY(${ys[leg] + (ys[leg + 1] - ys[leg]) * e}px)`;
      if (k >= 1) {
        leg++;
        setLit(leg);
        t0 = now;
        if (leg >= legs.length) return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stops, run]);

  const total = stops?.reduce((a, st) => a + (st.ms ?? 0), 0) ?? null;

  return (
    <div className={s.trace}>
      <p className={s.traceTitle}>
        {total == null ? "Tracing your visit" : `This page reached you in ${total} ms`}
      </p>
      <p className={s.traceSub}>Measured on your device, just now. Here is where the time went.</p>
      <div className={s.routeWrap}>
      <span ref={packet} className={s.packet} aria-hidden />
      <ol ref={line} className={s.route}>
        {(stops ?? measurePlaceholder).map((st, i) => (
          <li key={st.name} data-stop data-lit={lit >= i || undefined}>
            <span className={s.stopName}>{st.name}</span>
            <span className={s.stopDid}>{st.did}</span>
            <span className={s.stopMs}>
              {i === 0 ? "start" : st.ms == null ? "n/a" : st.ms === 0 ? "skipped, already known" : `${st.ms} ms`}
            </span>
          </li>
        ))}
      </ol>
      </div>
      <button
        type="button"
        className={s.replay}
        onClick={() => {
          setLit(-1);
          setRun((r) => r + 1);
        }}
      >
        Replay the trip
      </button>
    </div>
  );
}

const measurePlaceholder: Stop[] = [
  { name: "Your browser", did: "asked for this page", ms: null },
  { name: "Name lookup", did: "found the server's address", ms: null },
  { name: "Handshake", did: "opened a secure connection", ms: null },
  { name: "Server", did: "built the page for you", ms: null },
  { name: "Delivery", did: "sent the HTML back", ms: null },
  { name: "Your screen", did: "painted the first pixels", ms: null },
];
