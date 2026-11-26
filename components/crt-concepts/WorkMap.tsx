"use client";

import { useEffect, useRef, useState } from "react";
import { projects } from "@/content/projects";
import { smoothScrollTo } from "@/lib/scroll";
import s from "./concepts.module.css";

// Concept H: the work is the landscape. Each project is a hill on a
// contour map, tinted its own colour; the flagship is the highest peak.
// The labels are real links, so the map is also the project index.

const MAX = 8;

// where the peaks sit inside the map's box (0..1), largest first
const SPOTS: [number, number][] = [
  [0.42, 0.42],
  [0.78, 0.22],
  [0.2, 0.18],
  [0.74, 0.7],
  [0.16, 0.74],
  [0.5, 0.86],
  [0.92, 0.5],
  [0.05, 0.45],
];

const CATEGORY: Record<string, string> = {
  fullstack: "Full-stack",
  backend: "Backend",
  research: "Research",
  gamedev: "Game",
};

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform int uCount;
uniform vec4 uHills[${MAX}];   // x, y (px, GL space), radius px, height
uniform vec3 uColors[${MAX}];
uniform int uHover;
out vec4 outColor;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * noise(p); p = p * 2.03 + 1.7; a *= 0.5; }
  return s;
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 p = frag / min(uRes.x, uRes.y);
  float h = fbm(p * 2.2 + vec2(uTime * 0.01, 0.0)) * 0.28;
  vec3 tint = vec3(0.0);
  float tw = 0.0;
  float hot = 0.0;
  for (int i = 0; i < ${MAX}; i++) {
    if (i >= uCount) break;
    vec4 H = uHills[i];
    vec2 d = (frag - H.xy) / H.z;
    // slightly lumpy hills so they read as land, not cones
    float r2 = dot(d, d) * (1.0 + 0.25 * (fbm(frag / H.z * 1.3 + float(i) * 7.0) - 0.5));
    float k = exp(-r2 * 1.6);
    float lift = (i == uHover) ? 1.12 : 1.0;
    h += H.w * k * lift;
    tint += uColors[i] * k;
    tw += k;
    if (i == uHover) hot = k;
  }
  vec3 land = tw > 0.001 ? tint / tw : vec3(0.0);
  float near = clamp(tw * 1.6, 0.0, 1.0);

  float b = h * 16.0;
  float w = fwidth(b);
  float dist = abs(fract(b - 0.5) - 0.5);
  float line = 1.0 - smoothstep(w * 0.4, w * 1.4, dist);
  float major = 1.0 - step(0.5, mod(floor(b + 0.5), 5.0));

  vec3 bg = vec3(0.043, 0.055, 0.09);
  vec3 paper = vec3(0.86, 0.83, 0.75);
  vec3 ink = mix(paper * 0.55, mix(paper, land, 0.8), near);
  float a = line * (major > 0.5 ? 0.95 : 0.5) * mix(0.35, 1.0, near);
  a *= 1.0 + hot * 0.8;
  outColor = vec4(bg + ink * a, 1.0);
}`;

type Peak = { x: number; y: number; r: number; amp: number };

function hexRGB(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** The box the map lives in, in CSS px. Copy sits left on desktop, on top on phones. */
function mapBox(w: number, h: number) {
  if (w < 768) return { x: w * 0.06, y: h * 0.47, w: w * 0.88, h: h * 0.34 };
  return { x: w * 0.47, y: h * 0.16, w: w * 0.48, h: h * 0.7 };
}

export function WorkMap() {
  const ref = useRef<HTMLCanvasElement>(null);
  const hover = useRef(-1);
  const [peaks, setPeaks] = useState<Peak[]>([]);
  const [active, setActive] = useState(-1);
  const list = projects.slice(0, MAX);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", { antialias: false });
    if (!gl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const sh = (type: number, src: string) => {
      const o = gl.createShader(type)!;
      gl.shaderSource(o, src);
      gl.compileShader(o);
      if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(o));
      return o;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = {
      res: gl.getUniformLocation(prog, "uRes"),
      time: gl.getUniformLocation(prog, "uTime"),
      count: gl.getUniformLocation(prog, "uCount"),
      hills: gl.getUniformLocation(prog, "uHills"),
      colors: gl.getUniformLocation(prog, "uColors"),
      hover: gl.getUniformLocation(prog, "uHover"),
    };
    const colors = new Float32Array(MAX * 3);
    list.forEach((p, i) => colors.set(hexRGB(p.color ?? "#e9e2cf"), i * 3));
    gl.uniform3fv(U.colors, colors);
    gl.uniform1i(U.count, list.length);

    let w = 0;
    let h = 0;
    let dpr = 1;
    let raf = 0;
    let visible = true;
    const hills = new Float32Array(MAX * 4);
    const start = performance.now();

    function resize() {
      const r = canvas!.getBoundingClientRect();
      w = r.width;
      h = r.height;
      dpr = Math.min(1.5, window.devicePixelRatio || 1);
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      gl!.viewport(0, 0, canvas!.width, canvas!.height);
      const box = mapBox(w, h);
      const base = Math.min(box.w, box.h);
      const next: Peak[] = list.map((_, i) => {
        const [sx, sy] = SPOTS[i];
        const flagship = i === 0;
        return {
          x: box.x + sx * box.w,
          y: box.y + sy * box.h,
          r: base * (flagship ? 0.3 : 0.17 + (i % 3) * 0.02),
          amp: flagship ? 1.0 : 0.55 + ((i * 37) % 20) / 100,
        };
      });
      next.forEach((p, i) => hills.set([p.x * dpr, (h - p.y) * dpr, p.r * dpr, p.amp], i * 4));
      setPeaks(next);
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      gl!.uniform2f(U.res, canvas!.width, canvas!.height);
      gl!.uniform1f(U.time, reduce ? 0 : (now - start) / 1000);
      gl!.uniform4fv(U.hills, hills);
      gl!.uniform1i(U.hover, hover.current);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    }

    let t = 0;
    const onResize = () => {
      clearTimeout(t);
      t = window.setTimeout(resize, 150);
    };
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);
    resize();
    raf = requestAnimationFrame(frame);
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", onResize);
      gl.deleteProgram(prog);
      gl.deleteBuffer(buf);
    };
    // the project list is static content
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const focus = (i: number) => {
    hover.current = i;
    setActive(i);
  };

  return (
    <>
      <canvas ref={ref} aria-hidden style={{ width: "100%", height: "100%", display: "block" }} />
      <ul className={s.peaks} aria-label="Projects">
        {peaks.map((p, i) => {
          const proj = list[i];
          const ext = proj.href;
          return (
            <li key={proj.slug} style={{ left: p.x, top: p.y }} data-active={active === i || undefined} data-flagship={i === 0 || undefined}>
              <a
                href={ext ?? "#projects"}
                target={ext ? "_blank" : undefined}
                rel={ext ? "noreferrer" : undefined}
                onPointerEnter={() => focus(i)}
                onPointerLeave={() => focus(-1)}
                onFocus={() => focus(i)}
                onBlur={() => focus(-1)}
                onClick={(e) => {
                  if (ext) return;
                  e.preventDefault();
                  smoothScrollTo("#projects");
                }}
              >
                <span className={s.peakName}>{proj.title}</span>
                <span className={s.peakMeta}>
                  {CATEGORY[proj.category]}, {proj.year}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </>
  );
}
