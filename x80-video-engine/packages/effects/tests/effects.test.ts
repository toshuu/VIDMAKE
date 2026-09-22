/**
 * M6 effect tests: registry-wide determinism, neutral no-ops,
 * hand-computed color math, error paths, region scoping.
 */
import { createCanvas } from '@napi-rs/canvas';
import { resolveEffectParams } from '@x80/core';
import { describe, expect, it } from 'vitest';
import { applyEffect, applyEffectByName, effectNames } from '../src/index.js';
import type { EffectContext } from '../src/index.js';

const W = 96;
const H = 72;

/** Wrap a real napi canvas in the structural EffectContext. */
const wrapCanvas = (canvas: {
  width: number;
  height: number;
  getContext: (kind: '2d') => never;
}): EffectContext => {
  const raw = canvas.getContext('2d') as unknown as {
    getImageData(sx: number, sy: number, sw: number, sh: number): ImageData;
    putImageData(img: ImageData, dx: number, dy: number): void;
    createImageData(w: number, h: number): ImageData;
    drawImage(...args: never[]): void;
    save(): void;
    restore(): void;
    beginPath(): void;
    rect(x: number, y: number, w: number, h: number): void;
    clip(): void;
    arc(x: number, y: number, r: number, a0: number, a1: number): void;
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    fill(): void;
    stroke(): void;
    translate(x: number, y: number): void;
    scale(x: number, y: number): void;
    rotate(a: number): void;
    fillRect(x: number, y: number, w: number, h: number): void;
    createLinearGradient(x0: number, y0: number, x1: number, y1: number): never;
    createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): never;
    globalAlpha: number;
    globalCompositeOperation: never;
    fillStyle: never;
    strokeStyle: never;
    lineWidth: number;
  };
  const ctx: EffectContext['ctx'] = {
    getImageData: (sx, sy, sw, sh) => raw.getImageData(sx, sy, sw, sh),
    putImageData: (img, dx, dy) => raw.putImageData(img, dx, dy),
    createImageData: (w, h) => raw.createImageData(w, h),
    drawImage: (img: unknown, ...args: number[]) => raw.drawImage(img as never, ...args as never[]),
    save: () => raw.save(),
    restore: () => raw.restore(),
    beginPath: () => raw.beginPath(),
    rect: (x, y, w, h) => raw.rect(x, y, w, h),
    clip: () => raw.clip(),
    arc: (x, y, r, a0, a1) => raw.arc(x, y, r, a0, a1),
    moveTo: (x, y) => raw.moveTo(x, y),
    lineTo: (x, y) => raw.lineTo(x, y),
    fill: () => raw.fill(),
    stroke: () => raw.stroke(),
    translate: (x, y) => raw.translate(x, y),
    scale: (x, y) => raw.scale(x, y),
    rotate: (a) => raw.rotate(a),
    fillRect: (x, y, w, h) => raw.fillRect(x, y, w, h),
    createLinearGradient: (x0, y0, x1, y1) => raw.createLinearGradient(x0, y0, x1, y1) as never,
    createRadialGradient: (x0, y0, r0, x1, y1, r1) =>
      raw.createRadialGradient(x0, y0, r0, x1, y1, r1) as never,
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
    get strokeStyle() {
      return String(raw.strokeStyle);
    },
    set strokeStyle(v: string) {
      raw.strokeStyle = v as never;
    },
    get lineWidth() {
      return raw.lineWidth;
    },
    set lineWidth(v: number) {
      raw.lineWidth = v;
    },
    get filter() {
      return (raw as unknown as { filter: string }).filter;
    },
    set filter(v: string) {
      (raw as unknown as { filter: string }).filter = v;
    },
  };
  return {
    // canvas keeps the NATIVE handle: drawImage targets need it, and it
    // structurally satisfies width/height/getContext.
    canvas: canvas as unknown as EffectContext['canvas'],
    ctx,
    width: canvas.width,
    height: canvas.height,
    createTemp: (w: number, h: number) => {
      const c = createCanvas(w, h);
      const wrapped = wrapCanvas(c as never);
      return { canvas: c as unknown as EffectContext['canvas'], ctx: wrapped.ctx };
    },
  };
};

/** Deterministic fixture: gray gradient + red square + blue circle. */
const makeFixture = (): EffectContext => {
  const canvas = createCanvas(W, H);
  const raw = canvas.getContext('2d');
  const grad = raw.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, '#000000');
  grad.addColorStop(1, '#ffffff');
  raw.fillStyle = grad;
  raw.fillRect(0, 0, W, H);
  raw.fillStyle = '#e5484d';
  raw.fillRect(10, 10, 30, 30);
  raw.fillStyle = '#3c5aff';
  raw.beginPath();
  raw.arc(70, 50, 15, 0, Math.PI * 2);
  raw.fill();
  return wrapCanvas(canvas as never);
};

const snapshot = (ecx: EffectContext): Buffer =>
  Buffer.from(ecx.ctx.getImageData(0, 0, ecx.width, ecx.height).data);

describe('registry', () => {
  it('lists a broad catalog (no tiny subset)', () => {
    expect(effectNames().length).toBeGreaterThanOrEqual(60);
  });

  it('every effect applies deterministically with defaults', () => {
    for (const name of effectNames()) {
      const a = makeFixture();
      applyEffectByName(a, name);
      const first = snapshot(a);
      const b = makeFixture();
      applyEffectByName(b, name);
      expect(snapshot(b).equals(first), name).toBe(true);
    }
  });

  it('disabled is a no-op for every effect', () => {
    for (const name of effectNames()) {
      const a = makeFixture();
      const before = snapshot(a);
      applyEffect(a, { type: name, disabled: true });
      expect(snapshot(a).equals(before), name).toBe(true);
    }
  });

  it('unknown names throw loudly', () => {
    expect(() => applyEffectByName(makeFixture(), 'not-a-real-effect')).toThrow('Unknown effect');
  });

  it('neutral params are no-ops', () => {
    const neutrals: Array<[string, Record<string, unknown>]> = [
      ['brightness', { amount: 0 }],
      ['contrast', { amount: 0 }],
      ['exposure', { stops: 0 }],
      ['saturation', { amount: 1 }],
      ['vibrance', { amount: 0 }],
      ['hue', { degrees: 0 }],
      ['tint', { amount: 0 }],
      ['invert', { amount: 0 }],
      ['levels', {}],
      ['white-balance', { temperature: 0 }],
      ['shadows-highlights', { shadows: 0, highlights: 0 }],
      ['blur', { radius: 0 }],
      ['vignette', { strength: 0 }],
      ['noise', { amount: 0 }],
      ['pixelate', { size: 1 }],
      ['motion-blur', { distance: 0 }],
      ['zoom-blur', { strength: 0 }],
      ['wave', { amplitude: 0 }],
      ['waves', { ampX: 0, ampY: 0 }],
      ['ripple', { amplitude: 0 }],
      ['displacement', { scale: 0 }],
      ['fisheye', { strength: 0 }],
      ['barrel-distortion', { amount: 0 }],
      ['translate', { dx: 0, dy: 0 }],
      ['scale', { sx: 1, sy: 1 }],
      ['skew', { ax: 0, ay: 0 }],
      ['corner-pin', {}],
      ['glow', { intensity: 0 }],
      ['shine', { intensity: 0 }],
      ['light-leak', { intensity: 0 }],
      ['linear-gradient', { opacity: 0 }],
      ['pixel-dissolve', { progress: 0 }],
      ['tear', { offset: 0 }],
      ['emboss', { strength: 0 }],
      ['paper', { amount: 0 }],
      ['burlap', { amount: 0 }],
      ['flannel', { amount: 0 }],
      ['roughen-edges', { amount: 0 }],
      ['lut', {}],
    ];
    for (const [name, params] of neutrals) {
      const a = makeFixture();
      const before = snapshot(a);
      applyEffectByName(a, name, params);
      expect(snapshot(a).equals(before), name).toBe(true);
    }
  });
});

describe('exact color math (2x2 fixture)', () => {
  const tiny = (): EffectContext => {
    const canvas = createCanvas(2, 2);
    const raw = canvas.getContext('2d');
    const img = raw.createImageData(2, 2);
    // (100,100,100) (10,20,30) / (255,0,0) (0,255,0)
    img.data.set([100, 100, 100, 255, 10, 20, 30, 255, 255, 0, 0, 255, 0, 255, 0, 255]);
    raw.putImageData(img, 0, 0);
    return wrapCanvas(canvas as never);
  };

  it('brightness/contrast/exposure/invert', () => {
    const a = tiny();
    applyEffectByName(a, 'brightness', { amount: 0.2 });
    expect([...a.ctx.getImageData(0, 0, 1, 1).data]).toEqual([151, 151, 151, 255]);

    const b = tiny();
    applyEffectByName(b, 'contrast', { amount: 1 });
    expect([...b.ctx.getImageData(0, 0, 1, 1).data]).toEqual([72, 72, 72, 255]);

    const c = tiny();
    applyEffectByName(c, 'exposure', { stops: 1 });
    expect([...c.ctx.getImageData(0, 0, 1, 1).data]).toEqual([200, 200, 200, 255]);

    const d = tiny();
    applyEffectByName(d, 'invert', { amount: 1 });
    const px = d.ctx.getImageData(1, 0, 1, 1).data;
    expect([...px]).toEqual([245, 235, 225, 255]);
  });

  it('grayscale/duotone/saturation', () => {
    const a = tiny();
    applyEffectByName(a, 'grayscale');
    expect([...a.ctx.getImageData(0, 1, 1, 1).data]).toEqual([54, 54, 54, 255]);

    const b = tiny();
    applyEffectByName(b, 'duotone', { dark: '#000000', light: '#ffffff' });
    // luma 100 → t=100/255 → ~100 (identity ramp); pure red → luma 54.
    expect([...b.ctx.getImageData(0, 0, 1, 1).data]).toEqual([100, 100, 100, 255]);
    expect([...b.ctx.getImageData(0, 1, 1, 1).data]).toEqual([54, 54, 54, 255]);

    const c = tiny();
    applyEffectByName(c, 'saturation', { amount: 0 });
    expect([...c.ctx.getImageData(0, 1, 1, 1).data]).toEqual([54, 54, 54, 255]);
  });

  it('color-key removes green', () => {
    const a = tiny();
    applyEffectByName(a, 'color-key', { color: '#00ff00', tolerance: 0.2, edge: 0.1 });
    // (0,255,0) pixel → transparent; others intact.
    expect(a.ctx.getImageData(1, 1, 1, 1).data[3]).toBe(0);
    expect(a.ctx.getImageData(0, 0, 1, 1).data[3]).toBe(255);
  });
});

describe('params + regions', () => {
  it('bad param types throw', () => {
    expect(() => applyEffectByName(makeFixture(), 'brightness', { amount: 'x' })).toThrow('"amount"');
    expect(() => applyEffectByName(makeFixture(), 'mirror', { axis: 'z' })).toThrow('x|y');
    expect(() => applyEffectByName(makeFixture(), 'gradient-map', { stops: [] })).toThrow('stops');
    expect(() => applyEffectByName(makeFixture(), 'scale', { sx: 0, sy: 1 })).toThrow('positive');
    expect(() =>
      applyEffectByName(makeFixture(), 'corner-pin', {
        tl: [0.5, 0.5], tr: [0.5, 0.5], br: [0.5, 0.5], bl: [0.5, 0.5],
      }),
    ).toThrow('degenerate');
  });

  it('region scoping leaves outside pixels intact', () => {
    const a = makeFixture();
    const before = snapshot(a);
    applyEffectByName(a, 'invert', { amount: 1 }, { x: W / 2, y: 0, width: W / 2, height: H });
    const after = a.ctx.getImageData(0, 0, W, H).data;
    // Left quarter untouched.
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W / 4; x += 1) {
        const i = (y * W + x) * 4;
        expect(after[i]).toBe(before[i]);
      }
    }
    // Right side changed somewhere.
    let changed = 0;
    for (let y = 0; y < H; y += 1) {
      for (let x = Math.floor((3 * W) / 4); x < W; x += 1) {
        const i = (y * W + x) * 4;
        if (after[i] !== before[i]) {
          changed += 1;
        }
      }
    }
    expect(changed).toBeGreaterThan(100);
  });

  it('resolveEffectParams animates effect params with local frame', () => {
    const resolved = resolveEffectParams(
      { radius: { binding: 'interpolate', inputRange: [0, 30], outputRange: [0, 12] } },
      15,
      30,
    );
    expect(resolved.radius).toBe(6);
  });
});
