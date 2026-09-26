/**
 * motion.ts — first-class motion systems for the open composition language.
 * All helpers compile to the existing frame-pure interpolate/spring core:
 * no new renderer keywords, no wall-clock, same JSON -> same bytes.
 *
 * - keyframes(frames, values, options): explicit multi-stop motion.
 * - stagger(base, index, stepFrames): shift a binding in time for cascades.
 * - motionPath(points, duration, opts): Catmull-Rom sample -> {x, y} bindings.
 * - sharedFly(from, to, window): overlay-leaf bridge across a cut (FLIP idea).
 */
import type { AnimBinding } from './types.js';

type Interp = Extract<AnimBinding, { binding: 'interpolate' }>;

const clampOpts = (easing?: unknown): Interp['options'] => ({
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
  ...(easing !== undefined ? { easing } : {}),
});

const assertFrames = (frames: number[]): void => {
  if (frames.length === 0) throw new Error('motion.keyframes: frames[] must be non-empty');
  for (let i = 0; i < frames.length; i += 1) {
    if (!Number.isFinite(frames[i])) throw new Error(`motion.keyframes: frame[${i}] must be finite`);
    if (i > 0 && frames[i]! <= frames[i - 1]!) {
      throw new Error(`motion.keyframes: frames must be strictly increasing (got ${frames.join(',')})`);
    }
  }
};

/** Explicit keyframe track: frames[] -> values[] (strictly increasing). */
export const keyframes = (
  frames: number[],
  values: number[],
  easing?: unknown,
): AnimBinding => {
  assertFrames(frames);
  if (frames.length !== values.length || values.length === 0) {
    throw new Error('motion.keyframes: frames[] and values[] must be non-empty and equal length');
  }
  for (const v of values) {
    if (!Number.isFinite(v)) throw new Error('motion.keyframes: values must be finite');
  }
  return { binding: 'keyframes', frames: [...frames], values: [...values], options: clampOpts(easing) };
};

/** Shift any scalar binding later by (index * step) frames for cascades. */
export const stagger = (base: AnimBinding, index: number, step: number): AnimBinding => {
  if (!Number.isInteger(index) || index < 0) throw new Error('motion.stagger: index must be an integer >= 0');
  if (!Number.isFinite(step) || step < 0) throw new Error('motion.stagger: step must be finite and >= 0');
  const shift = index * step;
  if (shift === 0) return base;
  if (typeof base === 'number') return base;
  if (base.binding === 'interpolate') {
    return {
      binding: 'interpolate',
      inputRange: base.inputRange.map((f) => f + shift),
      outputRange: [...base.outputRange],
      options: base.options ?? clampOpts(),
    };
  }
  if (base.binding === 'keyframes') {
    return {
      binding: 'keyframes',
      frames: base.frames.map((f) => f + shift),
      values: [...base.values],
      options: base.options ?? clampOpts(),
    };
  }
  if (base.binding === 'spring') {
    const d = typeof base.delay === 'number' ? base.delay : 0;
    return { ...base, delay: d + shift };
  }
  if (base.binding === 'color') {
    return { ...base, inputRange: base.inputRange.map((f) => f + shift) };
  }
  return base;
};

type Pt = [number, number];

/** Catmull-Rom sample through control points (frame-pure, baked to data). */
const catmullRom = (pts: Pt[], t: number): Pt => {
  const n = pts.length - 1;
  const seg = Math.min(n - 1, Math.max(0, Math.floor(t * n)));
  const u = t * n - seg;
  const p0 = pts[Math.max(0, seg - 1)]!;
  const p1 = pts[seg]!;
  const p2 = pts[seg + 1]!;
  const p3 = pts[Math.min(n, seg + 2)]!;
  const f = (a: number, b: number, c: number, d: number): number =>
    0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);
  return [f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])];
};

/**
 * Bake a 2D path into {x, y} interpolate bindings over [0, duration].
 * samples controls fidelity (default 16 segments). Deterministic.
 */
export const motionPath = (
  points: Pt[],
  duration: number,
  opts: { samples?: number; easing?: unknown } = {},
): { x: AnimBinding; y: AnimBinding } => {
  if (points.length < 2) throw new Error('motion.motionPath: need >= 2 points');
  if (!Number.isInteger(duration) || duration < 2) {
    throw new Error('motion.motionPath: duration must be an integer >= 2');
  }
  for (const [px, py] of points) {
    if (!Number.isFinite(px) || !Number.isFinite(py)) {
      throw new Error('motion.motionPath: points must be finite [x,y]');
    }
  }
  const samples = opts.samples ?? 16;
  if (!Number.isInteger(samples) || samples < 4 || samples > 128) {
    throw new Error('motion.motionPath: samples must be an integer 4..128');
  }
  const frames: number[] = [];
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i <= samples; i += 1) {
    const [px, py] = catmullRom(points, i / samples);
    frames.push(Math.round((i / samples) * duration));
    xs.push(Math.round(px * 10) / 10);
    ys.push(Math.round(py * 10) / 10);
  }
  // De-dupe collided integer frames (strictly-increasing engine rule).
  const fi: number[] = [];
  const xi: number[] = [];
  const yi: number[] = [];
  frames.forEach((f, i) => {
    if (i > 0 && f <= fi[fi.length - 1]!) return;
    fi.push(f);
    xi.push(xs[i]!);
    yi.push(ys[i]!);
  });
  const o = clampOpts(opts.easing);
  return {
    x: { binding: 'interpolate', inputRange: fi, outputRange: xi, options: o },
    y: { binding: 'interpolate', inputRange: fi, outputRange: yi, options: o },
  };
};

/**
 * Shared-element fly across a cut: overlay leaf spanning [cut-6, cut+6]
 * interpolating P1 -> P2. Returns the overlay FreeNode fragment; the caller
 * hides both originals in that window via opacity bindings.
 */
export const sharedFly = (
  id: string,
  from: { x: number; y: number; scale?: number },
  to: { x: number; y: number; scale?: number },
  cut: number,
  extra: Record<string, unknown> = {},
): Record<string, unknown> => {
  for (const v of [from.x, from.y, to.x, to.y, cut]) {
    if (!Number.isFinite(v)) throw new Error('motion.sharedFly: from/to/cut must be finite');
  }
  const lo = cut - 6;
  const hi = cut + 6;
  const s0 = from.scale ?? 1;
  const s1 = to.scale ?? 1;
  return {
    id,
    type: 'container',
    x: { binding: 'interpolate', inputRange: [lo, hi], outputRange: [from.x, to.x], options: clampOpts() },
    y: { binding: 'interpolate', inputRange: [lo, hi], outputRange: [from.y, to.y], options: clampOpts() },
    ...(s0 !== 1 || s1 !== 1
      ? {
          scaleX: { binding: 'interpolate', inputRange: [lo, hi], outputRange: [s0, s1], options: clampOpts() },
          scaleY: { binding: 'interpolate', inputRange: [lo, hi], outputRange: [s0, s1], options: clampOpts() },
        }
      : {}),
    ...extra,
  };
};
