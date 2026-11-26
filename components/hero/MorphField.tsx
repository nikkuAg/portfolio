"use client";

import { useEffect, useRef, useState } from "react";
import s from "./morph.module.css";

// The hero's picture: one swarm of ink threads that keeps drawing who I am.
// Most threads gather into a picture (my face, then the things I love: F1,
// games, DJing, cooking, board games, code), hold it, let go and drift into
// the next; the rest never settle and keep the whole screen inked. While a
// picture holds it plays: the face looks round, the car launches, the pad
// is played, the record spins, the food is tossed, the dice are thrown.
// The pointer is a predator: threads near it scatter and glow, then come back.

/** Where a held picture's points go at a moment of its hold. */
type Meta = { cx: number; cy: number; rx: number; ry: number; yaw: number; pitch: number };
type Move = (out: { x: number; y: number }, u: number, v: number, part: number, i: number, ht: number, m: Meta) => void;
type Scene = {
  id: string;
  label: string;
  caption: string;
  draw: (o: CanvasRenderingContext2D, w: number, h: number) => void;
  image?: boolean;
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
  const c = `rgb(${id * 20},255,255)`;
  o.fillStyle = c;
  o.strokeStyle = c;
}

/** Draw in a unit space (uw × uh) centred and scaled to fit the box. */
let fitK = 1;
function fit(o: CanvasRenderingContext2D, w: number, h: number, uw: number, uh: number, fill = 0.9) {
  const k = Math.min(w / uw, h / uh) * fill;
  fitK = k;
  o.translate(w / 2, h / 2);
  o.scale(k, k);
}

// the face looks at the name, then glances the other way, then back at you
const face: Scene = {
  id: "face",
  label: "Me",
  caption: "my face",
  image: true,
  draw() {},
  move(out, u, v, _p, _i, ht, m) {
    const toName = smooth(0.3, 1.0, ht) * (1 - smooth(2.4, 3.0, ht));
    const away = smooth(2.9, 3.4, ht) * (1 - smooth(4.1, 4.7, ht));
    const yaw = m.yaw * toName - m.yaw * 0.7 * away;
    const pitch = m.pitch * toName - 0.03 * away;
    const nu = clamp((u - m.cx) / m.rx, -0.999, 0.999);
    const nv = clamp((v - m.cy) / m.ry, -0.999, 0.999);
    // the head turns on its neck; the shoulders stay put
    const head = 1 - smooth(0.3, 0.75, nv);
    out.x = m.cx + Math.sin(clamp(Math.asin(nu) + yaw * head, -1.5, 1.5)) * m.rx;
    out.y = m.cy + Math.sin(clamp(Math.asin(nv) + pitch * head, -1.5, 1.5)) * m.ry;
  },
};

// parts: 0 body, 1 rear wheel, 2 front wheel, 3 speed lines
const f1: Scene = {
  id: "f1",
  label: "F1",
  caption: "F1, and Ferrari",
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

const games: Scene = {
  id: "games",
  label: "Games",
  caption: "games, played and made",
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

// parts: 0 plinth and fader slot, 1 record, 2 tonearm, 3 fader knob, 4–7 level meter
const REC: [number, number] = [-16, 0];
const dj: Scene = {
  id: "dj",
  label: "DJ",
  caption: "DJing, my newest habit",
  draw(o, w, h) {
    o.save();
    fit(o, w, h, 140, 100, 0.92);
    o.lineCap = "round";
    // a turntable from above
    part(o, 0);
    o.lineWidth = 3;
    o.beginPath();
    o.roundRect(-66, -46, 132, 92, 9);
    o.stroke();
    o.lineWidth = 1.6;
    o.beginPath();
    o.moveTo(57, -6);
    o.lineTo(57, 36);
    o.stroke();
    // the record: grooves, a label with a stripe, and one bright notch, so
    // you can see it spin
    part(o, 1);
    o.beginPath();
    o.arc(REC[0], REC[1], 38, 0, Math.PI * 2);
    o.fill();
    o.globalCompositeOperation = "destination-out";
    o.lineWidth = 1.4;
    for (const r of [32, 26, 19]) {
      o.beginPath();
      o.arc(REC[0], REC[1], r, 0, Math.PI * 2);
      o.stroke();
    }
    o.lineWidth = 2.2;
    o.beginPath();
    o.arc(REC[0], REC[1], 13, 0, Math.PI * 2);
    o.stroke();
    o.fillRect(REC[0], REC[1] - 1.2, 12, 2.4);
    o.lineWidth = 2.4;
    o.beginPath();
    o.moveTo(REC[0] - Math.cos(2.2) * 16, REC[1] + Math.sin(2.2) * 16);
    o.lineTo(REC[0] - Math.cos(2.2) * 36, REC[1] + Math.sin(2.2) * 36);
    o.stroke();
    o.beginPath();
    o.arc(REC[0], REC[1], 1.8, 0, Math.PI * 2);
    o.fill();
    o.globalCompositeOperation = "source-over";
    // tonearm: pivot, counterweight, arm, headshell on the record
    part(o, 2);
    o.beginPath();
    o.arc(44, -30, 6, 0, Math.PI * 2);
    o.fill();
    o.beginPath();
    o.arc(51, -34, 4, 0, Math.PI * 2);
    o.fill();
    o.lineWidth = 3;
    o.beginPath();
    o.moveTo(44, -30);
    o.lineTo(15, -16);
    o.stroke();
    o.lineWidth = 4.5;
    o.beginPath();
    o.moveTo(15, -16);
    o.lineTo(8, -19);
    o.stroke();
    // pitch fader knob
    part(o, 3);
    o.fillRect(51, 10, 12, 6);
    // level meter
    for (let k = 0; k < 4; k++) {
      part(o, 4 + k);
      o.fillRect(27 + k * 6, 16, 3.6, 22);
    }
    o.restore();
  },
  move(out, u, v, p, _i, ht) {
    // 124 bpm: everything keeps time with the kick
    const beat = (ht * 124) / 60;
    const kick = Math.exp(-mod(beat, 1) * 5);
    let x = u;
    let y = v;
    if (p === 1) {
      // 33⅓ rpm, with a scratch in the middle
      const scratch = smooth(2.2, 2.4, ht) * (1 - smooth(3.2, 3.4, ht));
      const a = ht * 3.5 + scratch * 0.7 * Math.sin((ht - 2.2) * 15);
      turn(out, u, v, REC[0], REC[1], a);
      x = out.x;
      y = out.y;
    } else if (p === 2) {
      turn(out, u, v, 44, -30, 0.008 * Math.sin(ht * 23));
      x = out.x;
      y = out.y;
    } else if (p === 3) {
      y += 8 * Math.sin(ht * 0.9);
    } else if (p >= 4) {
      const j = p - 4;
      const level = clamp(0.22 + 0.62 * kick * (1 - j * 0.14) + 0.32 * noise(j * 3.7, ht * 5), 0.12, 1);
      y = 38 - (38 - v) * level;
    }
    const pulse = 1 + 0.012 * kick;
    out.x = x * pulse;
    out.y = y * pulse;
  },
};

// parts: 1 pan, 4 burner, 5 flames, 6–10 food
const FOOD: [number, number, number, number][] = [
  [-52, 5, 5, 0.4],
  [-40, 3, 6, 1.1],
  [-27, 4, 5.5, 0.2],
  [-14, 2, 6, 0.8],
  [-2, 5, 5, 0.5],
];
const PIVOT: [number, number] = [66, 10];
const cook: Scene = {
  id: "cook",
  label: "Cooking",
  caption: "cooking, mostly for friends",
  draw(o, w, h) {
    o.save();
    fit(o, w, h, 160, 130, 0.94);
    o.translate(-6, 0);
    // a sauté pan side on, with a long handle
    part(o, 1);
    o.beginPath();
    o.moveTo(-66, 14);
    o.lineTo(18, 14);
    o.lineTo(12, 32);
    o.quadraticCurveTo(10, 38, 2, 38);
    o.lineTo(-50, 38);
    o.quadraticCurveTo(-58, 38, -60, 32);
    o.closePath();
    o.fill();
    o.fillRect(-69, 11, 90, 4); // the rim
    o.save();
    o.translate(18, 18);
    o.rotate(-0.16);
    o.beginPath();
    o.roundRect(0, -4, 60, 8, 4);
    o.fill();
    o.restore();
    // a gas ring: the burner, and a row of flame tongues licking the pan
    part(o, 4);
    o.fillRect(-58, 60, 66, 4);
    part(o, 5);
    for (const fx of [-50, -38, -26, -14, -2]) {
      o.beginPath();
      o.moveTo(fx - 4.5, 60);
      o.quadraticCurveTo(fx - 5.5, 51, fx + 0.5, 44);
      o.quadraticCurveTo(fx + 0.5, 51, fx + 4.5, 60);
      o.closePath();
      o.fill();
    }
    // what's cooking, piled above the rim
    FOOD.forEach(([bx, by, r, rot], k) => {
      part(o, 6 + k);
      o.save();
      o.translate(bx, by);
      o.rotate(rot);
      o.beginPath();
      o.roundRect(-r, -r * 0.7, r * 2, r * 1.4, r * 0.5);
      o.fill();
      o.restore();
    });
    o.restore();
  },
  move(out, u, v, p, _i, ht) {
    // drawing units are offset by the -6 translate above
    const lu = u + 6;
    // a toss every 1.8s: the pan flicks, the food flies and lands, it settles
    const tt = ht < 0.4 ? -1 : mod(ht - 0.4, 1.8);
    const flick = tt < 0 ? 0 : 0.14 * bump(tt, 0.12, 0.07) - 0.035 * bump(tt, 1.15, 0.08);
    let x = lu;
    let y = v;
    if (p === 5) {
      const s = 0.8 + 0.4 * noise(lu * 0.2, ht * 7);
      y = 60 - (60 - v) * s;
      x = lu + (60 - v) * 0.07 * Math.sin(ht * 9 + lu * 0.3);
    } else if (p === 1) {
      turn(out, lu, v, PIVOT[0], PIVOT[1], flick);
      x = out.x;
      y = out.y;
    } else if (p >= 6) {
      const k = p - 6;
      const [bx, by] = FOOD[k];
      const fl = tt < 0 ? -1 : (tt - 0.12 - k * 0.04) / 0.95;
      if (fl > 0 && fl < 1) {
        const hgt = 4 * fl * (1 - fl) * (40 + ((k * 7) % 3) * 7);
        turn(out, lu, v, bx, by, fl * Math.PI * 2 * (k % 2 ? 1 : -1));
        x = out.x + Math.sin(fl * Math.PI * 2) * (k - 2) * 2;
        y = out.y - hgt;
      } else {
        turn(out, lu, v, PIVOT[0], PIVOT[1], flick);
        x = out.x;
        y = out.y;
      }
    }
    out.x = x - 6;
    out.y = y;
  },
};

// parts: 1 and 2 the dice
const DICE: [number, number, number][] = [
  [-24, 6, -0.25],
  [26, -4, 0.3],
];
const board: Scene = {
  id: "board",
  label: "Board games",
  caption: "board games, the longer the better",
  draw(o, w, h) {
    o.save();
    fit(o, w, h, 140, 96);
    o.translate(0, 8);
    const die = (k: number, pips: [number, number][]) => {
      const [cx, cy, rot] = DICE[k];
      o.save();
      o.translate(cx, cy);
      o.rotate(rot);
      o.globalCompositeOperation = "source-over";
      part(o, k + 1);
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
    die(0, [[-1, -1], [0, 0], [1, 1]]);
    die(1, [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]]);
    o.restore();
  },
  move(out, u, v, p, _i, ht) {
    // two throws: each die hops, tumbles a few quarter turns, lands and squashes
    const k = p - 1;
    if (k < 0 || k > 1) {
      out.x = u;
      out.y = v;
      return;
    }
    const [cx, cy0] = DICE[k];
    const cy = cy0 + 8;
    const throws: [number, number, number][] =
      k === 0
        ? [
            [0.5, 2, 10],
            [2.8, -1, -10],
          ]
        : [
            [0.62, -3, -8],
            [2.92, 2, 8],
          ];
    let ang = 0;
    let hop = 0;
    let dx = 0;
    let squash = 0;
    for (const [at, turns, slide] of throws) {
      const tau = clamp((ht - at) / 1.1, 0, 1);
      ang += easeOut(tau / 0.72) * turns * (Math.PI / 2);
      hop += tau < 0.62 ? Math.sin((Math.PI * tau) / 0.62) * 24 : tau < 0.86 ? Math.sin((Math.PI * (tau - 0.62)) / 0.24) * 4 : 0;
      dx += easeOut(tau / 0.8) * slide;
      squash += bump(tau, 0.63, 0.035) + 0.5 * bump(tau, 0.87, 0.03);
    }
    const lx = u - cx;
    const ly = (v - cy) * (1 - 0.14 * Math.min(1, squash));
    turn(out, lx, ly, 0, 0, ang);
    out.x += cx + dx;
    out.y += cy - hop + 0.14 * 20 * Math.min(1, squash);
  },
};

// parts: 1 "<", 2 "/", 3 ">", 4 the cursor
const CODE = { lt: 0, sl: 0, gt: 0, cur: 0 };
const code: Scene = {
  id: "code",
  label: "Code",
  caption: "code, most days",
  draw(o, w, h) {
    o.save();
    fit(o, w, h, 300, 140, 0.96);
    o.font = `800 100px ${identFont()}`;
    o.textAlign = "left";
    o.textBaseline = "middle";
    const ws = ["<", "/", ">"].map((c) => o.measureText(c).width);
    const total = ws[0] + ws[1] + ws[2] + 30;
    let x = -total / 2;
    ["<", "/", ">"].forEach((c, k) => {
      part(o, k + 1);
      o.fillText(c, x, 0);
      if (k === 0) CODE.lt = x + ws[0] / 2;
      if (k === 1) CODE.sl = x + ws[1] / 2;
      if (k === 2) CODE.gt = x + ws[2] / 2;
      x += ws[k];
    });
    part(o, 4);
    CODE.cur = x + 16;
    o.fillRect(x + 10, -34, 12, 68);
    o.restore();
  },
  move(out, u, v, p, _i, ht) {
    // the brackets open as if something is being typed between them, the
    // slash leans with each keystroke, and the cursor blinks
    const open = 7 * (smooth(0.6, 1.0, ht) - smooth(2.2, 2.7, ht)) + 7 * (smooth(3.1, 3.5, ht) - smooth(4.4, 4.9, ht));
    const keys = Math.max(0, Math.sin(ht * 13)) * (smooth(0.9, 1.1, ht) - smooth(2.0, 2.2, ht));
    out.x = u;
    out.y = v;
    if (p === 1) out.x = u - open;
    else if (p === 3) out.x = u + open;
    else if (p === 2) {
      turn(out, u, v, CODE.sl, 0, 0.12 * keys);
    } else if (p === 4) {
      out.x = u + open;
      if (Math.floor(ht * 1.9) % 2 === 1) out.y = 34 - (34 - v) * 0.12;
    }
  },
};

/** Turn a scene into exactly n target points inside the box. */
function sample(scene: Scene, n: number, bw: number, bh: number, img: HTMLImageElement | null) {
  const c = document.createElement("canvas");
  c.width = Math.max(2, Math.round(bw));
  c.height = Math.max(2, Math.round(bh));
  const o = c.getContext("2d", { willReadFrequently: true })!;
  part(o, 0);
  fitK = 1;
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
  const ps: number[] = [];
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
        ps.push(0);
      }
    }
  } else {
    for (let y = 0; y < c.height; y += 2) {
      for (let x = 0; x < c.width; x += 2) {
        const q = (y * c.width + x) * 4;
        if (d[q + 3] < 128) continue;
        xs.push(x);
        ys.push(y);
        ws.push(1);
        ps.push(Math.round(d[q] / 20));
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
  return { tx, ty, part: pt, k: fitK };
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
    type Target = { tx: Float32Array; ty: Float32Array; part: Uint8Array; k: number; meta: Meta };
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
        goalX = new Float32Array(n);
        goalY = new Float32Array(n);
        lastX = new Float32Array(n);
        lastY = new Float32Array(n);
        for (let i = 0; i < n; i++) {
          x[i] = Math.random() * w;
          y[i] = Math.random() * h;
          ambient[i] = i % 25 < 9 ? 1 : 0;
          delay[i] = Math.random() * 0.45;
        }
        if (started) seedEdges();
      }
      // the name, so the face knows where to look
      const cr = canvas!.getBoundingClientRect();
      const nm = canvas!.closest("section")?.querySelector<HTMLElement>("[data-hero-name]")?.getBoundingClientRect();
      const nameX = nm ? nm.left + nm.width * 0.35 - cr.left : 0;
      const nameY = nm ? nm.top + nm.height * 0.5 - cr.top : h;
      targets = list.map((sc) => {
        const s0 = sample(sc, n, box.w, box.h, portrait);
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
          meta.cx = (x0 + x1) / 2 - box.w / 2;
          meta.cy = (y0 + y1) / 2 - box.h / 2;
          meta.rx = Math.max(1, (x1 - x0) / 2);
          meta.ry = Math.max(1, (y1 - y0) / 2);
          const fx = box.x + box.w / 2 + meta.cx;
          const fy = box.y + box.h / 2 + meta.cy;
          meta.yaw = clamp((nameX - fx) / (meta.rx * 3), -0.34, 0.34);
          meta.pitch = clamp((nameY - fy) / (meta.ry * 4), -0.08, 0.22);
        }
        for (let i = 0; i < n; i++) {
          s0.tx[i] += box.x;
          s0.ty[i] += box.y;
        }
        return { ...s0, meta };
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

      // scene clock: form, hold, drift, next
      let el = now - phaseStart;
      if (ctl.current.paused || reduce) {
        el = Math.min(el, FORM + 1);
        phaseStart = now - el; // hold the clock where it is
      } else if (el > CYCLE) {
        sceneIdx = (sceneIdx + 1) % list.length;
        phaseStart = now;
        el = 0;
        freshGoals = true;
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

      // the held picture plays: each scene moves its own parts. It starts
      // just before the picture fully lands, so the motion grows out of it
      const sc = list[sceneIdx];
      const live = tgt && sc.move && !reduce ? smooth(FORM * 0.75, FORM * 1.05, el) : 0;
      const ht = (el - FORM * 0.8) / 1000;
      if (tgt) {
        for (let i = 0; i < n; i++) {
          let gx = tgt.tx[i];
          let gy = tgt.ty[i];
          if (live > 0 && !ambient[i]) {
            const u = (gx - cx0) / tgt.k;
            const v = (gy - cy0) / tgt.k;
            sc.move!(mv, u, v, tgt.part[i], i, ht, tgt.meta);
            gx = cx0 + (u + (mv.x - u) * live) * tgt.k;
            gy = cy0 + (v + (mv.y - v) * live) * tgt.k;
          }
          goalX[i] = gx;
          goalY[i] = gy;
        }
      }
      const jump = Math.max(14, Math.min(box.w, box.h) * 0.05);
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
          // a playing picture follows its motion tightly; forming ink stays loose
          const k = 0.012 + pi * 0.05 + (pi > 0.99 ? live * 0.16 : 0);
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
          const gx = cx0 + (goalX[i] - cx0) * breath + Math.sin(t * 1.3 + i * 0.71) * wob + leanX;
          const gy = cy0 + (goalY[i] - cy0) * breath + Math.cos(t * 1.1 + i * 0.53) * wob + leanY;
          ax += (gx - x[i]) * k * pi;
          ay += (gy - y[i]) * k * pi;
        }
        // cap the drift and pull so far-off threads glide in as ink, not
        // as streaks; the pointer's push (below) stays sharp on purpose
        const am = Math.hypot(ax, ay);
        if (am > cap && !(holding && live > 0.5 && pi > 0.99)) {
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
