/**
 * M1 golden parity: Easing (all 18) + bezier + random + colors vs reference.
 */
import { describe, expect, it } from 'vitest';
import {
  Easing,
  bezier,
  interpolateColors,
  processColor,
  random,
} from '../src/animation/index.js';
import { Remotion } from './reference.js';

const TS = [0, 0.25, 0.5, 0.75, 1, -0.5, 1.5];

describe('Easing parity', () => {
  const statics: Array<[string, (e: any) => any, (e: any) => any]> = [
    ['step0', (e) => e.step0, (e) => e.step0],
    ['step1', (e) => e.step1, (e) => e.step1],
    ['linear', (e) => e.linear, (e) => e.linear],
    ['ease', (e) => e.ease, (e) => e.ease],
    ['quad', (e) => e.quad, (e) => e.quad],
    ['cubic', (e) => e.cubic, (e) => e.cubic],
    ['sin', (e) => e.sin, (e) => e.sin],
    ['circle', (e) => e.circle, (e) => e.circle],
    ['exp', (e) => e.exp, (e) => e.exp],
    ['bounce', (e) => e.bounce, (e) => e.bounce],
  ];
  for (const [name, mine, ref] of statics) {
    it(`Easing.${name}`, () => {
      for (const t of TS) {
        expect(Math.abs(mine(Easing)(t) - ref(Remotion.Easing)(t))).toBeLessThanOrEqual(1e-9);
      }
    });
  }

  it('poly(n)', () => {
    for (const n of [2, 3, 4]) {
      for (const t of [0, 0.5, 1]) {
        expect(Math.abs(Easing.poly(n)(t) - Remotion.Easing.poly(n)(t))).toBeLessThanOrEqual(1e-9);
      }
    }
  });

  it('elastic(b) / back(s)', () => {
    for (const t of TS) {
      expect(Math.abs(Easing.elastic()(t) - Remotion.Easing.elastic()(t))).toBeLessThanOrEqual(1e-9);
      expect(Math.abs(Easing.elastic(2)(t) - Remotion.Easing.elastic(2)(t))).toBeLessThanOrEqual(1e-9);
      expect(Math.abs(Easing.back()(t) - Remotion.Easing.back()(t))).toBeLessThanOrEqual(1e-9);
      expect(Math.abs(Easing.back(2)(t) - Remotion.Easing.back(2)(t))).toBeLessThanOrEqual(1e-9);
    }
  });

  it('in / out / inOut modifiers', () => {
    for (const t of TS) {
      expect(Math.abs(Easing.in(Easing.quad)(t) - Remotion.Easing.in(Remotion.Easing.quad)(t))).toBeLessThanOrEqual(1e-9);
      expect(Math.abs(Easing.out(Easing.quad)(t) - Remotion.Easing.out(Remotion.Easing.quad)(t))).toBeLessThanOrEqual(1e-9);
      expect(Math.abs(Easing.inOut(Easing.quad)(t) - Remotion.Easing.inOut(Remotion.Easing.quad)(t))).toBeLessThanOrEqual(1e-9);
      expect(Math.abs(Easing.out(Easing.bounce)(t) - Remotion.Easing.out(Remotion.Easing.bounce)(t))).toBeLessThanOrEqual(1e-9);
    }
  });

  it('bezier() passthrough', () => {
    for (const t of TS) {
      expect(
        Math.abs(Easing.bezier(0.16, 1, 0.3, 1)(t) - Remotion.Easing.bezier(0.16, 1, 0.3, 1)(t)),
      ).toBeLessThanOrEqual(1e-9);
    }
    expect(() => Easing.bezier(2, 0, 0.5, 1)).toThrow();
  });

  it('Easing.spring() basic + tail flag', () => {
    const a = Easing.spring();
    const b = Remotion.Easing.spring();
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      expect(Math.abs(a(t) - b(t))).toBeLessThanOrEqual(1e-6);
    }
    const tail = Easing.spring({ allowTail: true });
    expect(tail.remotionShouldExtendRight).toBe(true);
    expect(Easing.spring().remotionShouldExtendRight ?? false).toBe(false);
    expect(tail(0)).toBe(0);
    expect(a(1)).toBe(1);
  });
});

describe('bezier parity', () => {
  it('matches reference across ease curves', () => {
    const curves: Array<[number, number, number, number]> = [
      [0.42, 0, 1, 1],
      [0.16, 1, 0.3, 1],
      [0.12, 0.9, 0.25, 1],
      [0.25, 0.1, 0.25, 1],
      [0, 0, 1, 1],
    ];
    for (const [x1, y1, x2, y2] of curves) {
      for (const x of [0, 0.1, 0.33, 0.5, 0.77, 0.9, 1]) {
        expect(Math.abs(bezier(x1, y1, x2, y2)(x) - Remotion.Easing.bezier(x1, y1, x2, y2)(x))).toBeLessThanOrEqual(1e-9);
      }
    }
  });
});

describe('random parity', () => {
  it('deterministic per seed and matches reference', () => {
    for (const seed of [0, 1, 42, 'hello', 'cafe-reel', 0.5]) {
      expect(random(seed)).toBe(Remotion.random(seed));
      expect(random(seed)).toBe(random(seed));
    }
  });
  it('null → Math.random range; invalid → throw', () => {
    const v = random(null);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
    expect(() => (random as any)({})).toThrow();
  });
});

describe('color parity', () => {
  it('processColor parses core formats (via identity interpolation)', () => {
    // Reference does not export processColor; verify parsing end-to-end:
    // interpolating [c, c] must yield the identical normalized string.
    const samples = [
      '#ff0000', '#f00', '#ff000080', '#f008',
      'rgb(255, 0, 0)', 'rgba(255, 0, 0, 0.5)', 'rgba(255, 0, 0, 0.123)',
      'rgb(127.5, 0, 0)', 'rgb(300, -10, 0)',
      'hsl(0, 100%, 50%)', 'hsla(120, 100%, 25%, 0.5)',
      'hwb(0 0% 0%)', 'hwb(0 0% 0% / 50%)',
      'lab(50 0 0)', 'lab(50 0 0 / 50%)',
      'lch(50 0 0)', 'oklab(0.5 0 0)', 'oklch(0.5 0.1 180)', 'oklch(50% 0.1 180)',
      'red', 'white', 'black', 'transparent', 'rebeccapurple',
    ];
    for (const s of samples) {
      const expected = Remotion.interpolateColors(0.5, [0, 1], [s, s]);
      expect(interpolateColors(0.5, [0, 1], [s, s]), s).toBe(expected);
      // Direct unit check on our parser shape.
      const mine = processColor(s);
      expect(mine.r).toBeGreaterThanOrEqual(0);
      expect(mine.a).toBeGreaterThanOrEqual(0);
      expect(mine.a).toBeLessThanOrEqual(1);
    }
  });

  it('processColor rejects what the reference rejects', () => {
    const invalid = [
      'rgb(255,0,0,0.5)',
      'rgb(100%, 0%, 0%)',
      'rgb(255 0 0 / 50%)',
      'hsl(0 100% 50%)',
      'hsl(0, 50, 50)',
      'hsl(180deg, 100%, 50%)',
      'rgba(255, 0, 0, 50%)',
      'notacolor',
      '#gg0000',
    ];
    for (const s of invalid) {
      expect(() => Remotion.interpolateColors(0.5, [0, 1], [s, s]), `ref accepts ${s}`).toThrow();
      expect(() => interpolateColors(0.5, [0, 1], [s, s]), `x80 accepts ${s}`).toThrow();
    }
  });

  it('interpolateColors matches reference strings', () => {
    const pairs: Array<[number, string[]]> = [
      [0, ['#ff0000', '#0000ff']],
      [0.5, ['#ff0000', '#0000ff']],
      [1, ['#ff0000', '#0000ff']],
      [0.25, ['red', 'green', 'blue']],
      [0.5, ['red', 'green', 'blue']],
      [15, ['rgba(0, 0, 0, 0)', 'rgba(255, 255, 255, 1)']],
      [0.5, ['hsl(0, 100%, 50%)', 'hsl(240, 100%, 50%)']],
      [0.5, ['oklch(0.5 0.1 180)', 'oklch(0.8 0.05 90)']],
      [0.5, ['lab(50 0 0)', 'lab(80 20 -20)']],
      [0.3, ['#ff000080', '#00ff00']],
    ];
    for (const [input, outs] of pairs) {
      expect(
        interpolateColors(input, outs.map((_, i) => i), outs),
        `input=${input} outs=${outs.join(' | ')}`,
      ).toBe(
        Remotion.interpolateColors(input, outs.map((_, i) => i), outs),
      );
    }
  });
});
