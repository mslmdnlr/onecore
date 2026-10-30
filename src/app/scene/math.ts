import { Targets } from './types';

export const TAU = Math.PI * 2;
export type RGB = [number, number, number];
export type Vec3 = [number, number, number];

export const rand = (min = 0, max = 1) => min + Math.random() * (max - min);
export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Normal dağılımlı rastgele sayı */
export const gauss = () => {
  let u = 0;
  let v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
};

export const randomDir = (): Vec3 => {
  const z = rand(-1, 1);
  const a = rand(0, TAU);
  const r = Math.sqrt(1 - z * z);
  return [r * Math.cos(a), z, r * Math.sin(a)];
};

export const normalize = (v: Vec3): Vec3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

/** '#rrggbb' → 0-1 aralığında RGB */
export const rgb = (hex: string): RGB => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export const mixRGB = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/** Açının [0, 2π) aralığındaki karşılığı */
export const wrap = (a: number) => ((a % TAU) + TAU) % TAU;

export function put(
  T: Targets,
  i: number,
  x: number,
  y: number,
  z: number,
  r: number,
  g: number,
  b: number,
  a: number,
  s: number,
) {
  const p = i * 3;
  const q = i * 4;
  T.pos[p] = x;
  T.pos[p + 1] = y;
  T.pos[p + 2] = z;
  T.col[q] = r;
  T.col[q + 1] = g;
  T.col[q + 2] = b;
  T.col[q + 3] = a;
  T.size[i] = s;
}
