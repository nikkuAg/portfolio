"use client";

import { useEffect, useRef, useState } from "react";
import s from "./mix.module.css";

// Concept W: the mix. A DJ mixer where every channel is one of the things I
// love. Push a fader and that part of me comes into the picture (and, with
// sound on, into the mix): F1 is an engine climbing through the gears,
// games are a chiptune arpeggio, cooking is the sizzle of a pan, board
// games are dice on the table, and code is the beat that holds it together.
// Everything is synthesised live with Web Audio; nothing is downloaded.
// Until someone touches a fader, a ghost DJ rides them slowly.

const BPM = 120;
const STEP = 60 / BPM / 4; // a sixteenth

type Ch = { id: string; name: string; sub: string; color: string };
const CHANNELS: Ch[] = [
  { id: "beat", name: "Code", sub: "the beat", color: "#e9e4d8" },
  { id: "f1", name: "F1", sub: "engine", color: "#e8222a" },
  { id: "games", name: "Games", sub: "arpeggio", color: "#5fd0ff" },
  { id: "cook", name: "Cooking", sub: "sizzle", color: "#ffb347" },
  { id: "board", name: "Board games", sub: "dice", color: "#9cf28a" },
];

const shared = { levels: [0.8, 0.7, 0.45, 0.35, 0.5], touched: false, meters: [0, 0, 0, 0, 0] };

/** All five channels, synthesised. Created on the first "Sound on". */
function makeEngine() {
  const ac = new AudioContext();
  const master = ac.createGain();
  master.gain.value = 0.55;
  const comp = ac.createDynamicsCompressor();
  master.connect(comp).connect(ac.destination);
  const bus = CHANNELS.map(() => {
    const g = ac.createGain();
    g.connect(master);
    return g;
  });
  const noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

  // F1: a sawtooth through a low-pass, pitch rising through each gear
  const eng = ac.createOscillator();
  eng.type = "sawtooth";
  const engF = ac.createBiquadFilter();
  engF.type = "lowpass";
  engF.frequency.value = 900;
  const engG = ac.createGain();
  engG.gain.value = 0.25;
  eng.connect(engF).connect(engG).connect(bus[1]);
  eng.start();

  // cooking: band-passed noise with a crackle on it
  const siz = ac.createBufferSource();
  siz.buffer = noise;
  siz.loop = true;
  const sizF = ac.createBiquadFilter();
  sizF.type = "bandpass";
  sizF.frequency.value = 5200;
  sizF.Q.value = 0.8;
  const sizG = ac.createGain();
  sizG.gain.value = 0.22;
  siz.connect(sizF).connect(sizG).connect(bus[3]);
  siz.start();

  const notes = [0, 3, 5, 7, 10, 12, 15, 17].map((n) => 330 * Math.pow(2, n / 12));
  let step = 0;
  let next = ac.currentTime + 0.05;

  const kick = (t: number) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g).connect(bus[0]);
    o.start(t);
    o.stop(t + 0.32);
  };
  const tick = (t: number, gain: number, freq: number, dest: AudioNode, len = 0.04) => {
    const src = ac.createBufferSource();
    src.buffer = noise;
    const f = ac.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = freq;
    const g = ac.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    src.connect(f).connect(g).connect(dest);
    src.start(t, Math.random() * 0.5);
    src.stop(t + len + 0.01);
  };
  const blip = (t: number, f: number) => {
    const o = ac.createOscillator();
    o.type = "square";
    o.frequency.value = f;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.connect(g).connect(bus[2]);
    o.start(t);
    o.stop(t + 0.11);
  };

  const timer = window.setInterval(() => {
    while (next < ac.currentTime + 0.12) {
      const s16 = step % 16;
      if (s16 % 4 === 0) kick(next);
      if (s16 % 4 === 2) tick(next, 0.25, 7000, bus[0]);
      if (s16 % 2 === 0 || s16 % 3 === 0) blip(next, notes[(step * 3 + (step >> 4)) % notes.length]);
      if (s16 === 12 || s16 === 13 || s16 === 15) tick(next, 0.5, 1800, bus[4], 0.03); // dice clatter
      // the engine climbs through a gear every bar and a half
      const gear = ((step % 24) / 24);
      eng.frequency.setValueAtTime(95 + gear * 170, next);
      sizG.gain.setValueAtTime(0.12 + Math.random() * 0.2, next);
      next += STEP;
      step++;
    }
    bus.forEach((g, i) => g.gain.setTargetAtTime(shared.levels[i] ** 1.5, ac.currentTime, 0.05));
  }, 25);

  return {
    ac,
    close() {
      window.clearInterval(timer);
      ac.close();
    },
  };
}

function Strip({ ch, i, meter }: { ch: Ch; i: number; meter: (el: HTMLSpanElement | null) => void }) {
  const [v, setV] = useState(shared.levels[i]);
  // reflect the ghost DJ's moves while nobody has taken over
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!shared.touched) setV(shared.levels[i]);
    }, 120);
    return () => window.clearInterval(id);
  }, [i]);
  return (
    <div className={s.strip} style={{ ["--ch" as string]: ch.color }}>
      <span className={s.meter} aria-hidden>
        <span ref={meter} />
      </span>
      <input
        className={s.fader}
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={v}
        aria-label={`${ch.name} channel level`}
        onChange={(e) => {
          const n = Number(e.target.value);
          shared.touched = true;
          shared.levels[i] = n;
          setV(n);
        }}
      />
      <span className={s.chName}>{ch.name}</span>
      <span className={s.chSub}>{ch.sub}</span>
    </div>
  );
}

export function TheMix() {
  const ref = useRef<HTMLCanvasElement>(null);
  const meters = useRef<(HTMLSpanElement | null)[]>([]);
  const engine = useRef<ReturnType<typeof makeEngine> | null>(null);
  const [sound, setSound] = useState(false);

  useEffect(() => () => engine.current?.close(), []);

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
    const t0 = performance.now();
    const streaks = Array.from({ length: 70 }, () => ({ y: Math.random(), x: Math.random(), l: 0.05 + Math.random() * 0.2, v: 0.6 + Math.random() }));
    const shapes = Array.from({ length: 14 }, (_, i) => ({ x: Math.random(), y: Math.random(), k: i % 4, r: Math.random() * 6.28, s: 10 + Math.random() * 16 }));
    const steam = Array.from({ length: 9 }, (_, i) => ({ x: 0.1 + i * 0.1, ph: Math.random() * 6 }));
    const dice = Array.from({ length: 3 }, (_, i) => ({ x: 0.3 + i * 0.2, face: 1 + i }));

    function resize() {
      const r = canvas!.getBoundingClientRect();
      w = r.width;
      h = r.height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
    }

    const pips: Record<number, [number, number][]> = {
      1: [[0, 0]],
      2: [[-1, -1], [1, 1]],
      3: [[-1, -1], [0, 0], [1, 1]],
      4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
      5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
      6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
    };

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      const t = reduce ? 0 : Math.max(0, now - t0) / 1000;
      const beat = (t / (60 / BPM)) % 1; // 0..1 within a beat
      const bar = Math.floor(t / ((60 / BPM) * 4));
      const L = shared.levels;

      // the ghost DJ: slow, overlapping swells until someone takes over
      if (!shared.touched && !reduce) {
        for (let i = 0; i < L.length; i++) L[i] = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t * 0.21 + i * 1.7));
      }
      // meters: each channel's level, kicked by its own rhythm
      const pulse = [Math.exp(-beat * 6), 0.7 + 0.3 * ((t * 0.67) % 1), Math.exp(-((t * 8) % 1) * 4), 0.6 + Math.random() * 0.4, beat > 0.75 ? 1 : 0.2];
      meters.current.forEach((m, i) => {
        if (m) m.style.transform = `scaleY(${Math.min(1, L[i] * pulse[i] * 1.1)})`;
      });

      const c = ctx!;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.fillStyle = "#0b0b0d";
      c.fillRect(0, 0, w, h);
      const mobile = w < 768;
      const bx = mobile ? 0 : w * 0.4;
      const bw = w - bx;
      const by = mobile ? h * 0.36 : 0;
      const bh = mobile ? h * 0.3 : h * 0.62;

      // F1: red speed lines and a low red glow on the horizon
      if (L[1] > 0.02) {
        // a soft red glow low in the frame, fading out on every side
        const g = c.createRadialGradient(bx + bw * 0.55, by + bh, 0, bx + bw * 0.55, by + bh, Math.max(bw, bh) * 0.7);
        g.addColorStop(0, `rgba(232,34,42,${0.32 * L[1]})`);
        g.addColorStop(1, "rgba(232,34,42,0)");
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);
        c.strokeStyle = `rgba(255,70,60,${0.75 * L[1]})`;
        c.lineWidth = 2;
        c.beginPath();
        for (const sk of streaks.slice(0, Math.round(streaks.length * L[1]))) {
          const x = bx + (((sk.x - t * sk.v * (0.8 + L[1])) % 1) + 1) % 1 * bw;
          const y = by + bh * (0.35 + sk.y * 0.62);
          c.moveTo(x, y);
          c.lineTo(x + sk.l * bw * L[1], y);
        }
        c.stroke();
      }
      // code: the beat, as rings from the middle on every kick
      if (L[0] > 0.02) {
        c.strokeStyle = `rgba(233,228,216,${0.5 * L[0] * (1 - beat)})`;
        c.lineWidth = 1.5;
        for (let k = 0; k < 3; k++) {
          c.beginPath();
          c.arc(bx + bw / 2, by + bh / 2, (beat + k) * Math.min(bw, bh) * 0.22, 0, Math.PI * 2);
          c.stroke();
        }
      }
      // cooking: steam curling up from below
      if (L[3] > 0.02) {
        c.strokeStyle = `rgba(255,190,110,${0.45 * L[3]})`;
        c.lineWidth = 3;
        c.lineCap = "round";
        for (const st of steam) {
          c.beginPath();
          for (let k = 0; k <= 20; k++) {
            const yy = by + bh - (k / 20) * bh * 0.8 * L[3];
            const xx = bx + st.x * bw + Math.sin(k * 0.45 + t * 2 + st.ph) * 14;
            if (k) c.lineTo(xx, yy);
            else c.moveTo(xx, yy);
          }
          c.stroke();
        }
      }
      // games: outline shapes that hop on the off-beats
      if (L[2] > 0.02) {
        c.strokeStyle = `rgba(95,208,255,${0.85 * L[2]})`;
        c.lineWidth = 2;
        for (const sh of shapes.slice(0, Math.round(shapes.length * L[2]))) {
          const hop = Math.abs(Math.sin((t * 4 + sh.r) * Math.PI)) * 12;
          const x = bx + sh.x * bw;
          const y = by + sh.y * bh * 0.8 + bh * 0.1 - hop;
          const r = sh.s;
          c.beginPath();
          if (sh.k === 0) {
            c.moveTo(x, y - r);
            c.lineTo(x + r * 0.87, y + r * 0.5);
            c.lineTo(x - r * 0.87, y + r * 0.5);
            c.closePath();
          } else if (sh.k === 1) c.arc(x, y, r * 0.8, 0, Math.PI * 2);
          else if (sh.k === 2) {
            c.moveTo(x - r * 0.7, y - r * 0.7);
            c.lineTo(x + r * 0.7, y + r * 0.7);
            c.moveTo(x + r * 0.7, y - r * 0.7);
            c.lineTo(x - r * 0.7, y + r * 0.7);
          } else c.rect(x - r * 0.7, y - r * 0.7, r * 1.4, r * 1.4);
          c.stroke();
        }
      }
      // board games: dice re-rolled every bar
      if (L[4] > 0.02) {
        const size = Math.min(bw, bh) * 0.11;
        dice.forEach((d, i) => {
          const face = 1 + ((bar * 7 + i * 3 + 1) % 6);
          const roll = beat < 0.15 && bar % 1 === 0 ? (0.15 - beat) * 8 : 0;
          const x = bx + d.x * bw;
          const y = by + bh * 0.82;
          c.save();
          c.translate(x, y);
          c.rotate(Math.sin(bar * 2.3 + i) * 0.4 + roll);
          c.globalAlpha = Math.min(1, L[4] * 1.4);
          c.fillStyle = "#16210f";
          c.strokeStyle = "#9cf28a";
          c.lineWidth = 2;
          c.beginPath();
          c.roundRect(-size / 2, -size / 2, size, size, size * 0.18);
          c.fill();
          c.stroke();
          c.fillStyle = "#9cf28a";
          for (const [px, py] of pips[face]) {
            c.beginPath();
            c.arc(px * size * 0.26, py * size * 0.26, size * 0.075, 0, Math.PI * 2);
            c.fill();
          }
          c.restore();
        });
        c.globalAlpha = 1;
      }
    }

    let tm = 0;
    const onResize = () => {
      clearTimeout(tm);
      tm = window.setTimeout(resize, 150);
    };
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);
    resize();
    raf = requestAnimationFrame(frame);
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <>
      <canvas ref={ref} aria-hidden style={{ width: "100%", height: "100%", display: "block" }} />
      <div className={s.mixer} role="group" aria-label="Mixer: one channel per thing I love">
        <div className={s.head}>
          <span className={s.title}>The mix</span>
          <button
            type="button"
            className={s.sound}
            aria-pressed={sound}
            onClick={() => {
              if (!engine.current) engine.current = makeEngine();
              const ac = engine.current.ac;
              if (sound) ac.suspend();
              else ac.resume();
              setSound(!sound);
            }}
          >
            {sound ? "Sound on" : "Sound off"}
          </button>
        </div>
        <div className={s.strips}>
          {CHANNELS.map((ch, i) => (
            <Strip key={ch.id} ch={ch} i={i} meter={(el) => (meters.current[i] = el)} />
          ))}
        </div>
      </div>
    </>
  );
}
