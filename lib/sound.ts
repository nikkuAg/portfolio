// Tiny Web Audio sound engine — all SFX synthesized (no asset files), so
// it's weightless and on-theme (retro bleeps). A singleton (not React
// context) so it can be triggered from anywhere: event handlers, the snake
// loop, even the R3F useFrame on a portal crossing.
//
// MUTED BY DEFAULT. Audio never autoplays (browsers block it anyway); the
// AudioContext is created on the first user gesture (the unmute click).

export type Sfx =
  | "click" // UI / knob
  | "hover" // subtle UI tick
  | "blip" // snake eat
  | "whoosh" // portal crossing
  | "coin" // arcade / contact
  | "toggle"; // mute on/off confirm

type Win = Window & { webkitAudioContext?: typeof AudioContext };

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = false;
const listeners = new Set<() => void>();

function ensure(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as Win).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.16; // keep the whole layer subtle
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

// a single decaying oscillator voice
function voice(
  c: AudioContext,
  opts: {
    type: OscillatorType;
    from: number;
    to?: number;
    dur: number;
    gain: number;
    delay?: number;
  },
) {
  const t0 = c.currentTime + (opts.delay ?? 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = opts.type;
  osc.frequency.setValueAtTime(opts.from, t0);
  if (opts.to !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.to), t0 + opts.dur);
  }
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(opts.gain, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
  osc.connect(g);
  g.connect(master!);
  osc.start(t0);
  osc.stop(t0 + opts.dur + 0.02);
}

// short filtered-noise burst (whoosh)
function noise(c: AudioContext, dur: number, gain: number) {
  const t0 = c.currentTime;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(280, t0);
  bp.frequency.exponentialRampToValueAtTime(2400, t0 + dur * 0.5);
  bp.frequency.exponentialRampToValueAtTime(180, t0 + dur);
  bp.Q.value = 0.8;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.04);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(bp);
  bp.connect(g);
  g.connect(master!);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

function render(name: Sfx, c: AudioContext) {
  switch (name) {
    case "click":
      voice(c, { type: "square", from: 240, to: 160, dur: 0.05, gain: 0.5 });
      break;
    case "hover":
      voice(c, { type: "sine", from: 900, dur: 0.035, gain: 0.18 });
      break;
    case "blip":
      voice(c, { type: "square", from: 620, to: 980, dur: 0.07, gain: 0.45 });
      break;
    case "whoosh":
      noise(c, 0.34, 0.5);
      break;
    case "coin":
      voice(c, { type: "square", from: 988, dur: 0.07, gain: 0.4 });
      voice(c, { type: "square", from: 1319, dur: 0.16, gain: 0.4, delay: 0.07 });
      break;
    case "toggle":
      voice(c, { type: "triangle", from: 420, to: 660, dur: 0.12, gain: 0.4 });
      break;
  }
}

export const sound = {
  get enabled() {
    return enabled;
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  toggle() {
    enabled = !enabled;
    if (enabled) {
      const c = ensure();
      if (c) render("toggle", c);
    }
    listeners.forEach((l) => l());
    return enabled;
  },
  play(name: Sfx) {
    if (!enabled) return;
    const c = ensure();
    if (c && master) render(name, c);
  },
};
