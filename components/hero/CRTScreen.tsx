"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import {
  autoPilotDir,
  createSnake,
  inputSnake,
  renderSnake,
  SnakeState,
  tickSnake,
} from "./snake";
import { renderHeroOverlay } from "./hero-overlay";
import { CRTScreenMaterial } from "./crtShader";

const TEX_W = 768;
const TEX_H = 576;
const TICK_MS = 130;
const IDLE_MS = 6000;
const TYPE_DURATION_MS = 3000;
const FADE_DURATION_MS = 500;

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

  // hero overlay state
  const dismissedRef = useRef(false);
  const opacityRef = useRef(1);
  const startTimeRef = useRef<number | null>(null);
  // hover-to-play is gated until the typewriter has finished — the screen
  // has to "say its piece" before becoming interactive
  const typeDoneRef = useRef(false);

  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

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
      e.preventDefault();
      lastInputRef.current = performance.now();
      idleRef.current = false;
      // any game key intent dismisses the entry overlay
      dismissedRef.current = true;

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

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
      stateRef.current = tickSnake(stateRef.current);
      lastTickRef.current = 0;
    }

    // overlay timing
    const elapsed = now - (startTimeRef.current ?? now);
    const typeProgress = Math.min(elapsed / TYPE_DURATION_MS, 1);
    if (typeProgress >= 1) typeDoneRef.current = true;

    const targetOpacity = dismissedRef.current ? 0 : 1;
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
        );
      }
      texture.needsUpdate = true;
    }

    materialRef.current.uniforms.uTime.value = now / 1000;
    if (materialRef.current.uniforms.uMap.value !== texture) {
      materialRef.current.uniforms.uMap.value = texture;
    }
  });

  function dismiss(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    if (!typeDoneRef.current) return;
    dismissedRef.current = true;
  }

  return (
    <mesh position={[0, 0.06, 0.82]} onPointerOver={dismiss}>
      <planeGeometry args={[3.05, 2.3]} />
      <cRTScreenMaterial
        ref={materialRef}
        key={CRTScreenMaterial.key}
        transparent={false}
      />
    </mesh>
  );
}
