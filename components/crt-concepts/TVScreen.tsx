"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import {
  autoPilotDir,
  createSnake,
  inputSnake,
  tickSnake,
  type SnakeState,
} from "@/components/hero/snake";
import { smoothScrollTo } from "@/lib/scroll";
import { createGlassMaterial } from "./crt-glass";
import {
  averageColor,
  drawAfterHours,
  drawReel,
  drawTeletext,
  drawTestCard,
  SCREEN_H,
  SCREEN_W,
  teletextHit,
  type Fonts,
} from "./screen-channels";
import { CHANNELS, tv, useTV } from "./tv-store";
import { tvAudio } from "./tv-audio";

const TUNE_MS = 420;
const POWER_MS = 900;
const SNAKE_TICK = 120;
const IDLE_MS = 7000;

function readFonts(): Fonts {
  const host = document.querySelector("[data-tv-fonts]") ?? document.documentElement;
  const cs = getComputedStyle(host);
  const pick = (v: string, fb: string) => cs.getPropertyValue(v).trim() || fb;
  return {
    ident: pick("--font-ident", "sans-serif"),
    mono: pick("--font-geist-mono", "monospace"),
    sans: pick("--font-geist-sans", "sans-serif"),
  };
}

export type Glow = { color: THREE.Color; intensity: number };

type Tube = { canvas: HTMLCanvasElement; texture: THREE.CanvasTexture; material: THREE.ShaderMaterial };

function createTube(aspect: number): Tube {
  const canvas = document.createElement("canvas");
  canvas.width = SCREEN_W;
  canvas.height = SCREEN_H;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return { canvas, texture, material: createGlassMaterial(texture, aspect) };
}

function disposeTube(t: Tube) {
  t.material.dispose();
  t.texture.dispose();
}

const STATIC_GREY = new THREE.Color(0.75, 0.8, 0.85);

function writeGlow(g: Glow, [r, gr, b]: [number, number, number], power: number, snow: number) {
  const lum = 0.299 * r + 0.587 * gr + 0.114 * b;
  g.color.setRGB(r, gr, b).lerp(STATIC_GREY, snow * 0.6);
  g.intensity = power * (1 - snow * 0.3) * (0.35 + lum * 1.2);
}

/**
 * The picture tube: bulged glass mesh + the canvas it displays.
 * `glow` is written every few frames with the screen's average colour so
 * the scene (and the page) can be lit by whatever is on.
 */
export function TVScreen({
  width,
  height,
  glow,
}: {
  width: number;
  height: number;
  glow: React.RefObject<Glow>;
}) {
  const tube = useMemo(() => createTube(width / height), [width, height]);
  // the frame loop mutates the GPU objects; it reaches them through a ref
  const tubeRef = useRef(tube);
  useEffect(() => {
    tubeRef.current = tube;
  }, [tube]);

  const fonts = useRef<Fonts | null>(null);
  const snake = useRef<SnakeState>(createSnake());
  const snakeAcc = useRef(0);
  const lastInput = useRef(-1e9);
  const powerT = useRef(0); // 0..1 tube warm-up
  const frame = useRef(0);
  const reduce = useRef(false);
  const state = useTV();

  useEffect(() => () => disposeTube(tube), [tube]);

  useEffect(() => {
    reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    fonts.current = readFonts();
    // redraw with the real faces once they've loaded
    document.fonts?.ready.then(() => (fonts.current = readFonts()));
  }, []);

  // keyboard: number keys tune, arrows play snake on CH 4
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && /input|textarea|select/i.test(target.tagName)) return;
      const hero = document.getElementById("top");
      const inView = hero ? hero.getBoundingClientRect().bottom > window.innerHeight * 0.4 : true;
      if (!inView) return;
      const n = Number(e.key);
      if (n >= 1 && n <= CHANNELS.length) {
        tv.tune(n - 1);
        return;
      }
      const s = tv.get();
      if (CHANNELS[s.channel].id !== "afterhours") return;
      const k = e.key.toLowerCase();
      const dirs: Record<string, { x: number; y: number }> = {
        arrowup: { x: 0, y: -1 },
        w: { x: 0, y: -1 },
        arrowdown: { x: 0, y: 1 },
        s: { x: 0, y: 1 },
        arrowleft: { x: -1, y: 0 },
        a: { x: -1, y: 0 },
        arrowright: { x: 1, y: 0 },
        d: { x: 1, y: 0 },
      };
      if (dirs[k]) {
        e.preventDefault();
        if (performance.now() - lastInput.current > IDLE_MS) snake.current = createSnake();
        lastInput.current = performance.now();
        snake.current = inputSnake(snake.current, dirs[k]);
      } else if (k === " ") {
        e.preventDefault();
        lastInput.current = performance.now();
        snake.current = snake.current.gameOver
          ? createSnake()
          : { ...snake.current, paused: !snake.current.paused };
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // sound cues follow store changes
  const prev = useRef(state);
  useEffect(() => {
    const p = prev.current;
    if (p.sound !== state.sound) tvAudio.setEnabled(state.sound);
    if (p.channel !== state.channel || (p.tunedAt !== state.tunedAt && state.power && p.power)) {
      tvAudio.click();
      tvAudio.staticBurst();
    }
    if (p.power !== state.power) tvAudio.thunk();
    prev.current = state;
  }, [state]);

  useFrame((r3f, delta) => {
    const { canvas, texture, material } = tubeRef.current;
    const f = fonts.current;
    const ctx = canvas.getContext("2d");
    if (!f || !ctx) return;
    const now = performance.now();
    const s = tv.get();
    const since = now - s.tunedAt;
    const u = material.uniforms;
    u.uTime.value = r3f.clock.elapsedTime;

    // tube warm-up / shut-down
    const target = s.power ? 1 : 0;
    const speed = reduce.current ? 50 : 1000 / POWER_MS;
    powerT.current = THREE.MathUtils.clamp(
      powerT.current + Math.sign(target - powerT.current) * delta * speed,
      0,
      1,
    );
    u.uPower.value = powerT.current;

    // tuning: static + vertical slip, easing out
    const k = reduce.current ? 1 : Math.min(1, since / TUNE_MS);
    u.uStatic.value = s.power ? Math.pow(1 - k, 1.6) : 0;
    u.uRoll.value = s.power && !reduce.current ? Math.pow(1 - k, 2.2) * 0.6 : 0;

    // content — Archivo's wide cut for idents (faces without a width axis
    // ignore this)
    ctx.fontStretch = "expanded";
    const id = CHANNELS[s.channel].id;
    if (id === "testcard") drawTestCard(ctx, f);
    else if (id === "teletext") drawTeletext(ctx, f, since);
    else if (id === "reel") drawReel(ctx, f, since, s.reelStart);
    else {
      const demo = now - lastInput.current > IDLE_MS;
      snakeAcc.current += delta * 1000;
      while (snakeAcc.current > SNAKE_TICK) {
        snakeAcc.current -= SNAKE_TICK;
        let st = snake.current;
        if (demo) {
          if (st.gameOver) st = createSnake();
          st = inputSnake(st, autoPilotDir(st));
        }
        snake.current = tickSnake(st);
      }
      drawAfterHours(ctx, f, snake.current, demo, r3f.clock.elapsedTime);
    }
    texture.needsUpdate = true;

    // light thrown into the room, sampled ~8×/s
    frame.current++;
    if (glow.current && frame.current % 8 === 0) {
      writeGlow(glow.current, averageColor(canvas), powerT.current, u.uStatic.value);
    }
  });

  function onClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    const s = tv.get();
    if (!s.power || !e.uv) return;
    const id = CHANNELS[s.channel].id;
    if (id === "teletext") {
      const section = teletextHit(e.uv.x, 1 - e.uv.y);
      if (section) smoothScrollTo(`#${section}`);
    } else if (id === "reel") {
      smoothScrollTo("#projects");
    } else if (id === "testcard") {
      tv.next();
    }
  }

  return (
    <mesh onClick={onClick}>
      <planeGeometry args={[width, height, 48, 36]} />
      <primitive object={tube.material} attach="material" />
    </mesh>
  );
}
