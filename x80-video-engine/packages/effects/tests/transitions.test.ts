/**
 * M7 transition tests: endpoints approximate pure A/B, midpoints are
 * deterministic blends, errors are loud.
 */
import { createCanvas } from '@napi-rs/canvas';
import { describe, expect, it } from 'vitest';
import { applyTransitionByName, transitionNames } from '../src/index.js';
import type { TransitionDraw } from '../src/index.js';

const W = 160;
const H = 120;

const card = (base: string, accent: string): unknown => {
  const c = createCanvas(W, H);
  const x = c.getContext('2d');
  x.fillStyle = base;
  x.fillRect(0, 0, W, H);
  x.fillStyle = accent;
  x.fillRect(20, 20, 50, 50);
  x.beginPath();
  x.arc(120, 80, 20, 0, Math.PI * 2);
  x.fill();
  return c;
};

const A = () => card('#a33c2a', '#f5d020');
const B = () => card('#2456c8', '#40e0d0');

const wrapRaw = (raw: {
  getImageData(sx: number, sy: number, sw: number, sh: number): ImageData;
  putImageData(img: ImageData, dx: number, dy: number): void;
  createImageData(w: number, h: number): ImageData;
  drawImage(...args: never[]): void;
  save(): void;
  restore(): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  arc(x: number, y: number, r: number, a0: number, a1: number, ccw?: boolean): void;
  fill(fillRule?: CanvasFillRule): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  translate(x: number, y: number): void;
  scale(x: number, y: number): void;
  globalAlpha: number;
  globalCompositeOperation: never;
  fillStyle: never;
  filter: string;
}): TransitionDraw['ctx'] => ({
  save: () => raw.save(),
  restore: () => raw.restore(),
  drawImage: (img: unknown, ...args: number[]) => raw.drawImage(img as never, ...args as never[]),
  beginPath: () => raw.beginPath(),
  moveTo: (x: number, y: number) => raw.moveTo(x, y),
  arc: (x: number, y: number, r: number, a0: number, a1: number) => raw.arc(x, y, r, a0, a1),
  fill: () => raw.fill(),
  fillRect: (x: number, y: number, w: number, h: number) => raw.fillRect(x, y, w, h),
  translate: (x: number, y: number) => raw.translate(x, y),
  scale: (x: number, y: number) => raw.scale(x, y),
  getImageData: (sx: number, sy: number, sw: number, sh: number) => raw.getImageData(sx, sy, sw, sh),
  putImageData: (img: ImageData, dx: number, dy: number) => raw.putImageData(img, dx, dy),
  createImageData: (w: number, h: number) => raw.createImageData(w, h),
  createLinearGradient: () => {
    throw new Error('unused in transitions');
  },
  createRadialGradient: () => {
    throw new Error('unused in transitions');
  },
  stroke: () => undefined,
  lineTo: () => undefined,
  rect: () => undefined,
  clip: () => undefined,
  rotate: () => undefined,
  strokeStyle: '',
  lineWidth: 1,
  get globalAlpha() {
    return raw.globalAlpha;
  },
  set globalAlpha(v: number) {
    raw.globalAlpha = v;
  },
  get globalCompositeOperation() {
    return raw.globalCompositeOperation as string;
  },
  set globalCompositeOperation(v: string) {
    raw.globalCompositeOperation = v as never;
  },
  get fillStyle() {
    return String(raw.fillStyle);
  },
  set fillStyle(v: string) {
    raw.fillStyle = v as never;
  },
  get filter() {
    return (raw as unknown as { filter: string }).filter;
  },
  set filter(v: string) {
    (raw as unknown as { filter: string }).filter = v;
  },
});

const run = (name: string, p: number, params?: Record<string, unknown>): Buffer => {
  const c = createCanvas(W, H);
  const raw = c.getContext('2d');
  const ctx = wrapRaw(raw as never);
  const t: TransitionDraw = {
    ctx,
    width: W,
    height: H,
    a: A(),
    b: B(),
    createTemp: (w: number, h: number) => {
      const tc = createCanvas(w, h);
      const tx = tc.getContext('2d');
      const wrapped = wrapRaw(tx as never);
      return { canvas: tc as never, ctx: wrapped };
    },
  };
  applyTransitionByName(t, name, p, params);
  return Buffer.from(raw.getImageData(0, 0, W, H).data);
};

const pure = (which: 'a' | 'b'): Buffer => {
  const c = createCanvas(W, H);
  const x = c.getContext('2d');
  x.drawImage((which === 'a' ? A() : B()) as never, 0, 0);
  return Buffer.from(x.getImageData(0, 0, W, H).data);
};

const avgDiff = (a: Buffer, b: Buffer): number => {
  let sum = 0;
  for (let i = 0; i < a.length; i += 4) {
    sum += Math.abs(a[i]! - b[i]!) + Math.abs(a[i + 1]! - b[i + 1]!) + Math.abs(a[i + 2]! - b[i + 2]!);
  }
  return sum / (a.length / 4);
};

describe('transitions', () => {
  it('covers all 18 targets + none', () => {
    expect(transitionNames()).toEqual([
      'book-flip', 'clock-wipe', 'cross-zoom', 'crosswarp', 'dissolve',
      'dreamy-zoom', 'fade', 'film-burn', 'flip', 'iris', 'linear-blur',
      'none', 'push-cut', 'ripple', 'slide', 'swap', 'wipe',
      'zoom-blur', 'zoom-in-out',
    ]);
  });

  it('endpoints approximate pure scenes', () => {
    const a = pure('a');
    const b = pure('b');
    for (const name of transitionNames()) {
      expect(avgDiff(run(name, 0), a), `${name} p=0`).toBeLessThan(3);
      expect(avgDiff(run(name, 1), b), `${name} p=1`).toBeLessThan(4);
    }
  });

  it('midpoints are deterministic blends', () => {
    const a = pure('a');
    const b = pure('b');
    for (const name of transitionNames()) {
      const m1 = run(name, 0.5);
      const m2 = run(name, 0.5);
      expect(m1.equals(m2), `${name} deterministic`).toBe(true);
      if (name === 'none') {
        // Hard cut: midpoint is still A.
        expect(avgDiff(m1, a), 'none is A at 0.5').toBeLessThan(1);
        continue;
      }
      expect(avgDiff(m1, a), `${name} differs A`).toBeGreaterThan(2);
      expect(avgDiff(m1, b), `${name} differs B`).toBeGreaterThan(2);
    }
  });

  it('errors are loud', () => {
    expect(() => run('nope', 0.5)).toThrow('Unknown transition');
    expect(() => run('slide', 0.5, { direction: 'diagonal' })).toThrow('left|right|up|down');
    expect(() => run('fade', NaN)).toThrow('finite');
    expect(() => run('flip', 0.5, { axis: 'z' })).toThrow('x|y');
  });
});
