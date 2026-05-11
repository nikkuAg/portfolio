"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Group = "frontend" | "game" | "infra" | "tool";

type NodeDef = {
  id: string;
  label: string;
  group: Group;
  primary?: boolean;
};

type Node = NodeDef & {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  // per-node noise drift — unique phase + frequency per axis so each chip
  // wanders independently and the constellation never visually settles
  npx: number;
  npy: number;
  nfx: number;
  nfy: number;
};

type Link = [string, string];

const W = 480;
const H = 460;
const CENTER = { x: W / 2, y: H / 2 };

const NODES_DEF: NodeDef[] = [
  // ─── frontend cluster ───
  { id: "ts", label: "TypeScript", group: "frontend", primary: true },
  { id: "react", label: "React", group: "frontend", primary: true },
  { id: "next", label: "Next.js", group: "frontend", primary: true },
  { id: "vue", label: "Vue.js", group: "frontend" },
  { id: "tailwind", label: "Tailwind", group: "frontend" },
  { id: "gsap", label: "GSAP", group: "frontend" },

  // ─── game / 3D cluster ───
  { id: "three", label: "Three.js", group: "game", primary: true },
  { id: "r3f", label: "R3F", group: "game", primary: true },
  { id: "webgl", label: "WebGL", group: "game" },
  { id: "glsl", label: "GLSL", group: "game" },
  { id: "unity", label: "Unity", group: "game" },
  { id: "csharp", label: "C#", group: "game" },

  // ─── backend / infra cluster ───
  { id: "python", label: "Python", group: "infra", primary: true },
  { id: "node", label: "Node.js", group: "infra", primary: true },
  { id: "go", label: "Go", group: "infra" },
  { id: "java", label: "Java", group: "infra" },
  { id: "rust", label: "Rust", group: "infra" },
  { id: "django", label: "Django", group: "infra" },
  { id: "postgres", label: "Postgres", group: "infra" },
  { id: "redis", label: "Redis", group: "infra" },
  { id: "airflow", label: "Airflow", group: "infra" },
  { id: "docker", label: "Docker", group: "infra" },
  { id: "aws", label: "AWS", group: "infra" },

  // ─── tool cluster ───
  { id: "figma", label: "Figma", group: "tool" },
];

const LINKS: Link[] = [
  // frontend internal
  ["ts", "react"],
  ["ts", "next"],
  ["react", "next"],
  ["react", "vue"],
  ["react", "tailwind"],
  ["react", "gsap"],
  ["next", "tailwind"],
  // game internal
  ["three", "r3f"],
  ["three", "webgl"],
  ["webgl", "glsl"],
  ["three", "glsl"],
  ["unity", "csharp"],
  ["unity", "glsl"],
  // infra internal — language → ORM/storage
  ["python", "django"],
  ["django", "postgres"],
  ["node", "postgres"],
  ["java", "postgres"],
  ["go", "postgres"],
  ["rust", "postgres"],
  ["redis", "node"],
  ["redis", "django"],
  // infra — data pipeline + cloud
  ["python", "airflow"],
  ["airflow", "postgres"],
  ["airflow", "aws"],
  ["docker", "node"],
  ["docker", "python"],
  ["aws", "docker"],
  // bridges (frontend ↔ game)
  ["r3f", "react"],
  ["r3f", "ts"],
  // bridges (frontend ↔ infra)
  ["next", "node"],
  ["ts", "node"],
  // tool bridges
  ["figma", "tailwind"],
];

const ANCHORS: Record<Group, { x: number; y: number }> = {
  frontend: { x: W * 0.25, y: H * 0.28 },
  game: { x: W * 0.75, y: H * 0.28 },
  infra: { x: W * 0.5, y: H * 0.78 },
  tool: { x: W * 0.18, y: H * 0.55 },
};

function chipWidth(label: string) {
  // approximate width of the chip pill
  return label.length * 6.4 + 20;
}

function buildInitial(): { nodes: Node[]; index: Map<string, number> } {
  const groupCounts: Record<Group, number> = {
    frontend: 0,
    game: 0,
    infra: 0,
    tool: 0,
  };
  const groupTotals: Record<Group, number> = NODES_DEF.reduce(
    (acc, n) => {
      acc[n.group]++;
      return acc;
    },
    { frontend: 0, game: 0, infra: 0, tool: 0 } as Record<Group, number>,
  );

  const nodes: Node[] = NODES_DEF.map((n) => {
    const a = ANCHORS[n.group];
    const idx = groupCounts[n.group]++;
    const total = groupTotals[n.group];
    const angle = (idx / total) * Math.PI * 2;
    const r = 55;
    return {
      ...n,
      x: a.x + Math.cos(angle) * r,
      y: a.y + Math.sin(angle) * r,
      vx: 0,
      vy: 0,
      width: chipWidth(n.label),
      npx: Math.random() * Math.PI * 2,
      npy: Math.random() * Math.PI * 2,
      nfx: 0.25 + Math.random() * 0.35,
      nfy: 0.3 + Math.random() * 0.35,
    };
  });

  const index = new Map<string, number>();
  nodes.forEach((n, i) => index.set(n.id, i));
  return { nodes, index };
}

function step(
  nodes: Node[],
  links: Link[],
  index: Map<string, number>,
  t: number,
  withNoise: boolean,
) {
  // mild centering + organic drift (when noise is enabled)
  for (const n of nodes) {
    n.vx += (CENTER.x - n.x) * 0.00022;
    n.vy += (CENTER.y - n.y) * 0.00022;
    if (withNoise) {
      n.vx += Math.sin(t * n.nfx + n.npx) * 0.025;
      n.vy += Math.cos(t * n.nfy + n.npy) * 0.025;
    }
  }

  // pairwise repulsion — stronger now with 24 nodes packed in
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distSq = dx * dx + dy * dy;
      const dist = Math.max(Math.sqrt(distSq), 26);
      const force = 1500 / (dist * dist);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx -= fx;
      a.vy -= fy;
      b.vx += fx;
      b.vy += fy;
    }
  }

  // spring on each link
  for (const link of links) {
    const ai = index.get(link[0]);
    const bi = index.get(link[1]);
    if (ai === undefined || bi === undefined) continue;
    const a = nodes[ai];
    const b = nodes[bi];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.max(Math.hypot(dx, dy), 1);
    const target = 78;
    const force = (dist - target) * 0.016;
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;
    a.vx += fx;
    a.vy += fy;
    b.vx -= fx;
    b.vy -= fy;
  }

  // damping + integrate + bounds
  for (const n of nodes) {
    n.vx *= 0.84;
    n.vy *= 0.84;
    n.x += n.vx;
    n.y += n.vy;

    const halfW = n.width / 2;
    const halfH = 12;
    const margin = 6;
    if (n.x - halfW < margin) {
      n.x = halfW + margin;
      n.vx = Math.abs(n.vx) * 0.4;
    }
    if (n.x + halfW > W - margin) {
      n.x = W - halfW - margin;
      n.vx = -Math.abs(n.vx) * 0.4;
    }
    if (n.y - halfH < margin) {
      n.y = halfH + margin;
      n.vy = Math.abs(n.vy) * 0.4;
    }
    if (n.y + halfH > H - margin) {
      n.y = H - halfH - margin;
      n.vy = -Math.abs(n.vy) * 0.4;
    }
  }
}

export function SkillsConstellation() {
  const initial = useMemo(buildInitial, []);
  const nodesRef = useRef<Node[]>(initial.nodes);
  const indexRef = useRef(initial.index);
  const [hovered, setHovered] = useState<string | null>(null);

  // refs to DOM elements for direct attribute updates (no re-render per frame)
  const nodeElRefs = useRef<Map<string, SVGGElement>>(new Map());
  const lineElRefs = useRef<(SVGLineElement | null)[]>([]);
  const pulseElRefs = useRef<(SVGCircleElement | null)[]>([]);

  // adjacency for hover state
  const adjacency = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const id of NODES_DEF.map((n) => n.id)) map.set(id, new Set());
    for (const [a, b] of LINKS) {
      map.get(a)?.add(b);
      map.get(b)?.add(a);
    }
    return map;
  }, []);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let warmup = 180; // extra simulation iterations to settle initial layout (24 nodes need more)

    function tick(now: number) {
      const nodes = nodesRef.current;
      const idx = indexRef.current;

      const iterations = warmup > 0 ? Math.min(warmup, 5) : reduce ? 0 : 1;
      // noise only kicks in after warmup so the layout settles cleanly first
      const withNoise = warmup <= 0 && !reduce;
      const t = now / 1000;
      for (let i = 0; i < iterations; i++) step(nodes, LINKS, idx, t, withNoise);
      if (warmup > 0) warmup -= iterations;

      // update node transforms
      for (const n of nodes) {
        const el = nodeElRefs.current.get(n.id);
        if (el) el.setAttribute("transform", `translate(${n.x} ${n.y})`);
      }

      // update line endpoints + pulse positions
      for (let i = 0; i < LINKS.length; i++) {
        const [aId, bId] = LINKS[i];
        const ai = idx.get(aId);
        const bi = idx.get(bId);
        if (ai === undefined || bi === undefined) continue;
        const a = nodes[ai];
        const b = nodes[bi];

        const lineEl = lineElRefs.current[i];
        if (lineEl) {
          lineEl.setAttribute("x1", String(a.x));
          lineEl.setAttribute("y1", String(a.y));
          lineEl.setAttribute("x2", String(b.x));
          lineEl.setAttribute("y2", String(b.y));
        }

        const pulseEl = pulseElRefs.current[i];
        if (pulseEl) {
          const phase = (t * 0.35 + i * 0.137) % 1;
          const px = a.x + (b.x - a.x) * phase;
          const py = a.y + (b.y - a.y) * phase;
          pulseEl.setAttribute("cx", String(px));
          pulseEl.setAttribute("cy", String(py));
          // fade in / out at start and end
          const fade = Math.sin(phase * Math.PI);
          pulseEl.setAttribute("opacity", String(fade * 0.85));
        }
      }

      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const isNeighbor = (id: string) => {
    if (!hovered) return true;
    if (id === hovered) return true;
    return adjacency.get(hovered)?.has(id) ?? false;
  };

  const linkActive = (link: Link) =>
    !hovered || link[0] === hovered || link[1] === hovered;

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-[440px] md:h-[460px] block"
        role="img"
        aria-label="Skill constellation: TypeScript, React, Next.js, Tailwind, Framer Motion, GSAP, Three.js, React Three Fiber, WebGL, GLSL, Rapier, Unity, C#, Node.js, Vite, Figma"
      >
        {/* lines layer */}
        <g>
          {LINKS.map((link, i) => {
            const active = linkActive(link);
            return (
              <line
                key={`l-${i}`}
                ref={(el) => {
                  lineElRefs.current[i] = el;
                }}
                stroke={active ? "rgba(200,255,61,0.45)" : "rgba(255,255,255,0.07)"}
                strokeWidth={hovered && active ? 1.1 : 0.7}
                style={{
                  transition: "stroke 0.3s ease, stroke-width 0.3s ease",
                }}
              />
            );
          })}
        </g>

        {/* pulses layer */}
        <g>
          {LINKS.map((link, i) => {
            const active = linkActive(link);
            return (
              <circle
                key={`p-${i}`}
                ref={(el) => {
                  pulseElRefs.current[i] = el;
                }}
                r={active && hovered ? 2.4 : 1.6}
                fill="#c8ff3d"
                style={{ transition: "r 0.3s ease" }}
              />
            );
          })}
        </g>

        {/* nodes layer */}
        <g>
          {nodesRef.current.map((n) => {
            const active = isNeighbor(n.id);
            const isHover = hovered === n.id;
            const groupColor =
              n.group === "game"
                ? "#c8ff3d"
                : n.group === "frontend"
                  ? "#f5f5f5"
                  : n.group === "infra"
                    ? "#7aa8ff"
                    : "#9c9c9c";
            const stroke = isHover
              ? "#c8ff3d"
              : n.primary
                ? "rgba(245,245,245,0.35)"
                : "rgba(255,255,255,0.15)";
            const fill = isHover ? "#c8ff3d" : "#0a0a0a";
            const textColor = isHover ? "#0a0a0a" : groupColor;

            return (
              <g
                key={n.id}
                ref={(el) => {
                  if (el) nodeElRefs.current.set(n.id, el);
                  else nodeElRefs.current.delete(n.id);
                }}
                style={{
                  opacity: active ? 1 : 0.22,
                  transition: "opacity 0.3s ease",
                }}
                onPointerEnter={() => setHovered(n.id)}
                onPointerLeave={() => setHovered((h) => (h === n.id ? null : h))}
              >
                <rect
                  x={-n.width / 2}
                  y={-12}
                  width={n.width}
                  height={24}
                  rx={12}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={isHover ? 1.2 : 0.9}
                  style={{
                    transition:
                      "fill 0.25s ease, stroke 0.25s ease, stroke-width 0.25s ease",
                  }}
                />
                {/* group dot indicator */}
                <circle
                  cx={-n.width / 2 + 8}
                  cy={0}
                  r={2.2}
                  fill={
                    isHover
                      ? "#0a0a0a"
                      : n.group === "game"
                        ? "#c8ff3d"
                        : n.group === "frontend"
                          ? "rgba(245,245,245,0.7)"
                          : n.group === "infra"
                            ? "#7aa8ff"
                            : "#9c9c9c"
                  }
                  style={{ transition: "fill 0.25s ease" }}
                />
                <text
                  x={6}
                  y={1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={textColor}
                  fontSize={10.5}
                  fontFamily='"Geist Mono", ui-monospace, monospace'
                  style={{
                    pointerEvents: "none",
                    transition: "fill 0.25s ease",
                    userSelect: "none",
                  }}
                >
                  {n.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      <div className="absolute bottom-1 left-0 right-0 text-center pointer-events-none font-mono text-[9px] uppercase tracking-widest text-muted/60">
        hover any node to follow its connections
      </div>
    </div>
  );
}
