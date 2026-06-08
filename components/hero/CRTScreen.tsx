"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  autoPilotDir,
  createSnake,
  inputSnake,
  renderSnake,
  SnakeState,
  tickSnake,
} from "./snake";
import {
  HERO_HINT_DESKTOP,
  HERO_HINT_MOBILE,
  renderHeroOverlay,
} from "./hero-overlay";
import { CRTScreenMaterial } from "./crtShader";
import { setChannel, useChannel } from "./useChannel";
import { sound } from "@/lib/sound";

const TEX_W = 768;
const TEX_H = 576;
const TICK_MS = 130;
const IDLE_MS = 6000;
const TYPE_DURATION_MS = 3000;
const FADE_DURATION_MS = 500;

// channel 0 is the boot/intro screen (typewriter visible, snake hidden
// behind it). Channel 1+ is "the TV is on" (snake live). The knob's first
// turn (INTRO → GAME) is the discoverable play affordance.
const INTRO_CHANNEL = 0;
const GAME_CHANNEL = 1;

export function CRTScreen() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const canvas = useMemo(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = TEX_W;
    c.height = TEX_H;
    return c;
  }, []);

  const texture = useMemo(() => {
    if (!canvas) return null;
    const t = new THREE.CanvasTexture(canvas);
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [canvas]);

  const stateRef = useRef<SnakeState>(createSnake());
  const lastTickRef = useRef(0);
  // start in "idle" so snake auto-pilots from frame one (overlay sits on top)
  const lastInputRef = useRef(0);
  const idleRef = useRef(false);

  // hero overlay state — opacity is driven by channelRef (overlay visible
  // while channel === INTRO_CHANNEL, fades out as soon as the user turns
  // the knob to any other channel)
  const opacityRef = useRef(1);
  const startTimeRef = useRef<number | null>(null);
  // input gating — overlay must finish typing before any interaction lands
  const typeDoneRef = useRef(false);

  // channel state synced to a ref so useFrame can read it without re-binding
  const channel = useChannel();
  const channelRef = useRef(channel);
  channelRef.current = channel;

  // compact / coarse-pointer devices show a different play hint inside the
  // CRT overlay (D-pad instead of knob) — detected once on mount
  const isCompactRef = useRef(false);

  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    isCompactRef.current = window.matchMedia(
      "(max-width: 768px), (pointer: coarse)",
    ).matches;

    // helper: when the user provides game input while still on the INTRO
    // channel, advance the knob to GAME for them. That's what makes any
    // input (keyboard / gamepad / knob) consistently equivalent to "play".
    function ensureOnGameChannel() {
      if (channelRef.current === INTRO_CHANNEL) setChannel(GAME_CHANNEL);
    }

    function onKey(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      const isGameKey = [
        "arrowup",
        "arrowdown",
        "arrowleft",
        "arrowright",
        "w",
        "a",
        "s",
        "d",
        " ",
        "r",
      ].includes(k);
      if (!isGameKey) return;
      if (!typeDoneRef.current) return; // wait for typewriter to finish
      e.preventDefault();
      lastInputRef.current = performance.now();
      idleRef.current = false;
      ensureOnGameChannel();

      if (k === " " || k === "r") {
        if (stateRef.current.gameOver) {
          stateRef.current = createSnake();
        } else {
          stateRef.current = {
            ...stateRef.current,
            paused: !stateRef.current.paused,
          };
        }
        return;
      }

      const dir =
        k === "arrowup" || k === "w"
          ? { x: 0, y: -1 }
          : k === "arrowdown" || k === "s"
            ? { x: 0, y: 1 }
            : k === "arrowleft" || k === "a"
              ? { x: -1, y: 0 }
              : { x: 1, y: 0 };
      stateRef.current = inputSnake(stateRef.current, dir);
    }

    // reduced-motion users get the full overlay text immediately, no anim
    if (reduce) {
      startTimeRef.current = performance.now() - TYPE_DURATION_MS;
    }

    // mobile / touch input via the on-screen MobileGamepad — same gating
    // (typewriter must finish first) and same "bump to GAME channel on
    // first input" behaviour
    function onSnakeInput(e: Event) {
      if (!typeDoneRef.current) return;
      const detail = (e as CustomEvent<
        | { kind: "dir"; dir: "up" | "down" | "left" | "right" }
        | { kind: "pause" }
      >).detail;
      lastInputRef.current = performance.now();
      idleRef.current = false;
      ensureOnGameChannel();

      if (detail.kind === "pause") {
        if (stateRef.current.gameOver) {
          stateRef.current = createSnake();
        } else {
          stateRef.current = {
            ...stateRef.current,
            paused: !stateRef.current.paused,
          };
        }
        return;
      }

      const dir =
        detail.dir === "up"
          ? { x: 0, y: -1 }
          : detail.dir === "down"
            ? { x: 0, y: 1 }
            : detail.dir === "left"
              ? { x: -1, y: 0 }
              : { x: 1, y: 0 };
      stateRef.current = inputSnake(stateRef.current, dir);
    }

    window.addEventListener("keydown", onKey);
    window.addEventListener("snake-input", onSnakeInput);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("snake-input", onSnakeInput);
    };
  }, []);

  useFrame((_, delta) => {
    if (!canvas || !texture || !materialRef.current) return;

    const now = performance.now();
    if (startTimeRef.current === null) startTimeRef.current = now;

    lastTickRef.current += delta * 1000;
    const idle = now - lastInputRef.current > IDLE_MS;

    if (idle && !idleRef.current && stateRef.current.gameOver) {
      stateRef.current = createSnake();
      idleRef.current = true;
    }

    if (lastTickRef.current > TICK_MS) {
      if (idle) {
        const dir = autoPilotDir(stateRef.current);
        stateRef.current = inputSnake(stateRef.current, dir);
      }
      const prevScore = stateRef.current.score;
      stateRef.current = tickSnake(stateRef.current);
      if (stateRef.current.score > prevScore) sound.play("blip"); // ate food
      lastTickRef.current = 0;
    }

    // overlay timing
    const elapsed = now - (startTimeRef.current ?? now);
    const typeProgress = Math.min(elapsed / TYPE_DURATION_MS, 1);
    if (typeProgress >= 1 && !typeDoneRef.current) {
      typeDoneRef.current = true;
      // notify the touch gamepad + knob hint that they can fade in now
      window.dispatchEvent(new CustomEvent("crt-typedone"));
    }

    // overlay is visible iff the knob is on INTRO. Cycling back to channel
    // 0 later re-shows the intro (fully typed, since typeProgress is capped
    // at 1 — no re-animation needed).
    const targetOpacity = channelRef.current === INTRO_CHANNEL ? 1 : 0;
    const fadeStep = Math.min(1, (delta * 1000) / FADE_DURATION_MS);
    opacityRef.current += (targetOpacity - opacityRef.current) * fadeStep;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      // snake first (bottom layer)
      renderSnake(ctx, stateRef.current, canvas.width, canvas.height, now / 1000);
      // overlay on top, only while it's still visible
      if (opacityRef.current > 0.005) {
        renderHeroOverlay(
          ctx,
          opacityRef.current,
          typeProgress,
          canvas.width,
          canvas.height,
          now / 1000,
          isCompactRef.current ? HERO_HINT_MOBILE : HERO_HINT_DESKTOP,
        );
      }
      texture.needsUpdate = true;
    }

    materialRef.current.uniforms.uTime.value = now / 1000;
    if (materialRef.current.uniforms.uMap.value !== texture) {
      materialRef.current.uniforms.uMap.value = texture;
    }
  });

  return (
    // y=0.3 matches the screen well in CRTMonitor.tsx (asymmetric thin-bezel
    // layout — screen lifted upward, wider chin below for the channel knob)
    <mesh position={[0, 0.3, 0.82]}>
      <planeGeometry args={[3.05, 2.3]} />
      <cRTScreenMaterial
        ref={materialRef}
        key={CRTScreenMaterial.key}
        transparent={false}
      />
    </mesh>
  );
}
