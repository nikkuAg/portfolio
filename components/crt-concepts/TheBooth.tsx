"use client";

import { useEffect, useRef, useState } from "react";
import s from "./booth.module.css";

// Concept AD: the booth. A DJ setup that is always playing, which is the
// attract mode: a track's waveform scrolls past the playhead and the rings
// pulse on every beat. The crossfader blends the two sides of me, from
// "9 to 5" (a clean code beat, in lime) to "After hours" (the things I love,
// in their colours). Four pads fire one-shots, each with its own burst:
// an F1 rev, a dice roll, a pan sizzle, a game coin. The first pad you hit
// turns the sound on (it's a gesture you made); the toggle mutes it.

const BPM = 122;
const BEAT = 60 / BPM;

type Pad = { id: string; label: string; key: string; color: string };
const PADS: Pad[] = [
  { id: "rev", label: "Rev", key: "1", color: "#e8222a" },
  { id: "roll", label: "Roll", key: "2", color: "#8be07a" },
  { id: "sizzle", label: "Sizzle", key: "3", color: "#ffad42" },
  { id: "coin", label: "Coin", key: "4", color: "#4aa8ff" },
];

const mixState = { x: 0.35, touched: false };
type Burst = { kind: string; t: number; seed: number };

function makeAudio() {
  const ac = new AudioContext();
  const out = ac.createGain();
  out.gain.value = 0.6;
  const comp = ac.createDynamicsCompressor();
  const analyser = ac.createAnalyser();
  analyser.fftSize = 256;
  out.connect(comp).connect(analyser).connect(ac.destination);
  const left = ac.createGain();
  const right = ac.createGain();
  left.connect(out);
  right.connect(out);
  const noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

  const env = (node: AudioNode, t: number, peak: number, dur: number, dest: AudioNode) => {
    const g = ac.createGain();
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    node.connect(g).connect(dest);
    return g;
  };
  const noiseHit = (t: number, f: number, type: BiquadFilterType, peak: number, dur: number, dest: AudioNode) => {
    const src = ac.createBufferSource();
    src.buffer = noise;
    const flt = ac.createBiquadFilter();
    flt.type = type;
    flt.frequency.value = f;
    src.connect(flt);
    env(flt, t, peak, dur, dest);
    src.start(t, Math.random() * 0.6);
    src.stop(t + dur + 0.02);
  };
  const tone = (t: number, f: number, type: OscillatorType, peak: number, dur: number, dest: AudioNode, glideTo?: number) => {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    env(o, t, peak, dur, dest);
    o.start(t);
    o.stop(t + dur + 0.02);
  };

  // two decks, crossfaded: left is the code beat, right is after hours
  const bass = [55, 55, 65.4, 49];
  const arp = [0, 7, 12, 15, 19, 15, 12, 7].map((n) => 220 * Math.pow(2, n / 12));
  let step = 0;
  let next = ac.currentTime + 0.05;
  const timer = window.setInterval(() => {
    while (next < ac.currentTime + 0.12) {
      const s16 = step % 16;
      const bar = Math.floor(step / 16) % 4;
      if (s16 % 4 === 0) {
        const o = ac.createOscillator();
        o.frequency.setValueAtTime(140, next);
        o.frequency.exponentialRampToValueAtTime(45, next + 0.12);
        env(o, next, 0.9, 0.28, out);
        o.start(next);
        o.stop(next + 0.3);
      }
      if (s16 % 4 === 2) noiseHit(next, 8000, "highpass", 0.18, 0.05, left);
      if (s16 % 2 === 1) tone(next, bass[bar] * 2, "triangle", 0.25, BEAT / 2.2, left);
      if (s16 % 8 === 4) noiseHit(next, 1600, "bandpass", 0.3, 0.12, left); // clap-ish
      tone(next, arp[(step + bar * 2) % arp.length], "square", 0.06, BEAT / 4.5, right);
      if (s16 === 0) tone(next, bass[bar], "sawtooth", 0.16, BEAT * 3.5, right);
      next += BEAT / 4;
      step++;
    }
    const x = mixState.x;
    left.gain.setTargetAtTime(Math.cos((x * Math.PI) / 2), ac.currentTime, 0.04);
    right.gain.setTargetAtTime(Math.sin((x * Math.PI) / 2), ac.currentTime, 0.04);
  }, 25);

  const fire = (id: string) => {
    const t = ac.currentTime + 0.005;
    if (id === "rev") {
      const o = ac.createOscillator();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(70, t);
      o.frequency.exponentialRampToValueAtTime(380, t + 0.55);
      o.frequency.exponentialRampToValueAtTime(240, t + 0.75);
      const f = ac.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 1400;
      o.connect(f);
      env(f, t, 0.35, 0.85, out);
      o.start(t);
      o.stop(t + 0.9);
    } else if (id === "roll") {
      for (let i = 0; i < 4; i++) noiseHit(t + i * 0.07 + Math.random() * 0.02, 2200, "highpass", 0.55, 0.03, out);
    } else if (id === "sizzle") {
      noiseHit(t, 5200, "bandpass", 0.5, 1.1, out);
    } else if (id === "coin") {
      tone(t, 988, "square", 0.14, 0.08, out);
      tone(t + 0.08, 1319, "square", 0.14, 0.3, out);
    }
  };

  return {
    ac,
    analyser,
    fire,
    close() {
      window.clearInterval(timer);
      ac.close();
    },
  };
}

export function TheBooth() {
  const ref = useRef<HTMLCanvasElement>(null);
  const audio = useRef<ReturnType<typeof makeAudio> | null>(null);
  const bursts = useRef<Burst[]>([]);
  const [sound, setSound] = useState(false);
  const [x, setX] = useState(mixState.x);
  const [hit, setHit] = useState<string | null>(null);

  const ensureAudio = () => {
    if (!audio.current) audio.current = makeAudio();
    audio.current.ac.resume();
    setSound(true);
  };

  const fire = (id: string) => {
    if (!audio.current || audio.current.ac.state !== "running") ensureAudio();
    audio.current?.fire(id);
    bursts.current.push({ kind: id, t: performance.now(), seed: Math.random() });
    setHit(id);
    window.setTimeout(() => setHit((h) => (h === id ? null : h)), 160);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea,select")) return;
      if (window.scrollY > window.innerHeight * 0.5) return;
      const pad = PADS.find((p) => p.key === e.key);
      if (pad) fire(pad.id);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      audio.current?.close();
    };
    // fire() only reads refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const t0 = performance.now();
    const spec = new Uint8Array(128);
    // a made-up track: peaks on the beat, busier in the second half of each phrase
    const wave = Array.from({ length: 2048 }, (_, i) => {
      const beat = i % 16;
      const phrase = Math.floor(i / 64) % 4;
      return Math.min(1, (beat < 2 ? 0.9 : 0.25 + Math.random() * 0.25) + (phrase === 3 ? 0.15 : 0));
    });

    function resize() {
      const r = canvas!.getBoundingClientRect();
      w = r.width;
      h = r.height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
    }

    const mixCol = (a: number[], b: number[], k: number, al: number) =>
      `rgba(${Math.round(a[0] + (b[0] - a[0]) * k)},${Math.round(a[1] + (b[1] - a[1]) * k)},${Math.round(a[2] + (b[2] - a[2]) * k)},${al})`;
    const LIME = [200, 255, 61];
    const WARM = [255, 120, 90];

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      const c = ctx!;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.fillStyle = "#0b0b0e";
      c.fillRect(0, 0, w, h);
      const t = reduce ? 0 : Math.max(0, now - t0) / 1000;
      const beat = (t / BEAT) % 1;
      const kick = Math.exp(-beat * 7);
      const mx = mixState.x;
      const mobile = w < 768;
      const cx = mobile ? w / 2 : w * 0.7;
      const cy = mobile ? h * 0.56 : h * 0.47;
      const R = Math.min(mobile ? w * 0.28 : w * 0.2, h * 0.3);

      // live spectrum when sound is on, a beat-shaped stand-in when it isn't
      const an = audio.current?.analyser;
      if (an && audio.current?.ac.state === "running") an.getByteFrequencyData(spec);
      else for (let i = 0; i < spec.length; i++) spec[i] = 255 * kick * Math.exp(-i / 22) + 60 * (0.5 + 0.5 * Math.sin(t * 3 + i * 0.4)) * mx;

      // the waveform strip, scrolling past a playhead
      const sy = mobile ? h * 0.36 : h * 0.13;
      const sh = mobile ? 34 : 54;
      const sx0 = mobile ? 16 : w * 0.46;
      const sx1 = mobile ? w - 16 : w - 48;
      const head = (sx0 + sx1) / 2;
      const pos = (t / BEAT) * 4;
      for (let px = sx0; px < sx1; px += 3) {
        const i = Math.floor(pos + (px - head) / 3);
        const v = wave[((i % wave.length) + wave.length) % wave.length];
        const played = px < head;
        c.fillStyle = mixCol(LIME, WARM, mx, played ? 0.28 : 0.85);
        c.fillRect(px, sy + sh / 2 - (v * sh) / 2, 2, v * sh);
      }
      c.fillStyle = "#f3efe6";
      c.fillRect(head - 1, sy - 6, 2, sh + 12);

      // rings: the spectrum wrapped round the platter
      for (let ring = 0; ring < 3; ring++) {
        c.beginPath();
        const rr = R * (0.55 + ring * 0.22);
        for (let k = 0; k <= 128; k++) {
          const a = (k / 128) * Math.PI * 2 + t * (0.3 + ring * 0.1);
          const v = spec[(k + ring * 9) % 64] / 255;
          const r = rr + v * R * 0.18 * (1 - ring * 0.25);
          const px = cx + Math.cos(a) * r;
          const py = cy + Math.sin(a) * r;
          if (k) c.lineTo(px, py);
          else c.moveTo(px, py);
        }
        c.closePath();
        c.strokeStyle = mixCol(LIME, WARM, mx, 0.25 + 0.5 * (1 - ring * 0.3) * (0.5 + kick * 0.5));
        c.lineWidth = 2;
        c.stroke();
      }
      c.fillStyle = mixCol(LIME, WARM, mx, 0.12 + kick * 0.2);
      c.beginPath();
      c.arc(cx, cy, R * 0.32 * (1 + kick * 0.06), 0, Math.PI * 2);
      c.fill();

      // after hours: the things I love drift through the ring as the fader opens
      if (mx > 0.05) {
        const items: [string, string][] = [
          ["#e8222a", "f1"],
          ["#4aa8ff", "games"],
          ["#ffad42", "cook"],
          ["#8be07a", "board"],
          ["#b48cff", "dj"],
        ];
        items.forEach(([col], i) => {
          const a = t * 0.4 + (i / items.length) * Math.PI * 2;
          const r = R * (1.15 + 0.08 * Math.sin(t + i));
          c.fillStyle = col;
          c.globalAlpha = Math.min(1, mx * 1.4);
          c.beginPath();
          c.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 5 + kick * 4, 0, Math.PI * 2);
          c.fill();
        });
        c.globalAlpha = 1;
      }

      // pad bursts
      bursts.current = bursts.current.filter((b) => now - b.t < 1100);
      for (const b of bursts.current) {
        const k = (now - b.t) / 1100;
        const al = 1 - k;
        if (b.kind === "rev") {
          c.strokeStyle = `rgba(232,34,42,${al})`;
          c.lineWidth = 3;
          c.beginPath();
          for (let i = 0; i < 18; i++) {
            const y = cy - R + ((i * 97 + b.seed * 300) % (R * 2));
            const x0 = cx + R * 1.6 - k * R * 4 - ((i * 53) % 80);
            c.moveTo(x0, y);
            c.lineTo(x0 + R * 0.6 * al, y);
          }
          c.stroke();
        } else if (b.kind === "roll") {
          for (let i = 0; i < 3; i++) {
            const x = cx - R + k * R * 2 + i * 40;
            const y = cy + R * 0.9 - Math.abs(Math.sin(k * 9 + i)) * R * 0.5 * al;
            c.save();
            c.translate(x, y);
            c.rotate(k * 12 + i);
            c.globalAlpha = al;
            c.strokeStyle = "#8be07a";
            c.lineWidth = 2;
            c.strokeRect(-12, -12, 24, 24);
            c.fillStyle = "#8be07a";
            c.beginPath();
            c.arc(0, 0, 3, 0, Math.PI * 2);
            c.fill();
            c.restore();
          }
        } else if (b.kind === "sizzle") {
          c.strokeStyle = `rgba(255,173,66,${al * 0.8})`;
          c.lineWidth = 3;
          c.lineCap = "round";
          for (let i = 0; i < 7; i++) {
            c.beginPath();
            for (let j = 0; j <= 14; j++) {
              const yy = cy + R * 0.6 - (j / 14) * R * 1.6 * Math.min(1, k * 2.5);
              const xx = cx - R * 0.6 + i * R * 0.2 + Math.sin(j * 0.6 + k * 8 + i) * 10;
              if (j) c.lineTo(xx, yy);
              else c.moveTo(xx, yy);
            }
            c.stroke();
          }
        } else if (b.kind === "coin") {
          const y = cy - k * R * 0.9;
          c.globalAlpha = al;
          c.fillStyle = "#ffd23f";
          c.beginPath();
          c.ellipse(cx, y, 14 * Math.abs(Math.cos(k * 12)) + 2, 14, 0, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = "#4aa8ff";
          c.font = "700 16px system-ui, sans-serif";
          c.textAlign = "center";
          c.fillText("+1", cx + 26, y - 6);
          c.textAlign = "left";
          c.globalAlpha = 1;
        }
      }
      // ghost DJ eases the fader back and forth until someone takes it
      if (!mixState.touched && !reduce) mixState.x = 0.5 + 0.42 * Math.sin(t * 0.18);
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
    const sync = window.setInterval(() => {
      if (!mixState.touched) setX(mixState.x);
    }, 100);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.clearInterval(sync);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <>
      <canvas ref={ref} aria-hidden style={{ width: "100%", height: "100%", display: "block" }} />
      <div className={s.desk}>
        <div className={s.top}>
          <span className={s.bpm}>
            <i className={s.led} />
            {BPM} BPM
          </span>
          <button
            type="button"
            className={s.mute}
            aria-pressed={sound}
            onClick={() => {
              if (sound) {
                audio.current?.ac.suspend();
                setSound(false);
              } else ensureAudio();
            }}
          >
            {sound ? "Sound on" : "Sound off"}
          </button>
        </div>
        <div className={s.pads} role="group" aria-label="Pads">
          {PADS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={s.pad}
              data-hit={hit === p.id || undefined}
              style={{ ["--pc" as string]: p.color }}
              onPointerDown={(e) => {
                e.preventDefault();
                fire(p.id);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fire(p.id);
                }
              }}
            >
              <span>{p.label}</span>
              <kbd>{p.key}</kbd>
            </button>
          ))}
        </div>
        <label className={s.xfade}>
          <span>9 to 5</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={x}
            aria-label="Crossfader, from 9 to 5 to after hours"
            onChange={(e) => {
              const v = Number(e.target.value);
              mixState.touched = true;
              mixState.x = v;
              setX(v);
            }}
          />
          <span>After hours</span>
        </label>
      </div>
    </>
  );
}
