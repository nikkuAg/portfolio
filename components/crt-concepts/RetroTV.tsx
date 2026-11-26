"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { RoundedBox, Text } from "@react-three/drei";
import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { TVScreen, type Glow } from "./TVScreen";
import { CHANNELS, tv, useTV } from "./tv-store";

RectAreaLightUniformsLib.init();

// A real tube set, not a flat panel: deep tapered back, molded lip around
// a 4:3 opening, convex glass, and a side control strip (channel dial,
// volume = sound on/off, power) the way late-80s sets were laid out.

const W = 4.3; // cabinet front
const H = 3.2;
const FRONT_D = 0.5;
const SCREEN_W = 2.96;
const SCREEN_H = 2.22;
const SCREEN_X = -0.52;
const SCREEN_Y = 0.08;
const PANEL_X = 1.56;
const FRONT_Z = FRONT_D / 2;
const SHELL_D = 0.9; // boxy rear shell behind the bezel
const BELL_D = 1.5; // taper from the shell to the neck

/** centre of the glass in the set's local space (for camera moves) */
export const TV_SCREEN_CENTER = new THREE.Vector3(SCREEN_X, SCREEN_Y, FRONT_Z);
export const TV_SCREEN_SIZE = { width: SCREEN_W, height: SCREEN_H };
export const TV_FOOT_Y = -H / 2 - 0.11;

// channel detents sweep the top of the dial, 150° → 0°, clear of its label
const DIAL_START = (5 * Math.PI) / 6;
const DIAL_STEP = (5 * Math.PI) / 18;

export type Finish = "graphite" | "beige";

const FINISHES: Record<
  Finish,
  { body: string; back: string; panel: string; knob: string; cap: string; ink: string; badge: string }
> = {
  graphite: {
    body: "#2b2c2e",
    back: "#232426",
    panel: "#18191b",
    knob: "#0f0f10",
    cap: "#a7a7a2",
    ink: "#8d8d88",
    badge: "#d9d8d2",
  },
  beige: {
    body: "#d6ccb4",
    back: "#c8bda3",
    panel: "#b3a88f",
    knob: "#38332d",
    cap: "#d9d4c8",
    ink: "#5d5546",
    badge: "#3a342c",
  },
};

function roundedRectPath(path: THREE.Path, x: number, y: number, w: number, h: number, r: number) {
  path.moveTo(x - w / 2 + r, y - h / 2);
  path.lineTo(x + w / 2 - r, y - h / 2);
  path.quadraticCurveTo(x + w / 2, y - h / 2, x + w / 2, y - h / 2 + r);
  path.lineTo(x + w / 2, y + h / 2 - r);
  path.quadraticCurveTo(x + w / 2, y + h / 2, x + w / 2 - r, y + h / 2);
  path.lineTo(x - w / 2 + r, y + h / 2);
  path.quadraticCurveTo(x - w / 2, y + h / 2, x - w / 2, y + h / 2 - r);
  path.lineTo(x - w / 2, y - h / 2 + r);
  path.quadraticCurveTo(x - w / 2, y - h / 2, x - w / 2 + r, y - h / 2);
}

function frameGeometry(
  ow: number,
  oh: number,
  or: number,
  hx: number,
  hy: number,
  hw: number,
  hh: number,
  hr: number,
  depth: number,
  bevel: number,
) {
  const shape = new THREE.Shape();
  roundedRectPath(shape, 0, 0, ow, oh, or);
  const hole = new THREE.Path();
  roundedRectPath(hole, hx, hy, hw, hh, hr);
  shape.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 4,
    curveSegments: 12,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}

// square frustum pointing backwards (the tube's bell)
function bellGeometry(fw: number, fh: number, bw: number, bh: number, depth: number) {
  const g = new THREE.CylinderGeometry(bw / Math.SQRT2, fw / Math.SQRT2, depth, 4, 1);
  g.rotateY(Math.PI / 4);
  // non-square cross-section: scale z by the aspect, top/bottom stay matched
  g.scale(1, 1, fh / fw);
  g.rotateX(-Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

export function RetroTV({
  finish = "graphite",
  antenna = false,
  glow,
  ...props
}: {
  finish?: Finish;
  antenna?: boolean;
  glow: React.RefObject<Glow>;
} & React.ComponentProps<"group">) {
  const c = FINISHES[finish];
  const front = useMemo(
    () => frameGeometry(W, H, 0.2, SCREEN_X, SCREEN_Y, SCREEN_W + 0.04, SCREEN_H + 0.04, 0.16, FRONT_D, 0.035),
    [],
  );
  const lip = useMemo(
    () => frameGeometry(SCREEN_W + 0.3, SCREEN_H + 0.3, 0.24, 0, 0, SCREEN_W + 0.02, SCREEN_H + 0.02, 0.15, 0.05, 0.03),
    [],
  );
  // behind the bezel: a boxy rear shell first, then the taper to the neck —
  // that chunky silhouette is what reads as "tube set" from any angle
  const bell = useMemo(() => bellGeometry(W - 0.3, H - 0.3, 2.5, 1.9, BELL_D), []);
  const rectLight = useRef<THREE.RectAreaLight>(null);
  const spill = useRef<THREE.PointLight>(null);

  useFrame(() => {
    const g = glow.current;
    if (!g) return;
    if (rectLight.current) {
      rectLight.current.color.copy(g.color);
      rectLight.current.intensity = g.intensity * 3;
    }
    if (spill.current) {
      spill.current.color.copy(g.color);
      spill.current.intensity = g.intensity * 1.3;
    }
  });

  const plastic = { roughness: 0.62, metalness: 0.0, clearcoat: 0.12, clearcoatRoughness: 0.6 };

  return (
    <group {...props}>
      {/* cabinet front with the screen opening cut out */}
      <mesh geometry={front} castShadow receiveShadow>
        <meshPhysicalMaterial color={c.body} {...plastic} />
      </mesh>

      {/* molded lip around the tube */}
      <mesh geometry={lip} position={[SCREEN_X, SCREEN_Y, FRONT_Z + 0.02]} castShadow>
        <meshPhysicalMaterial color={c.panel} roughness={0.5} clearcoat={0.2} />
      </mesh>

      {/* tube interior so you never see into the cabinet */}
      <mesh position={[SCREEN_X, SCREEN_Y, FRONT_Z - 0.32]}>
        <boxGeometry args={[SCREEN_W + 0.1, SCREEN_H + 0.1, 0.5]} />
        <meshBasicMaterial color="#040504" />
      </mesh>

      {/* glass */}
      <group position={[SCREEN_X, SCREEN_Y, FRONT_Z - 0.06]}>
        <TVScreen width={SCREEN_W} height={SCREEN_H} glow={glow} />
      </group>

      {/* rear shell, bell and neck */}
      <RoundedBox
        args={[W - 0.1, H - 0.1, SHELL_D]}
        radius={0.12}
        position={[0, 0, -FRONT_D / 2 - SHELL_D / 2 + 0.02]}
        castShadow
        receiveShadow
      >
        <meshPhysicalMaterial color={c.back} {...plastic} />
      </RoundedBox>
      <mesh
        geometry={bell}
        position={[SCREEN_X * 0.3, 0, -FRONT_D / 2 - SHELL_D - BELL_D / 2 + 0.04]}
        castShadow
        receiveShadow
      >
        <meshPhysicalMaterial color={c.back} {...plastic} flatShading />
      </mesh>
      <RoundedBox
        args={[1.6, 1.25, 0.45]}
        radius={0.08}
        position={[SCREEN_X * 0.3, 0, -FRONT_D / 2 - SHELL_D - BELL_D - 0.18]}
        castShadow
      >
        <meshPhysicalMaterial color={c.back} {...plastic} />
      </RoundedBox>
      {/* vent slots across the top of the rear shell */}
      {Array.from({ length: 9 }).map((_, i) => (
        <mesh key={i} position={[-1.6 + i * 0.4, (H - 0.1) / 2 + 0.002, -FRONT_D / 2 - SHELL_D / 2]}>
          <boxGeometry args={[0.08, 0.01, SHELL_D * 0.7]} />
          <meshStandardMaterial color="#0b0b0b" roughness={1} />
        </mesh>
      ))}

      <ControlPanel colors={c} />

      {/* maker's badge under the screen */}
      <Text
        position={[SCREEN_X - SCREEN_W / 2 + 0.12, -1.38, FRONT_Z + 0.04]}
        fontSize={0.13}
        letterSpacing={0.06}
        anchorX="left"
        anchorY="middle"
        color={c.badge}
      >
        DA·TV
      </Text>
      <Text
        position={[SCREEN_X + SCREEN_W / 2 - 0.1, -1.38, FRONT_Z + 0.04]}
        fontSize={0.07}
        anchorX="right"
        anchorY="middle"
        color={c.ink}
      >
        Model DA-2026
      </Text>

      {/* feet */}
      {[-1.6, 1.6].map((x) => (
        <RoundedBox key={x} args={[0.5, 0.12, 0.9]} radius={0.04} position={[x, -H / 2 - 0.05, -0.4]}>
          <meshStandardMaterial color="#141414" roughness={0.9} />
        </RoundedBox>
      ))}

      {antenna && <RabbitEars color={c.knob} cap={c.cap} />}

      {/* the light the picture throws forward */}
      <rectAreaLight
        ref={rectLight}
        position={[SCREEN_X, SCREEN_Y, FRONT_Z + 0.2]}
        width={SCREEN_W}
        height={SCREEN_H}
        intensity={0}
      />
      <pointLight ref={spill} position={[SCREEN_X, SCREEN_Y - 0.3, FRONT_Z + 3.2]} distance={14} decay={1.6} intensity={0} />
    </group>
  );
}

type Colors = (typeof FINISHES)[Finish];

function ControlPanel({ colors: c }: { colors: Colors }) {
  const { channel, sound, power } = useTV();
  return (
    <group position={[PANEL_X, 0, FRONT_Z + 0.04]}>
      <RoundedBox args={[0.86, 2.62, 0.04]} radius={0.05} position={[0, 0.02, -0.02]}>
        <meshPhysicalMaterial color={c.panel} roughness={0.7} />
      </RoundedBox>

      <Dial
        position={[0, 0.82, 0.02]}
        radius={0.25}
        colors={c}
        angle={DIAL_START - channel * DIAL_STEP}
        onClick={() => tv.next()}
        label="Channel"
        accent="#e2483d"
      />
      {CHANNELS.map((ch, i) => {
        const a = DIAL_START - i * DIAL_STEP;
        return (
          <Text
            key={ch.id}
            position={[Math.cos(a) * 0.37, 0.82 + Math.sin(a) * 0.37, 0.005]}
            fontSize={0.075}
            color={i === channel ? c.badge : c.ink}
            anchorX="center"
            anchorY="middle"
          >
            {String(ch.number)}
          </Text>
        );
      })}

      <Dial
        position={[0, 0.06, 0.02]}
        radius={0.15}
        colors={c}
        angle={sound ? -Math.PI / 6 : (Math.PI * 5) / 6}
        onClick={() => tv.toggleSound()}
        label={sound ? "Sound on" : "Sound off"}
        accent={sound ? "#e2483d" : c.ink}
      />

      {/* power rocker + standby LED */}
      <Pressable position={[0, -0.5, 0.02]} onClick={() => tv.togglePower()}>
        <RoundedBox args={[0.46, 0.16, 0.07]} radius={0.03}>
          <meshPhysicalMaterial color={c.knob} roughness={0.45} clearcoat={0.4} />
        </RoundedBox>
      </Pressable>
      <Text position={[0, -0.66, 0.005]} fontSize={0.06} color={c.ink} anchorX="center">
        Power
      </Text>
      <mesh position={[0.3, -0.5, 0.01]}>
        <circleGeometry args={[0.025, 16]} />
        <meshBasicMaterial color={power ? "#7dff6a" : "#ff3b2f"} toneMapped={false} />
      </mesh>

      {/* speaker grille */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} position={[0, -0.86 - i * 0.07, 0.002]}>
          <boxGeometry args={[0.6, 0.026, 0.01]} />
          <meshStandardMaterial color="#070707" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function Pressable({
  children,
  onClick,
  ...props
}: { children: React.ReactNode; onClick: () => void } & React.ComponentProps<"group">) {
  const [down, setDown] = useState(false);
  const [hover, setHover] = useState(false);
  return (
    <group
      {...props}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerDown={() => setDown(true)}
      onPointerUp={() => setDown(false)}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
      }}
      onPointerOut={() => {
        setHover(false);
        setDown(false);
      }}
    >
      <group position={[0, 0, down ? -0.025 : hover ? 0.008 : 0]}>{children}</group>
    </group>
  );
}

function Dial({
  radius,
  angle,
  colors: c,
  onClick,
  label,
  accent,
  ...props
}: {
  radius: number;
  angle: number;
  colors: Colors;
  onClick: () => void;
  label: string;
  accent: string;
} & React.ComponentProps<"group">) {
  const spin = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!spin.current) return;
    // detented feel: fast approach with a small overshoot-free settle
    spin.current.rotation.z = THREE.MathUtils.damp(spin.current.rotation.z, angle - Math.PI / 2, 14, dt);
  });
  const ridges = 28;
  return (
    <group {...props}>
      <Pressable position={[0, 0, 0]} onClick={onClick}>
        <group ref={spin}>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.06]} castShadow>
            <cylinderGeometry args={[radius, radius * 1.04, 0.14, 48]} />
            <meshPhysicalMaterial color={c.knob} roughness={0.55} clearcoat={0.3} />
          </mesh>
          {Array.from({ length: ridges }).map((_, i) => {
            const a = (i / ridges) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(a) * radius, Math.sin(a) * radius, 0.06]} rotation={[0, 0, a]}>
                <boxGeometry args={[0.025, 0.02, 0.13]} />
                <meshStandardMaterial color={c.knob} roughness={0.6} />
              </mesh>
            );
          })}
          {/* brushed cap */}
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.135]}>
            <cylinderGeometry args={[radius * 0.72, radius * 0.72, 0.015, 48]} />
            <meshStandardMaterial color={c.cap} roughness={0.3} metalness={0.8} />
          </mesh>
          {/* pointer */}
          <mesh position={[0, radius * 0.45, 0.145]}>
            <boxGeometry args={[radius * 0.08, radius * 0.6, 0.01]} />
            <meshBasicMaterial color={accent} toneMapped={false} />
          </mesh>
        </group>
      </Pressable>
      <Text position={[0, -radius - 0.13, -0.015]} fontSize={0.06} color={c.ink} anchorX="center">
        {label}
      </Text>
    </group>
  );
}

function RabbitEars({ color, cap }: { color: string; cap: string }) {
  return (
    <group position={[SCREEN_X * 0.3, (H - 0.1) / 2, -FRONT_D / 2 - SHELL_D * 0.75]}>
      <mesh castShadow>
        <sphereGeometry args={[0.32, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial color={color} roughness={0.4} clearcoat={0.5} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s} rotation={[0.25, 0, s * -0.42]}>
          <mesh position={[0, 1.25, 0]} castShadow>
            <cylinderGeometry args={[0.012, 0.022, 2.5, 8]} />
            <meshStandardMaterial color={cap} metalness={0.9} roughness={0.25} />
          </mesh>
          <mesh position={[0, 2.5, 0]}>
            <sphereGeometry args={[0.035, 12, 12]} />
            <meshStandardMaterial color={cap} metalness={0.9} roughness={0.25} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
