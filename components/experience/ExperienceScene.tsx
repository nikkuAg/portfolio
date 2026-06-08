"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { experience, type ExperienceItem } from "@/content/experience";
import { TYPE_TINT } from "./experience-tints";

// newest first (resume convention) — gate 01 is the current role, and the
// flight travels backwards through time toward the earliest internship
const ROLES: ExperienceItem[] = experience;
const N = ROLES.length;

// world units between gate planes on the z axis
export const GATE_SPACING = 14;
// camera rests this far BEFORE the gate it's "viewing" — the ring fills
// ~2/3 of the frame height at this distance with the fovs below
const STANDOFF = 5;
const TRAVEL = (N - 1) * GATE_SPACING;
// gates sit below the eyeline so their overhead labels clear the fixed
// site nav at the top of the viewport
const GATE_Y = -0.55;
// the gate is a card-shaped doorway — same rounded-rect proportions and
// corner radius language as the project cards / HUD card
const GATE_W = 3.4;
const GATE_H = 4.3;
const GATE_R = 0.55;
const BG = "#070707";
const CHALK = "#f5f5f5";
// the section is black + accent like the rest of the site — per-role color
// appears only in small elements inside each gate (orbiting ticks, membrane)
const ACCENT = "#c8ff3d";

// same glyph-per-type encoding the old chalkboard flags used
const TYPE_GLYPH: Record<ExperienceItem["type"], string> = {
  fulltime: "◆",
  internship: "▸",
  gsoc: "✦",
  leadership: "▲",
};

type ExperienceSceneProps = {
  /** eased section progress 0..1 — written by the section's scroll handler,
      read here every frame. Never React state (no re-renders on scroll). */
  progressRef: React.RefObject<number>;
  compact: boolean;
  /** false while the section is off-screen — freezes the frameloop */
  active: boolean;
};

export function ExperienceScene({
  progressRef,
  compact,
  active,
}: ExperienceSceneProps) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={compact ? 1 : [1, 1.8]}
      camera={{
        position: [0, 0, STANDOFF],
        fov: compact ? 75 : 70,
        near: 0.1,
        far: 60,
      }}
      gl={{
        antialias: !compact,
        alpha: true,
        powerPreference: "high-performance",
      }}
      style={{ background: "transparent" }}
    >
      <color attach="background" args={[BG]} />
      {/* fog makes the next gate fade in faint from the distance — like the
          un-drawn dashed part of the old chalk path */}
      <fog attach="fog" args={[BG, GATE_SPACING * 0.7, GATE_SPACING * 2.6]} />

      {ROLES.map((role, i) => (
        <Gate
          key={`${role.company}-${role.start}`}
          role={role}
          index={i}
          compact={compact}
          progressRef={progressRef}
        />
      ))}

      <Floor compact={compact} />
      <ChalkDust compact={compact} progressRef={progressRef} />
      <Rig progressRef={progressRef} />

      {/* gentle phosphor halo on the chalk strokes — desktop only. Compact
          compensates with slightly stronger stroke/membrane opacities. */}
      {!compact && (
        <EffectComposer>
          <Bloom
            mipmapBlur
            intensity={0.55}
            luminanceThreshold={0.18}
            luminanceSmoothing={0.35}
          />
        </EffectComposer>
      )}
    </Canvas>
  );
}

// ── camera dolly + dimension crossing ────────────────────────────────────
// All scroll-reactive work lives here, in the frame loop, driven by
// progressRef — React never re-renders during the flight.
// no fullscreen flash/wash here — the void stays pure black. Crossing
// feedback is local: each gate glows as the camera passes through it
// (see the proximity boost in Gate).
function Rig({ progressRef }: { progressRef: React.RefObject<number> }) {
  useFrame((state) => {
    const p = progressRef.current ?? 0;
    const cam = state.camera;

    // dolly: p=0 rests STANDOFF before gate 0, p=1 STANDOFF before the last.
    // Gentle sine sway on x/y so it reads as flight, not an elevator.
    const z = STANDOFF - p * TRAVEL;
    const swayX = Math.sin(p * Math.PI * 2.2) * 0.5;
    const swayY = Math.sin(p * Math.PI * 1.3) * 0.25;
    cam.position.set(swayX, swayY, z);
    cam.lookAt(swayX * 0.35, swayY * 0.35 + GATE_Y * 0.4, z - GATE_SPACING);
  });

  return null;
}

// ── chalk-line helpers ───────────────────────────────────────────────────
// the doorway outline — a rounded-rect path (the site's card shape)
function roundedRectPath(w: number, h: number, r: number) {
  const x = w / 2;
  const y = h / 2;
  const path = new THREE.Path();
  path.moveTo(-x + r, -y);
  path.lineTo(x - r, -y);
  path.absarc(x - r, -y + r, r, -Math.PI / 2, 0, false);
  path.lineTo(x, y - r);
  path.absarc(x - r, y - r, r, 0, Math.PI / 2, false);
  path.lineTo(-x + r, y);
  path.absarc(-x + r, y - r, r, Math.PI / 2, Math.PI, false);
  path.lineTo(-x, -y + r);
  path.absarc(-x + r, -y + r, r, Math.PI, Math.PI * 1.5, false);
  path.closePath();
  return path;
}

// 1px hairline dashed stroke along a path — same vocabulary as the old
// chalkboard's dashed SVG template path and the site's thin-divider lines.
function useChalkOutline(
  w: number,
  h: number,
  r: number,
  color: string,
  opacity: number,
  dashSize: number,
  gapSize: number,
) {
  const line = useMemo(() => {
    const pts2 = roundedRectPath(w, h, r).getPoints(24);
    const pts = pts2.map((p) => new THREE.Vector3(p.x, p.y, 0));
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineDashedMaterial({
      color,
      transparent: true,
      opacity,
      dashSize,
      gapSize,
      toneMapped: false,
      depthWrite: false,
    });
    const l = new THREE.Line(geo, mat);
    l.computeLineDistances();
    return l;
  }, [w, h, r, color, opacity, dashSize, gapSize]);

  useEffect(
    () => () => {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    },
    [line],
  );

  return line;
}

// the site's viewfinder corner-bracket motif, drawn around the gate
function useCornerBrackets(
  halfX: number,
  halfY: number,
  len: number,
  color: string,
) {
  const lines = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        const cx = sx * halfX;
        const cy = sy * halfY;
        // horizontal stroke
        pts.push(
          new THREE.Vector3(cx, cy, 0),
          new THREE.Vector3(cx - sx * len, cy, 0),
        );
        // vertical stroke
        pts.push(
          new THREE.Vector3(cx, cy, 0),
          new THREE.Vector3(cx, cy - sy * len, 0),
        );
      }
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.4,
      toneMapped: false,
      depthWrite: false,
    });
    return new THREE.LineSegments(geo, mat);
  }, [halfX, halfY, len, color]);

  useEffect(
    () => () => {
      lines.geometry.dispose();
      (lines.material as THREE.Material).dispose();
    },
    [lines],
  );

  return lines;
}

// ── one portal gate per role ─────────────────────────────────────────────
function Gate({
  role,
  index,
  compact,
  progressRef,
}: {
  role: ExperienceItem;
  index: number;
  compact: boolean;
  progressRef: React.RefObject<number>;
}) {
  const ticksRef = useRef<THREE.Group>(null);
  const frameRef = useRef<THREE.Line>(null);
  const membraneRef = useRef<THREE.Mesh>(null);
  // per-company brand color wins; otherwise the type-based tint. Drives the
  // membrane gradient, ticks, crossing glow, and logo — the frame/brackets
  // stay accent lime so the structure reads as one system.
  const tint = role.color ?? TYPE_TINT[role.type];
  const dir = index % 2 === 0 ? 1 : -1;

  // faint white template outline + accent dashed chalk outline — the same
  // two-layer treatment as the old path (dim template / bright chalk).
  // Gates are uniformly black + accent; the role's own color shows up only
  // in the traveling ticks and the card-face membrane.
  const templateFrame = useChalkOutline(
    GATE_W + 0.34,
    GATE_H + 0.34,
    GATE_R + 0.1,
    CHALK,
    0.13,
    0.06,
    0.5,
  );
  const chalkFrame = useChalkOutline(
    GATE_W,
    GATE_H,
    GATE_R,
    ACCENT,
    compact ? 1 : 0.9,
    0.3,
    0.15,
  );
  const brackets = useCornerBrackets(
    GATE_W / 2 + 0.4,
    GATE_H / 2 + 0.4,
    0.45,
    ACCENT,
  );

  // tick path — ticks travel along the doorway outline instead of orbiting
  const tickPath = useMemo(() => roundedRectPath(GATE_W, GATE_H, GATE_R), []);

  useFrame((state) => {
    // traveling chalk marks — slide along the frame, alternating direction
    const ticks = ticksRef.current;
    if (ticks) {
      const t0 = state.clock.elapsedTime * 0.022 * dir + index * 0.137;
      ticks.children.forEach((child, k) => {
        const u = ((t0 + k / ticks.children.length) % 1 + 1) % 1;
        const pt = tickPath.getPointAt(u);
        const tan = tickPath.getTangentAt(u);
        child.position.set(pt.x, pt.y, 0);
        child.rotation.z = Math.atan2(tan.y, tan.x);
      });
    }

    // the viewed gate breathes brighter — "you are here", like the old
    // active flag beacon
    const p = progressRef.current ?? 0;
    const vIdx = p * (N - 1);
    const focus = THREE.MathUtils.clamp(1 - Math.abs(vIdx - index), 0, 1);

    // local crossing glow — THIS gate lights up as the camera flies through
    // its plane (replaces the old fullscreen flash, keeps the void black)
    const gateZ = -index * GATE_SPACING;
    const cross = THREE.MathUtils.clamp(
      1 - Math.abs(state.camera.position.z - gateZ) / 2.4,
      0,
      1,
    );

    const frame = frameRef.current;
    if (frame) {
      const mat = frame.material as THREE.LineDashedMaterial;
      mat.opacity = Math.min(
        1,
        (compact ? 0.7 : 0.55) + focus * 0.45 + cross * 0.4,
      );
    }
    const membrane = membraneRef.current;
    if (membrane) {
      const mat = membrane.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.min(1, (compact ? 0.6 : 0.5) + cross * 0.5);
    }
  });

  return (
    <group position={[0, GATE_Y, -index * GATE_SPACING]}>
      <primitive object={templateFrame} />
      <primitive object={chalkFrame} ref={frameRef} />
      <primitive object={brackets} />

      {/* traveling chalk marks in the role's tint */}
      <group ref={ticksRef}>
        {Array.from({ length: 4 }, (_, k) => (
          <mesh key={k}>
            <planeGeometry args={[0.3, 0.045]} />
            <meshBasicMaterial
              color={tint}
              transparent
              opacity={0.9}
              toneMapped={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
      </group>

      {/* membrane — the project-card face: top-left tint bloom fading out,
          normal blending so it never dominates the page */}
      <Membrane tint={tint} compact={compact} membraneRef={membraneRef} />

      {/* portal mark — the company logo (white silhouette) if we have one,
          otherwise the company name set as a wordmark so no gate is blank */}
      {role.logo ? (
        <GateLogo src={role.logo} />
      ) : (
        <GateWordmark text={role.company} />
      )}

      <GateLabel role={role} index={index} tint={tint} />
    </group>
  );
}

// ── portal membrane — rim-gradient lens texture ──────────────────────────
function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// one texture per tint, shared by every gate of that type
const membraneTextureCache = new Map<string, THREE.CanvasTexture>();

function useMembraneTexture(tint: string) {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    const build = () => {
      const cached = membraneTextureCache.get(tint);
      if (cached) {
        setTexture(cached);
        return;
      }
      // canvas aspect matches the card doorway
      const W = 256;
      const H = Math.round((W * GATE_H) / GATE_W);
      const R = Math.round((W * GATE_R) / GATE_W);
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      // clip to the rounded-rect doorway, inset a hair so the fill tucks
      // under the chalk outline (square-corner fallback for old engines)
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(2, 2, W - 4, H - 4, R);
      } else {
        ctx.rect(2, 2, W - 4, H - 4);
      }
      ctx.clip();
      // the project-card face, translated: top-left tint bloom + faint
      // bottom-right answer, fading to nothing in the middle
      const g1 = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 1.2);
      g1.addColorStop(0, hexToRgba(tint, 0.22));
      g1.addColorStop(0.55, hexToRgba(tint, 0.04));
      g1.addColorStop(1, hexToRgba(tint, 0));
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, W, H);
      const g2 = ctx.createRadialGradient(W, H, 0, W, H, W * 0.9);
      g2.addColorStop(0, hexToRgba(tint, 0.09));
      g2.addColorStop(1, hexToRgba(tint, 0));
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, W, H);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      membraneTextureCache.set(tint, tex);
      setTexture(tex);
    };
    build();
  }, [tint]);

  return texture;
}

function Membrane({
  tint,
  compact,
  membraneRef,
}: {
  tint: string;
  compact: boolean;
  membraneRef: React.RefObject<THREE.Mesh | null>;
}) {
  const texture = useMembraneTexture(tint);
  if (!texture) return null;

  return (
    <mesh ref={membraneRef}>
      <planeGeometry args={[GATE_W, GATE_H]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={compact ? 0.6 : 0.5}
        toneMapped={false}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ── company logo — monochrome PNG on the portal face ─────────────────────
// Loads via TextureLoader (not Suspense) so a missing file fails silently
// to "no mark" instead of crashing the scene. Tinted to the brand color;
// the source should be a transparent-bg white/single-color silhouette.
function GateLogo({ src }: { src: string }) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let disposed = false;
    new THREE.TextureLoader().load(
      src,
      (t) => {
        if (disposed) {
          t.dispose();
          return;
        }
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        setTex(t);
      },
      undefined,
      () => {
        /* logo missing — leave the portal mark-less */
      },
    );
    return () => {
      disposed = true;
    };
  }, [src]);

  // fit the logo within a small box centered on the portal face,
  // preserving aspect ratio (kept well inside the GATE_W x GATE_H frame)
  const dims = useMemo(() => {
    if (!tex?.image) return null;
    const img = tex.image as { width: number; height: number };
    const aspect = img.width / img.height || 1;
    const MAX = 1.25;
    let w = MAX;
    let h = MAX / aspect;
    if (h > MAX) {
      h = MAX;
      w = MAX * aspect;
    }
    return { w, h };
  }, [tex]);

  if (!tex || !dims) return null;

  return (
    <mesh position={[0, 0, 0.04]}>
      <planeGeometry args={[dims.w, dims.h]} />
      <meshBasicMaterial
        map={tex}
        color={CHALK}
        transparent
        opacity={0.92}
        toneMapped={false}
        depthWrite={false}
      />
    </mesh>
  );
}

// ── wordmark fallback — company name in the display font ──────────────────
// when a company has no logo, set its name (Chakra Petch, white, uppercase)
// as a wordmark on the portal — consistent with the wordmark-style logos
// (Aspora, BNY, Sugar) so no gate is blank or reduced to bare initials
function GateWordmark({ text }: { text: string }) {
  const [tex, setTex] = useState<THREE.CanvasTexture | null>(null);
  const [aspect, setAspect] = useState(3);
  const label = text.replace(/,.*$/, "").toUpperCase(); // drop ", IIT Roorkee" etc.

  useEffect(() => {
    let disposed = false;
    let made: THREE.CanvasTexture | null = null;
    const draw = () => {
      const disp =
        getComputedStyle(document.body)
          .getPropertyValue("--font-display")
          .trim() || "sans-serif";
      const S = 180;
      const measure = document.createElement("canvas").getContext("2d");
      if (!measure) return;
      measure.font = `700 ${S}px ${disp}`;
      const tw = Math.ceil(measure.measureText(label).width);
      const padX = 40;
      const c = document.createElement("canvas");
      c.width = tw + padX * 2;
      c.height = Math.round(S * 1.5);
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.font = `700 ${S}px ${disp}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#f5f5f5";
      ctx.fillText(label, c.width / 2, c.height / 2);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      made = t;
      if (!disposed) {
        setAspect(c.width / c.height);
        setTex(t);
      }
    };
    draw();
    document.fonts?.ready.then(() => {
      if (!disposed) draw();
    });
    return () => {
      disposed = true;
      made?.dispose();
    };
  }, [label]);

  if (!tex) return null;

  // fit within a 2.4-wide / 0.8-tall box, preserving aspect
  const MAXW = 2.4;
  const MAXH = 0.8;
  let w = MAXW;
  let h = MAXW / aspect;
  if (h > MAXH) {
    h = MAXH;
    w = MAXH * aspect;
  }

  return (
    <mesh position={[0, 0, 0.04]}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial
        map={tex}
        color={CHALK}
        transparent
        opacity={0.92}
        toneMapped={false}
        depthWrite={false}
      />
    </mesh>
  );
}

// ── gate label — real Geist Mono via canvas texture ──────────────────────
// troika/drei <Text> can't load next/font's woff2, and a mismatched font
// would break the site's strict mono/serif system — so labels render with
// the page's actual loaded font on a 2D canvas (same trick as the hero
// CRT screen) and land in the scene as a texture.
function GateLabel({
  role,
  index,
  tint,
}: {
  role: ExperienceItem;
  index: number;
  tint: string;
}) {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);

  const year = role.start.split(" ").pop();
  const company = role.company.replace(", IIT Roorkee", "").toUpperCase();
  const glyph = TYPE_GLYPH[role.type];

  useEffect(() => {
    let disposed = false;

    const draw = () => {
      if (disposed) return;
      const c = document.createElement("canvas");
      c.width = 1024;
      c.height = 224;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // next/font registers Geist Mono under a hashed family name — resolve
      // it from the CSS variable so the canvas uses the real webfont
      const mono =
        getComputedStyle(document.body)
          .getPropertyValue("--font-geist-mono")
          .trim() || "ui-monospace, monospace";
      try {
        ctx.letterSpacing = "10px";
      } catch {
        /* older engines — tracking is cosmetic */
      }
      // meta line — index · glyph · year (the old flag label, line for line);
      // the glyph carries the role's tint, everything else stays chalk
      ctx.font = `500 38px ${mono}`;
      const idxStr = String(index + 1).padStart(2, "0");
      const meta = `${idxStr}  ${glyph}  ${year}`;
      const metaW = ctx.measureText(meta).width;
      const glyphOffset = ctx.measureText(`${idxStr}  `).width;
      const glyphW = ctx.measureText(glyph).width;
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(245,245,245,0.55)";
      ctx.fillText(idxStr, 512 - metaW / 2, 58);
      ctx.fillStyle = tint;
      ctx.fillText(glyph, 512 - metaW / 2 + glyphOffset, 58);
      ctx.fillStyle = "rgba(245,245,245,0.55)";
      ctx.fillText(
        `  ${year}`,
        512 - metaW / 2 + glyphOffset + glyphW,
        58,
      );
      ctx.textAlign = "center";
      // company line — chalk white, like the old flag labels. Long names
      // ("Information Management Group") get the font scaled down to fit
      // the canvas instead of cropping at its edges.
      // iterative because the fixed letter-spacing doesn't scale with the
      // font, so one proportional pass can land slightly wide
      const MAX_W = 940;
      let size = 58;
      ctx.font = `700 ${size}px ${mono}`;
      for (let pass = 0; pass < 3; pass++) {
        const w = ctx.measureText(company).width;
        if (w <= MAX_W) break;
        size = Math.floor((size * MAX_W) / w);
        ctx.font = `700 ${size}px ${mono}`;
      }
      ctx.fillStyle = "rgba(245,245,245,0.92)";
      ctx.fillText(company, 512, 150);

      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      textureRef.current?.dispose();
      textureRef.current = tex;
      setTexture(tex);
    };

    draw();
    // redraw once the real webfont is in (first pass may hit the fallback)
    document.fonts?.ready.then(() => draw());

    return () => {
      disposed = true;
      textureRef.current?.dispose();
      textureRef.current = null;
    };
  }, [company, glyph, index, tint, year]);

  if (!texture) return null;

  return (
    <mesh position={[0, 2.78, 0]}>
      {/* plane aspect matches the 1024×224 canvas */}
      <planeGeometry args={[4.4, 0.96]} />
      <meshBasicMaterial
        map={texture}
        transparent
        toneMapped={false}
        depthWrite={false}
      />
    </mesh>
  );
}

// ── the blackboard floor — dot grid + dashed guide line ──────────────────
// the same dot-grain the site uses on cards and the old chalk stage, lying
// flat under the flight path; the dashed center line is the chalk path
// you're now walking in first person
const FLOOR_Y = -2.9;

function Floor({ compact }: { compact: boolean }) {
  const dots = useMemo(() => {
    const step = compact ? 1.7 : 1.05;
    const halfW = compact ? 7 : 10;
    const z0 = STANDOFF + 9;
    const z1 = STANDOFF - TRAVEL - 16;
    const pts: number[] = [];
    for (let x = -halfW; x <= halfW; x += step) {
      for (let z = z1; z <= z0; z += step) {
        pts.push(x, FLOOR_Y, z);
      }
    }
    return new Float32Array(pts);
  }, [compact]);

  const guide = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, FLOOR_Y + 0.01, STANDOFF + 9),
      new THREE.Vector3(0, FLOOR_Y + 0.01, STANDOFF - TRAVEL - 16),
    ]);
    const mat = new THREE.LineDashedMaterial({
      color: CHALK,
      transparent: true,
      opacity: 0.22,
      dashSize: 0.22,
      gapSize: 0.55,
      toneMapped: false,
      depthWrite: false,
    });
    const l = new THREE.Line(geo, mat);
    l.computeLineDistances();
    return l;
  }, []);

  useEffect(
    () => () => {
      guide.geometry.dispose();
      (guide.material as THREE.Material).dispose();
    },
    [guide],
  );

  return (
    <>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[dots, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.035}
          color={CHALK}
          transparent
          opacity={0.16}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
      <primitive object={guide} />
    </>
  );
}

// ── sparse drifting chalk dust in the void ───────────────────────────────
// deterministic PRNG — stable positions across renders (render-pure,
// unlike Math.random)
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// At rest: sparse drifting motes. While scrolling: each mote stretches into
// a streak along the travel axis, scaled by scroll velocity — the
// "lightspeed" effect. Implemented as a second LineSegments layer sharing
// the same particle positions; its tail vertices get pushed along z every
// frame and its opacity ramps with speed (invisible when parked).
// brand color per gate (for the lightspeed streak tint), and a white to
// blend toward so dark brand colors still read on the black void
const STREAK_WHITE = new THREE.Color("#f5f5f5");
const GATE_TINTS = ROLES.map(
  (r) => new THREE.Color(r.color ?? TYPE_TINT[r.type]),
);

function ChalkDust({
  compact,
  progressRef,
}: {
  compact: boolean;
  progressRef: React.RefObject<number>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const streaksRef = useRef<THREE.LineSegments>(null);
  const prevP = useRef<number | null>(null);
  const vel = useRef(0); // damped camera velocity, world units/s
  const streakCol = useRef(new THREE.Color("#f5f5f5"));
  const tmpCol = useRef(new THREE.Color());

  const count = compact ? 260 : 800;

  const positions = useMemo(() => {
    const rand = mulberry32(1337);
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (rand() - 0.5) * 30;
      arr[i * 3 + 1] = (rand() - 0.5) * 18;
      arr[i * 3 + 2] = STANDOFF + 10 - rand() * (TRAVEL + 30);
    }
    return arr;
  }, [count]);

  // head+tail pair per particle, both starting at the particle position
  const streakPositions = useMemo(() => {
    const arr = new Float32Array(count * 6);
    for (let i = 0; i < count; i++) {
      arr[i * 6] = positions[i * 3];
      arr[i * 6 + 1] = positions[i * 3 + 1];
      arr[i * 6 + 2] = positions[i * 3 + 2];
      arr[i * 6 + 3] = positions[i * 3];
      arr[i * 6 + 4] = positions[i * 3 + 1];
      arr[i * 6 + 5] = positions[i * 3 + 2];
    }
    return arr;
  }, [positions, count]);

  useFrame((_, dt) => {
    const p = progressRef.current ?? 0;
    if (prevP.current === null) prevP.current = p;
    // camera z velocity (signed): camZ = STANDOFF - p * TRAVEL
    const inst = dt > 0 ? (-(p - prevP.current) * TRAVEL) / dt : 0;
    prevP.current = p;
    vel.current = THREE.MathUtils.damp(vel.current, inst, 6, dt);
    const speed = Math.abs(vel.current);

    // streak length opposes motion — flying forward (camZ decreasing)
    // stretches tails toward +z, i.e. past the camera
    const stretch = THREE.MathUtils.clamp(-vel.current * 0.09, -6, 6);

    const streaks = streaksRef.current;
    if (streaks) {
      const attr = streaks.geometry.getAttribute(
        "position",
      ) as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      for (let i = 0; i < count; i++) {
        arr[i * 6 + 5] = positions[i * 3 + 2] + stretch;
      }
      attr.needsUpdate = true;
      const mat = streaks.material as THREE.LineBasicMaterial;
      mat.opacity = THREE.MathUtils.clamp((speed - 2) * 0.045, 0, 0.6);
      // tint streaks toward the gate you're flying into (blended toward
      // white so dark brand colors stay visible); damped for smoothness
      const idx = Math.round(THREE.MathUtils.clamp(p, 0, 1) * (N - 1));
      tmpCol.current.copy(GATE_TINTS[idx]).lerp(STREAK_WHITE, 0.4);
      streakCol.current.lerp(tmpCol.current, 1 - Math.exp(-5 * dt));
      mat.color.copy(streakCol.current);
    }

    // motes hand over to streaks as speed rises
    const pts = pointsRef.current;
    if (pts) {
      (pts.material as THREE.PointsMaterial).opacity =
        THREE.MathUtils.clamp(0.3 - speed * 0.008, 0.08, 0.3);
    }

    if (groupRef.current) groupRef.current.rotation.z += dt * 0.01;
  });

  return (
    <group ref={groupRef}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.045}
          color={CHALK}
          transparent
          opacity={0.3}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
      <lineSegments ref={streaksRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[streakPositions, 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color={CHALK}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}
