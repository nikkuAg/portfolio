"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import s from "./three.module.css";

// Concept AJ: tiny world. A small floating island holding the things I
// love, all running at once (the attract mode): a car lapping a mini track,
// DJ platters spinning, a pot steaming on the stove, dice on a board-game
// table, a console with its light breathing, and a laptop in the middle.
// The camera drifts round it. Click a station (or its button) and the
// camera flies over, the station does its thing, and a caption explains it.

type St = { id: string; name: string; line: string; color: string; angle: number };
const STATIONS: St[] = [
  { id: "f1", name: "F1", line: "Ferrari, every race weekend.", color: "#e8222a", angle: 0 },
  { id: "dj", name: "DJing", line: "Newest hobby. Still learning to beatmatch.", color: "#b48cff", angle: 72 },
  { id: "cook", name: "Cooking", line: "How I switch off after a day of code.", color: "#ffad42", angle: 144 },
  { id: "board", name: "Board games", line: "The longer and more scheming, the better.", color: "#8be07a", angle: 216 },
  { id: "games", name: "Gaming", line: "PS5 for playing, Unity and Godot for making.", color: "#4aa8ff", angle: 288 },
];
const CODE: St = { id: "code", name: "Code", line: "Full-stack: interfaces, the services behind them, and the plumbing.", color: "#c8ff3d", angle: 0 };
const ALL = [...STATIONS, CODE];
const R = 2.9;

const world = { sel: -1, poke: {} as Record<string, number>, hover: "" };
const posOf = (st: St): [number, number, number] =>
  st.id === "code" ? [0, 0, 0] : [Math.cos((st.angle * Math.PI) / 180) * R, 0, Math.sin((st.angle * Math.PI) / 180) * R];
const sincePoke = (id: string, now: number) => now - (world.poke[id] ?? -1e9);

function Station({ st, children }: { st: St; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const [x, , z] = posOf(st);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const k = world.hover === st.id || ALL[world.sel]?.id === st.id ? 1.08 : 1;
    g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, k, 8, dt));
  });
  const pick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent("tinyworld-pick", { detail: st.id }));
  };
  return (
    <group
      ref={ref}
      position={[x, 0.3, z]}
      rotation={[0, -((st.angle * Math.PI) / 180) - Math.PI / 2, 0]}
      onClick={pick}
      onPointerOver={(e) => {
        e.stopPropagation();
        world.hover = st.id;
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        world.hover = "";
        document.body.style.cursor = "";
      }}
    >
      {children}
    </group>
  );
}

function F1Track() {
  const car = useRef<THREE.Group>(null);
  const t = useRef(0);
  useFrame((state, dt) => {
    const boost = sincePoke("f1", state.clock.elapsedTime) < 2.2 ? 3.2 : 1;
    t.current += dt * 1.1 * boost;
    const a = t.current;
    const c = car.current;
    if (c) {
      c.position.set(Math.cos(a) * 0.95, 0.08, Math.sin(a) * 0.55);
      c.rotation.y = -Math.atan2(Math.cos(a) * 0.55, -Math.sin(a) * 0.95);
    }
  });
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[1.7, 1, 1]} position={[0, 0.02, 0]} receiveShadow>
        <ringGeometry args={[0.45, 0.66, 48]} />
        <meshStandardMaterial color="#2a2c31" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.95, 0.03, 0]}>
        <planeGeometry args={[0.22, 0.05]} />
        <meshStandardMaterial color="#f3efe6" />
      </mesh>
      <group ref={car}>
        <mesh castShadow>
          <boxGeometry args={[0.28, 0.06, 0.1]} />
          <meshStandardMaterial color="#c40c14" />
        </mesh>
        <mesh position={[0.15, -0.01, 0]}>
          <boxGeometry args={[0.04, 0.02, 0.18]} />
          <meshStandardMaterial color="#c40c14" />
        </mesh>
      </group>
    </group>
  );
}

function DJ() {
  const a = useRef<THREE.Mesh>(null);
  const b = useRef<THREE.Mesh>(null);
  const led = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((state, dt) => {
    const hot = sincePoke("dj", state.clock.elapsedTime) < 1.6;
    const sp = hot ? -9 : 3.5;
    if (a.current) a.current.rotation.y += dt * sp;
    if (b.current) b.current.rotation.y += dt * 3.5;
    if (led.current) led.current.emissiveIntensity = (hot ? 3 : 1) * (0.6 + 0.4 * Math.sin(state.clock.elapsedTime * 8.2));
  });
  return (
    <group>
      <RoundedBox args={[1.5, 0.35, 0.7]} radius={0.05} position={[0, 0.17, 0]} castShadow>
        <meshStandardMaterial color="#1b1b1f" />
      </RoundedBox>
      {[-0.45, 0.45].map((x, i) => (
        <mesh key={x} ref={i ? b : a} position={[x, 0.37, 0]} castShadow>
          <cylinderGeometry args={[0.26, 0.26, 0.04, 32]} />
          <meshStandardMaterial color="#0d0d0f" />
          <mesh position={[0.12, 0.025, 0]}>
            <boxGeometry args={[0.12, 0.01, 0.03]} />
            <meshStandardMaterial color="#b48cff" emissive="#b48cff" emissiveIntensity={0.6} />
          </mesh>
        </mesh>
      ))}
      <mesh position={[0, 0.37, 0]}>
        <boxGeometry args={[0.24, 0.04, 0.5]} />
        <meshStandardMaterial ref={led} color="#2a2a30" emissive="#b48cff" emissiveIntensity={1} />
      </mesh>
    </group>
  );
}

function Cook() {
  const puffs = useRef<THREE.Mesh[]>([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const burst = sincePoke("cook", t) < 2 ? 2.2 : 1;
    puffs.current.forEach((m, i) => {
      if (!m) return;
      const k = ((t * 0.5 * burst + i / 6) % 1 + 1) % 1;
      m.position.set(Math.sin(i * 2 + t) * 0.08, 0.75 + k * 0.9, Math.cos(i * 3) * 0.06);
      m.scale.setScalar(0.05 + k * 0.09 * burst);
      (m.material as THREE.MeshStandardMaterial).opacity = (1 - k) * 0.55;
    });
  });
  return (
    <group>
      <RoundedBox args={[1, 0.5, 0.8]} radius={0.05} position={[0, 0.25, 0]} castShadow>
        <meshStandardMaterial color="#d8d4cc" />
      </RoundedBox>
      <mesh position={[0, 0.52, 0]}>
        <torusGeometry args={[0.22, 0.02, 8, 24]} />
        <meshStandardMaterial color="#3a7bff" emissive="#3a7bff" emissiveIntensity={1.5} />
      </mesh>
      <mesh position={[0, 0.66, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.2, 0.26, 24]} />
        <meshStandardMaterial color="#2b2b30" metalness={0.7} roughness={0.3} />
      </mesh>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} ref={(m) => void (puffs.current[i] = m!)}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshStandardMaterial color="#fff6ea" transparent opacity={0.4} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function Board() {
  const dice = useRef<THREE.Group[]>([]);
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const o = c.getContext("2d")!;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      o.fillStyle = (x + y) % 2 ? "#e9dfc9" : "#2f6b3a";
      o.fillRect(x * 8, y * 8, 8, 8);
    }
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter;
    return t;
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);
  useFrame((state) => {
    const k = sincePoke("board", state.clock.elapsedTime);
    dice.current.forEach((d, i) => {
      if (!d) return;
      const hop = k < 1 ? Math.sin(k * Math.PI) * 0.5 : 0;
      d.position.y = 0.52 + hop;
      if (k < 1) {
        d.rotation.x += 0.35 + i * 0.05;
        d.rotation.z += 0.27;
      }
    });
  });
  return (
    <group>
      <RoundedBox args={[1.3, 0.4, 1.3]} radius={0.05} position={[0, 0.2, 0]} castShadow>
        <meshStandardMaterial color="#5a3d26" />
      </RoundedBox>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.41, 0]}>
        <planeGeometry args={[1.0, 1.0]} />
        <meshStandardMaterial map={tex} />
      </mesh>
      {[-0.2, 0.22].map((x, i) => (
        <group key={x} ref={(g) => void (dice.current[i] = g!)} position={[x, 0.52, 0.1 * i]}>
          <RoundedBox args={[0.18, 0.18, 0.18]} radius={0.03} castShadow>
            <meshStandardMaterial color="#f3efe6" />
          </RoundedBox>
          <mesh position={[0, 0.091, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.025, 12]} />
            <meshStandardMaterial color="#111" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Games() {
  const strip = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const m = strip.current;
    if (!m) return;
    if (sincePoke("games", t) < 2) m.emissive.setHSL((t * 0.8) % 1, 0.9, 0.55);
    else m.emissive.set("#4aa8ff");
    m.emissiveIntensity = 1.2 + Math.sin(t * 1.6) * 0.6;
  });
  return (
    <group>
      {[-0.13, 0.13].map((x) => (
        <RoundedBox key={x} args={[0.1, 1.0, 0.6]} radius={0.04} position={[x, 0.5, 0]} castShadow>
          <meshStandardMaterial color="#ecebe7" />
        </RoundedBox>
      ))}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.15, 0.96, 0.56]} />
        <meshStandardMaterial ref={strip} color="#111" emissive="#4aa8ff" emissiveIntensity={1.2} />
      </mesh>
      <RoundedBox args={[0.42, 0.08, 0.24]} radius={0.04} position={[0.55, 0.06, 0.2]} rotation={[0, 0.4, 0]} castShadow>
        <meshStandardMaterial color="#ecebe7" />
      </RoundedBox>
    </group>
  );
}

function Laptop() {
  const screen = useRef<THREE.MeshStandardMaterial>(null);
  // the screen is a live canvas texture, owned by an effect so the frame
  // loop only ever draws into what the ref holds
  const live = useRef<{ tex: THREE.CanvasTexture; o: CanvasRenderingContext2D } | null>(null);
  useEffect(() => {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 80;
    const tex = new THREE.CanvasTexture(c);
    live.current = { tex, o: c.getContext("2d")! };
    const m = screen.current;
    if (m) {
      m.map = tex;
      m.emissiveMap = tex;
      m.needsUpdate = true;
    }
    return () => tex.dispose();
  }, []);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const fast = sincePoke("code", t) < 2 ? 4 : 1;
    const L = live.current;
    if (!L) return;
    const o = L.o;
    o.fillStyle = "#0b0f08";
    o.fillRect(0, 0, 128, 80);
    for (let i = 0; i < 8; i++) {
      const w = 20 + ((i * 37 + Math.floor(t * 3 * fast)) % 70);
      o.fillStyle = i % 3 ? "#c8ff3d" : "#7fa82a";
      o.fillRect(8 + (i % 3) * 6, 6 + i * 9, w, 4);
    }
    L.tex.needsUpdate = true;
  });
  return (
    <group position={[0, 0.3, 0]}>
      <RoundedBox args={[0.9, 0.05, 0.6]} radius={0.02} position={[0, 0.03, 0.1]} castShadow>
        <meshStandardMaterial color="#9a9ca3" metalness={0.6} roughness={0.35} />
      </RoundedBox>
      <group position={[0, 0.05, -0.2]} rotation={[-0.25, 0, 0]}>
        <RoundedBox args={[0.9, 0.58, 0.03]} radius={0.02} position={[0, 0.29, 0]} castShadow>
          <meshStandardMaterial color="#9a9ca3" metalness={0.6} roughness={0.35} />
        </RoundedBox>
        <mesh position={[0, 0.29, 0.017]}>
          <planeGeometry args={[0.82, 0.5]} />
          <meshStandardMaterial ref={screen} color="#ffffff" emissive="#ffffff" emissiveIntensity={1.1} />
        </mesh>
      </group>
    </group>
  );
}

function Rig() {
  const look = useRef(new THREE.Vector3());
  const orbit = useRef(0);
  useFrame((state, dt) => {
    const cam = state.camera;
    const wide = state.size.width >= 768;
    let to: THREE.Vector3;
    let at: THREE.Vector3;
    if (world.sel < 0) {
      orbit.current += dt * 0.07;
      const r = wide ? 13.5 : 19;
      to = new THREE.Vector3(Math.cos(orbit.current) * r, wide ? 7.2 : 11, Math.sin(orbit.current) * r);
      at = new THREE.Vector3(0, 0.3, 0);
    } else {
      const [x, , z] = posOf(ALL[world.sel]);
      const out = new THREE.Vector3(x, 0, z).normalize();
      if (ALL[world.sel].id === "code") out.set(Math.cos(orbit.current), 0, Math.sin(orbit.current));
      to = new THREE.Vector3(x + out.x * 5.8, 3.8, z + out.z * 5.8);
      at = new THREE.Vector3(x, 0.7, z);
    }
    cam.position.lerp(to, 1 - Math.exp(-dt * 2.2));
    look.current.lerp(at, 1 - Math.exp(-dt * 3));
    cam.lookAt(look.current);
  });
  return null;
}

function Island() {
  return (
    <group>
      <mesh position={[0, 0, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[4.8, 4.6, 0.6, 64]} />
        <meshStandardMaterial color="#1d2a22" roughness={0.95} />
      </mesh>
      <mesh position={[0, -1.6, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[4.6, 2.6, 9]} />
        <meshStandardMaterial color="#2a241f" roughness={1} flatShading />
      </mesh>
      <Station st={STATIONS[0]}>
        <F1Track />
      </Station>
      <Station st={STATIONS[1]}>
        <DJ />
      </Station>
      <Station st={STATIONS[2]}>
        <Cook />
      </Station>
      <Station st={STATIONS[3]}>
        <Board />
      </Station>
      <Station st={STATIONS[4]}>
        <Games />
      </Station>
      <Station st={CODE}>
        <Laptop />
      </Station>
    </group>
  );
}

export function TinyWorld() {
  const [sel, setSel] = useState(-1);
  const [mobile, setMobile] = useState(false);
  const clock = useRef(0);

  useEffect(() => {
    const m = () => setMobile(window.innerWidth < 768);
    m();
    const onPick = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      const i = ALL.findIndex((x) => x.id === id);
      world.sel = i;
      world.poke[id] = clock.current;
      setSel(i);
    };
    window.addEventListener("resize", m);
    window.addEventListener("tinyworld-pick", onPick);
    return () => {
      window.removeEventListener("resize", m);
      window.removeEventListener("tinyworld-pick", onPick);
      world.sel = -1;
      document.body.style.cursor = "";
    };
  }, []);

  const cur = sel >= 0 ? ALL[sel] : null;

  return (
    <>
      <div className={s.canvasWrap} data-side={!mobile || undefined}>
        <Canvas shadows dpr={[1, 1.75]} camera={{ position: [10, 6.4, 4], fov: 36 }} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}>
          <color attach="background" args={["#0b0d12"]} />
          <fog attach="fog" args={["#0b0d12", 16, 32]} />
          <hemisphereLight args={["#b9c7ff", "#1a1410", 0.6]} />
          <directionalLight position={[6, 10, 4]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-7} shadow-camera-right={7} shadow-camera-top={7} shadow-camera-bottom={-7} color="#fff1dd" />
          <pointLight position={[-5, 3, -4]} intensity={30} color="#7a8cff" />
          <Suspense fallback={null}>
            <Island />
            <ContactShadows position={[0, 0.31, 0]} opacity={0.4} scale={10} blur={2} far={2} />
          </Suspense>
          <Rig />
          <ClockTap clockRef={clock} />
        </Canvas>
      </div>
      <div className={s.worldHud} style={{ ["--wc" as string]: cur?.color ?? "#ece8dc" }}>
        <p className={s.worldTag}>{cur ? cur.name : "Tiny world"}</p>
        <p className={s.worldLine} aria-live="polite">
          {cur ? cur.line : "Everything I love, on one small island. Click anything on it."}
        </p>
        <div className={s.worldBtns} role="group" aria-label="Fly to">
          {ALL.map((st, i) => (
            <button
              key={st.id}
              type="button"
              aria-pressed={sel === i}
              style={{ ["--wc" as string]: st.color }}
              onClick={() => window.dispatchEvent(new CustomEvent("tinyworld-pick", { detail: st.id }))}
            >
              {st.name}
            </button>
          ))}
          {sel >= 0 && (
            <button
              type="button"
              onClick={() => {
                world.sel = -1;
                setSel(-1);
              }}
            >
              Whole island
            </button>
          )}
        </div>
      </div>
    </>
  );
}

/** Copies the scene clock out so DOM events can stamp "poked at" times. */
function ClockTap({ clockRef }: { clockRef: React.RefObject<number> }) {
  useFrame((state) => {
    clockRef.current = state.clock.elapsedTime;
  });
  return null;
}
