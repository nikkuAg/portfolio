import * as THREE from "three";

// The tube face. The geometry bulges toward the viewer (real CRT glass is
// convex), the image is barrel-distorted to match, and the fragment stage
// adds what makes a tube read as a tube: an aperture-grille RGB mask,
// scanlines, phosphor bloom, tuning static + vertical roll, a power-on
// line, and a reflection sitting ON the glass (undistorted).

const vertexShader = /* glsl */ `
uniform float uBulge;
varying vec2 vUv;
varying vec3 vNormalV;
varying vec3 vViewPos;
void main() {
  vUv = uv;
  vec3 p = position;
  vec2 c = uv * 2.0 - 1.0;
  p.z += uBulge * (1.0 - 0.5 * dot(c * c, vec2(1.0)));
  // approximate the bulge normal for the glass highlight
  vec3 n = normalize(vec3(c.x * uBulge * 1.4, c.y * uBulge * 1.4, 1.0));
  vNormalV = normalize(normalMatrix * n);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vViewPos = mv.xyz;
  gl_Position = projectionMatrix * mv;
}
`;

const fragmentShader = /* glsl */ `
precision highp float;
uniform sampler2D uMap;
uniform vec2 uRes;       // source texture size in px
uniform float uTime;
uniform float uStatic;   // 0..1 tuning noise
uniform float uRoll;     // 0..1 vertical hold slip
uniform float uPower;    // 0 = off, 1 = fully on
uniform float uAspect;   // screen w / h
varying vec2 vUv;
varying vec3 vNormalV;
varying vec3 vViewPos;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec2 barrel(vec2 uv) {
  vec2 c = uv * 2.0 - 1.0;
  c *= 1.0 + 0.045 * dot(c, c);
  return c * 0.5 + 0.5;
}

float roundedMask(vec2 uv) {
  vec2 p = (uv - 0.5) * vec2(uAspect, 1.0);
  vec2 b = vec2(uAspect, 1.0) * 0.5 - 0.06;
  vec2 q = abs(p) - b;
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 0.06;
  return 1.0 - smoothstep(-0.004, 0.004, d);
}

vec3 tap(vec2 uv) {
  return texture2D(uMap, uv).rgb;
}

void main() {
  vec2 uv = barrel(vUv);
  float inside = roundedMask(uv);

  // vertical hold slip while tuning
  uv.y = fract(uv.y + uRoll);
  // horizontal tearing, line by line, during static
  float line = floor(uv.y * uRes.y * 0.5);
  uv.x += (hash(vec2(line, floor(uTime * 30.0))) - 0.5) * 0.035 * uStatic;

  // image + slight convergence error
  float ca = 0.0011 + 0.004 * uStatic;
  vec3 col;
  col.r = tap(uv + vec2(ca, 0.0)).r;
  col.g = tap(uv).g;
  col.b = tap(uv - vec2(ca, 0.0)).b;

  // phosphor bloom — cheap 8-tap halo added back on top
  vec2 px = 2.6 / uRes;
  vec3 halo = vec3(0.0);
  halo += tap(uv + vec2( px.x, 0.0));
  halo += tap(uv + vec2(-px.x, 0.0));
  halo += tap(uv + vec2(0.0,  px.y));
  halo += tap(uv + vec2(0.0, -px.y));
  halo += tap(uv + px * 1.6);
  halo += tap(uv - px * 1.6);
  halo += tap(uv + vec2(px.x, -px.y) * 1.6);
  halo += tap(uv + vec2(-px.x, px.y) * 1.6);
  halo /= 8.0;
  col += halo * halo * 0.55;

  // tuning snow
  float n = hash(floor(uv * uRes * 0.7) + fract(uTime * 7.31) * 97.0);
  col = mix(col, vec3(n * 0.9), clamp(uStatic, 0.0, 1.0));

  // scanlines (one per two texture rows) — brighter content blooms over them
  float s = sin(uv.y * uRes.y * 3.14159);
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col *= mix(0.72, 1.0, mix(s * 0.5 + 0.5, 1.0, lum * 0.6));

  // aperture grille: vertical RGB phosphor stripes
  float stripe = mod(floor(vUv.x * uRes.x * 1.5), 3.0);
  vec3 mask = vec3(0.86);
  if (stripe < 1.0) mask.r = 1.08; else if (stripe < 2.0) mask.g = 1.08; else mask.b = 1.08;
  col *= mask;

  // gentle refresh flicker + edge falloff
  col *= 0.985 + 0.015 * sin(uTime * 120.0);
  vec2 v = vUv * (1.0 - vUv.yx);
  col *= pow(v.x * v.y * 16.0, 0.18);

  // power: an off tube is not black, it's dark green-grey glass; turning on
  // opens from a bright horizontal line
  float open = smoothstep(0.0, 1.0, uPower);
  float band = abs(vUv.y - 0.5);
  float lineH = mix(0.002, 0.62, smoothstep(0.25, 1.0, open));
  float lit = 1.0 - smoothstep(lineH, lineH + 0.01, band);
  float flash = (1.0 - smoothstep(0.0, 0.5, open)) * step(0.001, open) * 2.2;
  col = col * lit * (1.0 + flash);
  vec3 glass = vec3(0.028, 0.034, 0.031);
  col = max(col, glass) * inside + glass * (1.0 - inside) * 0.6;

  // reflection on the glass: a soft window-shaped highlight + fresnel sheen
  vec3 viewDir = normalize(-vViewPos);
  float fres = pow(1.0 - max(dot(vNormalV, viewDir), 0.0), 3.0);
  vec2 r = (vUv - vec2(0.28, 0.78)) * vec2(1.0, 1.7);
  float win = smoothstep(0.32, 0.0, length(r)) * 0.035;
  col += vec3(0.85, 0.9, 1.0) * (win + fres * 0.12);

  gl_FragColor = vec4(col, 1.0);
}
`;

export function createGlassMaterial(map: THREE.Texture, aspect: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uRes: { value: new THREE.Vector2(1024, 768) },
      uTime: { value: 0 },
      uStatic: { value: 0 },
      uRoll: { value: 0 },
      uPower: { value: 0 },
      uBulge: { value: 0.09 },
      uAspect: { value: aspect },
    },
    vertexShader,
    fragmentShader,
  });
}
