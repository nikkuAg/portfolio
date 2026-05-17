"use client";

import { Canvas } from "@react-three/fiber";
import { Environment, ContactShadows } from "@react-three/drei";
import { Suspense, useEffect, useState } from "react";
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
