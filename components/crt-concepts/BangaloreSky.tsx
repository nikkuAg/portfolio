"use client";

import { useEffect, useRef, useState } from "react";
import s from "./concepts.module.css";

// Concept K: the sky over Bangalore, right now. The sun and moon sit where
// they really are for 12.97°N 77.59°E at this minute (a low-precision solar
// formula, good to about a degree), the sky colour follows the sun's
// height, and the city's windows light up after dark. A slider lets the
// visitor run the day forward to see it change.

const LAT = 12.97;
const LON = 77.59;
const RAD = Math.PI / 180;

type Body = { alt: number; az: number };

function daysSinceJ2000(t: number) {
  return t / 86400000 + 2440587.5 - 2451545.0;
}

function altAz(ra: number, dec: number, d: number): Body {
  const gmst = (18.697374558 + 24.06570982441908 * d) % 24;
  const ha = ((gmst * 15 + LON) * RAD - ra) % (2 * Math.PI);
  const lat = LAT * RAD;
  const alt = Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(ha));
  const az = Math.atan2(-Math.sin(ha), Math.tan(dec) * Math.cos(lat) - Math.sin(lat) * Math.cos(ha));
  return { alt: alt / RAD, az: ((az / RAD) + 360) % 360 };
}

function sun(t: number) {
  const d = daysSinceJ2000(t);
  const g = (357.529 + 0.98560028 * d) * RAD;
  const q = 280.459 + 0.98564736 * d;
  const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
  const e = (23.439 - 0.00000036 * d) * RAD;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  return { ...altAz(ra, dec, d), ra };
}

/** Moon: placed by its phase angle from the sun, which is close enough to draw. */
function moon(t: number, sunRa: number) {
  const d = daysSinceJ2000(t);
  const age = (((d - 5.6) / 29.530588853) % 1 + 1) % 1; // 0 new, 0.5 full
  const ra = sunRa + age * 2 * Math.PI;
  const dec = 18 * RAD * Math.sin(ra);
  return { ...altAz(ra, dec, d), age };
}

const STOPS: [number, string, string][] = [
  [-18, "#04060d", "#0b1022"],
  [-9, "#0a0f2c", "#28234e"],
  [-3, "#1b2757", "#b0607a"],
  [2, "#33508f", "#f0a070"],
  [10, "#2f6fb5", "#9fc9e8"],
  [40, "#2a67b0", "#8cc0e6"],
];

function mix(a: string, b: string, k: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (sh: number) => Math.round(((pa >> sh) & 255) * (1 - k) + ((pb >> sh) & 255) * k);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

function skyAt(alt: number) {
  if (alt <= STOPS[0][0]) return [STOPS[0][1], STOPS[0][2]];
  for (let i = 1; i < STOPS.length; i++) {
    if (alt <= STOPS[i][0]) {
      const [a0, t0, b0] = STOPS[i - 1];
      const [a1, t1, b1] = STOPS[i];
      const k = (alt - a0) / (a1 - a0);
      return [mix(t0, t1, k), mix(b0, b1, k)];
    }
  }
  const last = STOPS[STOPS.length - 1];
  return [last[1], last[2]];
}

const fmt = (t: number) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true }).format(t);

function offsetLine(t: number) {
  // IST is UTC+5:30; the visitor's own offset comes from their clock
  const mine = -new Date(t).getTimezoneOffset();
  const diff = 330 - mine;
  if (diff === 0) return "Same time as you.";
  const h = Math.floor(Math.abs(diff) / 60);
  const m = Math.abs(diff) % 60;
  const span = `${h ? `${h} h` : ""}${h && m ? " " : ""}${m ? `${m} min` : ""}`;
  return `That's ${span} ${diff > 0 ? "ahead of" : "behind"} you.`;
}

export function BangaloreSky() {
  const ref = useRef<HTMLCanvasElement>(null);
  const shift = useRef(0); // hours added to now by the slider
  const [hours, setHours] = useState(0);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 15000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let raf = 0;
    let visible = true;
    let stars: [number, number, number][] = [];
    let blocks: { x: number; w: number; h: number; win: [number, number, number][] }[] = [];
    let ground = 0;

    function build() {
      const r = canvas!.getBoundingClientRect();
      w = r.width;
      h = r.height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      ground = h * (w < 768 ? 0.5 : 0.53);
      stars = Array.from({ length: Math.round((w * ground) / 2600) }, () => [Math.random() * w, Math.random() * ground * 0.92, Math.random()]);
      // a made-up skyline: low blocks, a few towers, seeded so it doesn't jump
      let seed = 7;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      blocks = [];
      let x = -10;
      const unit = Math.max(14, w / 70);
      while (x < w + 10) {
        const bw = unit * (1 + rnd() * 2.2);
        const tall = rnd() < 0.14;
        const bh = unit * (tall ? 5 + rnd() * 5 : 1.2 + rnd() * 3);
        const win: [number, number, number][] = [];
        for (let wy = 6; wy < bh - 6; wy += 9) for (let wx = 5; wx < bw - 5; wx += 8) if (rnd() < 0.42) win.push([wx, wy, rnd()]);
        blocks.push({ x, w: bw, h: bh, win });
        x += bw + (rnd() < 0.3 ? unit * 0.4 : 1);
      }
    }

    function toScreen(b: Body) {
      // east on the left, west on the right, as you'd see facing south
      const x = ((b.az - 60) / 240) * w;
      const y = ground - (b.alt / 90) * ground * 0.95;
      return [x, y];
    }

    function draw(t: number, now: number) {
      const c = ctx!;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      const S = sun(t);
      const M = moon(t, S.ra);
      const [top, low] = skyAt(S.alt);
      const g = c.createLinearGradient(0, 0, 0, ground);
      g.addColorStop(0, top);
      g.addColorStop(1, low);
      c.fillStyle = g;
      c.fillRect(0, 0, w, ground + 1);

      const dark = Math.min(1, Math.max(0, (-S.alt - 2) / 12));
      if (dark > 0) {
        for (const [x, y, k] of stars) {
          const tw = reduce ? 0.7 : 0.55 + 0.45 * Math.sin(now / 900 + k * 50);
          c.fillStyle = `rgba(255,255,255,${dark * tw * (0.35 + k * 0.6)})`;
          c.fillRect(x, y, k > 0.9 ? 2 : 1, k > 0.9 ? 2 : 1);
        }
      }

      if (M.alt > -2) {
        const [mx, my] = toScreen(M);
        const r = Math.max(10, w * 0.014);
        c.fillStyle = `rgba(240,236,220,${0.35 + dark * 0.6})`;
        c.beginPath();
        c.arc(mx, my, r, 0, Math.PI * 2);
        c.fill();
        // the phase: a sky-coloured disc slid off the moon by how lit it is
        // (waxing: lit on the right, so the shadow slides left)
        const f = (1 - Math.cos(M.age * 2 * Math.PI)) / 2;
        if (f < 0.97) {
          c.fillStyle = g; // the sky gradient itself, so the shadow matches exactly
          c.beginPath();
          c.arc(mx + (M.age < 0.5 ? -1 : 1) * 2 * r * f, my, r * 1.02, 0, Math.PI * 2);
          c.fill();
        }
      }
      if (S.alt > -3) {
        const [sx, sy] = toScreen(S);
        const r = Math.max(16, w * 0.02);
        const glow = c.createRadialGradient(sx, sy, r * 0.5, sx, sy, r * 6);
        glow.addColorStop(0, "rgba(255,214,140,0.55)");
        glow.addColorStop(1, "rgba(255,214,140,0)");
        c.fillStyle = glow;
        c.fillRect(sx - r * 6, sy - r * 6, r * 12, r * 12);
        c.fillStyle = S.alt < 6 ? "#ffb070" : "#fff2cf";
        c.beginPath();
        c.arc(sx, sy, r, 0, Math.PI * 2);
        c.fill();
      }

      // a few soft clouds by day, drifting east to west
      const day = Math.min(1, Math.max(0, (S.alt + 2) / 10));
      if (day > 0) {
        for (let i = 0; i < 4; i++) {
          const cw = w * (0.12 + i * 0.03);
          const cx = ((i * 0.31 + now / 400000 * (1 + i * 0.3)) % 1.3) * (w + cw) - cw;
          const cy = ground * (0.18 + i * 0.13);
          c.fillStyle = `rgba(255,255,255,${0.13 * day})`;
          c.beginPath();
          c.ellipse(cx, cy, cw / 2, cw / 9, 0, 0, Math.PI * 2);
          c.ellipse(cx + cw * 0.18, cy - cw / 14, cw / 4, cw / 10, 0, 0, Math.PI * 2);
          c.fill();
        }
      }

      // the city, then the ground the copy stands on
      const shade = mix("#0b0e18", "#1c2436", Math.max(0, Math.min(1, (S.alt + 4) / 20)));
      c.fillStyle = shade;
      for (const b of blocks) c.fillRect(b.x, ground - b.h, b.w, b.h + 1);
      if (dark > 0.1) {
        for (const b of blocks) {
          for (const [wx, wy, k] of b.win) {
            if (k > 0.25 + (1 - dark) * 0.6) continue;
            c.fillStyle = k < 0.08 ? "rgba(150,200,255,0.8)" : "rgba(255,206,120,0.85)";
            c.fillRect(b.x + wx, ground - b.h + wy, 3, 4);
          }
        }
      }
      c.fillStyle = "#0a0c14";
      c.fillRect(0, ground, w, h - ground);
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      draw(Date.now() + shift.current * 3600000, now);
    }

    let tm = 0;
    const onResize = () => {
      clearTimeout(tm);
      tm = window.setTimeout(build, 150);
    };
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);
    build();
    raf = requestAnimationFrame(frame);
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const shown = now == null ? null : now + hours * 3600000;

  return (
    <>
      <canvas ref={ref} aria-hidden style={{ width: "100%", height: "100%", display: "block" }} />
      <div className={s.clock}>
        <p className={s.clockTime} aria-live="polite">
          {shown == null ? " " : `It's ${fmt(shown)} in Bangalore`}
        </p>
        <p className={s.clockSub}>
          {shown == null ? " " : hours ? `${hours > 0 ? "+" : ""}${hours} h from now.` : offsetLine(shown)}
        </p>
        <label className={s.clockScrub}>
          <span>Run the day</span>
          <input
            type="range"
            min={0}
            max={24}
            step={0.25}
            value={hours}
            onChange={(e) => {
              const v = Number(e.target.value);
              shift.current = v;
              setHours(v);
            }}
          />
        </label>
        {hours !== 0 && (
          <button
            type="button"
            className={s.clockNow}
            onClick={() => {
              shift.current = 0;
              setHours(0);
            }}
          >
            Back to now
          </button>
        )}
      </div>
    </>
  );
}
