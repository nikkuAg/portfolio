"use client";

import { useEffect, useRef, useState } from "react";
import s from "./morph.module.css";

// The hero's picture: one swarm of ink threads that keeps drawing who I am.
// Most threads gather into a picture (my face, then the things I love: F1,
// games, DJing, drums, board games, code), hold it, let go and drift into
// the next; the rest never settle and keep the whole screen inked. While a
// picture holds it plays: the face looks round, the car launches, the pad
// is played, the decks are mixed, a backgammon opening is played, the code
// types itself, the drums are played.
// The pictures never follow the pointer. Moving it through the ink sweeps
// the dots it crosses along with it, harder the faster it moves; they glow
// lime, then drift back into place.

/** Where a held picture's points go at a moment of its hold. */
type Meta = { cx: number; cy: number; rx: number; ry: number; yaw: number; pitch: number };
type Move = (out: { x: number; y: number }, u: number, v: number, part: number, i: number, ht: number, m: Meta) => void;
type Scene = {
  id: string;
  label: string;
  caption: string;
  draw: (o: CanvasRenderingContext2D, w: number, h: number) => void;
  image?: boolean;
  /** where on the page it goes, on screens wide enough to choose */
  place?: "side" | "band" | "left";
  /** seen from above, so on a tall screen it may be turned a quarter to
   *  fill the space */
  turn?: boolean;
  /** side-on pictures that can't turn have a second drawing, composed to
   *  stand tall, used whenever their box is nearly as tall as it is wide */
  tall?: Scene;
  /** Once the picture has landed it keeps playing: this moves each point
   *  (u, v in the drawing's own units) by its part and the time held. */
  move?: Move;
};

const BG: [number, number, number] = [11, 12, 16];
const CALM = "rgba(236,232,220,0.92)";
const UNEASY = "rgba(200,255,61,0.75)"; // the site's lime, for ink that's been disturbed
const ALARMED = "rgba(222,255,140,1)";

const FORM = 2600;
const HOLD = 4800;
const CYCLE = FORM + HOLD;

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

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
const bump = (x: number, at: number, width: number) => Math.exp(-(((x - at) / width) ** 2));
const mod = (a: number, b: number) => ((a % b) + b) % b;
const easeOut = (t: number) => 1 - (1 - clamp(t, 0, 1)) ** 3;
function turn(out: { x: number; y: number }, u: number, v: number, px: number, py: number, a: number) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const dx = u - px;
  const dy = v - py;
  out.x = px + dx * c - dy * s;
  out.y = py + dx * s + dy * c;
}

/** Drawings tag their parts by colour, so each point knows what it belongs to. */
function part(o: CanvasRenderingContext2D, id: number) {
  const c = `rgb(${id * 8},255,255)`;
  o.fillStyle = c;
  o.strokeStyle = c;
}

/** Draw in a unit space (uw × uh) centred and scaled to fit the box. */
let fitK = 1;
let fitDX = 0;
let fitDY = 0;
function fit(o: CanvasRenderingContext2D, w: number, h: number, uw: number, uh: number, fill = 0.9) {
  const k = Math.min(w / uw, h / uh) * fill;
  fitK = k;
  fitDX = 0;
  fitDY = 0;
  o.translate(w / 2, h / 2);
  o.scale(k, k);
}
/** Move the drawing within its box, in its own units. Unlike a bare
 *  translate this is recorded, so the scene's move() still gets its own
 *  coordinates. */
function shift(o: CanvasRenderingContext2D, dx: number, dy: number) {
  fitDX += dx;
  fitDY += dy;
  o.translate(dx, dy);
}

// the face looks at the name, then glances the other way, then back at you
const face: Scene = {
  id: "face",
  label: "Me",
  caption: "my face",
  place: "side",
  image: true,
  draw() {},
  move(out, u, v, _p, _i, ht, m) {
    const toName = smooth(0.3, 1.0, ht) * (1 - smooth(2.4, 3.0, ht));
    const away = smooth(2.9, 3.4, ht) * (1 - smooth(4.1, 4.7, ht));
    // where it looks, -1..1 each way
    const lx = (m.yaw / 0.34) * (toName - 0.7 * away);
    const ly = (m.pitch / 0.22) * toName - 0.15 * away;
    const nu = (u - m.cx) / m.rx;
    const nv = (v - m.cy) / m.ry;
    // the eyes, glasses and nose slide towards the look; the outline doesn't,
    // so the face reads as turning, not as being squeezed
    const across = Math.max(0, 1 - nu * nu);
    const down = Math.max(0, 1 - ((nv + 0.2) / 0.7) ** 2);
    const feat = across * across * down * down;
    let fx = u + lx * m.rx * 0.08 * feat;
    let fy = v + ly * m.ry * 0.05 * feat;
    // and the whole head moves with it, rigidly: a small lean and tilt on
    // the neck, while the shoulders stay put
    const head = 1 - smooth(0.45, 0.8, nv);
    fx += lx * m.rx * 0.03 * head;
    fy += ly * m.ry * 0.025 * head;
    turn(out, fx, fy, m.cx, m.cy + m.ry * 0.6, -lx * 0.035 * head);
  },
};

// The car for tall screens: seen from above, nose up, so it can be drawn
// tall. It idles, launches up the screen, and the track streams past.
// parts: 0 body, 1 rear tyres, 2 front tyres, 3 the track's dashes
const F1_TYRES: { id: number; x: number; y: number; w: number; h: number }[] = [
  { id: 2, x: -37, y: -74, w: 13, h: 24 },
  { id: 2, x: 24, y: -74, w: 13, h: 24 },
  { id: 1, x: -41, y: 52, w: 16, h: 30 },
  { id: 1, x: 25, y: 52, w: 16, h: 30 },
];
const f1Tall: Scene = {
  id: "f1",
  label: "F1",
  caption: "F1, and Ferrari",
  draw(o, w, h) {
    o.save();
    fit(o, w, h, 100, 232, 0.95);
    o.lineCap = "round";
    part(o, 0);
    // front wing: two elements and endplates
    o.fillRect(-38, -104, 76, 5);
    o.fillRect(-35, -97, 70, 3);
    o.fillRect(-41, -107, 4, 15);
    o.fillRect(37, -107, 4, 15);
    // nose, then the chassis widening into the sidepods and back to the gearbox
    o.beginPath();
    o.moveTo(-4, -95);
    o.lineTo(4, -95);
    o.lineTo(9, -40);
    o.lineTo(12, -22);
    o.lineTo(25, -10);
    o.lineTo(26, 28);
    o.quadraticCurveTo(24, 50, 12, 62);
    o.lineTo(9, 80);
    o.lineTo(-9, 80);
    o.lineTo(-12, 62);
    o.quadraticCurveTo(-24, 50, -26, 28);
    o.lineTo(-25, -10);
    o.lineTo(-12, -22);
    o.lineTo(-9, -40);
    o.closePath();
    o.fill();
    // the cockpit cut out, the helmet in it, and the engine cover's lines
    o.globalCompositeOperation = "destination-out";
    o.beginPath();
    o.ellipse(0, -13, 7, 12, 0, 0, Math.PI * 2);
    o.fill();
    o.lineWidth = 1.3;
    for (const x of [-15, 15]) {
      o.beginPath();
      o.moveTo(x, 2);
      o.lineTo(x * 0.9, 40);
      o.stroke();
    }
    o.globalCompositeOperation = "source-over";
    o.beginPath();
    o.arc(0, -15, 5, 0, Math.PI * 2);
    o.fill();
    // suspension arms
    o.lineWidth = 1.8;
    for (const [x0, y0, x1, y1] of [
      [-8, -64, -25, -63],
      [-8, -54, -25, -59],
      [8, -64, 25, -63],
      [8, -54, 25, -59],
      [-12, 62, -26, 65],
      [-11, 72, -26, 70],
      [12, 62, 26, 65],
      [11, 72, 26, 70],
    ]) {
      o.beginPath();
      o.moveTo(x0, y0);
      o.lineTo(x1, y1);
      o.stroke();
    }
    // rear wing
    o.fillRect(-34, 86, 68, 6);
    o.fillRect(-32, 94, 64, 3);
    o.fillRect(-37, 84, 4, 15);
    o.fillRect(33, 84, 4, 15);
    // tyres, each in a gap, with tread cut across so you can see them roll
    for (const t of F1_TYRES) {
      o.globalCompositeOperation = "destination-out";
      o.beginPath();
      o.roundRect(t.x - 1.5, t.y - 1.5, t.w + 3, t.h + 3, 4);
      o.fill();
      o.globalCompositeOperation = "source-over";
      part(o, t.id);
      o.beginPath();
      o.roundRect(t.x, t.y, t.w, t.h, 3);
      o.fill();
      o.globalCompositeOperation = "destination-out";
      for (let y = t.y + 4; y < t.y + t.h - 2; y += 5) o.fillRect(t.x, y, t.w, 1.3);
      o.globalCompositeOperation = "source-over";
    }
    // the track: dashed lines either side
    part(o, 3);
    o.lineWidth = 1.8;
    o.setLineDash([7, 7]);
    for (const x of [-48, 48]) {
      o.beginPath();
      o.moveTo(x, -112);
      o.lineTo(x, 112);
      o.stroke();
    }
    o.setLineDash([]);
    o.restore();
  },
  move(out, u, v, p, i, ht) {
    const launch = smooth(0.8, 1.9, ht);
    // how far the car has travelled: an idle creep, then the launch
    const run = Math.max(0, ht) * 26 + Math.max(0, ht - 0.8) * 160;
    if (p === 3) {
      out.x = u;
      out.y = -112 + mod(v + 112 + run, 224);
      return;
    }
    let x = u;
    let y = v;
    if (p === 1 || p === 2) {
      // the tread rolls through each tyre
      const t = F1_TYRES.find((q) => q.id === p && u >= q.x - 2 && u <= q.x + q.w + 2) ?? F1_TYRES[p === 2 ? 0 : 2];
      y = t.y + mod(v - t.y + run * 0.35, t.h);
      if (p === 2) {
        // a little steering on the line, straight once it goes
        turn(out, x, y, t.x + t.w / 2, t.y + t.h / 2, 0.12 * Math.sin(ht * 2.6) * (1 - launch));
        x = out.x;
        y = out.y;
      }
    }
    const surge = easeOut((ht - 0.8) / 1.4) * 12 - 1.6 * (bump(ht, 2.6, 0.12) + bump(ht, 3.8, 0.12));
    out.x = x + (1 - launch * 0.5) * 0.5 * Math.sin(ht * 63 + (i & 7));
    out.y = y - surge;
  },
};

// parts: 0 body, 1 rear wheel, 2 front wheel, 3 speed lines
const f1: Scene = {
  id: "f1",
  label: "F1",
  caption: "F1, and Ferrari",
  place: "band",
  tall: f1Tall,
  draw(o, w, h) {
    o.save();
    fit(o, w, h, 272, 66, 0.96);
    o.translate(16, 0);
    part(o, 0);
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
    // rear wing side on: the endplate is a solid panel down to the swan-neck
    // pylon, with the slot between its two elements cut through
    o.beginPath();
    o.moveTo(-104, -33);
    o.lineTo(-79, -33);
    o.lineTo(-79, -22);
    o.lineTo(-85, -16);
    o.lineTo(-85, 2);
    o.lineTo(-100, 4);
    o.closePath();
    o.fill();
    o.globalCompositeOperation = "destination-out";
    o.fillRect(-103, -25.5, 23, 1.8);
    o.globalCompositeOperation = "source-over";
    // front wing: three elements and an endplate
    o.fillRect(76, 14, 28, 2.6);
    o.fillRect(79, 10, 24, 2.4);
    o.fillRect(83, 6.5, 19, 2.2);
    o.fillRect(101, 3, 3, 13.5);
    // halo and helmet
    o.lineWidth = 2.6;
    o.lineCap = "round";
    o.beginPath();
    o.moveTo(-1, -10);
    o.bezierCurveTo(3, -19, 14, -19, 19, -10);
    o.stroke();
    o.beginPath();
    o.arc(7, -12, 5, 0, Math.PI * 2);
    o.fill();
    // wheels: tyre, a gap, and a five-spoke rim, so you can see them turn
    for (const [x, r, id] of [
      [-60, 15, 1],
      [60, 14, 2],
    ] as const) {
      o.globalCompositeOperation = "destination-out";
      o.beginPath();
      o.arc(x, 9, r + 1.5, 0, Math.PI * 2);
      o.fill();
      o.globalCompositeOperation = "source-over";
      part(o, id);
      o.beginPath();
      o.arc(x, 9, r, 0, Math.PI * 2);
      o.fill();
      o.globalCompositeOperation = "destination-out";
      o.beginPath();
      o.arc(x, 9, r * 0.7, 0, Math.PI * 2);
      o.fill();
      o.globalCompositeOperation = "source-over";
      o.lineWidth = r * 0.17;
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        o.beginPath();
        o.moveTo(x, 9);
        o.lineTo(x + Math.cos(a) * r * 0.7, 9 + Math.sin(a) * r * 0.7);
        o.stroke();
      }
      o.beginPath();
      o.arc(x, 9, r * 0.2, 0, Math.PI * 2);
      o.fill();
    }
    // speed lines streaming off the back
    part(o, 3);
    o.lineWidth = 2;
    o.setLineDash([6, 5]);
    for (const y of [-24, -13, -2, 8, 18]) {
      o.beginPath();
      o.moveTo(-150, y);
      o.lineTo(-117, y);
      o.stroke();
    }
    o.setLineDash([]);
    o.restore();
  },
  move(out, u, v, p, i, ht) {
    // idle on the line, then launch: it squats, surges, and the scenery streams
    const launch = smooth(0.8, 1.9, ht);
    if (p === 3) {
      const s = ht * 26 + Math.max(0, ht - 0.8) * 150;
      out.x = -134 + mod(u + 134 - s, 33);
      out.y = v;
      return;
    }
    let cu = u;
    let cv = v;
    if (p === 1 || p === 2) {
      const wx = p === 1 ? -44 : 76;
      const a = ht * 3 + Math.max(0, ht - 1.1) * 9;
      turn(out, u, v, wx, 9, a);
      cu = out.x;
      cv = out.y;
    }
    // the nose lifts as the power goes down, then each upshift nods it
    const lift = -0.045 * bump(ht, 1.0, 0.25) + 0.012 * (bump(ht, 2.6, 0.08) + bump(ht, 3.8, 0.08));
    turn(out, cu, cv, -44, 24, lift);
    const surge = easeOut((ht - 0.8) / 1.4) * 9 - 1.4 * (bump(ht, 2.6, 0.12) + bump(ht, 3.8, 0.12));
    const shake = (1 - launch * 0.5) * 0.5 * Math.sin(ht * 63 + (i & 7));
    out.x += surge;
    out.y += shake;
  },
};

// parts: 0 body, 1–4 face buttons (top, right, bottom, left), 5 d-pad, 6–7 sticks
const BTN: [number, number][] = [
  [34, -9],
  [44, 0],
  [34, 9],
  [24, 0],
];
const STICK: [number, number][] = [
  [-14, 9],
  [14, 9],
];
// a little combo, in seconds since the picture landed: [when, part, d-pad direction]
const COMBO: [number, number, number][] = [
  [0.7, 5, 1],
  [0.9, 5, 0],
  [1.1, 3, 0],
  [1.4, 2, 0],
  [1.6, 2, 0],
  [2.0, 1, 0],
  [2.5, 5, 3],
  [2.65, 5, 3],
  [2.85, 4, 0],
  [3.05, 3, 0],
  [3.6, 5, 2],
  [3.8, 1, 0],
  [3.95, 3, 0],
];
const DIRS: [number, number][] = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];
const press = (ht: number, at: number) => smooth(at, at + 0.03, ht) * (1 - smooth(at + 0.13, at + 0.22, ht));

// Games for tall screens: a handheld console with a little runner game on
// its screen. The runner jumps each block as it comes, and the button goes
// down as it jumps. The body is drawn in outline, the controls solid.
// parts: 0 body, screen frame and ground, 1 A, 2 B,
// 3 select, 4 start, 5 d-pad, 9 the runner, 10–11 the blocks
const HH_A: [number, number] = [30, 22];
const HH_B: [number, number] = [12, 38];
const HH_RUNNER = -26;
const HH_BLOCKS: [number, number][] = [
  [10, 6.5],
  [11, 34.5],
];
/** Where a block is on the screen at a moment of the hold. */
const hhBlock = (x0: number, ht: number) => -42 + mod(x0 + 42 - 34 * Math.max(0, ht), 84);
const gamesTall: Scene = {
  id: "games",
  label: "Games",
  caption: "games, played and made",
  draw(o, w, h) {
    o.save();
    fit(o, w, h, 124, 206, 0.95);
    // the body and the screen in outline, so the controls (solid) stand out
    part(o, 0);
    o.lineWidth = 2.6;
    o.beginPath();
    o.roundRect(-56, -99, 112, 198, [12, 12, 30, 12]);
    o.stroke();
    o.lineWidth = 1.6;
    o.beginPath();
    o.roundRect(-46, -88, 92, 78, 5);
    o.stroke();
    // speaker slots
    o.lineWidth = 2;
    o.lineCap = "round";
    for (const d of [0, 7, 14]) {
      o.beginPath();
      o.moveTo(20 + d, 88 - d * 0.2);
      o.lineTo(32 + d, 76 - d * 0.2);
      o.stroke();
    }
    // inside the screen: the ground, the runner and two blocks
    o.fillRect(-41, -24, 82, 1.8);
    part(o, 9);
    o.beginPath();
    o.roundRect(HH_RUNNER - 4, -36, 8, 11, 2);
    o.fill();
    HH_BLOCKS.forEach(([id, x]) => {
      part(o, id);
      o.fillRect(x - 3, id === 10 ? -31 : -33, 6, id === 10 ? 7 : 9);
    });
    // the controls
    part(o, 5);
    o.fillRect(-40, 25, 28, 10);
    o.fillRect(-31, 16, 10, 28);
    part(o, 1);
    o.beginPath();
    o.arc(HH_A[0], HH_A[1], 7.5, 0, Math.PI * 2);
    o.fill();
    part(o, 2);
    o.beginPath();
    o.arc(HH_B[0], HH_B[1], 7.5, 0, Math.PI * 2);
    o.fill();
    part(o, 3);
    o.beginPath();
    o.roundRect(-19.5, 64.5, 15, 4, 2);
    o.fill();
    part(o, 4);
    o.beginPath();
    o.roundRect(4.5, 64.5, 15, 4, 2);
    o.fill();
    o.restore();
  },
  move(out, u, v, p, _i, ht) {
    out.x = u;
    out.y = v;
    // each block's distance ahead of the runner: the jump runs from 14
    // ahead to 8 past, and the A button goes down as it starts
    let jump = 0;
    let a = 0;
    for (const [, x0] of HH_BLOCKS) {
      const d = hhBlock(x0, ht) - HH_RUNNER;
      if (d < 14 && d > -8) jump = Math.max(jump, Math.sin((Math.PI * (14 - d)) / 22));
      a = Math.max(a, bump(d, 12, 2.6));
    }
    if (ht < 0) {
      jump = 0;
      a = 0;
    }
    if (p === 9) {
      const bob = jump > 0 ? 0 : 0.8 * Math.abs(Math.sin(ht * 14));
      out.y = v - 15 * jump - bob;
    } else if (p === 10 || p === 11) {
      const x0 = HH_BLOCKS[p - 10][1];
      out.x = u - x0 + hhBlock(x0, ht);
    } else if (p === 1 || p === 2) {
      const [bx, by] = p === 1 ? HH_A : HH_B;
      const k = p === 1 ? a : press(mod(ht, 1.7), 0.9);
      out.x = bx + (u - bx) * (1 - 0.35 * k);
      out.y = by + (v - by) * (1 - 0.35 * k) + 0.6 * k;
    } else if (p === 4) {
      out.y = v + 0.8 * press(ht, 0.05);
    } else if (p === 5) {
      // tapping right along with the run
      const k = press(mod(ht, 0.9), 0.15) * smooth(0.2, 0.4, ht);
      if (u > -26 + 2.5) out.x = u - 1.6 * k;
    }
  },
};

const games: Scene = {
  id: "games",
  label: "Games",
  caption: "games, played and made",
  place: "left",
  tall: gamesTall,
  draw(o, w, h) {
    o.save();
    fit(o, w, h, 136, 70);
    part(o, 0);
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
    // every control sits in its own cut-out, so a press reads as movement
    o.globalCompositeOperation = "destination-out";
    o.fillRect(-43.8, -5.8, 23.6, 9.6);
    o.fillRect(-36.8, -12.8, 9.6, 23.6);
    for (const [x, y] of BTN) {
      o.beginPath();
      o.arc(x, y, 5.6, 0, Math.PI * 2);
      o.fill();
    }
    for (const [x, y] of STICK) {
      o.beginPath();
      o.arc(x, y, 7, 0, Math.PI * 2);
      o.fill();
    }
    o.globalCompositeOperation = "source-over";
    part(o, 5);
    o.fillRect(-42, -4, 20, 6);
    o.fillRect(-35, -11, 6, 20);
    BTN.forEach(([x, y], k) => {
      part(o, k + 1);
      o.beginPath();
      o.arc(x, y, 3.8, 0, Math.PI * 2);
      o.fill();
    });
    STICK.forEach(([x, y], k) => {
      part(o, k + 6);
      o.beginPath();
      o.arc(x, y, 4.6, 0, Math.PI * 2);
      o.fill();
    });
    o.restore();
  },
  move(out, u, v, p, i, ht) {
    const t = ht % 4.6;
    let x = u;
    let y = v;
    if (p >= 1 && p <= 4) {
      let k = 0;
      for (const [at, q] of COMBO) if (q === p) k = Math.max(k, press(t, at));
      const [bx, by] = BTN[p - 1];
      x = bx + (u - bx) * (1 - 0.4 * k);
      y = by + (v - by) * (1 - 0.4 * k) + 0.5 * k;
    } else if (p === 5) {
      for (const [at, q, d] of COMBO) {
        if (q !== 5) continue;
        const k = press(t, at);
        const [dx, dy] = DIRS[d];
        if ((u + 32) * dx + (v + 1) * dy > 2.5) {
          x -= dx * 1.6 * k;
          y -= dy * 1.6 * k;
        }
      }
    } else if (p === 6) {
      const r = 1.9 * smooth(0.3, 0.8, ht);
      x += Math.cos(ht * 2.4) * r;
      y += Math.sin(ht * 2.4) * r;
    } else if (p === 7) {
      x += 2.2 * (bump(t, 1.9, 0.12) - bump(t, 3.3, 0.12));
      y -= 1.6 * bump(t, 2.3, 0.12);
    }
    // a hit on the bottom button makes the pad rumble
    let rumble = 0;
    for (const [at, q] of COMBO) if (q === 3) rumble += press(t, at);
    out.x = x + Math.sin(ht * 95 + (i & 15)) * 0.7 * Math.min(1, rumble);
    out.y = y;
  },
};

// A two-deck controller from above. parts: 0 chassis, slots and dividers,
// 1–2 jog wheels, 3–4 channel fader caps, 5 crossfader cap, 6–7 level
// meters, 8–9 EQ knobs (A, B)
const JOG: [number, number][] = [
  [-60, 4],
  [60, 4],
];
const STRIP = [-12, 12];
const KNOB_Y = [-36, -27, -18];
const METER_BASE = -10;
const dj: Scene = {
  id: "dj",
  label: "DJ",
  caption: "DJing, my newest habit",
  place: "band",
  turn: true,
  draw(o, w, h) {
    o.save();
    fit(o, w, h, 204, 100, 0.95);
    o.lineCap = "round";
    part(o, 0);
    o.lineWidth = 2.6;
    o.beginPath();
    o.roundRect(-100, -46, 200, 92, 9);
    o.stroke();
    o.lineWidth = 1.3;
    for (const x of [-25, 25]) {
      o.beginPath();
      o.moveTo(x, -40);
      o.lineTo(x, 40);
      o.stroke();
    }
    // fader slots and the crossfader slot
    for (const x of STRIP) {
      o.beginPath();
      o.moveTo(x, -6);
      o.lineTo(x, 26);
      o.stroke();
    }
    o.beginPath();
    o.moveTo(-14, 36);
    o.lineTo(14, 36);
    o.stroke();
    // jog wheels: a platter with rings and one marker, so you see them turn
    JOG.forEach(([cx, cy], k) => {
      part(o, k + 1);
      o.beginPath();
      o.arc(cx, cy, 33, 0, Math.PI * 2);
      o.fill();
      o.globalCompositeOperation = "destination-out";
      o.lineWidth = 1.6;
      for (const r of [27, 15]) {
        o.beginPath();
        o.arc(cx, cy, r, 0, Math.PI * 2);
        o.stroke();
      }
      o.lineWidth = 3.2;
      o.beginPath();
      o.moveTo(cx, cy - 17);
      o.lineTo(cx, cy - 31);
      o.stroke();
      o.beginPath();
      o.arc(cx, cy, 3.2, 0, Math.PI * 2);
      o.fill();
      o.globalCompositeOperation = "source-over";
    });
    // EQ knobs, each with a cut pointer
    STRIP.forEach((x, k) => {
      part(o, 8 + k);
      for (const y of KNOB_Y) {
        o.beginPath();
        o.arc(x, y, 3.8, 0, Math.PI * 2);
        o.fill();
        o.globalCompositeOperation = "destination-out";
        o.lineWidth = 1.2;
        o.beginPath();
        o.moveTo(x, y);
        o.lineTo(x, y - 3.8);
        o.stroke();
        o.globalCompositeOperation = "source-over";
      }
    });
    // level meters, a column of segments per channel
    [-4, 4].forEach((x, k) => {
      part(o, 6 + k);
      for (let s = 0; s < 7; s++) o.fillRect(x - 1.8, METER_BASE - 3 - s * 4, 3.6, 3);
    });
    // fader caps, drawn at the top of their throw, and the crossfader cap
    STRIP.forEach((x, k) => {
      part(o, 3 + k);
      o.fillRect(x - 4.5, -6, 9, 4.5);
    });
    part(o, 5);
    o.fillRect(-2.5, 32, 5, 8);
    o.restore();
  },
  move(out, u, v, p, _i, ht) {
    // the set: A is playing, B is brought in, the crossfader sweeps from
    // A to B, then A's fader comes down. Everything keeps a 124 bpm beat
    const beat = (ht * 124) / 60;
    const kick = Math.exp(-mod(beat, 1) * 5);
    const faderA = 1 - smooth(3.7, 4.5, ht);
    const faderB = smooth(0.4, 1.4, ht);
    const xf = smooth(1.6, 3.4, ht); // 0 = all A, 1 = all B
    let x = u;
    let y = v;
    if (p === 1 || p === 2) {
      const [cx, cy] = JOG[p - 1];
      // A spins steadily; B is nudged into time before it's let go
      const a =
        p === 1
          ? ht * 3.4
          : ht * 3.4 * smooth(0.3, 0.9, ht) + 0.6 * Math.sin(ht * 11) * (smooth(0.5, 0.7, ht) - smooth(1.4, 1.7, ht));
      turn(out, u, v, cx, cy, a);
      x = out.x;
      y = out.y;
    } else if (p === 3 || p === 4) {
      const f = p === 3 ? faderA : faderB;
      y = v + (1 - f) * 26;
    } else if (p === 5) {
      x = u - 9 + 18 * xf;
    } else if (p === 6 || p === 7) {
      const gain = p === 6 ? faderA * (1 - xf * 0.85) : faderB * (0.15 + xf * 0.85);
      const level = clamp(0.08 + gain * (0.45 + 0.5 * kick + 0.2 * noise(p * 5.1, ht * 6)), 0.08, 1);
      y = METER_BASE - (METER_BASE - v) * level;
    } else if (p === 8 || p === 9) {
      const sx = STRIP[p - 8];
      let ky = KNOB_Y[0];
      for (const k of KNOB_Y) if (Math.abs(v - k) < Math.abs(v - ky)) ky = k;
      const row = KNOB_Y.indexOf(ky);
      // A's bass is cut as B comes in; B's highs are swept up and back
      let a = 0;
      if (p === 8 && row === 2) a = -2.2 * smooth(1.4, 1.9, ht);
      if (p === 9 && row === 0) a = 1.6 * Math.sin(Math.max(0, ht - 2) * 2.2) * smooth(2, 2.4, ht);
      if (p === 9 && row === 2) a = -2.2 * (1 - smooth(1.8, 2.6, ht)) * smooth(0.2, 0.5, ht);
      turn(out, u, v, sx, ky, a);
      x = out.x;
      y = out.y;
    }
    const pulse = 1 + 0.008 * kick;
    out.x = x * pulse;
    out.y = y * pulse;
  },
};

// Drums for tall screens: the kit from above, on its rug, the throne at the
// bottom. Heads flex as they're hit, cymbals rock, and the sticks swing
// between them. parts: 0 rug and throne, 1 kick, 2–3 rack toms, 4 snare,
// 5 floor tom, 6 hi-hat, 7 crash, 8 ride, 9 left stick, 10 right stick
const DT_HEADS: { id: number; x: number; y: number; r: number }[] = [
  { id: 2, x: -15, y: -30, r: 13 },
  { id: 3, x: 15, y: -30, r: 13 },
  { id: 4, x: -30, y: 34, r: 14 },
  { id: 5, x: 36, y: 28, r: 19 },
];
const DT_CYMBALS: { id: number; x: number; y: number; r: number }[] = [
  { id: 6, x: -52, y: 2, r: 16 },
  { id: 7, x: -38, y: -66, r: 25 },
  { id: 8, x: 40, y: -62, r: 27 },
];
const DT_HAND_L: [number, number] = [-12, 60];
const DT_HAND_R: [number, number] = [12, 58];
const DT_TIP_L: [number, number] = [-30, 34];
const DT_TIP_R: [number, number] = [-48, 4];
/** Swing a stick about its hand from aiming at `from` to aiming at `to`
 *  (by w, 0–1), shortened as its tip lifts off the head. */
function aim(
  out: { x: number; y: number },
  u: number,
  v: number,
  hand: [number, number],
  from: [number, number],
  to: [number, number],
  w: number,
  lift: number,
) {
  const a0 = Math.atan2(from[1] - hand[1], from[0] - hand[0]);
  const a1 = Math.atan2(to[1] - hand[1], to[0] - hand[0]);
  const l0 = Math.hypot(from[0] - hand[0], from[1] - hand[1]);
  const l1 = Math.hypot(to[0] - hand[0], to[1] - hand[1]);
  const k = (1 + w * (l1 / l0 - 1)) * (1 - 0.2 * lift);
  turn(out, hand[0] + (u - hand[0]) * k, hand[1] + (v - hand[1]) * k, hand[0], hand[1], w * (a1 - a0));
}
const drumsTall: Scene = {
  id: "drums",
  label: "Drums",
  caption: "drums, loudly",
  draw(o, w, h) {
    o.save();
    fit(o, w, h, 144, 192, 0.95);
    o.lineCap = "round";
    part(o, 0);
    o.lineWidth = 1.6;
    o.beginPath();
    o.roundRect(-70, -94, 140, 182, 10);
    o.stroke();
    o.beginPath();
    o.arc(0, 74, 10, 0, Math.PI * 2);
    o.fill();
    // the kick from above: a shell with a hoop at each end
    part(o, 1);
    o.beginPath();
    o.roundRect(-13, -14, 26, 42, 3);
    o.fill();
    o.globalCompositeOperation = "destination-out";
    o.fillRect(-13, -10, 26, 1.4);
    o.fillRect(-13, 23, 26, 1.4);
    o.globalCompositeOperation = "source-over";
    // drum heads, each with its hoop cut in
    for (const d of DT_HEADS) {
      o.globalCompositeOperation = "destination-out";
      o.beginPath();
      o.arc(d.x, d.y, d.r + 1.8, 0, Math.PI * 2);
      o.fill();
      o.globalCompositeOperation = "source-over";
      part(o, d.id);
      o.beginPath();
      o.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      o.fill();
      o.globalCompositeOperation = "destination-out";
      o.lineWidth = 1.2;
      o.beginPath();
      o.arc(d.x, d.y, d.r - 2.6, 0, Math.PI * 2);
      o.stroke();
      o.globalCompositeOperation = "source-over";
    }
    // cymbals: rings with a bell, lighter than the drums
    for (const c of DT_CYMBALS) {
      o.globalCompositeOperation = "destination-out";
      o.beginPath();
      o.arc(c.x, c.y, c.r + 1.5, 0, Math.PI * 2);
      o.fill();
      o.globalCompositeOperation = "source-over";
      part(o, c.id);
      o.lineWidth = 2.4;
      o.beginPath();
      o.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      o.stroke();
      o.lineWidth = 0.9;
      o.beginPath();
      o.arc(c.x, c.y, c.r * 0.62, 0, Math.PI * 2);
      o.stroke();
      o.beginPath();
      o.arc(c.x, c.y, 4, 0, Math.PI * 2);
      o.fill();
    }
    // the sticks, from the hands to the snare and the hi-hat
    o.lineWidth = 2.6;
    for (const [id, hand, tip] of [
      [9, DT_HAND_L, DT_TIP_L],
      [10, DT_HAND_R, DT_TIP_R],
    ] as const) {
      part(o, id);
      o.beginPath();
      o.moveTo(hand[0], hand[1]);
      o.lineTo(tip[0], tip[1]);
      o.stroke();
      o.beginPath();
      o.arc(tip[0], tip[1], 2.3, 0, Math.PI * 2);
      o.fill();
    }
    o.restore();
  },
  move(out, u, v, p, _i, ht) {
    // the same 110 bpm groove as the kit seen front on
    const beat = Math.max(0, ht) * (110 / 60);
    const hat = mod(beat * 2, 1);
    const snr = mod(beat - 1, 2) / 2;
    const kick = Math.min(1, Math.exp(-mod(beat, 2) * 6) + Math.exp(-mod(beat - 2.5, 4) * 8));
    const crash = Math.exp(-mod(beat, 4) * 1.1);
    const bar8 = mod(beat, 8);
    out.x = u;
    out.y = v;
    const flex = (cx: number, cy: number, k: number) => {
      out.x = cx + (u - cx) * k;
      out.y = cy + (v - cy) * k;
    };
    if (p === 1) flex(0, 7, 1 + 0.05 * kick);
    else if (p === 4) flex(-30, 34, 1 + 0.08 * Math.exp(-snr * 14));
    else if (p === 2 || p === 3) {
      const fill = Math.exp(-mod(beat - (p === 2 ? 7 : 7.5), 8) * 7);
      flex(p === 2 ? -15 : 15, -30, 1 + 0.1 * fill);
    } else if (p === 5) flex(36, 28, 1 + 0.06 * Math.exp(-mod(beat - 3.5, 4) * 8));
    else if (p === 6) flex(-52, 2, 1 - 0.06 * Math.exp(-hat * 6));
    else if (p === 7 || p === 8) {
      // a cymbal rocks on its stand: from above it squashes one way, then the other
      const c = DT_CYMBALS[p - 6];
      const amt = p === 7 ? 0.1 * crash * Math.sin(ht * 17) : 0.035 * Math.exp(-mod(beat, 1) * 5) * Math.sin(ht * 21);
      out.x = c.x + (u - c.x) * (1 + amt);
      out.y = c.y + (v - c.y) * (1 - amt);
    } else if (p === 9) {
      // left hand: snare backbeat, over to the toms for the fill
      const w = smooth(6.75, 6.95, bar8) * (1 - smooth(7.75, 7.95, bar8));
      aim(out, u, v, DT_HAND_L, DT_TIP_L, [-15, -30], w, Math.sin(Math.PI * snr) ** 0.6);
    } else if (p === 10) {
      // right hand: hi-hat eighths, out to the crash at the top of each bar
      const b4 = mod(beat + 0.3, 4);
      const w = smooth(0, 0.22, b4) * (1 - smooth(0.42, 0.7, b4));
      aim(out, u, v, DT_HAND_R, DT_TIP_R, [-38, -60], w, Math.sin(Math.PI * hat) ** 0.7);
    }
  },
};

// A drum kit, front on. parts: 0 stands and legs, 1 bass drum, 2–3 rack
// toms, 4 snare, 5 floor tom, 6 top hi-hat, 7 crash, 8 left stick (snare),
// 9 right stick (hi-hat), 10 bottom hi-hat
const STICK_L: [number, number] = [-26, -42];
const STICK_R: [number, number] = [-46, -48];
const drums: Scene = {
  id: "drums",
  label: "Drums",
  caption: "drums, loudly",
  place: "side",
  tall: drumsTall,
  draw(o, w, h) {
    o.save();
    fit(o, w, h, 190, 128, 0.94);
    o.translate(0, -2);
    o.lineCap = "round";
    // stands and legs
    part(o, 0);
    o.lineWidth = 2;
    for (const [x0, y0, x1, y1] of [
      [-78, 62, -78, -4],
      [-86, 64, -78, 54],
      [-70, 64, -78, 54],
      [70, 62, 70, -34],
      [62, 64, 70, 54],
      [78, 64, 70, 54],
      [-47, 17, -47, 62],
      [-55, 64, -47, 56],
      [-39, 64, -47, 56],
      [37, 32, 37, 62],
      [59, 32, 59, 62],
      [-22, 54, -28, 62],
      [22, 54, 28, 62],
    ]) {
      o.beginPath();
      o.moveTo(x0, y0);
      o.lineTo(x1, y1);
      o.stroke();
    }
    // bass drum with its hoop
    part(o, 1);
    o.beginPath();
    o.arc(0, 30, 30, 0, Math.PI * 2);
    o.fill();
    o.globalCompositeOperation = "destination-out";
    o.lineWidth = 2;
    o.beginPath();
    o.arc(0, 30, 25, 0, Math.PI * 2);
    o.stroke();
    o.globalCompositeOperation = "source-over";
    // rack toms, snare, floor tom: shells with a cut line under the hoop
    const shell = (id: number, x: number, y: number, sw: number, sh: number) => {
      part(o, id);
      o.beginPath();
      o.roundRect(x, y, sw, sh, 3);
      o.fill();
      o.globalCompositeOperation = "destination-out";
      o.fillRect(x, y + 3, sw, 1.3);
      o.fillRect(x, y + sh - 4.3, sw, 1.3);
      o.globalCompositeOperation = "source-over";
    };
    shell(2, -28, -19, 23, 15);
    shell(3, 5, -19, 23, 15);
    shell(4, -62, 4, 30, 13);
    shell(5, 34, 6, 28, 26);
    // hi-hat pair and the crash
    part(o, 10);
    o.beginPath();
    o.ellipse(-78, -3, 17, 2.2, 0, 0, Math.PI * 2);
    o.fill();
    part(o, 6);
    o.beginPath();
    o.ellipse(-78, -8.5, 17, 2.4, 0, 0, Math.PI * 2);
    o.fill();
    o.fillRect(-79, -12, 2, 4);
    part(o, 7);
    o.beginPath();
    o.ellipse(70, -36, 23, 3, -0.2, 0, Math.PI * 2);
    o.fill();
    // the sticks, drawn at the moment of the hit
    o.lineWidth = 3;
    for (const [id, [hx, hy], tx, ty] of [
      [8, STICK_L, -46, 2],
      [9, STICK_R, -72, -11],
    ] as const) {
      part(o, id);
      o.beginPath();
      o.moveTo(hx, hy);
      o.lineTo(tx, ty);
      o.stroke();
      o.beginPath();
      o.arc(tx, ty, 2.2, 0, Math.PI * 2);
      o.fill();
    }
    o.restore();
  },
  move(out, u, v, p, _i, ht) {
    // a 110 bpm groove: hats on the eighths, snare on 2 and 4, kick on 1 and
    // 3 (plus the "and" of 3), a crash at the top of every bar
    const lv = v + 2;
    const beat = Math.max(0, ht) * (110 / 60);
    const hat = mod(beat * 2, 1);
    const snr = mod(beat - 1, 2) / 2;
    const kick = Math.exp(-mod(beat, 2) * 6) + Math.exp(-mod(beat - 2.5, 4) * 8);
    const crash = Math.exp(-mod(beat, 4) * 1.1);
    let x = u;
    let y = lv;
    if (p === 9) {
      turn(out, u, lv, STICK_R[0], STICK_R[1], 0.42 * Math.sin(Math.PI * hat) ** 0.7);
      x = out.x;
      y = out.y;
    } else if (p === 8) {
      turn(out, u, lv, STICK_L[0], STICK_L[1], 0.55 * Math.sin(Math.PI * snr) ** 0.6);
      x = out.x;
      y = out.y;
    } else if (p === 4) {
      const hit = Math.exp(-snr * 2 * 7);
      x = -47 + (u + 47) * (1 + 0.04 * hit);
      y = 10.5 + (lv - 10.5) * (1 + 0.12 * hit);
    } else if (p === 6) {
      const hit = Math.exp(-hat * 6);
      turn(out, u, lv, -78, -8.5, 0.05 * hit);
      x = out.x;
      y = out.y + 1.6 * hit;
    } else if (p === 7) {
      turn(out, u, lv, 70, -36, 0.2 * crash * Math.sin(ht * 17));
      x = out.x;
      y = out.y;
    } else if (p === 1) {
      const k = 1 + 0.06 * Math.min(1, kick);
      x = u * k;
      y = 30 + (lv - 30) * k;
    } else if (p === 2 || p === 3) {
      // a quick fill across the toms at the end of each second bar
      const fill = Math.exp(-mod(beat - (p === 2 ? 7 : 7.5), 8) * 7);
      const cx = p === 2 ? -16.5 : 16.5;
      x = cx + (u - cx) * (1 + 0.05 * fill);
      y = -11.5 + (lv + 11.5) * (1 + 0.14 * fill);
    }
    out.x = x;
    out.y = y - 2 + 0.6 * Math.min(1, kick);
  },
};

// Board games: a backgammon board from above, set up for the start, and an
// opening played on it. Two dice tumble in and land on 3 and 1, and white
// makes its 5-point: one checker from the 8-point, one from the 6, each
// hopping across. Then the dice are shaken and thrown again. White checkers
// are solid discs, black ones rings, the points thin outlines. parts: 0 board and the checkers that
// stay, 1–2 the dice, 3–4 the two checkers that move
const BG_PW = 94 / 6; // a point's width: six to a quarter, 94 units wide
const BG_R = 6.3; // checker radius
/** Where checker k (0 at the rim) sits on point i (0–23 as in play: 0 is
 *  the bottom right, round to 23 at the top right). */
function bgSpot(i: number, k: number): [number, number] {
  const bottom = i < 12;
  const j = bottom ? i : i - 12;
  const x = bottom
    ? j < 6
      ? 101 - BG_PW * (j + 0.5)
      : -7 - BG_PW * (j - 6 + 0.5)
    : j < 6
      ? -101 + BG_PW * (j + 0.5)
      : 7 + BG_PW * (j - 6 + 0.5);
  const y = bottom ? 66 - BG_R - 0.6 - k * (2 * BG_R + 0.4) : -66 + BG_R + 0.6 + k * (2 * BG_R + 0.4);
  return [x, y];
}
// the starting position: [point, count, white]
const BG_START: [number, number, boolean][] = [
  [23, 2, true],
  [12, 5, true],
  [7, 3, true],
  [5, 5, true],
  [0, 2, false],
  [11, 5, false],
  [16, 3, false],
  [18, 5, false],
];
// the opening 3-1: 8/5 then 6/5. From the top of each stack to the 5-point
const BG_MOVES: { id: number; from: [number, number]; to: [number, number]; at: number }[] = [
  { id: 3, from: [7, 2], to: [4, 0], at: 1.15 },
  { id: 4, from: [5, 4], to: [4, 1], at: 1.95 },
];
const BG_DICE: { id: number; at: [number, number]; pips: number }[] = [
  { id: 1, at: [40, 0], pips: 3 },
  { id: 2, at: [60, 0], pips: 1 },
];
const PIPS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  3: [
    [-3.4, -3.4],
    [0, 0],
    [3.4, 3.4],
  ],
};
const board: Scene = {
  id: "board",
  label: "Board games",
  caption: "board games, the longer the better",
  place: "left",
  turn: true,
  draw(o, w, h) {
    o.save();
    fit(o, w, h, 220, 146, 0.95);
    o.lineJoin = "round";
    part(o, 0);
    // the frame and the bar down the middle
    o.lineWidth = 2.4;
    o.beginPath();
    o.roundRect(-106, -70, 212, 140, 5);
    o.stroke();
    o.lineWidth = 1.4;
    for (const x of [-5, 5]) {
      o.beginPath();
      o.moveTo(x, -68);
      o.lineTo(x, 68);
      o.stroke();
    }
    // the points: long thin outlines, so the checkers get most of the ink
    o.lineWidth = 1;
    for (let i = 0; i < 24; i++) {
      const [cx] = bgSpot(i, 0);
      const bottom = i < 12;
      const base = bottom ? 66 : -66;
      const tip = bottom ? 12 : -12;
      o.beginPath();
      o.moveTo(cx - BG_PW / 2 + 1, base);
      o.lineTo(cx, tip);
      o.lineTo(cx + BG_PW / 2 - 1, base);
      o.closePath();
      o.stroke();
    }
    // a checker: a gap round it, then a disc (white) or a ring (black)
    const checker = (x: number, y: number, white: boolean, id: number) => {
      o.globalCompositeOperation = "destination-out";
      o.beginPath();
      o.arc(x, y, BG_R + 1.2, 0, Math.PI * 2);
      o.fill();
      o.globalCompositeOperation = "source-over";
      part(o, id);
      o.beginPath();
      o.arc(x, y, BG_R, 0, Math.PI * 2);
      o.fill();
      if (!white) {
        o.globalCompositeOperation = "destination-out";
        o.beginPath();
        o.arc(x, y, BG_R - 2.6, 0, Math.PI * 2);
        o.fill();
        o.globalCompositeOperation = "source-over";
      }
    };
    for (const [pt, count, white] of BG_START) {
      for (let k = 0; k < count; k++) {
        const mover = BG_MOVES.find((m) => m.from[0] === pt && m.from[1] === k);
        const [x, y] = bgSpot(pt, k);
        checker(x, y, white, mover ? mover.id : 0);
      }
    }
    // the dice, with their pips cut out
    for (const d of BG_DICE) {
      const [x, y] = d.at;
      part(o, d.id);
      o.beginPath();
      o.roundRect(x - 6.5, y - 6.5, 13, 13, 2.6);
      o.fill();
      o.globalCompositeOperation = "destination-out";
      for (const [px, py] of PIPS[d.pips]) {
        o.beginPath();
        o.arc(x + px, y + py, 1.5, 0, Math.PI * 2);
        o.fill();
      }
      o.globalCompositeOperation = "source-over";
    }
    o.restore();
  },
  move(out, u, v, p, _i, ht) {
    out.x = u;
    out.y = v;
    if (p === 1 || p === 2) {
      // thrown in from the right, tumbling and bouncing, then still; shaken
      // and thrown again near the end
      const d = BG_DICE[p - 1];
      const throwAt = (t0: number) => {
        const s = clamp((ht - t0) / 0.85, 0, 1);
        const e = easeOut(s);
        const lag = p === 2 ? 0.08 : 0;
        const bounce = Math.abs(Math.sin(s * Math.PI * 3)) * (1 - s) * 9;
        return { dx: (1 - e) * (70 + lag * 200), dy: -bounce, a: (1 - e) * (p === 2 ? -7 : 8), live: ht >= t0 };
      };
      const second = ht >= 3.75;
      const th = throwAt(second ? 3.75 : -0.15);
      // the shake before the second throw: a rattle on the spot
      const shake = smooth(3.15, 3.3, ht) * (1 - smooth(3.65, 3.75, ht));
      const sx = shake * 3 * Math.sin(ht * 55 + p);
      const sy = shake * 2.2 * Math.cos(ht * 47 + p * 2);
      turn(out, u, v, d.at[0], d.at[1], th.a + shake * 0.5 * Math.sin(ht * 40 + p));
      out.x += th.dx + sx;
      out.y += th.dy + sy;
      return;
    }
    if (p === 3 || p === 4) {
      const m = BG_MOVES[p - 3];
      const s = smooth(m.at, m.at + 0.6, ht);
      const [x0, y0] = bgSpot(...m.from);
      const [x1, y1] = bgSpot(...m.to);
      // lifted on the way: a hop, and a little bigger at the top of it
      const lift = Math.sin(Math.PI * s);
      const k = 1 + 0.22 * lift;
      out.x = x0 + (x1 - x0) * s + (u - x0) * k;
      out.y = y0 + (y1 - y0) * s + (v - y0) * k - lift * 16;
    }
  },
};

// The code picture: an editor made of ink. When it lands the whole program
// is sucked back into the cursor, then types itself out again token by
// token, each one sprayed from the cursor, and runs. parts: 0 window, 30 the
// cursor, 1.. the tokens, in typing order
const LINES: [number, number[]][] = [
  [0, [16, 24, 9]],
  [1, [11, 18, 28]],
  [1, [9, 32]],
  [2, [13, 20, 11]],
  [2, [26]],
  [1, [7]],
  [1, [17, 12, 23]],
  [0, [7]],
  [0, []],
  [0, [19, 36]],
];
type Tok = { x: number; y: number; w: number; t: number };
const TOKENS: Tok[] = [];
{
  let k = 0;
  LINES.forEach(([indent, ws], row) => {
    let x = -82 + indent * 10;
    const y = -33 + row * 9;
    for (const w of ws) {
      TOKENS.push({ x, y, w, t: 0.75 + k * 0.19 });
      x += w + 3.5;
      k++;
    }
  });
}
const CURSOR0: [number, number] = [-82, -33];
function cursorAt(ht: number): [number, number] {
  if (ht < TOKENS[0].t) return CURSOR0;
  for (let k = TOKENS.length - 1; k >= 0; k--) {
    const tk = TOKENS[k];
    if (ht >= tk.t) return [tk.x + tk.w * clamp((ht - tk.t) / 0.16, 0, 1) + 2, tk.y];
  }
  return CURSOR0;
}
const code: Scene = {
  id: "code",
  label: "Code",
  caption: "code, most days",
  place: "band",
  draw(o, w, h) {
    o.save();
    // the code only fills the left of a wide window; wherever the wide one
    // would be held back by the width (anything but a wide band) the
    // window closes in round it, so the whole editor can be drawn far bigger
    const tall = h > w * 0.55;
    const right = tall ? 14 : 110;
    if (tall) {
      fit(o, w, h, 128, 126, 0.96);
      shift(o, 48, 0);
    } else fit(o, w, h, 228, 126, 0.96);
    part(o, 0);
    o.lineWidth = 2.2;
    o.beginPath();
    o.roundRect(-110, -58, 110 + right, 116, 8);
    o.stroke();
    o.lineWidth = 1.2;
    o.beginPath();
    o.moveTo(-110, -45);
    o.lineTo(right, -45);
    o.stroke();
    for (const dx of [0, 8, 16]) {
      o.beginPath();
      o.arc(-100 + dx, -51.5, 2.3, 0, Math.PI * 2);
      o.fill();
    }
    // line numbers
    for (let r = 0; r < LINES.length; r++) o.fillRect(-97, -35 + r * 9, 5, 3.6);
    TOKENS.forEach((tk, k) => {
      part(o, k + 1);
      o.beginPath();
      o.roundRect(tk.x, tk.y - 2.3, tk.w, 4.6, 2.3);
      o.fill();
    });
    part(o, 30);
    o.fillRect(CURSOR0[0] - 1, CURSOR0[1] - 4, 2.4, 8);
    o.restore();
  },
  move(out, u, v, p, _i, ht) {
    const [cx, cy] = cursorAt(ht);
    // "run": once it's all typed, a ripple runs down the lines
    const run = (row: number) => 2.5 * bump(ht, 4.55 + row * 0.06, 0.07);
    if (p === 30) {
      const blink = ht > 4.4 && Math.floor(ht * 2.2) % 2 === 1 ? 0.15 : 1;
      out.x = cx + (u - CURSOR0[0]);
      out.y = cy + (v - CURSOR0[1]) * blink;
      return;
    }
    if (p < 1 || p > TOKENS.length) {
      out.x = u;
      out.y = v;
      return;
    }
    const tk = TOKENS[p - 1];
    // how much of this token is on the page: all of it as the picture lands,
    // none once it's been sucked away, then back as it's typed
    const here = ht < 0.6 ? 1 - smooth(0.05 + (TOKENS.length - p) * 0.012, 0.35 + (TOKENS.length - p) * 0.012, ht) : smooth(tk.t, tk.t + 0.2, ht);
    const tcx = tk.x + tk.w / 2;
    // away, a token is a small knot of ink riding on the cursor
    const ax = cx + (u - tcx) * 0.1;
    const ay = cy + (v - tk.y) * 0.4;
    const row = Math.round((tk.y + 33) / 9);
    out.x = ax + (u - ax) * here + run(row);
    out.y = ay + (v - ay) * here;
  },
};

/**
 * The portrait as n evenly spaced dots, like a halftone print. A positive:
 * ink where the face is lit and none where it's dark (hair, brows, eyes,
 * beard), with extra ink tracing strong edges (glasses, the beard line) and
 * the head's outline. The dots come from error diffusion rather than random
 * picks, so they sit evenly and the features stay crisp instead of noisy.
 * The wall behind is removed by flooding in from the borders, and the
 * shoulders fade out so the picture ends softly under the chin.
 */
function stipple(d: Uint8ClampedArray, W: number, H: number, n: number, top: number, ph: number) {
  const L = new Float32Array(W * H);
  const S = new Float32Array(W * H);
  for (let p = 0; p < W * H; p++) {
    const r = d[p * 4];
    const g = d[p * 4 + 1];
    const b = d[p * 4 + 2];
    L[p] = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const mx = Math.max(r, g, b);
    S[p] = mx ? (mx - Math.min(r, g, b)) / mx : 0;
  }
  // a light blur, so skin grain and single hairs don't count as edges
  const blurred = new Float32Array(W * H);
  {
    const tmp = new Float32Array(W * H);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const p = y * W + x;
        tmp[p] = (L[x > 0 ? p - 1 : p] + L[p] + L[x < W - 1 ? p + 1 : p]) / 3;
      }
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const p = y * W + x;
        blurred[p] = (tmp[y > 0 ? p - W : p] + tmp[p] + tmp[y < H - 1 ? p + W : p]) / 3;
      }
  }
  // the wall: light and colourless, reached from the edges
  const wall = new Uint8Array(W * H);
  const isWall = (p: number) => blurred[p] > 0.66 && S[p] < 0.16;
  const stack: number[] = [];
  for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
  while (stack.length) {
    const p = stack.pop()!;
    if (wall[p] || !isWall(p)) continue;
    wall[p] = 1;
    const x = p % W;
    if (x > 0) stack.push(p - 1);
    if (x < W - 1) stack.push(p + 1);
    if (p >= W) stack.push(p - W);
    if (p < W * (H - 1)) stack.push(p + W);
  }
  const D = new Float32Array(W * H);
  let sum = 0;
  const r3 = Math.max(2, Math.round(Math.min(W, H) / 180));
  for (let y = 1; y < H - 1; y++) {
    const fy = (y - top) / ph;
    const fade = fy < 0.78 ? 1 : Math.max(0, 1 - (fy - 0.78) / 0.14);
    if (!fade) continue;
    for (let x = 1; x < W - 1; x++) {
      const p = y * W + x;
      if (wall[p]) continue;
      const B = blurred;
      const gx = B[p - W + 1] + 2 * B[p + 1] + B[p + W + 1] - B[p - W - 1] - 2 * B[p - 1] - B[p + W - 1];
      const gy = B[p + W - 1] + 2 * B[p + W] + B[p + W + 1] - B[p - W - 1] - 2 * B[p - W] - B[p - W + 1];
      const edge = Math.min(1, (Math.hypot(gx, gy) / 4) * 3);
      const rim =
        (x >= r3 && wall[p - r3]) || (x < W - r3 && wall[p + r3]) || (y >= r3 && wall[p - r3 * W]) || (y < H - r3 && wall[p + r3 * W]) ? 1 : 0;
      const v = fade * (smooth(0.25, 0.75, B[p]) ** 1.5 + 0.9 * edge + rim);
      D[p] = v;
      sum += v;
    }
  }
  const tx = new Float32Array(n);
  const ty = new Float32Array(n);
  const pt = new Uint8Array(n);
  if (!sum) return null;
  // Floyd–Steinberg, serpentine, on the density scaled to about n dots
  const a = n / sum;
  for (let p = 0; p < W * H; p++) D[p] *= a;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let y = 0; y < H; y++) {
    const ltr = y % 2 === 0;
    const dx = ltr ? 1 : -1;
    for (let k = 0; k < W; k++) {
      const x = ltr ? k : W - 1 - k;
      const p = y * W + x;
      const v = D[p];
      const on = v >= 0.5 ? 1 : 0;
      if (on) {
        xs.push(x);
        ys.push(y);
      }
      const e = v - on;
      const fwd = x + dx >= 0 && x + dx < W;
      const back = x - dx >= 0 && x - dx < W;
      if (fwd) D[p + dx] += (e * 7) / 16;
      if (y + 1 < H) {
        if (back) D[p + W - dx] += (e * 3) / 16;
        D[p + W] += (e * 5) / 16;
        if (fwd) D[p + W + dx] += (e * 1) / 16;
      }
    }
  }
  const m = xs.length;
  if (!m) return null;
  // exactly n: a shuffled pass over the dots, repeating with a nudge if short
  const order = Array.from({ length: m }, (_, i) => i);
  for (let i = m - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [order[i], order[j]] = [order[j], order[i]];
  }
  for (let i = 0; i < n; i++) {
    const j = order[i % m];
    const extra = i >= m ? 1.5 : 0.3;
    tx[i] = xs[j] + (Math.random() - 0.5) * extra;
    ty[i] = ys[j] + (Math.random() - 0.5) * extra;
  }
  return { tx, ty, part: pt, k: 1, dx: 0, dy: 0, rot: false };
}

/** Turn a scene into exactly n target points inside the box. */
function sample(scene: Scene, n: number, bw: number, bh: number, img: HTMLImageElement | null) {
  const c = document.createElement("canvas");
  c.width = Math.max(2, Math.round(bw));
  c.height = Math.max(2, Math.round(bh));
  const o = c.getContext("2d", { willReadFrequently: true })!;
  part(o, 0);
  fitK = 1;
  fitDX = 0;
  fitDY = 0;
  if (scene.image && img) {
    // fit the portrait; the stippling decides where the threads go. The box
    // around it is painted the wall's own colour first, so the photo's
    // borders don't read as edges
    const k = Math.min(c.width / img.width, c.height / img.height);
    const iw = img.width * k;
    const ih = img.height * k;
    const x0 = (c.width - iw) / 2;
    const y0 = (c.height - ih) / 2;
    o.drawImage(img, x0, y0, iw, ih);
    const [r, g, b] = o.getImageData(Math.round(x0 + 3), Math.round(y0 + 3), 1, 1).data;
    o.fillStyle = `rgb(${r},${g},${b})`;
    o.fillRect(0, 0, c.width, c.height);
    o.drawImage(img, x0, y0, iw, ih);
    return stipple(o.getImageData(0, 0, c.width, c.height).data, c.width, c.height, n, y0, ih);
  }
  // a top-down picture in a tall box is drawn a quarter turn round, so it
  // fills the height instead of shrinking to the width
  // (for a 2:1 controller or a 3:2 board that wins once the box is square)
  const rot = !!scene.turn && c.height > c.width;
  if (rot) {
    o.translate(c.width / 2, c.height / 2);
    o.rotate(-Math.PI / 2);
    o.translate(-c.height / 2, -c.width / 2);
    scene.draw(o, c.height, c.width);
  } else scene.draw(o, c.width, c.height);
  const d = o.getImageData(0, 0, c.width, c.height).data;
  const xs: number[] = [];
  const ys: number[] = [];
  const ws: number[] = [];
  const ps: number[] = [];
  {
    for (let y = 0; y < c.height; y += 2) {
      for (let x = 0; x < c.width; x += 2) {
        const q = (y * c.width + x) * 4;
        if (d[q + 3] < 128) continue;
        xs.push(x);
        ys.push(y);
        ws.push(1);
        ps.push(Math.round(d[q] / 8));
      }
    }
  }
  const tx = new Float32Array(n);
  const ty = new Float32Array(n);
  const pt = new Uint8Array(n);
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
    pt[i] = ps[j];
  }
  return { tx, ty, part: pt, k: fitK, dx: fitDX, dy: fitDY, rot };
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
  // landscape below desktop width (a phone on its side, a small laptop or a
  // tablet held wide): the words take the left half, the picture the right,
  // top to bottom
  if (w < 1024 && w > h * 1.15) {
    const top = h < 520 ? 60 : navClear;
    const x = w * 0.5;
    return { x, y: top, w: w - x - g, h: h - top - (h < 520 ? 16 : 28) };
  }
  if (w >= 1024 && w > h) {
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

type Box = { x: number; y: number; w: number; h: number };
/**
 * Pictures don't all sit in one spot. On wide screens each has its own place:
 * "side" is the upper right beside the name, "band" is the whole width above
 * the words, "left" is above the name. Narrower screens have one free area,
 * so everything uses it.
 */
function pictureBoxes(canvas: HTMLCanvasElement, w: number, h: number): Record<"side" | "band" | "left", Box> {
  const side = pictureBox(canvas, w, h);
  if (w < 1024 || w <= h * 1.15) return { side, band: side, left: side };
  const navClear = 72;
  const fl = Math.max(40, (w - 2200) / 2);
  const fw = w - fl * 2;
  const cr = canvas.getBoundingClientRect();
  const hero = canvas.closest("section");
  const topOf = (sel: string, fb: number) => {
    const el = hero?.querySelector<HTMLElement>(sel);
    return el ? el.getBoundingClientRect().top - cr.top : fb;
  };
  const nameTop = topOf("[data-hero-name]", h * 0.65);
  const sideTop = topOf("[data-hero-side]", h * 0.7);
  const bandBottom = Math.min(nameTop, sideTop) - 24;
  return {
    side,
    band: { x: fl, y: navClear, w: fw, h: Math.max(140, bandBottom - navClear) },
    left: { x: fl, y: navClear, w: fw * 0.52, h: Math.max(140, nameTop - 24 - navClear) },
  };
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
    type Target = {
      tx: Float32Array;
      ty: Float32Array;
      part: Uint8Array;
      k: number;
      /** how far the drawing was shifted in its box, and whether it was turned */
      dx: number;
      dy: number;
      rot: boolean;
      meta: Meta;
      b: Box;
      /** the drawing actually used: the scene, or its tall version */
      sc: Scene;
    };
    let targets: (Target | null)[] = [];
    // where each point is asked to be this frame, and last frame: a jump
    // (a speed line wrapping round, the cursor blinking) moves the point with
    // it rather than letting it streak across
    let goalX = new Float32Array(0);
    let goalY = new Float32Array(0);
    let lastX = new Float32Array(0);
    let lastY = new Float32Array(0);
    let freshGoals = true;
    const mv = { x: 0, y: 0 };
    let list: Scene[] = [f1, games, dj, board, code, drums];
    let portrait: HTMLImageElement | null = null;
    let box: Box = { x: 0, y: 0, w: 0, h: 0 };
    let boxes: Record<"side" | "band" | "left", Box> = { side: box, band: box, left: box };
    // between pictures each thread bends through its own random spot on the
    // page, so a hand-off fills the whole hero the way the entrance does
    let scatX = new Float32Array(0);
    let scatY = new Float32Array(0);
    let snapX = new Float32Array(0);
    let snapY = new Float32Array(0);
    let ctrlX = new Float32Array(0);
    let ctrlY = new Float32Array(0);
    let morph = false;
    let swirl = 1;
    function rollScatter() {
      for (let i = 0; i < n; i++) {
        scatX[i] = Math.random() * w;
        scatY[i] = Math.random() * h;
      }
      swirl = -swirl;
    }
    let sceneIdx = 0;
    let phaseStart = 0;
    let started = false;
    let startedAt = 0;
    // the pointer: where it is, how far it has moved since the last frame
    // (dx, dy) and its smoothed velocity per frame (vx, vy). Only movement
    // stirs the ink; a resting pointer leaves the picture alone
    const pointer = { x: -1e4, y: -1e4, dx: 0, dy: 0, vx: 0, vy: 0, on: false };

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
      boxes = pictureBoxes(canvas!, w, h);
      box = boxes.side;
      const area = Math.max(...Object.values(boxes).map((b) => b.w * b.h));
      const shape = Math.min(mobile ? 2600 : 5200, area / (mobile ? 34 : 46));
      const count = Math.round(shape / 0.62);
      if (count !== n) {
        n = count;
        morph = false;
        x = new Float32Array(n);
        y = new Float32Array(n);
        vx = new Float32Array(n);
        vy = new Float32Array(n);
        fear = new Float32Array(n);
        ambient = new Uint8Array(n);
        delay = new Float32Array(n);
        goalX = new Float32Array(n);
        goalY = new Float32Array(n);
        lastX = new Float32Array(n);
        lastY = new Float32Array(n);
        scatX = new Float32Array(n);
        scatY = new Float32Array(n);
        snapX = new Float32Array(n);
        snapY = new Float32Array(n);
        ctrlX = new Float32Array(n);
        ctrlY = new Float32Array(n);
        for (let i = 0; i < n; i++) {
          x[i] = Math.random() * w;
          y[i] = Math.random() * h;
          ambient[i] = i % 25 < 9 ? 1 : 0;
          delay[i] = Math.random() * 0.45;
        }
        if (started) seedEdges();
      }
      rollScatter();
      // the name, so the face knows where to look
      const cr = canvas!.getBoundingClientRect();
      const nm = canvas!.closest("section")?.querySelector<HTMLElement>("[data-hero-name]")?.getBoundingClientRect();
      const nameX = nm ? nm.left + nm.width * 0.35 - cr.left : 0;
      const nameY = nm ? nm.top + nm.height * 0.5 - cr.top : h;
      targets = list.map((sc) => {
        const b = boxes[sc.place ?? "side"];
        // a side-on picture has a tall drawing of its own for tall boxes
        const use = sc.tall && b.h > b.w * 0.8 ? sc.tall : sc;
        const s0 = sample(use, n, b.w, b.h, portrait);
        if (!s0) return null;
        const meta: Meta = { cx: 0, cy: 0, rx: 1, ry: 1, yaw: 0, pitch: 0 };
        if (sc.image) {
          let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
          for (let i = 0; i < n; i++) {
            x0 = Math.min(x0, s0.tx[i]);
            x1 = Math.max(x1, s0.tx[i]);
            y0 = Math.min(y0, s0.ty[i]);
            y1 = Math.max(y1, s0.ty[i]);
          }
          meta.cx = (x0 + x1) / 2 - b.w / 2;
          meta.cy = (y0 + y1) / 2 - b.h / 2;
          meta.rx = Math.max(1, (x1 - x0) / 2);
          meta.ry = Math.max(1, (y1 - y0) / 2);
          const fx = b.x + b.w / 2 + meta.cx;
          const fy = b.y + b.h / 2 + meta.cy;
          meta.yaw = clamp((nameX - fx) / (meta.rx * 3), -0.34, 0.34);
          meta.pitch = clamp((nameY - fy) / (meta.ry * 4), -0.08, 0.22);
        }
        for (let i = 0; i < n; i++) {
          s0.tx[i] += b.x;
          s0.ty[i] += b.y;
        }
        return { ...s0, meta, b, sc: use };
      });
      freshGoals = true;
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

      // scene clock: form (the entrance, or the morph out of the last
      // picture), hold, and straight on to the next
      let el = now - phaseStart;
      if (ctl.current.paused || reduce) {
        el = Math.min(el, FORM + 1);
        phaseStart = now - el; // hold the clock where it is
      } else if (el > CYCLE) {
        sceneIdx = (sceneIdx + 1) % list.length;
        phaseStart = now;
        el = 0;
        freshGoals = true;
        rollScatter();
        // hand straight over: every thread flies from where it is right now
        // into its place in the next picture, along its own curve. The curves
        // bow out across the page, so mid-flight the ink fills the hero
        const nt = targets[sceneIdx];
        if (nt) {
          morph = true;
          for (let i = 0; i < n; i++) {
            if (ambient[i]) continue;
            snapX[i] = x[i];
            snapY[i] = y[i];
            const dx = nt.tx[i] - x[i];
            const dy = nt.ty[i] - y[i];
            const len = Math.hypot(dx, dy) + 1;
            const mx = x[i] + dx / 2;
            const my = y[i] + dy / 2;
            const amp = len * (0.2 + 0.4 * Math.random()) * swirl;
            // the control point overshoots this thread's random spot, so at
            // mid-flight the ink is spread across most of the page
            ctrlX[i] = mx - (dy / len) * amp + (scatX[i] - mx) * 1.3;
            ctrlY[i] = my + (dx / len) * amp + (scatY[i] - my) * 1.3;
          }
        }
        setCurrent(sceneIdx);
      }
      const tgt = targets[sceneIdx];
      // pull: rises while forming, full while holding
      const pull = el >= FORM ? 1 : morph ? 0.3 + 0.7 * (el / FORM) ** 2 : (el / FORM) ** 2;

      // short trails while the ink first floods in, the long ink trails after
      const entry = Math.max(0, 1 - (now - startedAt) / 2200);
      const fade = reduce ? 1 : Math.max(0.07 + pull * 0.1, 0.32 * entry);
      c.fillStyle = `rgba(${BG.join(",")},${fade})`;
      c.fillRect(0, 0, w, h);

      const t = now / 1000;
      // the pointer's speed this frame, smoothed so one jumpy event doesn't
      // blast the picture and a stop lets it settle within a few frames
      pointer.vx = pointer.vx * 0.55 + pointer.dx * 0.45;
      pointer.vy = pointer.vy * 0.55 + pointer.dy * 0.45;
      pointer.dx = 0;
      pointer.dy = 0;
      const speed = Math.min(80, Math.hypot(pointer.vx, pointer.vy));
      const stir = pointer.on && speed > 0.4;
      // a faster sweep reaches further
      const R = Math.max(44, Math.min(w, h) * 0.07) * (0.7 + 0.6 * Math.min(1, speed / 40));
      const R2 = R * R;
      const ns = 0.0022;
      // the speed limit grows with the screen, so the ink arrives as quickly
      // on a 4K monitor as on a laptop
      const cap = 2.2 * Math.max(1, Math.min(w, h) / 820);

      // while a picture holds it stays alive: it breathes (a slow, slight
      // swell) and every dot circles its spot. It stays where it is: the
      // pointer moves dots, never the picture
      const B = tgt ? tgt.b : box;
      const cx0 = B.x + B.w / 2;
      const cy0 = B.y + B.h / 2;
      const breath = 1 + 0.016 * Math.sin(t * 0.9);
      // a portrait keeps still enough for its features to stay sharp
      const wob = Math.max(1.2, Math.min(B.w, B.h) * 0.0045) * (list[sceneIdx].image ? 0.3 : 1);

      // the held picture plays: each scene moves its own parts. It starts
      // just before the picture fully lands, so the motion grows out of it
      const sc = tgt ? tgt.sc : list[sceneIdx];
      const live = tgt && sc.move && !reduce ? smooth(FORM * 0.75, FORM * 1.05, el) : 0;
      const ht = (el - FORM * 0.8) / 1000;
      if (tgt) {
        for (let i = 0; i < n; i++) {
          let gx = tgt.tx[i];
          let gy = tgt.ty[i];
          if (live > 0 && !ambient[i]) {
            const u = (gx - cx0) / tgt.k;
            const v = (gy - cy0) / tgt.k;
            // into the drawing's own units: undo the quarter turn and the shift
            const du = (tgt.rot ? -v : u) - tgt.dx;
            const dv = (tgt.rot ? u : v) - tgt.dy;
            sc.move!(mv, du, dv, tgt.part[i], i, ht, tgt.meta);
            const rx = mv.x + tgt.dx;
            const ry = mv.y + tgt.dy;
            const su = tgt.rot ? ry : rx;
            const sv = tgt.rot ? -rx : ry;
            gx = cx0 + (u + (su - u) * live) * tgt.k;
            gy = cy0 + (v + (sv - v) * live) * tgt.k;
          }
          goalX[i] = gx;
          goalY[i] = gy;
        }
      }
      const jump = Math.max(14, Math.min(B.w, B.h) * 0.05);
      const holding = el >= FORM && el < FORM + HOLD && !freshGoals;

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
        let flying = false;
        if (!ambient[i]) {
          if (el >= FORM) pi = 1;
          else if (morph && tgt) flying = true;
          else {
            const kk = Math.min(1, Math.max(0, (el / FORM - delay[i]) / 0.55));
            pi = kk * kk * (3 - 2 * kk);
          }
        }
        const fi = flying ? 0 : 1 - pi;
        if (fi > 0.01) {
          const a = noise(x[i] * ns + t * 0.05, y[i] * ns - t * 0.04) * Math.PI * 4;
          ax += Math.cos(a) * 0.35 * fi;
          ay += Math.sin(a) * 0.35 * fi;
        }
        if (flying) {
          // along this thread's curve from the last picture to the next,
          // each thread a little behind or ahead of its neighbours
          const s = clamp((el / FORM - delay[i] * 0.6) / 0.73, 0, 1);
          const e = s * s * (3 - 2 * s);
          const q = 1 - e;
          const gx = q * q * snapX[i] + 2 * q * e * ctrlX[i] + e * e * goalX[i];
          const gy = q * q * snapY[i] + 2 * q * e * ctrlY[i] + e * e * goalY[i];
          ax += (gx - x[i]) * 0.3;
          ay += (gy - y[i]) * 0.3;
        } else if (tgt && pi > 0) {
          // a playing picture follows its motion tightly; forming ink stays loose
          // dots the pointer has just swept aside drift home more slowly,
          // so the wake stays visible for a moment before the picture heals
          const k = (0.012 + pi * 0.05 + (pi > 0.99 ? live * 0.16 : 0)) * (1 - 0.8 * fear[i]);
          if (holding) {
            const jx = goalX[i] - lastX[i];
            const jy = goalY[i] - lastY[i];
            if (Math.abs(jx) > jump || Math.abs(jy) > jump) {
              x[i] += jx;
              y[i] += jy;
              px[i] = x[i];
              py[i] = y[i];
            }
          }
          const gx = cx0 + (goalX[i] - cx0) * breath + Math.sin(t * 1.3 + i * 0.71) * wob;
          const gy = cy0 + (goalY[i] - cy0) * breath + Math.cos(t * 1.1 + i * 0.53) * wob;
          ax += (gx - x[i]) * k * pi;
          ay += (gy - y[i]) * k * pi;
        }
        // cap the drift and pull so far-off threads glide in as ink, not
        // as streaks; the pointer's push (below) stays sharp on purpose
        const am = Math.hypot(ax, ay);
        if (am > cap && !flying && !(holding && live > 0.5 && pi > 0.99)) {
          ax *= cap / am;
          ay *= cap / am;
        }
        let f = fear[i] * 0.96;
        if (stir) {
          const dx = x[i] - pointer.x;
          const dy = y[i] - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < R2 && d2 > 0.01) {
            // the dots under a moving pointer are carried along the way it
            // moves and parted to either side, both as hard as it moves
            const d = Math.sqrt(d2);
            const near = 1 - d / R;
            const push = near * near;
            ax += (pointer.vx * 0.5 + (dx / d) * speed * 0.18) * push;
            ay += (pointer.vy * 0.5 + (dy / d) * speed * 0.18) * push;
            f = Math.max(f, near * Math.min(1, speed / 22));
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

      lastX.set(goalX);
      lastY.set(goalY);
      freshGoals = false;

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
        const span = B.w + B.h * 0.6;
        const band = (((t / 4.5) % 1) * 1.5 - 0.25) * span;
        const width = Math.max(30, span * 0.05);
        for (const [alpha, lo, hi] of [
          [0.35, 0.5, 1],
          [0.85, 0, 0.5],
        ] as const) {
          c.fillStyle = `rgba(250,255,228,${alpha})`;
          for (let i = 0; i < n; i++) {
            if (ambient[i] || fear[i] > 0.2) continue;
            const d = Math.abs((x[i] - B.x) + (y[i] - B.y) * 0.6 - band) / width;
            if (d < lo || d >= hi) continue;
            c.fillRect(x[i] - 1, y[i] - 1, 2, 2);
          }
        }
      }
    }

    function onMove(e: PointerEvent) {
      const r = canvas!.getBoundingClientRect();
      const nx = e.clientX - r.left;
      const ny = e.clientY - r.top;
      // a fresh touch or a pointer coming back in starts from rest
      if (pointer.on && e.type === "pointermove") {
        pointer.dx += nx - pointer.x;
        pointer.dy += ny - pointer.y;
      }
      pointer.x = nx;
      pointer.y = ny;
      pointer.on = true;
    }
    function onLeave() {
      pointer.on = false;
      pointer.vx = 0;
      pointer.vy = 0;
    }

    let tm = 0;
    const onResize = () => {
      clearTimeout(tm);
      tm = window.setTimeout(layout, 150);
    };
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);

    // once this effect is cleaned up (a remount, Strict Mode's double run in
    // dev) a late image or font load must not start a second loop on the
    // same canvas: two swarms would draw two pictures at once
    let dead = false;
    const begin = () => {
      if (dead) return;
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
    hero.addEventListener("pointerleave", onLeave);
    hero.addEventListener("pointerup", onLeave);
    window.addEventListener("resize", onResize);
    return () => {
      dead = true;
      clearTimeout(tm);
      cancelAnimationFrame(raf);
      io.disconnect();
      hero.removeEventListener("pointermove", onMove as EventListener);
      hero.removeEventListener("pointerdown", onMove as EventListener);
      hero.removeEventListener("pointerleave", onLeave);
      hero.removeEventListener("pointerup", onLeave);
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
