/**
 * M1 golden parity: interpolate() scalar core vs Remotion reference.
 * Tolerance 1e-9 for pure numerics.
 */
import { describe, expect, it } from 'vitest';
import { Easing, interpolate } from '../src/animation/index.js';
import { Remotion } from './reference.js';

const close = (a: number, b: number, tol = 1e-9): void => {
  expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);
};

describe('interpolate scalar parity', () => {
  const cases: Array<[number, number[], number[], any?]> = [
    [0, [0, 1], [0, 100]],
    [0.5, [0, 1], [0, 100]],
    [1, [0, 1], [0, 100]],
    [0.25, [0, 1], [0, 100]],
    [0.75, [0, 1], [0, 100]],
    [5, [0, 10], [0, 100]],
    [-5, [0, 10], [0, 100]],
    [15, [0, 10], [0, 100]],
    [150, [0, 300], [1.14, 1]],
    [0, [0, 3], [0.6, 0]],
    [30, [0, 30], [0, 1]],
    [300, [0, 300], [0, 1]],
    [-10, [0, 300], [0, 1]],
    [400, [0, 300], [0, 1]],
    // multi-stop
    [0, [0, 50, 100], [0, 10, 0]],
    [25, [0, 50, 100], [0, 10, 0]],
    [50, [0, 50, 100], [0, 10, 0]],
    [75, [0, 50, 100], [0, 10, 0]],
    [100, [0, 50, 100], [0, 10, 0]],
    [7, [0, 10, 20, 30], [0, 5, 5, 20]],
    // reversed / negative outputs
    [0.5, [0, 1], [100, 0]],
    [0.5, [0, 1], [-50, 50]],
    [2, [0, 4], [1, 1]],
  ];

  for (const [input, ir, or] of cases) {
    it(`scalar input=${input} range=[${ir}] → [${or}]`, () => {
      const expected = Remotion.interpolate(input, ir, or);
      const actual = interpolate(input, ir, or);
      close(actual, expected);
    });
  }

  it('clamp both sides', () => {
    const opts = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
    for (const input of [-5, 0, 5, 10, 15]) {
      close(
        interpolate(input, [0, 10], [0, 100], opts),
        Remotion.interpolate(input, [0, 10], [0, 100], opts),
      );
    }
  });

  it('wrap extrapolation', () => {
    const opts = { extrapolateLeft: 'wrap', extrapolateRight: 'wrap' } as const;
    for (const input of [-15, -10, -1, 11, 21, 35]) {
      close(
        interpolate(input, [0, 10], [0, 100], opts),
        Remotion.interpolate(input, [0, 10], [0, 100], opts),
      );
    }
  });

  it('identity extrapolation returns raw input', () => {
    expect(
      interpolate(-5, [0, 10], [0, 100], { extrapolateLeft: 'identity' }),
    ).toBe(-5);
    expect(
      interpolate(15, [0, 10], [0, 100], { extrapolateRight: 'identity' }),
    ).toBe(15);
    expect(
      Remotion.interpolate(-5, [0, 10], [0, 100], { extrapolateLeft: 'identity' }),
    ).toBe(-5);
  });

  it('per-segment easing array', () => {
    const mine = { easing: [Easing.quad, Easing.cubic] };
    const ref = { easing: [Remotion.Easing.quad, Remotion.Easing.cubic] };
    for (const input of [0, 25, 50, 75, 100]) {
      close(
        interpolate(input, [0, 50, 100], [0, 10, 0], mine),
        Remotion.interpolate(input, [0, 50, 100], [0, 10, 0], ref),
      );
    }
  });

  it('single easing + bezier (reel-style punch)', () => {
    const bez = (e: any) => e.bezier(0.12, 0.9, 0.25, 1);
    for (const f of [0, 3, 5, 9, 10, 20]) {
      close(
        interpolate(f, [0, 10], [1.14, 1], {
          easing: bez(Easing),
          extrapolateRight: 'clamp',
        }),
        Remotion.interpolate(f, [0, 10], [1.14, 1], {
          easing: bez(Remotion.Easing),
          extrapolateRight: 'clamp',
        }),
      );
    }
  });

  it('posterize quantizes input', () => {
    const opts = { posterize: 5 };
    for (const input of [0, 3, 7, 12, 29]) {
      close(
        interpolate(input, [0, 30], [0, 1], opts),
        Remotion.interpolate(input, [0, 30], [0, 1], opts),
      );
    }
  });

  it('perceptual-scale output mode', () => {
    const opts = { output: 'perceptual-scale' } as const;
    for (const input of [0, 0.5, 1, 2]) {
      close(
        interpolate(input, [0, 1], [1, 4], opts),
        Remotion.interpolate(input, [0, 1], [1, 4], opts),
      );
    }
  });

  it('spring allowTail continuation past keyframe', () => {
    const mine = {
      easing: Easing.spring({ allowTail: true }),
      extrapolateRight: 'clamp' as const,
    };
    const ref = {
      easing: Remotion.Easing.spring({ allowTail: true }),
      extrapolateRight: 'clamp' as const,
    };
    for (const input of [0, 10, 29, 30, 35, 45, 60]) {
      close(
        interpolate(input, [0, 30], [0, 1], mine),
        Remotion.interpolate(input, [0, 30], [0, 1], ref),
        1e-6,
      );
    }
  });

  it('validation errors match reference intent', () => {
    expect(() => interpolate(0, [0], [0, 1])).toThrow();
    expect(() => interpolate(0, [0, 0], [0, 1])).toThrow();
    expect(() => interpolate(0, [10, 0], [0, 1])).toThrow();
    expect(() => interpolate(0, [0, 1], [0])).toThrow();
    expect(() => interpolate(0, [0, 1], [0, 1], { posterize: 0 })).toThrow();
    expect(() =>
      interpolate(0, [0, 50, 100], [0, 1, 2], { easing: [Easing.quad] }),
    ).toThrow();
  });
});
