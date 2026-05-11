import * as THREE from "three";
import { shaderMaterial } from "@react-three/drei";
import { extend, type ThreeElement } from "@react-three/fiber";

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
precision highp float;

uniform sampler2D uMap;
uniform float uTime;
uniform vec2 uResolution;
uniform float uCurvature;
uniform float uScanlineStrength;
uniform float uAberration;
uniform float uVignette;
uniform float uFlicker;

varying vec2 vUv;

vec2 curveUv(vec2 uv) {
  vec2 cuv = uv * 2.0 - 1.0;
  vec2 offset = abs(cuv.yx) / vec2(uCurvature, uCurvature);
  cuv += cuv * offset * offset;
  return cuv * 0.5 + 0.5;
}

vec3 sampleSplit(vec2 uv) {
  float a = uAberration;
  float r = texture2D(uMap, uv + vec2(a, 0.0)).r;
  float g = texture2D(uMap, uv).g;
  float b = texture2D(uMap, uv - vec2(a, 0.0)).b;
  return vec3(r, g, b);
}

void main() {
  vec2 uv = curveUv(vUv);

  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  vec3 col = sampleSplit(uv);

  // scanlines (every 2px)
  float scan = sin(uv.y * uResolution.y * 1.7) * 0.5 + 0.5;
  col *= mix(1.0, scan, uScanlineStrength);

  // soft refresh roll
  float roll = sin(uv.y * 120.0 - uTime * 1.4) * 0.012;
  col += roll;

  // flicker
  col *= 1.0 - uFlicker * (sin(uTime * 60.0) * 0.5 + 0.5) * 0.05;

  // vignette
  float dist = length(vUv - 0.5);
  float vig = smoothstep(0.85, 0.25, dist);
  col *= mix(1.0, vig, uVignette);

  // phosphor lift
  col = pow(col, vec3(0.92));
  col *= 1.1;

  gl_FragColor = vec4(col, 1.0);
}
`;

export const CRTScreenMaterial = shaderMaterial(
  {
    uMap: null as THREE.Texture | null,
    uTime: 0,
    uResolution: new THREE.Vector2(800, 600),
    uCurvature: 6.0,
    uScanlineStrength: 0.25,
    uAberration: 0.0022,
    uVignette: 0.85,
    uFlicker: 0.3,
  },
  vertexShader,
  fragmentShader,
);

extend({ CRTScreenMaterial });

declare module "@react-three/fiber" {
  interface ThreeElements {
    cRTScreenMaterial: ThreeElement<typeof CRTScreenMaterial>;
  }
}
