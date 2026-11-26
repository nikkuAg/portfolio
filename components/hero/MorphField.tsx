"use client";

import { useEffect, useRef, useState } from "react";
import s from "./morph.module.css";

// The hero's picture: one swarm of ink threads that keeps drawing who I am.
// Most threads gather into a picture (my face, then the things I love: F1,
// games, DJing, cooking, board games, code), hold it, let go and drift into
// the next; the rest never settle and keep the whole screen inked. The
// pointer is a predator: threads near it scatter and glow, then come back.
// The timeline under the hero shows which picture is up and how long it
// has left, and lets you jump or pause.

type Scene = { id: string; label: string; caption: string; draw: (o: CanvasRenderingContext2D, w: number, h: number) => void; image?: boolean };

const BG: [number, number, number] = [11, 12, 16];
const CALM = "rgba(236,232,220,0.92)";
const UNEASY = "rgba(200,255,61,0.75)"; // the site's lime, for ink that's been disturbed
const ALARMED = "rgba(222,255,140,1)";

const FORM = 2600;
const HOLD = 4800;
const DRIFT = 2200;
const CYCLE = FORM + HOLD + DRIFT;

function identFont() {
  return getComputedStyle(document.documentElement).getPropertyValue("--font-ident").trim() || "sans-serif";
}

function hash(x: number, y: number) {
  const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return v - Math.floor(v);
}
function noise(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Draw in a unit space (uw × uh) centred and scaled to fit the box. */
function fit(o: CanvasRenderingContext2D, w: number, h: number, uw: number, uh: number, fill = 0.9) {
  const k = Math.min(w / uw, h / uh) * fill;
  o.translate(w / 2, h / 2);
  o.scale(k, k);
}

const face: Scene = { id: "face", label: "Me", caption: "my face", image: true, draw() {} };

const f1: Scene = {
  id: "f1",
  label: "F1",
  caption: "F1, and Ferrari",
  draw(o, w, h) {
    o.save();
    fit(o, w, h, 210, 62, 0.94);
    // a modern single-seater in profile, nose to the right
    o.beginPath();
    o.moveTo(-86, 14); // under the diffuser
    o.lineTo(-86, 4); // gearbox
    o.lineTo(-72, 1);
    o.bezierCurveTo(-56, -1, -40, -6, -26, -10); // engine cover rising
    o.lineTo(-17, -21); // airbox above the driver
    o.lineTo(-5, -21);
    o.lineTo(-2, -10);
    o.lineTo(20, -9); // cockpit rim
    o.bezierCurveTo(40, -8, 62, -4, 84, 3); // the long nose
    o.lineTo(98, 6);
    o.lineTo(98, 9);
    o.lineTo(70, 12);
    o.lineTo(-86, 15);
    o.closePath();
    o.fill();
    // sidepod and floor edge
    o.beginPath();
    o.moveTo(-44, 2);
    o.bezierCurveTo(-28, -4, -4, -2, 8, 4);
    o.lineTo(8, 13);
    o.lineTo(-48, 14);
    o.closePath();
    o.fill();
    o.fillRect(-90, 14, 182, 3);
    // rear wing: endplate, two elements, and its pylon
    o.fillRect(-100, -30, 4, 34);
    o.fillRect(-100, -30, 22, 4.5);
    o.fillRect(-98, -21, 20, 3.5);
    o.fillRect(-84, -17, 3, 19);
    // front wing: three elements and an endplate
    o.fillRect(76, 14, 28, 2.6);
    o.fillRect(79, 10, 24, 2.4);
    o.fillRect(83, 6.5, 19, 2.2);
    o.fillRect(101, 3, 3, 13.5);
    // halo and helmet
    o.strokeStyle = "#fff";
    o.lineWidth = 2.6;
    o.lineCap = "round";
    o.beginPath();
    o.moveTo(-1, -10);
    o.bezierCurveTo(3, -19, 14, -19, 19, -10);
    o.stroke();
    o.beginPath();
    o.arc(7, -12, 5, 0, Math.PI * 2);
    o.fill();
    // wheels: tyre, a gap, and the rim
    for (const [x, r] of [
      [-60, 15],
      [60, 14],
    ] as const) {
      o.beginPath();
      o.arc(x, 9, r, 0, Math.PI * 2);
      o.fill();
      o.globalCompositeOperation = "destination-out";
      o.beginPath();
      o.arc(x, 9, r * 0.66, 0, Math.PI * 2);
      o.fill();
      o.globalCompositeOperation = "source-over";
      o.beginPath();
      o.arc(x, 9, r * 0.48, 0, Math.PI * 2);
      o.fill();
      o.globalCompositeOperation = "destination-out";
      o.beginPath();
      o.arc(x, 9, r * 0.16, 0, Math.PI * 2);
      o.fill();
      o.globalCompositeOperation = "source-over";
    }
    o.restore();
  },
};

const games: Scene = {
  id: "games",
  label: "Games",
  caption: "games, played and made",
  draw(o, w, h) {
    o.save();
    fit(o, w, h, 136, 70);
    o.beginPath();
    o.moveTo(-34, -20);
    o.lineTo(34, -20);
    o.bezierCurveTo(52, -20, 60, -8, 64, 14);
    o.bezierCurveTo(68, 34, 60, 44, 50, 42);
    o.bezierCurveTo(40, 40, 34, 22, 22, 18);
    o.lineTo(-22, 18);
    o.bezierCurveTo(-34, 22, -40, 40, -50, 42);
    o.bezierCurveTo(-60, 44, -68, 34, -64, 14);
    o.bezierCurveTo(-60, -8, -52, -20, -34, -20);
    o.fill();
    o.globalCompositeOperation = "destination-out";
    o.fillRect(-42, -4, 20, 6);
    o.fillRect(-35, -11, 6, 20);
    for (const [x, y] of [[34, -9], [44, 0], [34, 9], [24, 0]]) {
      o.beginPath();
      o.arc(x, y, 3.6, 0, Math.PI * 2);
      o.fill();
    }
    o.restore();
  },
};

const dj: Scene = {
  id: "dj",
  label: "DJ",
  caption: "DJing, my newest habit",
  draw(o, w, h) {
    o.save();
    fit(o, w, h, 110, 100);
    o.strokeStyle = "#fff";
    o.lineWidth = 9;
    o.lineCap = "round";
    o.beginPath();
    o.arc(0, 4, 38, Math.PI * 1.04, Math.PI * 1.96); // headband
    o.stroke();
    for (const x of [-46, 28]) {
      o.beginPath();
      o.roundRect(x, -2, 18, 40, 8); // ear cups
      o.fill();
    }
    o.lineWidth = 4;
    for (const x of [-37, 37]) {
      o.beginPath();
      o.moveTo(x, -8);
      o.lineTo(x, -2);
      o.stroke();
    }
    o.restore();
  },
};

const cook: Scene = {
  id: "cook",
  label: "Cooking",
  caption: "cooking, mostly for friends",
  draw(o, w, h) {
    o.save();
    fit(o, w, h, 170, 130, 0.92);
    o.translate(-14, 22);
    // a sauté pan side on: a shallow body and a long handle
    o.beginPath();
    o.moveTo(-52, -4);
    o.lineTo(32, -4);
    o.lineTo(26, 14);
    o.quadraticCurveTo(24, 20, 16, 20);
    o.lineTo(-36, 20);
    o.quadraticCurveTo(-44, 20, -46, 14);
    o.closePath();
    o.fill();
    o.fillRect(-55, -7, 90, 4); // the rim
    o.save();
    o.translate(32, 0);
    o.rotate(-0.16);
    o.beginPath();
    o.roundRect(0, -4, 60, 8, 4); // handle
    o.fill();
    o.restore();
    // the flame underneath
    for (const fx of [-30, -10, 10]) {
      o.beginPath();
      o.moveTo(fx - 6, 38);
      o.quadraticCurveTo(fx - 7, 30, fx, 22);
      o.quadraticCurveTo(fx + 7, 30, fx + 6, 38);
      o.quadraticCurveTo(fx, 42, fx - 6, 38);
      o.fill();
    }
    // food mid-toss: an arc of pieces above the pan
    const bits: [number, number, number, number][] = [
      [-38, -26, 6, 0.4],
      [-22, -44, 7.5, 1.2],
      [-2, -52, 6, 0.2],
      [16, -44, 7, 0.9],
      [28, -26, 5.5, 0.5],
    ];
    for (const [bx, by, r, rot] of bits) {
      o.save();
      o.translate(bx, by);
      o.rotate(rot);
      o.beginPath();
      o.roundRect(-r, -r * 0.7, r * 2, r * 1.4, r * 0.5);
      o.fill();
      o.restore();
    }
    // motion lines under the arc
    o.strokeStyle = "#fff";
    o.lineWidth = 2.2;
    o.lineCap = "round";
    o.setLineDash([5, 6]);
    o.beginPath();
    o.moveTo(-44, -12);
    o.quadraticCurveTo(-6, -78, 34, -12);
    o.stroke();
    o.setLineDash([]);
    o.restore();
  },
};

const board: Scene = {
  id: "board",
  label: "Board games",
  caption: "board games, the longer the better",
  draw(o, w, h) {
    o.save();
    fit(o, w, h, 120, 80);
    const die = (cx: number, cy: number, rot: number, pips: [number, number][]) => {
      o.save();
      o.translate(cx, cy);
      o.rotate(rot);
      o.globalCompositeOperation = "source-over";
      o.beginPath();
      o.roundRect(-20, -20, 40, 40, 8);
      o.fill();
      o.globalCompositeOperation = "destination-out";
      for (const [x, y] of pips) {
        o.beginPath();
        o.arc(x * 10, y * 10, 4, 0, Math.PI * 2);
        o.fill();
      }
      o.restore();
    };
    die(-24, 6, -0.25, [[-1, -1], [0, 0], [1, 1]]);
    die(26, -4, 0.3, [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]]);
    o.restore();
  },
};

const code: Scene = {
  id: "code",
  label: "Code",
  caption: "code, most days",
  draw(o, w, h) {
    const fs = Math.min(w * 0.36, h * 0.7);
    o.font = `800 ${fs}px ${identFont()}`;
    o.textAlign = "center";
    o.textBaseline = "middle";
    o.fillText("</>", w / 2, h / 2);
  },
};

/** Turn a scene into exactly n target points inside the box. */
function sample(scene: Scene, n: number, bw: number, bh: number, img: HTMLImageElement | null) {
  const c = document.createElement("canvas");
  c.width = Math.max(2, Math.round(bw));
  c.height = Math.max(2, Math.round(bh));
  const o = c.getContext("2d", { willReadFrequently: true })!;
  o.fillStyle = "#fff";
  if (scene.image && img) {
    // fit the portrait; the stippling below decides where the threads go
    const k = Math.min(c.width / img.width, c.height / img.height);
    const iw = img.width * k;
    const ih = img.height * k;
    o.drawImage(img, (c.width - iw) / 2, (c.height - ih) / 2, iw, ih);
  } else scene.draw(o, c.width, c.height);
  const d = o.getImageData(0, 0, c.width, c.height).data;
  const xs: number[] = [];
  const ys: number[] = [];
  const ws: number[] = [];
  if (scene.image) {
    // A portrait in light dots on a dark page has to be a positive: ink where
    // the face is lit, plus extra ink along strong edges (hairline, glasses,
    // eyes, the beard line) so the features stay readable. The plain wall
    // behind (light and nearly colourless) gets none, except where the head
    // meets it, which keeps the outline.
    const W = c.width;
    const H = c.height;
    const L = new Float32Array(W * H);
    const wall = new Uint8Array(W * H);
    for (let p = 0; p < W * H; p++) {
      const r = d[p * 4];
      const g = d[p * 4 + 1];
      const b = d[p * 4 + 2];
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const mx = Math.max(r, g, b);
      const sat = mx ? (mx - Math.min(r, g, b)) / mx : 0;
      L[p] = lum;
      wall[p] = d[p * 4 + 3] < 128 || (lum > 0.7 && sat < 0.14) ? 1 : 0;
    }
    for (let y = 1; y < H - 1; y += 2) {
      for (let x = 1; x < W - 1; x += 2) {
        const p = y * W + x;
        // ignore the photo's own border against the empty canvas
        if (d[(p - 2) * 4 + 3] < 128 || d[(p + 2) * 4 + 3] < 128 || d[(p - 2 * W) * 4 + 3] < 128 || d[(p + 2 * W) * 4 + 3] < 128) continue;
        const gx = L[p - W + 1] + 2 * L[p + 1] + L[p + W + 1] - L[p - W - 1] - 2 * L[p - 1] - L[p + W - 1];
        const gy = L[p + W - 1] + 2 * L[p + W] + L[p + W + 1] - L[p - W - 1] - 2 * L[p - W] - L[p - W + 1];
        const raw = Math.min(1, (Math.hypot(gx, gy) / 4) * 2.2);
        // faint texture (hair strands, skin grain) isn't a feature
        const edge = raw < 0.16 ? 0 : raw;
        if (wall[p] && edge < 0.4) continue;
        const wgt = (wall[p] ? 0 : 0.5 * Math.pow(L[p], 2.2)) + 2 * Math.pow(edge, 1.2);
        if (wgt < 0.06) continue;
        xs.push(x);
        ys.push(y);
        ws.push(wgt);
      }
    }
  } else {
    for (let y = 0; y < c.height; y += 2) {
      for (let x = 0; x < c.width; x += 2) {
        if (d[(y * c.width + x) * 4 + 3] < 128) continue;
        xs.push(x);
        ys.push(y);
        ws.push(1);
      }
    }
  }
  const tx = new Float32Array(n);
  const ty = new Float32Array(n);
  if (!xs.length) return null;
  // a loop, not Math.max(...ws): a huge screen yields more samples than a
  // spread can pass as arguments
  let maxW = 0;
  for (const v of ws) if (v > maxW) maxW = v;
  for (let i = 0; i < n; i++) {
    let j = 0;
    for (let tries = 0; tries < 30; tries++) {
      j = (Math.random() * xs.length) | 0;
      if (Math.random() * maxW <= ws[j]) break;
    }
    tx[i] = xs[j] + Math.random() * 2;
    ty[i] = ys[j] + Math.random() * 2;
  }
  return { tx, ty };
}


/**
 * Where the picture lives. Rather than fixed percentages, it measures where
 * the name and the intro actually landed on this screen and fills the space
 * they leave: the upper right beside the name on wide screens, everything
 * between the nav and the name when stacked, the right half on a phone held
 * sideways.
 */
function pictureBox(canvas: HTMLCanvasElement, w: number, h: number) {
  const navClear = 72;
  const g = w < 640 ? 16 : w < 768 ? 24 : 40;
  const cr = canvas.getBoundingClientRect();
  const hero = canvas.closest("section");
  const topOf = (sel: string) => {
    const el = hero?.querySelector<HTMLElement>(sel);
    return el ? el.getBoundingClientRect().top - cr.top : null;
  };
  if (w > h && h < 520) {
    const x = w * 0.5;
    return { x, y: 60, w: w - x - g, h: h - 60 - 16 };
  }
  if (w >= 1024) {
    // follow the words' frame, which stops growing past 2200px on ultrawides
    const fl = Math.max(g, (w - 2200) / 2);
    const fw = w - fl * 2;
    const x = fl + fw * 0.42;
    const bottom = Math.min(h * 0.72, (topOf("[data-hero-side]") ?? h * 0.7) - 28);
    return { x, y: navClear, w: fl + fw - x, h: Math.max(140, bottom - navClear) };
  }
  const bottom = (topOf("[data-hero-name]") ?? h * 0.55) - 20;
  return { x: g / 2, y: navClear - 8, w: w - g, h: Math.max(140, bottom - navClear + 8) };
}

export function MorphField({ go }: { go: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const ctl = useRef({ paused: false, go: false });
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    ctl.current.go = go;
  }, [go]);

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
    let n = 0;
    let x = new Float32Array(0);
    let y = new Float32Array(0);
    let vx = new Float32Array(0);
    let vy = new Float32Array(0);
    let fear = new Float32Array(0);
    // a share of the threads never join a picture: they keep the whole
    // screen inked while the rest gather. Each joiner also has its own small
    // delay, so a picture streams in from everywhere instead of snapping
    let ambient = new Uint8Array(0);
    let delay = new Float32Array(0);
    let targets: ({ tx: Float32Array; ty: Float32Array } | null)[] = [];
    let list: Scene[] = [f1, games, dj, cook, board, code];
    let portrait: HTMLImageElement | null = null;
    let box = { x: 0, y: 0, w: 0, h: 0 };
    let sceneIdx = 0;
    let phaseStart = 0;
    let started = false;
    let startedAt = 0;
    let leanX = 0;
    let leanY = 0;
    const pointer = { x: -1e4, y: -1e4, at: -1e9 };

    // on the first frame after the go signal, every thread starts on the
    // edge of the screen, so the first picture streams in from all sides
    function seedEdges() {
      for (let i = 0; i < n; i++) {
        const side = i % 4;
        const t = Math.random();
        x[i] = side === 0 ? t * w : side === 1 ? w + 4 : side === 2 ? t * w : -4;
        y[i] = side === 0 ? -4 : side === 1 ? t * h : side === 2 ? h + 4 : t * h;
        vx[i] = 0;
        vy[i] = 0;
      }
    }

    function layout() {
      const r = canvas!.getBoundingClientRect();
      w = r.width;
      h = r.height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      const mobile = w < 768;
      box = pictureBox(canvas!, w, h);
      const shape = Math.min(mobile ? 2600 : 5200, (box.w * box.h) / (mobile ? 34 : 46));
      const count = Math.round(shape / 0.62);
      if (count !== n) {
        n = count;
        x = new Float32Array(n);
        y = new Float32Array(n);
        vx = new Float32Array(n);
        vy = new Float32Array(n);
        fear = new Float32Array(n);
        ambient = new Uint8Array(n);
        delay = new Float32Array(n);
        for (let i = 0; i < n; i++) {
          x[i] = Math.random() * w;
          y[i] = Math.random() * h;
          ambient[i] = i % 25 < 9 ? 1 : 0;
          delay[i] = Math.random() * 0.45;
        }
        if (started) seedEdges();
      }
      targets = list.map((sc) => {
        const t = sample(sc, n, box.w, box.h, portrait);
        if (!t) return null;
        for (let i = 0; i < n; i++) {
          t.tx[i] += box.x;
          t.ty[i] += box.y;
        }
        return t;
      });
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.fillStyle = `rgb(${BG.join(",")})`;
      ctx!.fillRect(0, 0, w, h);
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (!visible || !n) return;
      const c = ctx!;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!started) {
        if (!ctl.current.go) return;
        started = true;
        startedAt = now;
        phaseStart = now;
        if (!reduce) seedEdges();
      }

      // scene clock: form, hold, drift, next
      let el = now - phaseStart;
      if (ctl.current.paused || reduce) {
        el = Math.min(el, FORM + 1);
        phaseStart = now - el; // hold the clock where it is
      } else if (el > CYCLE) {
        sceneIdx = (sceneIdx + 1) % list.length;
        phaseStart = now;
        el = 0;
        setCurrent(sceneIdx);
      }
      const tgt = targets[sceneIdx];
      // pull: 0 while drifting, rises while forming, full while holding
      let pull: number;
      if (el < FORM) pull = Math.pow(el / FORM, 2);
      else if (el < FORM + HOLD) pull = 1;
      else pull = Math.max(0, 1 - (el - FORM - HOLD) / 500);

      // short trails while the ink first floods in, the long ink trails after
      const entry = Math.max(0, 1 - (now - startedAt) / 2200);
      const fade = reduce ? 1 : Math.max(0.07 + pull * 0.1, 0.32 * entry);
      c.fillStyle = `rgba(${BG.join(",")},${fade})`;
      c.fillRect(0, 0, w, h);

      const t = now / 1000;
      const stir = now - pointer.at < 2500;
      const R = Math.max(70, Math.min(w, h) * 0.12);
      const R2 = R * R;
      const ns = 0.0022;
      // the speed limit grows with the screen, so the ink arrives as quickly
      // on a 4K monitor as on a laptop
      const cap = 2.2 * Math.max(1, Math.min(w, h) / 820);

      // while a picture holds it stays alive: it breathes (a slow, slight
      // swell), every dot circles its spot, and the whole picture leans a
      // little towards the pointer
      const cx0 = box.x + box.w / 2;
      const cy0 = box.y + box.h / 2;
      const breath = 1 + 0.016 * Math.sin(t * 0.9);
      const wob = Math.max(1.2, Math.min(box.w, box.h) * 0.0045);
      const leanTo = (v: number, centre: number, span: number) => Math.max(-span, Math.min(span, (v - centre) * 0.035));
      leanX += ((stir ? leanTo(pointer.x, cx0, 18) : 0) - leanX) * 0.04;
      leanY += ((stir ? leanTo(pointer.y, cy0, 12) : 0) - leanY) * 0.04;

      const px = new Float32Array(n);
      const py = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        if (reduce) {
          // no motion: the picture is simply there
          if (!ambient[i] && tgt) {
            x[i] = tgt.tx[i];
            y[i] = tgt.ty[i];
          }
          px[i] = x[i];
          py[i] = y[i];
          continue;
        }
        px[i] = x[i];
        py[i] = y[i];
        let ax = 0;
        let ay = 0;
        // this thread's own pull: never for ambient ones; staggered for the rest
        let pi = 0;
        if (!ambient[i]) {
          if (el < FORM) {
            const kk = Math.min(1, Math.max(0, (el / FORM - delay[i]) / 0.55));
            pi = kk * kk * (3 - 2 * kk);
          } else if (el < FORM + HOLD) pi = 1;
          else {
            const rel = Math.min(1, Math.max(0, ((el - FORM - HOLD) / 900 - delay[i] * 0.6) / 0.5));
            pi = 1 - rel * rel * (3 - 2 * rel);
          }
        }
        const fi = 1 - pi;
        if (fi > 0.01) {
          const a = noise(x[i] * ns + t * 0.05, y[i] * ns - t * 0.04) * Math.PI * 4;
          ax += Math.cos(a) * 0.35 * fi;
          ay += Math.sin(a) * 0.35 * fi;
        }
        if (tgt && pi > 0) {
          const k = 0.012 + pi * 0.05;
          const gx = cx0 + (tgt.tx[i] - cx0) * breath + Math.sin(t * 1.3 + i * 0.71) * wob + leanX;
          const gy = cy0 + (tgt.ty[i] - cy0) * breath + Math.cos(t * 1.1 + i * 0.53) * wob + leanY;
          ax += (gx - x[i]) * k * pi;
          ay += (gy - y[i]) * k * pi;
        }
        // cap the drift and pull so far-off threads glide in as ink, not
        // as streaks; the pointer's push (below) stays sharp on purpose
        const am = Math.hypot(ax, ay);
        if (am > cap) {
          ax *= cap / am;
          ay *= cap / am;
        }
        let f = fear[i] * 0.95;
        if (stir) {
          const dx = x[i] - pointer.x;
          const dy = y[i] - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < R2 && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const near = 1 - d / R;
            ax += (dx / d) * near * near * 9;
            ay += (dy / d) * near * near * 9;
            f = Math.max(f, near);
          }
        }
        fear[i] = f;
        const damp = 0.82 - fi * 0.06;
        vx[i] = (vx[i] + ax) * damp;
        vy[i] = (vy[i] + ay) * damp;
        x[i] += vx[i];
        y[i] += vy[i];
        // threads that drift off one side come back on the other
        if (x[i] < -10) x[i] += w + 20;
        else if (x[i] > w + 10) x[i] -= w + 20;
        if (y[i] < -10) y[i] += h + 20;
        else if (y[i] > h + 10) y[i] -= h + 20;
      }

      // ink: each thread draws the step it just took, plus a dot where it is
      const bands: [string, number, number][] = [
        [CALM, -1, 0.2],
        [UNEASY, 0.2, 0.55],
        [ALARMED, 0.55, 9],
      ];
      // the ambient ink first, quieter, so the pictures read on top of it
      c.strokeStyle = "rgba(236,232,220,0.42)";
      c.lineWidth = 1.1;
      c.beginPath();
      for (let i = 0; i < n; i++) {
        if (!ambient[i] || fear[i] > 0.2) continue;
        if (Math.abs(x[i] - px[i]) > 40 || Math.abs(y[i] - py[i]) > 40) continue;
        c.moveTo(px[i], py[i]);
        c.lineTo(x[i], y[i]);
      }
      c.stroke();
      c.lineWidth = 1;
      for (const [col, lo, hi] of bands) {
        c.strokeStyle = col;
        c.fillStyle = col;
        c.beginPath();
        for (let i = 0; i < n; i++) {
          const f = fear[i];
          if (f <= lo || f > hi) continue;
          if (ambient[i] && f <= 0.2) continue;
          if (Math.abs(x[i] - px[i]) > 40 || Math.abs(y[i] - py[i]) > 40) continue;
          c.moveTo(px[i], py[i]);
          c.lineTo(x[i], y[i]);
        }
        c.stroke();
        if (pull > 0.6) {
          for (let i = 0; i < n; i++) {
            const f = fear[i];
            if (f <= lo || f > hi || ambient[i]) continue;
            c.fillRect(x[i] - 0.7, y[i] - 0.7, 1.4, 1.4);
          }
        }
      }

      // a slow band of light sweeps across the held picture, every few seconds
      if (pull > 0.6 && !reduce) {
        const span = box.w + box.h * 0.6;
        const band = (((t / 4.5) % 1) * 1.5 - 0.25) * span;
        const width = Math.max(30, span * 0.05);
        for (const [alpha, lo, hi] of [
          [0.35, 0.5, 1],
          [0.85, 0, 0.5],
        ] as const) {
          c.fillStyle = `rgba(250,255,228,${alpha})`;
          for (let i = 0; i < n; i++) {
            if (ambient[i] || fear[i] > 0.2) continue;
            const d = Math.abs((x[i] - box.x) + (y[i] - box.y) * 0.6 - band) / width;
            if (d < lo || d >= hi) continue;
            c.fillRect(x[i] - 1, y[i] - 1, 2, 2);
          }
        }
      }
    }

    function onMove(e: PointerEvent) {
      const r = canvas!.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      pointer.at = performance.now();
    }

    let tm = 0;
    const onResize = () => {
      clearTimeout(tm);
      tm = window.setTimeout(layout, 150);
    };
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);

    const begin = () => {
      layout();
      setScenes(list);
      raf = requestAnimationFrame(frame);
    };
    // my face opens the set when the portrait is there
    const img = new Image();
    img.onload = () => {
      portrait = img;
      list = [face, ...list];
      document.fonts.ready.then(begin);
    };
    img.onerror = () => document.fonts.ready.then(begin);
    img.src = "/portrait.jpg";

    const hero = canvas.closest("section") ?? canvas;
    hero.addEventListener("pointermove", onMove as EventListener);
    hero.addEventListener("pointerdown", onMove as EventListener);
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      hero.removeEventListener("pointermove", onMove as EventListener);
      hero.removeEventListener("pointerdown", onMove as EventListener);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <>
      <canvas ref={ref} aria-hidden className={s.canvas} />
      {scenes.length > 0 && (
        <>
          <p className="sr-only" aria-live="polite">
            Now drawing {scenes[current]?.caption}
          </p>
          {/* moving content needs a way to stop it (WCAG 2.2.2): this stays
              out of sight until someone tabs to it */}
          <button
            type="button"
            className={s.pause}
            aria-pressed={paused}
            onClick={() => {
              ctl.current.paused = !ctl.current.paused;
              setPaused(ctl.current.paused);
            }}
          >
            {paused ? "Play the ink animation" : "Pause the ink animation"}
          </button>
        </>
      )}
    </>
  );
}
