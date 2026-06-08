"use client";

import { useMemo, useRef } from "react";
import { motion, useInView } from "motion/react";

// The toolbelt as a printed circuit board — a literal take on the tagline
// "the wires between them". A power bus feeds three component banks
// (FRONT / INFRA / GAME); skills are labelled chips wired in series by
// copper traces with vias, and current flows along the traces. Phosphor
// on black, like a board lit under a bench lamp.

type Bank = {
  id: string;
  label: string;
  color: string;
  rgb: string;
  cols: number;
  skills: string[];
};

const BANKS: Bank[] = [
  {
    id: "front",
    label: "U1 · FRONTEND",
    color: "#f5f5f5",
    rgb: "245,245,245",
    cols: 2,
    skills: ["TypeScript", "React", "Next.js", "Vue.js", "Tailwind", "GSAP", "Figma"],
  },
  {
    id: "infra",
    label: "U2 · BACKEND·INFRA",
    color: "#7aa8ff",
    rgb: "122,168,255",
    cols: 3,
    skills: [
      "Python", "Node.js", "Go", "Java", "Rust", "Django",
      "Postgres", "Redis", "Airflow", "Docker", "AWS",
    ],
  },
  {
    id: "game",
    label: "U3 · GAMES·3D",
    color: "#c8ff3d",
    rgb: "200,255,61",
    cols: 2,
    skills: ["Three.js", "R3F", "WebGL", "GLSL", "Unity", "C#"],
  },
];

const VB_W = 400;
const BUS_X = 16;
const CONTENT_X = 40;
const CHIP_GAP = 10;
const ROW_H = 34;
const CHIP_H = 19;
const LABEL_H = 22;
const BANK_GAP = 22;
const TOP_PAD = 40;

type Chip = {
  label: string;
  x: number;
  y: number;
  w: number;
  color: string;
  rgb: string;
};
type Trace = { d: string };

function buildLayout() {
  const chips: Chip[] = [];
  const traces: Trace[] = [];
  const vias: { x: number; y: number }[] = [];
  const banks: { label: string; x: number; y: number; color: string }[] = [];
  const areaW = VB_W - CONTENT_X - 14;

  let y = TOP_PAD;
  for (const bank of BANKS) {
    const colW = areaW / bank.cols;
    const chipW = colW - CHIP_GAP;
    const rows = Math.ceil(bank.skills.length / bank.cols);
    banks.push({ label: bank.label, x: CONTENT_X, y: y + 12, color: bank.color });

    const bankChipTop = y + LABEL_H;
    const ordered: Chip[] = bank.skills.map((label, i) => {
      const row = Math.floor(i / bank.cols);
      const posInRow = i % bank.cols;
      // serpentine so the trace can snake through every chip in series
      const col = row % 2 === 0 ? posInRow : bank.cols - 1 - posInRow;
      const cx = CONTENT_X + col * colW + colW / 2;
      const cy = bankChipTop + row * ROW_H + CHIP_H / 2 + 4;
      return { label, x: cx, y: cy, w: chipW, color: bank.color, rgb: bank.rgb };
    });

    // feeder from the bus into the bank's first chip
    const first = ordered[0];
    traces.push({
      d: `M ${BUS_X} ${first.y} H ${first.x - first.w / 2}`,
    });
    vias.push({ x: BUS_X, y: first.y });

    // daisy-chain the chips in serpentine order (orthogonal segments)
    for (let i = 0; i < ordered.length - 1; i++) {
      const a = ordered[i];
      const b = ordered[i + 1];
      if (Math.abs(a.y - b.y) < 1) {
        // same row — connect facing edges
        const ax = a.x + Math.sign(b.x - a.x) * (a.w / 2);
        const bx = b.x - Math.sign(b.x - a.x) * (b.w / 2);
        traces.push({ d: `M ${ax} ${a.y} H ${bx}` });
      } else {
        // row change — drop straight down at the shared column edge
        traces.push({ d: `M ${a.x} ${a.y + CHIP_H / 2} V ${b.y - CHIP_H / 2}` });
      }
      vias.push({ x: b.x, y: b.y });
    }

    chips.push(...ordered);
    y = bankChipTop + rows * ROW_H + BANK_GAP;
  }

  const busBottom = y - BANK_GAP + 6;
  return { chips, traces, vias, banks, busBottom, height: y };
}

export function SkillsBoard() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15%" });
  const L = useMemo(() => buildLayout(), []);
  const VB_H = L.height;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="relative rounded-xl border border-border bg-[#070707] overflow-hidden"
    >
      {/* board silkscreen header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card/30 font-mono text-[10px] uppercase tracking-widest text-muted">
        <span>Toolbelt · rev 2.6</span>
        <span className="flex items-center gap-1.5 text-accent">
          <span className="size-1.5 rounded-full bg-accent animate-pulse" />
          Powered
        </span>
      </div>

      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="block w-full"
        role="img"
        aria-label="Skills circuit board: frontend, backend/infra, and game/3D toolchains"
      >
        {/* dot-grid solder mask */}
        <defs>
          <pattern id="pcbdots" width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.6" fill="rgba(200,255,61,0.06)" />
          </pattern>
        </defs>
        <rect width={VB_W} height={VB_H} fill="url(#pcbdots)" />

        {/* mounting holes */}
        {[
          [10, 12], [VB_W - 10, 12], [10, VB_H - 10], [VB_W - 10, VB_H - 10],
        ].map(([cx, cy], i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={3.5}
            fill="none"
            stroke="rgba(245,245,245,0.18)"
            strokeWidth={1}
          />
        ))}

        {/* power bus */}
        <line
          x1={BUS_X}
          y1={20}
          x2={BUS_X}
          y2={L.busBottom}
          stroke="rgba(200,255,61,0.55)"
          strokeWidth={1.6}
        />
        <line
          x1={BUS_X}
          y1={20}
          x2={BUS_X}
          y2={L.busBottom}
          className="pcb-flow"
          stroke="#c8ff3d"
          strokeWidth={1.6}
          fill="none"
        />
        {/* edge connector at the top of the bus */}
        <rect
          x={BUS_X - 8}
          y={14}
          width={16}
          height={10}
          rx={1}
          fill="#0c0c0c"
          stroke="rgba(200,255,61,0.6)"
          strokeWidth={1}
        />

        {/* traces — dim copper base + bright flowing current overlay */}
        <g>
          {L.traces.map((t, i) => (
            <path
              key={`b-${i}`}
              d={t.d}
              fill="none"
              stroke="rgba(200,255,61,0.22)"
              strokeWidth={1}
            />
          ))}
          {L.traces.map((t, i) => (
            <path
              key={`f-${i}`}
              d={t.d}
              fill="none"
              className="pcb-flow"
              stroke="#c8ff3d"
              strokeWidth={1}
            />
          ))}
        </g>

        {/* vias */}
        {L.vias.map((v, i) => (
          <circle
            key={`v-${i}`}
            cx={v.x}
            cy={v.y}
            r={1.8}
            fill="#070707"
            stroke="rgba(200,255,61,0.6)"
            strokeWidth={0.8}
          />
        ))}

        {/* bank silkscreen labels */}
        {L.banks.map((b) => (
          <text
            key={b.label}
            x={b.x - 2}
            y={b.y}
            fontSize={8}
            fontFamily='"Geist Mono", ui-monospace, monospace'
            letterSpacing={1}
            fill={b.color}
            opacity={0.7}
          >
            {b.label}
          </text>
        ))}

        {/* component chips */}
        {L.chips.map((c) => (
          <g key={c.label} className="pcb-chip">
            {/* pin pads */}
            <rect x={c.x - c.w / 2 - 3} y={c.y - 2.5} width={3} height={5} fill={c.color} opacity={0.7} />
            <rect x={c.x + c.w / 2} y={c.y - 2.5} width={3} height={5} fill={c.color} opacity={0.7} />
            <rect
              className="pcb-pad"
              x={c.x - c.w / 2}
              y={c.y - CHIP_H / 2}
              width={c.w}
              height={CHIP_H}
              rx={2.5}
              fill="#0d0d0d"
              stroke={`rgba(${c.rgb},0.5)`}
              strokeWidth={1}
            />
            <text
              x={c.x}
              y={c.y + 0.5}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={9}
              fontFamily='"Geist Mono", ui-monospace, monospace'
              fill="#f5f5f5"
              style={{ pointerEvents: "none" }}
            >
              {c.label}
            </text>
          </g>
        ))}
      </svg>
    </motion.div>
  );
}
