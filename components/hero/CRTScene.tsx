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
      <fog attach="fog" args={["#070707", 8, 18]} />

      {/* lights — fewer + cheaper on compact */}
      <ambientLight intensity={compact ? 0.55 : 0.35} />
      <directionalLight
        position={[3, 4, 5]}
        intensity={0.9}
        castShadow={!compact}
        shadow-mapSize={[compact ? 512 : 1024, compact ? 512 : 1024]}
      />
      {!compact && (
        <>
          <pointLight position={[-4, 2, -2]} color="#7aa8ff" intensity={0.7} />
          <pointLight position={[4, -1, 3]} color="#c8ff3d" intensity={0.25} />
        </>
      )}

      <Suspense fallback={null}>
        <CRTMonitor />
        {/* env probe + ground-plane shadow are the heaviest ops here — both
            skipped on compact. The compact rim-light bump above keeps the
            casing from going totally flat without them. */}
        {!compact && (
          <>
            <Environment preset="city" environmentIntensity={0.3} />
            <ContactShadows
              position={[0, -1.85, 0]}
              opacity={0.55}
              scale={8}
              blur={2.6}
              far={3}
            />
          </>
        )}
      </Suspense>
    </Canvas>
  );
}
