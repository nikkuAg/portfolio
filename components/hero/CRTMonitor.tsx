"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { CRTScreen } from "./CRTScreen";
import { ChannelKnob } from "./ChannelKnob";

export function CRTMonitor() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    // gentle bob + cursor parallax
    const t = state.clock.getElapsedTime();
    const x = state.pointer.x * 0.15;
    const y = state.pointer.y * 0.1;
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
  });

  return (
    <group ref={groupRef}>
      {/* main casing (rear-deep CRT shape) */}
      <RoundedBox
        args={[3.8, 3.0, 2.4]}
        radius={0.12}
        smoothness={4}
        position={[0, 0, -0.4]}
      >
        <meshStandardMaterial
          color="#1a1a1a"
          roughness={0.6}
          metalness={0.1}
        />
      </RoundedBox>

      {/* front bezel */}
      <RoundedBox
        args={[3.6, 2.85, 0.6]}
        radius={0.18}
        smoothness={4}
        position={[0, 0.05, 0.5]}
      >
        <meshStandardMaterial
          color="#272727"
          roughness={0.55}
          metalness={0.15}
        />
      </RoundedBox>

      {/* live screen — sits in front of the bezel face (depth test wins) */}
      <CRTScreen />

      {/* brand label strip */}
      <mesh position={[0, -1.25, 0.81]}>
        <planeGeometry args={[1.2, 0.18]} />
        <meshBasicMaterial color="#0e0e0e" />
      </mesh>

      {/* channel knob (left) */}
      <ChannelKnob />

      {/* power LED */}
      <mesh position={[1.45, -1.25, 0.81]}>
        <circleGeometry args={[0.04, 16]} />
        <meshBasicMaterial color="#c8ff3d" />
      </mesh>
      <pointLight
        position={[1.45, -1.25, 1]}
        color="#c8ff3d"
        intensity={0.15}
        distance={0.5}
      />

      {/* stand */}
      <mesh position={[0, -1.75, -0.2]}>
        <cylinderGeometry args={[0.7, 0.9, 0.15, 24]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.7} />
      </mesh>
      <mesh position={[0, -1.55, -0.2]}>
        <cylinderGeometry args={[0.18, 0.18, 0.25, 16]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.7} />
      </mesh>
    </group>
  );
}
