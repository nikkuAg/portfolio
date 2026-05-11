"use client";

import { useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { advanceChannel, CHANNELS, useChannel } from "./useChannel";

export function ChannelKnob() {
  const groupRef = useRef<THREE.Group>(null);
  const targetRot = useRef(0);
  const [hovered, setHovered] = useState(false);
  useChannel(); // re-render on change so notch rotates

  useFrame((_, dt) => {
    if (!groupRef.current) return;
    const k = Math.min(1, dt * 9);
    groupRef.current.rotation.z = THREE.MathUtils.lerp(
      groupRef.current.rotation.z,
      targetRot.current,
      k,
    );
  });

  function onClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    targetRot.current -= (Math.PI * 2) / CHANNELS.length;
    advanceChannel();
  }

  return (
    <group
      position={[-1.2, -1.32, 0.82]}
      onClick={onClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
      }}
      scale={hovered ? 1.06 : 1}
    >
      {/* outer ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.21, 0.21, 0.04, 32]} />
        <meshStandardMaterial
          color="#0e0e0e"
          roughness={0.6}
          metalness={0.3}
        />
      </mesh>
      {/* knob body — rotates */}
      <group ref={groupRef} position={[0, 0, 0.03]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.06, 32]} />
          <meshStandardMaterial
            color="#2a2a2a"
            roughness={0.45}
            metalness={0.55}
          />
        </mesh>
        {/* notch */}
        <mesh position={[0, 0.13, 0.031]}>
          <boxGeometry args={[0.02, 0.06, 0.005]} />
          <meshBasicMaterial color="#c8ff3d" />
        </mesh>
      </group>

      {/* tick marks around the dial — one per channel */}
      {CHANNELS.map((_, i) => {
        const a = (i / CHANNELS.length) * Math.PI * 2 + Math.PI / 2;
        const r = 0.245;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * r, Math.sin(a) * r, 0.005]}
            rotation={[0, 0, a - Math.PI / 2]}
          >
            <boxGeometry args={[0.01, 0.04, 0.004]} />
            <meshBasicMaterial color="#444" />
          </mesh>
        );
      })}
    </group>
  );
}
