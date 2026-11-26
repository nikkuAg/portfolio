"use client";

import { useEffect, useRef, useState } from "react";
import s from "./more.module.css";

// Concept AH: the sequencer. A 16-step beat grid where every row is one of
// the things I love: code is the kick, dice are the clap, the pan is the
// hi-hat, a game coin carries the melody and an F1 engine is the bass. A
// pattern is already playing (silently, until you ask for sound): the
// playhead sweeps and the lit cells flash. Click cells to write your own
// beat; the first click turns the sound on.

const STEPS = 16;
type Row = { id: string; name: string; color: string };
const ROWS: Row[] = [
  { id: "kick", name: "Code", color: "#c8ff3d" },
  { id: "clap", name: "Dice", color: "#8be07a" },
  { id: "hat", name: "Sizzle", color: "#ffad42" },
  { id: "coin", name: "Coin", color: "#4aa8ff" },
  { id: "engine", name: "F1", color: "#e8222a" },
];
const PRESET = [
  "x...x...x...x...",
  "....x.......x..x",
  "..x...x...x...xx",
  "x..x..x...x.x...",
  "x.......x.....x.",
].map((r) => r.split("").map((c) => c === "x"));
const MELODY = [0, 3, 7, 10, 12, 10, 7, 3, 0, 5, 7, 12, 15, 12, 7, 5].map((n) => 523 * Math.pow(2, n / 12));

function makeSynth() {
  const ac = new AudioContext();
  const out = ac.createGain();
  out.gain.value = 0.55;
  out.connect(ac.createDynamicsCompressor()).connect(ac.destination);
  const noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const env = (n: AudioNode, t: number, p: number, d: number) => {
    const g = ac.createGain();
    g.gain.setValueAtTime(p, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    n.connect(g).connect(out);
  };
  const hit = (row: string, t: number, step: number) => {
    if (row === "kick") {
      const o = ac.createOscillator();
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
      env(o, t, 0.95, 0.3);
      o.start(t);
      o.stop(t + 0.32);
    } else if (row === "clap" || row === "hat") {
      const src = ac.createBufferSource();
      src.buffer = noise;
      const f = ac.createBiquadFilter();
      f.type = row === "hat" ? "highpass" : "bandpass";
      f.frequency.value = row === "hat" ? 7500 : 1700;
      src.connect(f);
      env(f, t, row === "hat" ? 0.25 : 0.6, row === "hat" ? 0.05 : 0.14);
      src.start(t, Math.random() * 0.5);
      src.stop(t + 0.2);
    } else if (row === "coin") {
      const o = ac.createOscillator();
      o.type = "square";
      o.frequency.value = MELODY[step];
      env(o, t, 0.1, 0.12);
      o.start(t);
      o.stop(t + 0.14);
    } else {
      const o = ac.createOscillator();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(55, t);
      o.frequency.exponentialRampToValueAtTime(170, t + 0.35);
      const f = ac.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 700;
      o.connect(f);
      env(f, t, 0.35, 0.4);
      o.start(t);
      o.stop(t + 0.42);
    }
  };
  return { ac, hit };
}

export function Sequencer() {
  const [grid, setGrid] = useState<boolean[][]>(() => PRESET.map((r) => [...r]));
  const [step, setStep] = useState(-1);
  const [sound, setSound] = useState(false);
  const [bpm, setBpm] = useState(118);
  const gridRef = useRef(grid);
  const bpmRef = useRef(bpm);
  const synth = useRef<ReturnType<typeof makeSynth> | null>(null);
  const soundRef = useRef(false);

  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);
  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  const startSound = () => {
    if (!synth.current) synth.current = makeSynth();
    synth.current.ac.resume();
    soundRef.current = true;
    setSound(true);
  };

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    // Silent: the playhead runs on the page clock. With sound: a look-ahead
    // scheduler books each step on the audio clock, and the playhead follows
    // the audio clock so picture and sound never drift apart.
    let raf = 0;
    let stepIdx = 0;
    let nextAt = performance.now() + 300;
    let audioStep = 0;
    let audioNext = -1;
    const queue: { step: number; at: number }[] = [];
    const timer = window.setInterval(() => {
      const sy = synth.current;
      if (!sy || !soundRef.current || sy.ac.state !== "running") {
        audioNext = -1;
        return;
      }
      if (audioNext < 0) {
        audioNext = sy.ac.currentTime + 0.06;
        audioStep = stepIdx;
      }
      const len = 60 / bpmRef.current / 4;
      while (audioNext < sy.ac.currentTime + 0.12) {
        const g = gridRef.current;
        ROWS.forEach((r, ri) => g[ri][audioStep] && sy.hit(r.id, audioNext, audioStep));
        queue.push({ step: audioStep, at: audioNext });
        audioStep = (audioStep + 1) % STEPS;
        audioNext += len;
      }
    }, 25);
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const sy = synth.current;
      if (sy && soundRef.current && sy.ac.state === "running" && audioNext >= 0) {
        while (queue.length && queue[0].at <= sy.ac.currentTime) {
          const q = queue.shift()!;
          stepIdx = q.step;
          setStep(q.step);
        }
        nextAt = now;
        return;
      }
      queue.length = 0;
      const len = 60000 / bpmRef.current / 4;
      while (now >= nextAt) {
        stepIdx = (stepIdx + 1) % STEPS;
        setStep(stepIdx);
        nextAt += len;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => () => void synth.current?.ac.close(), []);

  const toggle = (ri: number, si: number) => {
    if (!soundRef.current) startSound();
    setGrid((g) => g.map((row, r) => (r === ri ? row.map((v, c) => (c === si ? !v : v)) : row)));
  };

  return (
    <div className={s.seq}>
      <div className={s.seqTop}>
        <button
          type="button"
          className={s.seqPlay}
          aria-pressed={sound}
          onClick={() => {
            if (sound) {
              synth.current?.ac.suspend();
              soundRef.current = false;
              setSound(false);
            } else startSound();
          }}
        >
          {sound ? "Sound on" : "Play with sound"}
        </button>
        <button type="button" className={s.seqBtn} onClick={() => setGrid(ROWS.map(() => Array(STEPS).fill(false)))}>
          Clear
        </button>
        <button type="button" className={s.seqBtn} onClick={() => setGrid(ROWS.map((_, ri) => Array.from({ length: STEPS }, (_, si) => Math.random() < [0.3, 0.15, 0.4, 0.3, 0.15][ri] || (ri === 0 && si % 4 === 0))))}>
          Surprise me
        </button>
        <label className={s.seqTempo}>
          <span>{bpm} BPM</span>
          <input type="range" min={90} max={150} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} aria-label="Tempo" />
        </label>
      </div>
      <div className={s.seqGrid} role="group" aria-label="Beat grid: rows are sounds, columns are steps">
        {ROWS.map((r, ri) => (
          <div key={r.id} className={s.seqRow} role="group" aria-label={r.name} style={{ ["--rc" as string]: r.color }}>
            <span className={s.seqName} aria-hidden>
              {r.name}
            </span>
            {grid[ri].map((on, si) => (
              <button
                key={si}
                type="button"
                aria-pressed={on}
                aria-label={`${r.name}, step ${si + 1}`}
                className={s.cell}
                data-beat={si % 4 === 0 || undefined}
                data-head={si === step || undefined}
                onClick={() => toggle(ri, si)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
