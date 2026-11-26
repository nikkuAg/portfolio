"use client";

import { useEffect, useRef } from "react";
import { paintSubject, ready, stageBox } from "./subject";

// Concept O: the subject as a wet ink wash on paper. Dragging through it
// smears the ink the way a finger would; the wash slowly creeps back to
// where it was. A small displacement field lives on the CPU, the shader
// reads the picture through it and paints pooled edges and paper grain.

const GW = 128;
const GH = 80;

const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uInk;
uniform sampler2D uDisp;
uniform vec2 uRes;
out vec4 outColor;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}

float ink(vec2 uv) { return texture(uInk, uv).r; }

void main() {
  vec2 d = texture(uDisp, vUv).rg;
  vec2 uv = vUv - d;
  float a = ink(uv);
  vec2 px = 3.0 / uRes;
  float around = (ink(uv + vec2(px.x, 0)) + ink(uv - vec2(px.x, 0)) + ink(uv + vec2(0, px.y)) + ink(uv - vec2(0, px.y))) * 0.25;
  float edge = max(0.0, a - around) * 3.0;          // pigment pools at the edge of a wash
  float grain = noise(gl_FragCoord.xy * 0.35) * 0.5 + noise(gl_FragCoord.xy * 0.08) * 0.5;
  float smear = clamp(length(d) * 60.0, 0.0, 1.0);  // smeared ink thins out
  float k = clamp(a * (0.78 + grain * 0.3) * (1.0 - smear * 0.25) + edge, 0.0, 1.0);
  vec3 paper = vec3(0.937, 0.914, 0.866) - grain * 0.035;
  vec3 deep = vec3(0.105, 0.125, 0.235);
  vec3 thin = vec3(0.42, 0.36, 0.36);
  vec3 col = mix(paper, mix(thin, deep, smoothstep(0.25, 0.9, k)), smoothstep(0.02, 0.6, k));
  outColor = vec4(col, 1.0);
}`;

export function InkWash() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", { antialias: false });
    if (!gl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sh = (t: number, src: string) => {
      const o = gl.createShader(t)!;
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
    const uRes = gl.getUniformLocation(prog, "uRes");
    gl.uniform1i(gl.getUniformLocation(prog, "uInk"), 0);
    gl.uniform1i(gl.getUniformLocation(prog, "uDisp"), 1);

    const mk = () => {
      const t = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };
    const inkTex = mk();
    const dispTex = mk();
    const disp = new Float32Array(GW * GH * 2);
    const vel = new Float32Array(GW * GH * 2);
    const tmp = new Float32Array(GW * GH * 2);

    let w = 0;
    let h = 0;
    let raf = 0;
    let visible = true;
    let img: HTMLImageElement | null = null;
    const ptr = { x: 0, y: 0, has: false };

    function paint() {
      const r = canvas!.getBoundingClientRect();
      w = r.width;
      h = r.height;
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      gl!.viewport(0, 0, canvas!.width, canvas!.height);
      // the wash: a soft blurred layer under a sharper core, in the stage box
      const box = stageBox(w, h);
      const c = document.createElement("canvas");
      c.width = Math.round(w);
      c.height = Math.round(h);
      const o = c.getContext("2d")!;
      o.fillStyle = "#000";
      o.fillRect(0, 0, c.width, c.height);
      const sub = document.createElement("canvas");
      sub.width = Math.round(box.w);
      sub.height = Math.round(box.h);
      paintSubject(sub.getContext("2d")!, sub.width, sub.height, img);
      o.globalCompositeOperation = "lighter";
      o.filter = "blur(14px)";
      o.globalAlpha = 0.55;
      o.drawImage(sub, box.x, box.y);
      o.filter = "blur(2px)";
      o.globalAlpha = 0.75;
      o.drawImage(sub, box.x, box.y);
      gl!.activeTexture(gl!.TEXTURE0);
      gl!.bindTexture(gl!.TEXTURE_2D, inkTex);
      gl!.pixelStorei(gl!.UNPACK_FLIP_Y_WEBGL, true);
      gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, c);
      gl!.pixelStorei(gl!.UNPACK_FLIP_Y_WEBGL, false);
    }

    function step() {
      // move, damp, relax back, and diffuse a little so smears stay smooth
      for (let i = 0; i < disp.length; i++) {
        disp[i] += vel[i];
        vel[i] *= 0.85;
        disp[i] *= reduce ? 0.9 : 0.988;
      }
      for (let y = 1; y < GH - 1; y++) {
        for (let x = 1; x < GW - 1; x++) {
          for (let k = 0; k < 2; k++) {
            const i = (y * GW + x) * 2 + k;
            tmp[i] = disp[i] * 0.6 + (disp[i - 2] + disp[i + 2] + disp[i - GW * 2] + disp[i + GW * 2]) * 0.1;
          }
        }
      }
      for (let y = 1; y < GH - 1; y++) for (let x = 1; x < GW - 1; x++) for (let k = 0; k < 2; k++) disp[(y * GW + x) * 2 + k] = tmp[(y * GW + x) * 2 + k];
    }

    function frame() {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      step();
      gl!.activeTexture(gl!.TEXTURE1);
      gl!.bindTexture(gl!.TEXTURE_2D, dispTex);
      gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RG16F, GW, GH, 0, gl!.RG, gl!.FLOAT, disp);
      gl!.uniform2f(uRes, canvas!.width, canvas!.height);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    }

    function onMove(e: PointerEvent) {
      const r = canvas!.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      if (ptr.has) {
        const dx = (x - ptr.x) / w;
        const dy = -(y - ptr.y) / h;
        const gx = (x / w) * GW;
        const gy = (1 - y / h) * GH;
        const R = 7;
        for (let j = Math.max(0, Math.floor(gy - R)); j < Math.min(GH, gy + R); j++) {
          for (let i = Math.max(0, Math.floor(gx - R)); i < Math.min(GW, gx + R); i++) {
            const d = Math.hypot(i - gx, j - gy) / R;
            if (d >= 1) continue;
            const f = (1 - d) * (1 - d) * 0.35;
            vel[(j * GW + i) * 2] += dx * f;
            vel[(j * GW + i) * 2 + 1] += dy * f;
          }
        }
      }
      ptr.x = x;
      ptr.y = y;
      ptr.has = true;
    }

    let tm = 0;
    const onResize = () => {
      clearTimeout(tm);
      tm = window.setTimeout(paint, 150);
    };
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);
    ready().then((p) => {
      img = p;
      paint();
      raf = requestAnimationFrame(frame);
    });
    const hero = canvas.closest("section") ?? canvas;
    hero.addEventListener("pointermove", onMove as EventListener);
    const leave = () => (ptr.has = false);
    hero.addEventListener("pointerleave", leave);
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      hero.removeEventListener("pointermove", onMove as EventListener);
      hero.removeEventListener("pointerleave", leave);
      window.removeEventListener("resize", onResize);
      gl.deleteProgram(prog);
      gl.deleteTexture(inkTex);
      gl.deleteTexture(dispTex);
      gl.deleteBuffer(buf);
    };
  }, []);

  return <canvas ref={ref} aria-hidden style={{ width: "100%", height: "100%", display: "block", touchAction: "pan-y" }} />;
}
