"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, ContactShadows } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { CRTMonitor } from "./CRTMonitor";

export function CRTScene() {
  // detect compact / coarse-pointer devices once on mount; we render a lighter
  // version of the scene there (lower DPR cap, no shadows, no env probe) so
  // mobile GPUs aren't asked to do desktop-tier rendering
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(
      "(max-width: 768px), (pointer: coarse)",
    );
    const update = () => setCompact(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  return (
    <Canvas
      shadows={!compact}
      dpr={compact ? 1 : [1, 1.8]}
      camera={{ position: [0, 0.4, 6.2], fov: compact ? 44 : 38 }}
      gl={{
        antialias: !compact,
        alpha: true,
        powerPreference: "high-performance",
      }}
      style={{ background: "transparent" }}
    >
      <color attach="background" args={["#070707"]} />
      <fog attach="fog" args={["#070707", 9, 20]} />

      {/* lights — fewer + cheaper on compact. Ambient up a tick so the casing
          edges read; key directional slightly brighter for shape definition */}
      <ambientLight intensity={compact ? 0.6 : 0.42} />
      <directionalLight
        position={[3, 4, 5]}
        intensity={1.05}
        castShadow={!compact}
        shadow-mapSize={[compact ? 512 : 1024, compact ? 512 : 1024]}
      />
      {/* back-rim lights — symmetric pair catches BOTH top edges of the
          casing so the silhouette pops on every side, not just one. Left
          rim is accent (brand cue), right rim is cool white (contrast). */}
      <directionalLight
        position={[-2, 3, -4]}
        intensity={compact ? 0.55 : 0.9}
        color="#c8ff3d"
      />
      <directionalLight
        position={[2.5, 2.5, -4]}
        intensity={compact ? 0.4 : 0.65}
        color="#eaf0ff"
      />
      {!compact && (
        <>
          <pointLight position={[-4, 2, -2]} color="#7aa8ff" intensity={0.8} />
          <pointLight position={[4, -1, 3]} color="#c8ff3d" intensity={0.3} />
          {/* low fill from below-front — gives the bottom of the casing /
              stand a subtle highlight so the TV doesn't sink into the floor */}
          <pointLight
            position={[0, -2.5, 3]}
            color="#ffffff"
            intensity={0.35}
            distance={6}
          />
        </>
      )}

      {/* ambience — the same chalk-dust + dot-floor vocabulary as the
          Experience void, so the TV sits in a room instead of a vacuum */}
      <ChalkDust compact={compact} />
      <FloorDots compact={compact} />

      <Suspense fallback={null}>
        <CRTMonitor />
        {/* env probe + ground-plane shadow are the heaviest ops here — both
            skipped on compact. The compact rim-light bump above keeps the
            casing from going totally flat without them. */}
        {!compact && (
          <>
            <Environment preset="city" environmentIntensity={0.35} />
            <ContactShadows
              position={[0, -1.88, 0]}
              opacity={0.78}
              scale={9}
              blur={2.2}
              far={3}
              color="#000000"
            />
          </>
        )}
      </Suspense>
    </Canvas>
  );
}

// deterministic PRNG — stable positions across renders
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// sparse drifting chalk dust around + behind the TV. Fog (9..20) swallows
// the far ones, so the room reads deep without ever distracting from the
// screen.
function ChalkDust({ compact }: { compact: boolean }) {
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const rand = mulberry32(2026);
    const count = compact ? 90 : 240;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // keep a clear cylinder around the TV (|x| < 2.4 near z 0) so motes
      // never float across the screen face
      let x = (rand() - 0.5) * 18;
      const y = -1.6 + rand() * 6;
      const z = 1 - rand() * 11;
      if (Math.abs(x) < 2.4 && z > -2.5) x = Math.sign(x || 1) * (2.4 + rand() * 6);
      arr[i * 3] = x;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = z;
    }
    return arr;
  }, [compact]);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.y = t * 0.012;
    ref.current.position.y = Math.sin(t * 0.25) * 0.12;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        color="#f5f5f5"
        transparent
        opacity={0.4}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// faint dot-grid floor — the site's card/stage dot grain lying under the
// TV, receding into the fog (same floor the Experience flight uses)
function FloorDots({ compact }: { compact: boolean }) {
  const positions = useMemo(() => {
    const step = compact ? 1.3 : 0.85;
    const pts: number[] = [];
    for (let x = -11; x <= 11; x += step) {
      for (let z = -10; z <= 3; z += step) {
        pts.push(x, -1.87, z);
      }
    }
    return new Float32Array(pts);
  }, [compact]);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color="#f5f5f5"
        transparent
        opacity={0.14}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}
