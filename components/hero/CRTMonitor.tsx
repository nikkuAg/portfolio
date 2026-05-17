"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { CRTScreen } from "./CRTScreen";
import { ChannelKnob } from "./ChannelKnob";

// Vertical canvas gradient — used as a colour map so casing surfaces have
// top-to-bottom dimension instead of reading as one flat tone.
function makeGradientTexture(stops: Array<[number, string]>) {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 256;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  for (const [stop, col] of stops) g.addColorStop(stop, col);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// asymmetric thin-bezel layout — screen is offset upward so the top/sides
// are razor-thin and the chin (which houses the knob + LED) is wider.
// CRTScreen.tsx + ChannelKnob.tsx are positioned to match these constants.
const SCREEN_Y = 0.3;

export function CRTMonitor() {
  const groupRef = useRef<THREE.Group>(null);
  // disable mouse-parallax on touch devices — there's no continuous cursor
  // to follow, the pointer just sticks wherever the last tap was
  const isCoarseRef = useRef(false);
  useEffect(() => {
    isCoarseRef.current = window.matchMedia("(pointer: coarse)").matches;
  }, []);

  const bodyGradient = useMemo(
    () =>
      makeGradientTexture([
        [0.0, "#3c3c3c"],
        [0.35, "#262626"],
        [0.7, "#161616"],
        [1.0, "#0c0c0c"],
      ]),
    [],
  );

  const backGradient = useMemo(
    () =>
      makeGradientTexture([
        [0.0, "#4a4a4a"],
        [0.5, "#2e2e2e"],
        [1.0, "#1a1a1a"],
      ]),
    [],
  );

  const standGradient = useMemo(
    () =>
      makeGradientTexture([
        [0.0, "#5a5a5a"],
        [0.5, "#323232"],
        [1.0, "#1a1a1a"],
      ]),
    [],
  );

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    const px = isCoarseRef.current ? 0 : state.pointer.x * 0.15;
    const py = isCoarseRef.current ? 0 : state.pointer.y * 0.1;
    const x = px;
    const y = py;
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      x,
      0.05,
    );
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      -y,
      0.05,
    );
    groupRef.current.position.y = Math.sin(t * 0.6) * 0.04;

    const { viewport } = state;
    const targetW = 4.0;
    const targetH = 4.4;
    const fit = Math.min(
      1,
      viewport.width / targetW,
      viewport.height / targetH,
    );
    const scale = THREE.MathUtils.lerp(groupRef.current.scale.x, fit, 0.15);
    groupRef.current.scale.setScalar(scale);
  });

  return (
    <group ref={groupRef}>
      {/* main display panel — narrower than before (3.35 vs 3.7) so the
          horizontal bezel padding drops to ~0.15. Vertical gradient gives
          the slab top-to-bottom dimension; clearcoat adds specular variation */}
      <RoundedBox
        args={[3.35, 3.0, 0.28]}
        radius={0.13}
        smoothness={5}
        position={[0, 0.05, 0.66]}
      >
        <meshPhysicalMaterial
          map={bodyGradient ?? undefined}
          color={bodyGradient ? "#ffffff" : "#1e1e1e"}
          roughness={0.45}
          metalness={0.4}
          clearcoat={0.35}
          clearcoatRoughness={0.35}
        />
      </RoundedBox>

      {/* back plate — brushed metallic, picks up the accent back-rim light */}
      <RoundedBox
        args={[3.2, 2.85, 0.04]}
        radius={0.11}
        smoothness={3}
        position={[0, 0.05, 0.49]}
      >
        <meshPhysicalMaterial
          map={backGradient ?? undefined}
          color={backGradient ? "#ffffff" : "#3a3a3a"}
          roughness={0.3}
          metalness={0.75}
          clearcoat={0.2}
        />
      </RoundedBox>

      {/* screen recess — thin dark frame just larger than the screen so the
          display reads as a real inset window (not a sticker on the panel).
          No more accent halo — the previous additive layer was reading as an
          ugly neon border rather than a subtle glow */}
      <RoundedBox
        args={[3.12, 2.36, 0.012]}
        radius={0.045}
        smoothness={3}
        position={[0, SCREEN_Y, 0.802]}
      >
        <meshStandardMaterial
          color="#050505"
          roughness={0.92}
          metalness={0.05}
        />
      </RoundedBox>

      {/* live screen — content layer (snake + hero overlay) */}
      <CRTScreen />

      {/* channel knob — sits centered in the wider chin (knob position is
          set inside ChannelKnob.tsx to match the new chin) */}
      <ChannelKnob />

      {/* power LED — right side of the chin, on the same horizontal line as
          the knob's etched label so the chin reads as a single control row */}
      <mesh position={[1.25, -1.15, 0.81]}>
        <circleGeometry args={[0.038, 16]} />
        <meshBasicMaterial color="#c8ff3d" />
      </mesh>
      <pointLight
        position={[1.25, -1.15, 1]}
        color="#c8ff3d"
        intensity={0.18}
        distance={0.6}
      />

      {/* slim metallic arm — brushed gradient */}
      <mesh position={[0, -1.65, 0.5]}>
        <cylinderGeometry args={[0.045, 0.085, 0.4, 24]} />
        <meshPhysicalMaterial
          map={standGradient ?? undefined}
          color={standGradient ? "#ffffff" : "#3a3a3a"}
          roughness={0.22}
          metalness={0.88}
          clearcoat={0.55}
        />
      </mesh>

      {/* base plate — brushed-metal slab */}
      <RoundedBox
        args={[1.45, 0.08, 0.75]}
        radius={0.035}
        smoothness={2}
        position={[0, -1.88, 0.45]}
      >
        <meshPhysicalMaterial
          color="#383838"
          roughness={0.26}
          metalness={0.75}
          clearcoat={0.35}
        />
      </RoundedBox>
    </group>
  );
}
