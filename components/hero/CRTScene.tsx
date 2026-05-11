"use client";

import { Canvas } from "@react-three/fiber";
import { Environment, ContactShadows } from "@react-three/drei";
import { Suspense } from "react";
import { CRTMonitor } from "./CRTMonitor";

export function CRTScene() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.8]}
      camera={{ position: [0, 0.4, 6.2], fov: 38 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <color attach="background" args={["#070707"]} />
      <fog attach="fog" args={["#070707", 8, 18]} />

      {/* lights */}
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[3, 4, 5]}
        intensity={0.9}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[-4, 2, -2]} color="#7aa8ff" intensity={0.7} />
      <pointLight position={[4, -1, 3]} color="#c8ff3d" intensity={0.25} />

      <Suspense fallback={null}>
        <CRTMonitor />
        <Environment preset="city" environmentIntensity={0.3} />
        <ContactShadows
          position={[0, -1.85, 0]}
          opacity={0.55}
          scale={8}
          blur={2.6}
          far={3}
        />
      </Suspense>
    </Canvas>
  );
}
