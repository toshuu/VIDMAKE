/**
 * M1 golden parity: spring() + measureSpring() vs Remotion reference.
 * Tolerance 1e-6 (iterative float accumulation).
 */
import { describe, expect, it } from 'vitest';
import { measureSpring, spring } from '../src/animation/index.js';
import { Remotion } from './reference.js';

const FRAMES = [0, 1, 5, 10, 15, 20, 30, 45, 60, 90];

describe('spring parity', () => {
  it('measureSpring defaults + custom configs', () => {
    expect(measureSpring({ fps: 30 })).toBe(Remotion.measureSpring({ fps: 30 }));
    expect(measureSpring({ fps: 60 })).toBe(Remotion.measureSpring({ fps: 60 }));
    const cfg = { damping: 20, mass: 0.5, stiffness: 200 };
    expect(measureSpring({ fps: 30, config: cfg })).toBe(
      Remotion.measureSpring({ fps: 30, config: cfg }),
    );
    expect(measureSpring({ fps: 30, threshold: 0.01 })).toBe(
      Remotion.measureSpring({ fps: 30, threshold: 0.01 }),
    );
    expect(measureSpring({ fps: 30, threshold: 0 })).toBe(Infinity);
    expect(measureSpring({ fps: 30, threshold: 1 })).toBe(0);
  });

  it('spring() default config across frames', () => {
    for (const frame of FRAMES) {
      const a = spring({ frame, fps: 30 });
      const b = Remotion.spring({ frame, fps: 30 });
      expect(Math.abs(a - b)).toBeLessThanOrEqual(1e-6);
    }
  });

  it('spring() custom config + from/to', () => {
    const cfg = { damping: 14, mass: 1, stiffness: 120 };
    for (const frame of [0, 5, 15, 30, 60]) {
      expect(
        Math.abs(
          spring({ frame, fps: 30, config: cfg, from: 0, to: 200 }) -
            Remotion.spring({ frame, fps: 30, config: cfg, from: 0, to: 200 }),
        ),
      ).toBeLessThanOrEqual(1e-6);
    }
  });

  it('spring() delay / reverse / durationInFrames / overshootClamping', () => {
    const variants: any[] = [
      { delay: 10 },
      { reverse: true },
      { durationInFrames: 45 },
      { reverse: true, durationInFrames: 45 },
      { config: { overshootClamping: true } },
      { delay: 5, durationInFrames: 60 },
      { durationRestThreshold: 0.01 },
    ];
    for (const v of variants) {
      for (const frame of [0, 5, 20, 44, 45, 60, 90]) {
        const a = spring({ frame, fps: 30, ...v });
        const b = Remotion.spring({ frame, fps: 30, ...v });
        expect(Math.abs(a - b), JSON.stringify({ v, frame })).toBeLessThanOrEqual(1e-6);
      }
    }
  });

  it('spring() rejects non-positive damping', () => {
    expect(() => spring({ frame: 5, fps: 30, config: { damping: 0 } })).toThrow();
    expect(() => spring({ frame: 5, fps: 30, config: { damping: -3 } })).toThrow();
  });
});
