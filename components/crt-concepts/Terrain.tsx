"use client";

import { useEffect, useRef } from "react";
import { terrainParams } from "./fear-params";

// Concept F: the name is high ground on a contour map, rendered by a
// fragment shader. The numbers in the code card next to it are the
// shader's real inputs; drag one and the terrain changes under you.

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform sampler2D uName;
uniform vec2 uPointer;
uniform float uPointerA;
uniform float uLift, uBands, uWarp, uFlow;
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
  for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + 1.7; a *= 0.5; }
  return s;
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = frag / uRes;
  vec2 p = frag / min(uRes.x, uRes.y);
  float t = uTime * uFlow;
  vec2 drift = vec2(fbm(p * 2.0 + t), fbm(p * 2.0 + 5.2 - t));
  float h = fbm(p * 1.6 + uWarp * drift) * 0.9;
  h += texture(uName, vec2(uv.x, 1.0 - uv.y)).r * uLift;
  vec2 d = (frag - uPointer) / min(uRes.x, uRes.y);
  h += exp(-dot(d, d) * 38.0) * 0.32 * uPointerA;

  float b = h * uBands;
  float w = fwidth(b);
  float dist = abs(fract(b - 0.5) - 0.5); // to the nearest whole contour
  float line = 1.0 - smoothstep(w * 0.4, w * 1.4, dist);
  float major = 1.0 - step(0.5, mod(floor(b + 0.5), 5.0));
  float lit = smoothstep(0.35, 0.95, h);
  vec3 bg = vec3(0.035, 0.05, 0.04);
  vec3 ink = mix(vec3(0.33, 0.45, 0.2), vec3(0.8, 1.0, 0.26), lit);
  float a = line * mix(0.35, 0.95, lit) * (major > 0.5 ? 1.0 : 0.6);
  outColor = vec4(bg + ink * a, 1.0);
}`;

function identFont() {
  const host = document.querySelector("[data-tv-fonts]") ?? document.documentElement;
  return getComputedStyle(host).getPropertyValue("--font-ident").trim() || "sans-serif";
}

/** The name as a soft height map: white letters, blurred into hills. */
function drawName(c: HTMLCanvasElement, w: number, h: number) {
  const s = 0.5; // half-res is plenty for a blurred map
  c.width = Math.max(2, Math.round(w * s));
  c.height = Math.max(2, Math.round(h * s));
  const o = c.getContext("2d")!;
  o.fillStyle = "#000";
  o.fillRect(0, 0, c.width, c.height);
  const mobile = w < 768;
  const fs = (mobile ? Math.min(w * 0.17, 96) : Math.min(w * 0.115, h * 0.2, 190)) * s;
  const left = (mobile ? 16 : Math.max(24, w * 0.05)) * s;
  const top = (mobile ? h * 0.13 : h * 0.17) * s;
  o.filter = `blur(${Math.max(2, fs * 0.07)}px)`;
  o.fillStyle = "#fff";
  o.fontStretch = "expanded";
  o.font = `800 ${fs}px ${identFont()}`;
  o.textBaseline = "top";
  o.fillText("Divyansh", left, top);
  o.fillText("Agarwal", left, top + fs * 0.98);
  o.filter = "none";
}

export function Terrain() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", { antialias: false, premultipliedAlpha: false });
    if (!gl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(sh));
      return sh;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = (n: string) => gl.getUniformLocation(prog, n);
    const U = {
      res: u("uRes"),
      time: u("uTime"),
      name: u("uName"),
      pointer: u("uPointer"),
      pointerA: u("uPointerA"),
      lift: u("uLift"),
      bands: u("uBands"),
      warp: u("uWarp"),
      flow: u("uFlow"),
    };

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(U.name, 0);
    const nameCanvas = document.createElement("canvas");

    let w = 0;
    let h = 0;
    let dpr = 1;
    let raf = 0;
    let visible = true;
    const start = performance.now();
    const pointer = { x: -1e4, y: -1e4, a: 0, target: 0, at: -1e9 };

    function resize() {
      const r = canvas!.getBoundingClientRect();
      w = r.width;
      h = r.height;
      // contour lines are thin; 1.5x keeps them crisp without paying for 3x
      dpr = Math.min(1.5, window.devicePixelRatio || 1);
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      gl!.viewport(0, 0, canvas!.width, canvas!.height);
      drawName(nameCanvas, w, h);
      gl!.bindTexture(gl!.TEXTURE_2D, tex);
      gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, nameCanvas);
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      const t = reduce ? 4 : (now - start) / 1000;
      pointer.target = now - pointer.at < 3000 ? 1 : 0;
      pointer.a += (pointer.target - pointer.a) * 0.06;
      gl!.uniform2f(U.res, canvas!.width, canvas!.height);
      gl!.uniform1f(U.time, t);
      gl!.uniform2f(U.pointer, pointer.x * dpr, (h - pointer.y) * dpr);
      gl!.uniform1f(U.pointerA, pointer.a);
      gl!.uniform1f(U.lift, terrainParams.lift);
      gl!.uniform1f(U.bands, terrainParams.bands);
      gl!.uniform1f(U.warp, terrainParams.warp);
      gl!.uniform1f(U.flow, terrainParams.flow);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    }

    function onMove(e: PointerEvent) {
      const r = canvas!.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      pointer.at = performance.now();
    }

    let resizeTimer = 0;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 150);
    };
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);
    document.fonts.ready.then(() => {
      resize();
      raf = requestAnimationFrame(frame);
    });
    const hero = canvas.closest("section") ?? canvas;
    hero.addEventListener("pointermove", onMove as EventListener);
    hero.addEventListener("pointerdown", onMove as EventListener);
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      hero.removeEventListener("pointermove", onMove as EventListener);
      hero.removeEventListener("pointerdown", onMove as EventListener);
      window.removeEventListener("resize", onResize);
      gl.deleteProgram(prog);
      gl.deleteTexture(tex);
      gl.deleteBuffer(buf);
    };
  }, []);

  return <canvas ref={ref} aria-hidden style={{ width: "100%", height: "100%", display: "block", touchAction: "pan-y" }} />;
}
