"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, MeshReflectorMaterial, OrbitControls, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import s from "./three.module.css";

// Concept AI: the garage. A stylised F1 car (built from primitives, no
// team's livery or logo) on a turntable under studio lights. It turns by
// itself, which is the attract mode; drag to walk round it. Rev it (the car
// shakes, the exhaust glows and, with sound on, the engine climbs), open
// DRS to flip the rear wing, and pick a livery.

type Livery = { id: string; name: string; body: string; accent: string };
const LIVERIES: Livery[] = [
  { id: "rosso", name: "Rosso", body: "#b80d14", accent: "#f2e6c9" },
  { id: "midnight", name: "Midnight", body: "#14161c", accent: "#c8ff3d" },
  { id: "silver", name: "Silver", body: "#b8bcc4", accent: "#11aaa0" },
];

const ctl = { rev: 0, drs: false, touched: false };

function engineRev() {
  const AC = window.AudioContext;
  if (!AC) return;
  const ac = new AC();
  const t = ac.currentTime;
  const o = ac.createOscillator();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(65, t);
  o.frequency.exponentialRampToValueAtTime(360, t + 0.6);
  o.frequency.exponentialRampToValueAtTime(140, t + 1.1);
  const f = ac.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 1300;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.35, t + 0.08);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
  o.connect(f).connect(g).connect(ac.destination);
  o.start(t);
  o.stop(t + 1.25);
  window.setTimeout(() => ac.close(), 1500);
}

function Wheel({ x, z, r }: { x: number; z: number; r: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.z -= dt * (1 + ctl.rev * 18);
  });
  return (
    <group position={[x, r, z]}>
      <group ref={ref}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[r, r, 0.4, 32]} />
          <meshStandardMaterial color="#121212" roughness={0.85} />
        </mesh>
        {/* rim and the coloured compound stripe */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, z > 0 ? 0.201 : -0.201]}>
          <cylinderGeometry args={[r * 0.62, r * 0.62, 0.01, 24]} />
          <meshStandardMaterial color="#2b2b30" metalness={0.8} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0, z > 0 ? 0.203 : -0.203]}>
          <torusGeometry args={[r * 0.82, 0.018, 8, 40]} />
          <meshStandardMaterial color="#ffd23f" emissive="#ffd23f" emissiveIntensity={0.2} />
        </mesh>
      </group>
    </group>
  );
}

function Car({ liv }: { liv: Livery }) {
  const group = useRef<THREE.Group>(null);
  const flap = useRef<THREE.Group>(null);
  const glow = useRef<THREE.MeshStandardMaterial>(null);
  const B = <meshStandardMaterial color={liv.body} metalness={0.35} roughness={0.32} />;
  const A = <meshStandardMaterial color={liv.accent} metalness={0.2} roughness={0.4} />;
  const C = <meshStandardMaterial color="#0d0d0f" metalness={0.4} roughness={0.45} />;

  useFrame((state, dt) => {
    ctl.rev = Math.max(0, ctl.rev - dt * 0.9);
    const g = group.current;
    if (g) {
      const shake = ctl.rev * 0.02;
      g.position.y = Math.sin(state.clock.elapsedTime * 70) * shake;
      g.rotation.x = Math.sin(state.clock.elapsedTime * 53) * shake * 0.6;
    }
    if (flap.current) flap.current.rotation.z = THREE.MathUtils.damp(flap.current.rotation.z, ctl.drs ? 0.75 : 0, 8, dt);
    if (glow.current) glow.current.emissiveIntensity = 0.4 + ctl.rev * 6 + Math.random() * ctl.rev * 2;
  });

  return (
    <group ref={group}>
      {/* floor and plank */}
      <mesh position={[0, 0.16, 0]} castShadow>{C}
        <boxGeometry args={[4.6, 0.06, 1.5]} />
      </mesh>
      {/* tub */}
      <RoundedBox args={[2.4, 0.42, 0.72]} radius={0.12} position={[0.2, 0.44, 0]} castShadow>{B}</RoundedBox>
      {/* nose */}
      <mesh position={[1.95, 0.36, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>{B}
        <cylinderGeometry args={[0.08, 0.26, 1.7, 20]} />
      </mesh>
      {/* sidepods */}
      {[-0.62, 0.62].map((z) => (
        <RoundedBox key={z} args={[1.7, 0.36, 0.46]} radius={0.14} position={[-0.25, 0.42, z]} castShadow>{B}</RoundedBox>
      ))}
      {/* engine cover tapering to the back */}
      <mesh position={[-1.2, 0.56, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>{B}
        <cylinderGeometry args={[0.2, 0.34, 1.6, 20]} />
      </mesh>
      {/* airbox and accent stripe */}
      <RoundedBox args={[0.42, 0.42, 0.34]} radius={0.08} position={[-0.42, 0.92, 0]} castShadow>{A}</RoundedBox>
      <mesh position={[0.6, 0.66, 0]}>{A}
        <boxGeometry args={[1.4, 0.02, 0.14]} />
      </mesh>
      {/* cockpit, helmet, halo */}
      <mesh position={[0.1, 0.66, 0]}>
        <boxGeometry args={[0.7, 0.06, 0.42]} />
        <meshStandardMaterial color="#050506" />
      </mesh>
      <mesh position={[0.06, 0.78, 0]} castShadow>
        <sphereGeometry args={[0.17, 24, 16]} />
        <meshStandardMaterial color="#ffd23f" roughness={0.3} metalness={0.2} />
      </mesh>
      <mesh position={[0.22, 0.98, 0]} rotation={[Math.PI / 2, 0, 0]}>{C}
        <torusGeometry args={[0.3, 0.03, 8, 24, Math.PI]} />
      </mesh>
      <mesh position={[0.52, 0.84, 0]} rotation={[0, 0, 0.5]}>{C}
        <boxGeometry args={[0.04, 0.32, 0.04]} />
      </mesh>
      {/* front wing */}
      <mesh position={[2.72, 0.16, 0]} castShadow>{A}
        <boxGeometry args={[0.5, 0.04, 2.1]} />
      </mesh>
      <mesh position={[2.66, 0.24, 0]}>{B}
        <boxGeometry args={[0.36, 0.03, 1.9]} />
      </mesh>
      {[-1.05, 1.05].map((z) => (
        <mesh key={z} position={[2.7, 0.26, z]}>{C}
          <boxGeometry args={[0.6, 0.24, 0.03]} />
        </mesh>
      ))}
      {/* rear wing, with a DRS flap hinged at the front edge */}
      <mesh position={[-2.25, 0.62, 0]}>{C}
        <boxGeometry args={[0.06, 0.62, 0.06]} />
      </mesh>
      <mesh position={[-2.3, 1.0, 0]} castShadow>{B}
        <boxGeometry args={[0.42, 0.05, 1.5]} />
      </mesh>
      <group ref={flap} position={[-2.1, 1.1, 0]}>
        <mesh position={[-0.17, 0, 0]}>{A}
          <boxGeometry args={[0.34, 0.04, 1.46]} />
        </mesh>
      </group>
      {[-0.77, 0.77].map((z) => (
        <mesh key={z} position={[-2.28, 0.98, z]}>{C}
          <boxGeometry args={[0.56, 0.5, 0.03]} />
        </mesh>
      ))}
      {/* exhaust and its glow */}
      <mesh position={[-2.02, 0.5, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.07, 0.07, 0.16, 16]} />
        <meshStandardMaterial ref={glow} color="#ff6a2a" emissive="#ff6a2a" emissiveIntensity={0.4} />
      </mesh>
      <Wheel x={1.55} z={0.98} r={0.36} />
      <Wheel x={1.55} z={-0.98} r={0.36} />
      <Wheel x={-1.62} z={0.98} r={0.39} />
      <Wheel x={-1.62} z={-0.98} r={0.39} />
    </group>
  );
}

function Turntable({ liv }: { liv: Livery }) {
  const ref = useRef<THREE.Group>(null);
  const ring = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((state, dt) => {
    if (ref.current && !ctl.touched) ref.current.rotation.y += dt * 0.25;
    if (ring.current) ring.current.emissiveIntensity = 1.2 + Math.sin(state.clock.elapsedTime * 2) * 0.3 + ctl.rev * 2;
  });
  return (
    <group ref={ref}>
      <mesh position={[0, -0.06, 0]} receiveShadow>
        <cylinderGeometry args={[3.6, 3.7, 0.12, 64]} />
        <meshStandardMaterial color="#141519" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, -0.0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.45, 3.55, 96]} />
        <meshStandardMaterial ref={ring} color="#ff2d20" emissive="#ff2d20" emissiveIntensity={1.2} />
      </mesh>
      <group rotation={[0, -0.6, 0]}>
        <Car liv={liv} />
      </group>
    </group>
  );
}

export function Garage() {
  const [livery, setLivery] = useState(LIVERIES[0].id);
  const [drs, setDrs] = useState(false);
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const m = () => setMobile(window.innerWidth < 768);
    m();
    window.addEventListener("resize", m);
    return () => window.removeEventListener("resize", m);
  }, []);

  return (
    <>
      <div className={s.canvasWrap} data-side={!mobile || undefined}>
        <Canvas shadows dpr={[1, 1.75]} camera={{ position: mobile ? [11, 6, 14] : [10, 4.6, 11.5], fov: 34 }} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}>
          <color attach="background" args={["#08090b"]} />
          <fog attach="fog" args={["#08090b", 14, 28]} />
          <ambientLight intensity={0.25} />
          <spotLight position={[0, 9, 0]} angle={0.55} penumbra={0.7} intensity={140} castShadow shadow-mapSize={[1024, 1024]} color="#fff4e6" />
          <spotLight position={[-7, 4, 5]} angle={0.5} penumbra={1} intensity={60} color="#9fb4ff" />
          <spotLight position={[7, 3, -5]} angle={0.5} penumbra={1} intensity={70} color="#ff8a6a" />
          <Suspense fallback={null}>
            <Turntable liv={LIVERIES.find((l) => l.id === livery)!} />
            <ContactShadows position={[0, 0.01, 0]} opacity={0.6} scale={10} blur={2.4} far={3} />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]}>
              <planeGeometry args={[60, 60]} />
              <MeshReflectorMaterial resolution={512} mixBlur={1} mixStrength={18} blur={[400, 120]} roughness={0.9} depthScale={1} color="#0c0d10" metalness={0.5} mirror={0.4} />
            </mesh>
          </Suspense>
          <OrbitControls
            enablePan={false}
            enableZoom={false}
            minPolarAngle={0.6}
            maxPolarAngle={1.42}
            target={[0, 0.5, 0]}
            onStart={() => (ctl.touched = true)}
          />
        </Canvas>
      </div>
      <div className={s.garageHud}>
        <button
          type="button"
          className={s.rev}
          onClick={() => {
            ctl.rev = 1;
            engineRev();
          }}
        >
          Rev it
        </button>
        <button
          type="button"
          className={s.ghost}
          aria-pressed={drs}
          onClick={() => {
            ctl.drs = !ctl.drs;
            setDrs(ctl.drs);
          }}
        >
          {drs ? "DRS open" : "Open DRS"}
        </button>
        <div className={s.swatches} role="radiogroup" aria-label="Livery">
          {LIVERIES.map((l) => (
            <button
              key={l.id}
              type="button"
              role="radio"
              aria-checked={livery === l.id}
              aria-label={l.name}
              title={l.name}
              style={{ ["--a" as string]: l.body, ["--b" as string]: l.accent }}
              onClick={() => {
                setLivery(l.id);
              }}
            />
          ))}
        </div>
        <p className={s.garageHint}>Drag to walk round it.</p>
      </div>
    </>
  );
}
