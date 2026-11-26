"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { RetroTV } from "./RetroTV";
import { GlowToDom } from "./GlowToDom";
import type { Glow } from "./TVScreen";

// Concept B: one graphite set, three-quarter view so the tube's depth reads,
// alone in a dark studio. The only real light is the picture itself.

function useRig() {
  const group = useRef<THREE.Group>(null);
  const { viewport, pointer, size } = useThree();
  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const wide = size.width >= 768;
    // desktop: set sits right of the copy; phones: centred, higher, smaller
    const targetX = wide ? Math.min(2.2, viewport.width * 0.15) : 0;
    const targetY = wide ? 0.15 : 0.9;
    const scale = wide
      ? THREE.MathUtils.clamp(viewport.width / 11, 0.6, 1.1)
      : THREE.MathUtils.clamp(viewport.width / 6.4, 0.45, 0.8);
    g.position.x = THREE.MathUtils.damp(g.position.x, targetX, 6, dt);
    g.position.y = THREE.MathUtils.damp(g.position.y, targetY, 6, dt);
    g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, scale, 6, dt));
    // gentle look-around, never enough to lose the three-quarter read
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, -0.62 + pointer.x * 0.08, 3, dt);
    state.camera.position.y = THREE.MathUtils.damp(state.camera.position.y, 2.0 + pointer.y * 0.15, 3, dt);
    state.camera.lookAt(0, 0.1, 0);
  });
  return group;
}

export function BroadcastScene({ heroRef }: { heroRef: React.RefObject<HTMLElement | null> }) {
  const glow = useRef<Glow>({ color: new THREE.Color(0.6, 0.6, 0.6), intensity: 0 });
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [0, 2.0, 10], fov: 30 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
    >
      <color attach="background" args={["#08090b"]} />
      <fog attach="fog" args={["#08090b", 14, 30]} />
      <ambientLight intensity={0.05} />
      {/* faint cool rim from behind-left so the silhouette separates */}
      <directionalLight position={[-6, 5, -6]} intensity={0.45} color="#9fb4d9" />
      <directionalLight position={[4, 6, 6]} intensity={0.12} castShadow shadow-mapSize={[1024, 1024]} />
      {/* warm top-back key so the tube's bell and vents read in silhouette */}
      <directionalLight position={[7, 7, -6]} intensity={0.55} color="#e8dccb" />

      {/* the set's printed labels load a font; suspending without a
          boundary here tears down the whole WebGL root */}
      <Suspense fallback={null}>
        <Stage glow={glow} />
      </Suspense>
      <GlowToDom glow={glow} target={heroRef} />

      {/* studio floor — slightly glossy so the picture pools on it */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.78, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#0c0d0f" roughness={0.38} metalness={0.1} />
      </mesh>
      <mesh position={[0, 4, -9]} receiveShadow>
        <planeGeometry args={[60, 20]} />
        <meshStandardMaterial color="#0b0c0e" roughness={0.9} />
      </mesh>
    </Canvas>
  );
}

function Stage({ glow }: { glow: React.RefObject<Glow> }) {
  const ref = useRig();
  return (
    <group ref={ref}>
      <RetroTV glow={glow} finish="graphite" position={[0, 0, 0]} />
      <ContactShadows position={[0, -1.77, -0.6]} scale={10} blur={2.4} far={3} opacity={0.8} />
    </group>
  );
}
