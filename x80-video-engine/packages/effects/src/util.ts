/**
 * M6 — Shared pixel/noise/blur utilities. All deterministic; no wall-clock.
 */
import type { EffectContext } from './types.js';
import { createSeededRng } from '@x80/core';

// ImageData is DOM-global in types but may be absent at runtime; the backend
// provides compatible instances. We only use it as a structural type.
export type Pixels = { data: Uint8ClampedArray<ArrayBufferLike>; width: number; height: number };

export const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
export const clamp255 = (v: number): number => (v < 0 ? 0 : v > 255 ? 255 : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const num = (params: Record<string, unknown>, key: string, fallback: number): number => {
  const v = params[key] ?? fallback;
  if (typeof v !== 'number' || Number.isNaN(v)) {
    throw new Error(`Effect param "${key}" must be a number`);
  }
  return v;
};

export const str = (params: Record<string, unknown>, key: string, fallback: string): string => {
  const v = params[key] ?? fallback;
  if (typeof v !== 'string') {
    throw new Error(`Effect param "${key}" must be a string`);
  }
  return v;
};

export const bool = (params: Record<string, unknown>, key: string, fallback: boolean): boolean => {
  const v = params[key] ?? fallback;
  if (typeof v !== 'boolean') {
    throw new Error(`Effect param "${key}" must be a boolean`);
  }
  return v;
};

export const hexToRgb = (hex: string): [number, number, number] => {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) {
    h = h.split('').map((c) => c + c).join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) {
    throw new Error(`Effect color must be #rgb/#rrggbb (got "${hex}")`);
  }
  return [
    Number.parseInt(h.slice(0, 2), 16),
    Number.parseInt(h.slice(2, 4), 16),
    Number.parseInt(h.slice(4, 6), 16),
  ];
};

export const luma = (r: number, g: number, b: number): number =>
  0.2126 * r + 0.7152 * g + 0.0722 * b;

export const getPixels = (ecx: EffectContext): Pixels => {
  const img = ecx.ctx.getImageData(0, 0, ecx.width, ecx.height);
  return { data: img.data, width: ecx.width, height: ecx.height };
};

export const putPixels = (ecx: EffectContext, px: Pixels): void => {
  const img = ecx.ctx.createImageData(px.width, px.height);
  img.data.set(px.data);
  ecx.ctx.putImageData(img, 0, 0);
};

export const blankPixels = (ecx: EffectContext): Pixels => ({
  data: new Uint8ClampedArray(ecx.width * ecx.height * 4),
  width: ecx.width,
  height: ecx.height,
});

/**
 * Backend-accelerated gaussian blur via standard Canvas2D ctx.filter.
 * Falls back to the portable JS sliding-window box blur when unsupported.
 * Deterministic per backend build; radius capped at 100.
 */
export const nativeBlur = (ecx: EffectContext, radius: number): Pixels => {
  const r = Math.max(0, Math.min(100, radius));
  if (r <= 0) {
    const px = getPixels(ecx);
    return { data: px.data.slice(), width: px.width, height: px.height };
  }
  try {
    const temp = ecx.createTemp(ecx.width, ecx.height);
    temp.ctx.filter = `blur(${r}px)`;
    temp.ctx.drawImage(ecx.canvas as unknown, 0, 0);
    temp.ctx.filter = 'none';
    const img = temp.ctx.getImageData(0, 0, ecx.width, ecx.height);
    return { data: img.data.slice(), width: ecx.width, height: ecx.height };
  } catch {
    return blurPixels(getPixels(ecx), r);
  }
};

/** Native blur of arbitrary pixels: upload → filter-draw → read back. */
export const nativeBlurPixels = (ecx: EffectContext, px: Pixels, radius: number): Pixels => {
  const r = Math.max(0, Math.min(100, radius));
  if (r <= 0) {
    return { data: px.data.slice(), width: px.width, height: px.height };
  }
  try {
    const up = ecx.createTemp(px.width, px.height);
    const img = up.ctx.createImageData(px.width, px.height);
    img.data.set(px.data);
    up.ctx.putImageData(img, 0, 0);
    const down = ecx.createTemp(px.width, px.height);
    down.ctx.filter = `blur(${r}px)`;
    down.ctx.drawImage(up.canvas as unknown, 0, 0);
    down.ctx.filter = 'none';
    const out = down.ctx.getImageData(0, 0, px.width, px.height);
    return { data: out.data.slice(), width: px.width, height: px.height };
  } catch {
    return blurPixels(px, r);
  }
};

/** Portable fallback: 3× sliding-window box blur (deterministic, slower). */
export const blurPixels = (src: Pixels, radius: number): Pixels => {
  const r = Math.max(0, Math.min(100, Math.round(radius)));
  if (r === 0) {
    return { data: src.data.slice(), width: src.width, height: src.height };
  }
  let current = Float32Array.from(src.data);
  let next = new Float32Array(current.length);
  const { width: w, height: h } = src;
  for (let pass = 0; pass < 3; pass += 1) {
    boxPassH(current, next, w, h, r);
    boxPassV(next, current, w, h, r);
  }
  const out = new Uint8ClampedArray(current.length);
  for (let i = 0; i < current.length; i += 1) {
    out[i] = Math.round(current[i] as number);
  }
  return { data: out, width: w, height: h };
};

const boxPassH = (
  src: Float32Array,
  dst: Float32Array,
  w: number,
  h: number,
  r: number,
): void => {
  const diameter = 2 * r + 1;
  for (let y = 0; y < h; y += 1) {
    const row = y * w * 4;
    let s0 = 0;
    let s1 = 0;
    let s2 = 0;
    let s3 = 0;
    for (let k = -r; k <= r; k += 1) {
      const sx = Math.min(w - 1, Math.max(0, k));
      const i = (row + sx) * 4;
      s0 += src[i] as number;
      s1 += src[i + 1] as number;
      s2 += src[i + 2] as number;
      s3 += src[i + 3] as number;
    }
    for (let x = 0; x < w; x += 1) {
      const o = (row + x) * 4;
      dst[o] = s0 / diameter;
      dst[o + 1] = s1 / diameter;
      dst[o + 2] = s2 / diameter;
      dst[o + 3] = s3 / diameter;
      const si = (row + Math.max(0, x - r)) * 4;
      const ai = (row + Math.min(w - 1, x + r + 1)) * 4;
      s0 += (src[ai] as number) - (src[si] as number);
      s1 += (src[ai + 1] as number) - (src[si + 1] as number);
      s2 += (src[ai + 2] as number) - (src[si + 2] as number);
      s3 += (src[ai + 3] as number) - (src[si + 3] as number);
    }
  }
};

const boxPassV = (
  src: Float32Array,
  dst: Float32Array,
  w: number,
  h: number,
  r: number,
): void => {
  const diameter = 2 * r + 1;
  for (let x = 0; x < w; x += 1) {
    let s0 = 0;
    let s1 = 0;
    let s2 = 0;
    let s3 = 0;
    for (let k = -r; k <= r; k += 1) {
      const sy = Math.min(h - 1, Math.max(0, k));
      const i = (sy * w + x) * 4;
      s0 += src[i] as number;
      s1 += src[i + 1] as number;
      s2 += src[i + 2] as number;
      s3 += src[i + 3] as number;
    }
    for (let y = 0; y < h; y += 1) {
      const o = (y * w + x) * 4;
      dst[o] = s0 / diameter;
      dst[o + 1] = s1 / diameter;
      dst[o + 2] = s2 / diameter;
      dst[o + 3] = s3 / diameter;
      const si = (Math.max(0, y - r) * w + x) * 4;
      const ai = (Math.min(h - 1, y + r + 1) * w + x) * 4;
      s0 += (src[ai] as number) - (src[si] as number);
      s1 += (src[ai + 1] as number) - (src[si + 1] as number);
      s2 += (src[ai + 2] as number) - (src[si + 2] as number);
      s3 += (src[ai + 3] as number) - (src[si + 3] as number);
    }
  }
};

/** 3x3 convolution (edge-clamped), alpha preserved unless includeAlpha. */
export const convolve3 = (
  src: Pixels,
  kernel: readonly number[],
  divisor = 1,
  bias = 0,
): Pixels => {
  const { data, width, height } = src;
  const out = new Uint8ClampedArray(data.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      for (let c = 0; c < 3; c += 1) {
        let acc = 0;
        for (let ky = -1; ky <= 1; ky += 1) {
          for (let kx = -1; kx <= 1; kx += 1) {
            const sx = Math.min(width - 1, Math.max(0, x + kx));
            const sy = Math.min(height - 1, Math.max(0, y + ky));
            acc += (data[(sy * width + sx) * 4 + c] as number) * (kernel[(ky + 1) * 3 + (kx + 1)] as number);
          }
        }
        out[(y * width + x) * 4 + c] = clamp255(acc / divisor + bias);
      }
      out[(y * width + x) * 4 + 3] = data[(y * width + x) * 4 + 3] as number;
    }
  }
  return { data: out, width, height };
};

/** Deterministic integer-lattice hash → [0,1). */
export const hash2 = (x: number, y: number, seed: number): number => {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

const smootherstep = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10);

/** Value noise with seeded lattice. */
export const valueNoise = (x: number, y: number, seed: number): number => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const a = hash2(xi, yi, seed);
  const b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed);
  const d = hash2(xi + 1, yi + 1, seed);
  const u = smootherstep(xf);
  const v = smootherstep(yf);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
};

/** Fractal noise (octaves of value noise, lacunarity 2, gain 0.5). */
export const fbm = (x: number, y: number, seed: number, octaves: number): number => {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < Math.max(1, Math.round(octaves)); o += 1) {
    sum += amp * valueNoise(x * freq, y * freq, seed + o * 101);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
};

export const makeRng = (seed: number | string): (() => number) => createSeededRng(seed);

/** Bilinear sample of RGBA data (clamped edges). Returns [r,g,b,a]. */
export const sampleBilinear = (
  data: Uint8ClampedArray,
  w: number,
  h: number,
  x: number,
  y: number,
): [number, number, number, number] => {
  const x0 = Math.min(w - 1, Math.max(0, Math.floor(x)));
  const y0 = Math.min(h - 1, Math.max(0, Math.floor(y)));
  const x1 = Math.min(w - 1, x0 + 1);
  const y1 = Math.min(h - 1, y0 + 1);
  const fx = Math.min(1, Math.max(0, x - x0));
  const fy = Math.min(1, Math.max(0, y - y0));
  const out: [number, number, number, number] = [0, 0, 0, 0];
  for (let c = 0; c < 4; c += 1) {
    const a = data[(y0 * w + x0) * 4 + c] as number;
    const b = data[(y0 * w + x1) * 4 + c] as number;
    const cc = data[(y1 * w + x0) * 4 + c] as number;
    const d = data[(y1 * w + x1) * 4 + c] as number;
    out[c] = lerp(lerp(a, b, fx), lerp(cc, d, fx), fy);
  }
  return out;
};

/** Nearest sample (fast path for distortion previews/tests). */
export const sampleNearest = (
  data: Uint8ClampedArray,
  w: number,
  h: number,
  x: number,
  y: number,
): [number, number, number, number] => {
  const xi = Math.min(w - 1, Math.max(0, Math.round(x)));
  const yi = Math.min(h - 1, Math.max(0, Math.round(y)));
  const i = (yi * w + xi) * 4;
  return [data[i] as number, data[i + 1] as number, data[i + 2] as number, data[i + 3] as number];
};

