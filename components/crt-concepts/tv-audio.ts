"use client";

// Tiny WebAudio kit for the set: tuning static, dial detent click, power
// thunk and a low mains hum. Everything is synthesised (no audio files) and
// nothing plays until the viewer turns the volume knob on.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let hum: { osc: OscillatorNode; gain: GainNode } | null = null;
let noise: AudioBuffer | null = null;

function ensure() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export const tvAudio = {
  setEnabled(on: boolean) {
    const c = ensure();
    if (!c || !master) return;
    master.gain.setTargetAtTime(on ? 0.5 : 0, c.currentTime, 0.05);
    if (on && !hum) {
      // 50 Hz mains hum + a touch of its 2nd harmonic, very quiet
      const osc = c.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = 50;
      const gain = c.createGain();
      gain.gain.value = 0.018;
      osc.connect(gain).connect(master);
      osc.start();
      hum = { osc, gain };
    }
  },

  staticBurst(duration = 0.42) {
    const c = ctx;
    if (!c || !master || !noise || master.gain.value < 0.01) return;
    const src = c.createBufferSource();
    src.buffer = noise;
    const band = c.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 2600;
    band.Q.value = 0.6;
    const g = c.createGain();
    const t = c.currentTime;
    g.gain.setValueAtTime(0.0, t);
    g.gain.linearRampToValueAtTime(0.32, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.connect(band).connect(g).connect(master);
    src.start(t, Math.random() * 0.5);
    src.stop(t + duration + 0.05);
  },

  click() {
    const c = ctx;
    if (!c || !master || master.gain.value < 0.01) return;
    const o = c.createOscillator();
    o.type = "square";
    o.frequency.value = 1800;
    const g = c.createGain();
    const t = c.currentTime;
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.04);
  },

  thunk() {
    const c = ctx;
    if (!c || !master || master.gain.value < 0.01) return;
    const o = c.createOscillator();
    o.type = "sine";
    const g = c.createGain();
    const t = c.currentTime;
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.25);
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.32);
  },
};
