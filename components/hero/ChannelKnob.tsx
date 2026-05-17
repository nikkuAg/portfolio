"use client";

import { useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { advanceChannel, CHANNELS, useChannel } from "./useChannel";

export function ChannelKnob() {
  const groupRef = useRef<THREE.Group>(null);
  const notchRef = useRef<THREE.Mesh>(null);
  const targetRot = useRef(0);
  const [hovered, setHovered] = useState(false);
  const channel = useChannel(); // re-render on change so notch rotates + label updates

  useFrame((state, dt) => {
    if (!groupRef.current) return;
    const k = Math.min(1, dt * 9);
    groupRef.current.rotation.z = THREE.MathUtils.lerp(
      groupRef.current.rotation.z,
      targetRot.current,
      k,
    );
    // notch breathes — subtle scale + colour pulse so the eye finds it.
    // Bumps faster when hovered to confirm the interaction is "live".
    if (notchRef.current) {
      const t = state.clock.getElapsedTime();
      const freq = hovered ? 4 : 1.4;
      const amp = hovered ? 0.18 : 0.12;
      const pulse = 1 - amp + Math.sin(t * freq) * amp;
      notchRef.current.scale.setScalar(0.9 + pulse * 0.15);
      const mat = notchRef.current.material as THREE.MeshBasicMaterial;
      // brighten from dim accent → full accent
      const b = 0.55 + pulse * 0.45;
      mat.color.setRGB((200 / 255) * b, (255 / 255) * b, (61 / 255) * b);
    }
  });

  function onClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    targetRot.current -= (Math.PI * 2) / CHANNELS.length;
    advanceChannel();
  }

  return (
    <group
      position={[-1.0, -1.15, 0.82]}
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
        {/* notch — pulses via useFrame above */}
        <mesh ref={notchRef} position={[0, 0.13, 0.031]}>
          <boxGeometry args={[0.02, 0.06, 0.005]} />
          <meshBasicMaterial color="#c8ff3d" />
        </mesh>
      </group>

      {/* tick marks around the dial — one per channel; the current channel's
          tick is brightened so the dial state reads at a glance */}
      {CHANNELS.map((_, i) => {
        const a = (i / CHANNELS.length) * Math.PI * 2 + Math.PI / 2;
        const r = 0.245;
        const isCurrent = i === channel;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * r, Math.sin(a) * r, 0.005]}
            rotation={[0, 0, a - Math.PI / 2]}
          >
            <boxGeometry args={[0.01, 0.04, 0.004]} />
            <meshBasicMaterial color={isCurrent ? "#c8ff3d" : "#444"} />
          </mesh>
        );
      })}

      {/* etched bezel label — sits to the right of the knob and updates
          with the channel number. The "CH·NN" suffix makes the dial state
          legible without looking at the corner pill. */}
      <Text
        position={[0.42, 0, 0.001]}
        fontSize={0.075}
        color="#7c7c7c"
        anchorX="left"
        anchorY="middle"
        letterSpacing={0.18}
        outlineWidth={0.002}
        outlineColor="#000000"
        outlineOpacity={0.55}
      >
        {`CHANNEL  ·  CH·${String(channel + 1).padStart(2, "0")}`}
      </Text>
    </group>
  );
}
