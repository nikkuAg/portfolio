"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { projects } from "@/content/projects";
import { RetroTV, TV_FOOT_Y, TV_SCREEN_CENTER, TV_SCREEN_SIZE } from "./RetroTV";
import { GlowToDom } from "./GlowToDom";
import { CHANNELS, tv } from "./tv-store";
import type { Glow } from "./TVScreen";

// Concept A: a beige set with rabbit ears on his desk, late at night. The
// cartridges in front of it are his projects (click one to "insert" it and
// the set cuts to it). Scrolling flies the camera into the picture.

const DESK_Y = TV_FOOT_Y - 0.06;
const REEL = CHANNELS.findIndex((c) => c.id === "reel");

// the four cartridges on the desk, in the order they lean
const CART_SLUGS = ["rank-matrix", "29-8n", "a-dot", "inbound"];

function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (ctx) draw(ctx);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function identFont() {
  const host = document.querySelector("[data-tv-fonts]") ?? document.documentElement;
  return getComputedStyle(host).getPropertyValue("--font-ident").trim() || "sans-serif";
}

export function RoomScene({ heroRef }: { heroRef: React.RefObject<HTMLElement | null> }) {
  const glow = useRef<Glow>({ color: new THREE.Color(0.6, 0.6, 0.6), intensity: 0 });
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [3.4, 1.5, 9], fov: 34 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
    >
      <color attach="background" args={["#0d0b09"]} />
      <fog attach="fog" args={["#0d0b09", 12, 26]} />
      <ambientLight intensity={0.06} color="#ffd9b0" />

      {/* the set's printed labels load a font; suspending without a
          boundary here tears down the whole WebGL root */}
      <Suspense fallback={null}>
        <Room />
        <Lamp position={[3.3, DESK_Y, -0.6]} />
        <group position={[-0.5, 0, 0.5]} rotation={[0, 0.3, 0]}>
          <RetroTV glow={glow} finish="beige" antenna />
        </group>
        <Cartridges />
        <Mug position={[-3.4, DESK_Y, 1.0]} />
        <Notebook position={[1.7, DESK_Y, 1.35]} />
        <ContactShadows position={[0, DESK_Y + 0.005, 0]} scale={14} blur={2} far={2.5} opacity={0.75} />
      </Suspense>

      <ScrollCamera heroRef={heroRef} />
      <GlowToDom glow={glow} target={heroRef} />
    </Canvas>
  );
}

// ── camera: pointer parallax at rest, flies into the glass with scroll ──
function ScrollCamera({ heroRef }: { heroRef: React.RefObject<HTMLElement | null> }) {
  const screenWorld = useMemo(() => {
    // matches the TV group transform above
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(-0.5, 0, 0.5),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.3, 0)),
      new THREE.Vector3(1, 1, 1),
    );
    const center = TV_SCREEN_CENTER.clone().applyMatrix4(m);
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.3, 0)));
    return { center, normal };
  }, []);
  const look = useRef(new THREE.Vector3());
  const reduce = useRef<boolean | null>(null);

  useFrame((state, dt) => {
    const el = heroRef.current;
    if (reduce.current === null) reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let p = 0;
    if (el) {
      const r = el.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      p = span > 0 ? THREE.MathUtils.clamp(-r.top / span, 0, 1) : 0;
      el.style.setProperty("--copy-a", String(1 - THREE.MathUtils.smoothstep(p, 0.05, 0.3)));
    }
    if (reduce.current) p = 0;
    const e = THREE.MathUtils.smootherstep(p, 0, 1);

    const wide = state.size.width >= 768;
    const rest = new THREE.Vector3(wide ? 3.4 : 0.8, wide ? 1.9 : 2.6, wide ? 11 : 19);
    rest.x += state.pointer.x * 0.5;
    rest.y += state.pointer.y * 0.25;
    // stop where the 4:3 glass just overfills the frame
    const cam = state.camera as THREE.PerspectiveCamera;
    const vfov = THREE.MathUtils.degToRad(cam.fov);
    const fitH = TV_SCREEN_SIZE.height / (2 * Math.tan(vfov / 2));
    const fitW = TV_SCREEN_SIZE.width / (2 * Math.tan(vfov / 2) * cam.aspect);
    const dist = Math.min(fitH, fitW) * 0.92;
    const inside = screenWorld.center.clone().addScaledVector(screenWorld.normal, dist);

    const target = rest.lerp(inside, e);
    cam.position.x = THREE.MathUtils.damp(cam.position.x, target.x, 8, dt);
    cam.position.y = THREE.MathUtils.damp(cam.position.y, target.y, 8, dt);
    cam.position.z = THREE.MathUtils.damp(cam.position.z, target.z, 8, dt);

    const restLook = new THREE.Vector3(wide ? -2.1 : -0.6, wide ? 0.0 : -2.4, 0);
    const want = restLook.lerp(screenWorld.center, e);
    look.current.lerp(want, 1 - Math.exp(-8 * dt));
    cam.lookAt(look.current);
  });
  return null;
}

function Room() {
  const poster = useMemo(
    () =>
      canvasTexture(600, 840, (ctx) => {
        const f = identFont();
        ctx.fillStyle = "#1c1630";
        ctx.fillRect(0, 0, 600, 840);
        // artillery arcs
        ctx.strokeStyle = "#a78bfa";
        ctx.lineWidth = 6;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(60, 620);
          ctx.quadraticCurveTo(300, 120 + i * 70, 540, 620 - i * 40);
          ctx.globalAlpha = 1 - i * 0.2;
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#efe9ff";
        ctx.fontStretch = "expanded";
        ctx.font = `800 120px ${f}`;
        ctx.fillText("29.8N", 52, 760);
        ctx.font = `500 30px ${f}`;
        ctx.fillText("3v3 artillery, IIT Roorkee", 56, 806);
      }),
    [],
  );
  const note = useMemo(
    () =>
      canvasTexture(300, 300, (ctx) => {
        ctx.fillStyle = "#f3e27a";
        ctx.fillRect(0, 0, 300, 300);
        ctx.fillStyle = "#2b2614";
        ctx.font = "600 34px 'Segoe Print', 'Bradley Hand', cursive";
        ctx.fillText("GSoC '22", 34, 110);
        ctx.fillText("GSoC '24", 34, 170);
        ctx.font = "500 26px 'Segoe Print', 'Bradley Hand', cursive";
        ctx.fillText("ship it.", 34, 240);
      }),
    [],
  );

  return (
    <group>
      {/* floor + back wall */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, DESK_Y - 2.6, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#17110c" roughness={0.8} />
      </mesh>
      <mesh position={[0, 2, -4.6]} receiveShadow>
        <planeGeometry args={[40, 16]} />
        <meshStandardMaterial color="#2a221b" roughness={0.95} />
      </mesh>

      {/* night window, back-left, throwing moonlight across the desk */}
      <group position={[-4.6, 2.3, -4.55]}>
        <mesh>
          <planeGeometry args={[3.2, 2.6]} />
          <meshBasicMaterial color="#14224a" toneMapped={false} />
        </mesh>
        {[-0.8, 0, 0.8].map((x) => (
          <mesh key={x} position={[x, 0, 0.02]}>
            <boxGeometry args={[0.07, 2.6, 0.06]} />
            <meshStandardMaterial color="#3a2f25" />
          </mesh>
        ))}
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[3.2, 0.07, 0.06]} />
          <meshStandardMaterial color="#3a2f25" />
        </mesh>
      </group>
      <directionalLight position={[-6, 4, -3]} intensity={0.35} color="#7f9be0" castShadow shadow-mapSize={[1024, 1024]} />

      {/* poster + sticky note */}
      <mesh position={[3.1, 2.5, -4.55]} rotation={[0, 0, -0.02]}>
        <planeGeometry args={[1.5, 2.1]} />
        <meshStandardMaterial map={poster} roughness={0.85} />
      </mesh>
      <mesh position={[1.9, 1.7, -4.54]} rotation={[0, 0, 0.06]}>
        <planeGeometry args={[0.55, 0.55]} />
        <meshStandardMaterial map={note} roughness={0.9} />
      </mesh>

      {/* the desk */}
      <RoundedBox args={[10, 0.14, 4.4]} radius={0.03} position={[0, DESK_Y - 0.07, -0.3]} receiveShadow castShadow>
        <meshPhysicalMaterial color="#5b3a22" roughness={0.5} clearcoat={0.25} clearcoatRoughness={0.4} />
      </RoundedBox>
      {[-4.7, 4.7].map((x) => (
        <mesh key={x} position={[x, DESK_Y - 1.4, -0.3]} castShadow>
          <boxGeometry args={[0.14, 2.6, 4.0]} />
          <meshStandardMaterial color="#4a2f1b" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function Lamp(props: React.ComponentProps<"group">) {
  return (
    <group {...props}>
      <mesh position={[0, 0.04, 0]} castShadow>
        <cylinderGeometry args={[0.38, 0.42, 0.08, 32]} />
        <meshStandardMaterial color="#1d1d1d" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 2.3, 12]} />
        <meshStandardMaterial color="#1d1d1d" metalness={0.6} roughness={0.35} />
      </mesh>
      <group position={[-0.25, 2.35, 0.1]} rotation={[0, 0, 0.5]}>
        <mesh castShadow>
          <coneGeometry args={[0.42, 0.6, 32, 1, true]} />
          <meshStandardMaterial color="#2a4436" side={THREE.DoubleSide} roughness={0.5} />
        </mesh>
        <mesh position={[0, -0.12, 0]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshBasicMaterial color="#ffd9a1" toneMapped={false} />
        </mesh>
      </group>
      <pointLight position={[-0.45, 2.0, 0.15]} color="#ffb067" intensity={9} distance={9} decay={2} castShadow shadow-mapSize={[512, 512]} />
    </group>
  );
}

function Cartridges() {
  const list = CART_SLUGS.map((slug) => projects.findIndex((p) => p.slug === slug)).filter((i) => i >= 0);
  return (
    <group position={[2.5, DESK_Y, 0.9]} rotation={[0, -0.35, 0]}>
      {list.map((pi, i) => (
        <Cartridge key={pi} index={pi} position={[i * 0.12, 0, -i * 0.3]} rotation={[-0.12, 0, 0.02 * i]} />
      ))}
    </group>
  );
}

function Cartridge({ index, ...props }: { index: number } & React.ComponentProps<"group">) {
  const p = projects[index];
  const [hover, setHover] = useState(false);
  const lift = useRef<THREE.Group>(null);
  const label = useMemo(
    () =>
      canvasTexture(320, 360, (ctx) => {
        const f = identFont();
        // title band on top: the cartridges stand in a leaning stack, so
        // only the top of the ones behind is visible
        ctx.fillStyle = "#121212";
        ctx.fillRect(0, 0, 320, 360);
        ctx.fillStyle = "#f4f3ee";
        ctx.fontStretch = "expanded";
        ctx.font = `800 ${p.title.length > 9 ? 30 : 40}px ${f}`;
        ctx.fillText(p.title, 18, 56);
        ctx.fillStyle = p.color ?? "#c8ff3d";
        ctx.fillRect(0, 82, 320, 278);
        ctx.fillStyle = "rgba(0,0,0,0.62)";
        ctx.font = `600 22px ${f}`;
        ctx.fillText(p.year, 18, 336);
      }),
    [p],
  );
  useFrame((_, dt) => {
    if (!lift.current) return;
    lift.current.position.y = THREE.MathUtils.damp(lift.current.position.y, hover ? 0.32 : 0, 12, dt);
  });
  return (
    <group {...props}>
      <group
        ref={lift}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          setHover(true);
        }}
        onPointerOut={() => setHover(false)}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          tv.tune(REEL, { reelStart: index });
        }}
      >
        <RoundedBox args={[0.95, 1.1, 0.2]} radius={0.03} position={[0, 0.55, 0]} castShadow>
          <meshPhysicalMaterial color="#3b3b3d" roughness={0.55} clearcoat={0.2} />
        </RoundedBox>
        {/* label on the face */}
        <mesh position={[0, 0.58, 0.101]}>
          <planeGeometry args={[0.8, 0.9]} />
          <meshStandardMaterial map={label} roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
}

function Mug(props: React.ComponentProps<"group">) {
  return (
    <group {...props}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.22, 0.6, 32, 1, true]} />
        <meshStandardMaterial color="#c9472f" roughness={0.45} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.52, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.22, 32]} />
        <meshStandardMaterial color="#2a160b" roughness={0.2} />
      </mesh>
      <mesh position={[0.27, 0.3, 0]}>
        <torusGeometry args={[0.13, 0.035, 12, 24, Math.PI]} />
        <meshStandardMaterial color="#c9472f" roughness={0.45} />
      </mesh>
    </group>
  );
}

function Notebook(props: React.ComponentProps<"group">) {
  return (
    <group {...props} rotation={[0, 0.25, 0]}>
      <RoundedBox args={[1.5, 0.08, 1.05]} radius={0.02} position={[0, 0.04, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#e9e3d3" roughness={0.9} />
      </RoundedBox>
      <mesh position={[-0.74, 0.085, 0]}>
        <boxGeometry args={[0.04, 0.02, 1.0]} />
        <meshStandardMaterial color="#2b2b2b" />
      </mesh>
    </group>
  );
}
