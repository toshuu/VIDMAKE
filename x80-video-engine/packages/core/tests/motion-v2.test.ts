/**
 * motion-v2: keyframes bindings resolve identically to multi-stop
 * interpolate (same math, first-class name); shapeToPath is deterministic.
 */
import { describe, expect, it } from 'vitest';
import { resolveAnimNumber } from '../src/animation/bindings.js';
import { shapeToPath } from '../src/compositor/render.js';

describe('keyframes binding', () => {
  it('matches interpolate on the same stops', () => {
    const kf = { binding: 'keyframes', frames: [0, 10, 20], values: [0, 100, 50] } as const;
    const ip = { binding: 'interpolate', inputRange: [0, 10, 20], outputRange: [0, 100, 50] } as const;
    for (const f of [0, 5, 10, 15, 20]) {
      expect(resolveAnimNumber(kf as never, f, 30)).toBe(resolveAnimNumber(ip as never, f, 30));
    }
  });
  it('throws loudly on empty/mismatched stops', () => {
    expect(() => resolveAnimNumber({ binding: 'keyframes', frames: [], values: [] } as never, 0, 30)).toThrow();
    expect(() => resolveAnimNumber({ binding: 'keyframes', frames: [0, 5], values: [1] } as never, 0, 30)).toThrow();
  });
});

describe('shapeToPath', () => {
  it('is deterministic and shape-distinct', () => {
    const a = shapeToPath({ shape: 'star', width: 100, height: 100, points: 5 }, 0, 30);
    expect(shapeToPath({ shape: 'star', width: 100, height: 100, points: 5 }, 0, 30)).toBe(a);
    expect(shapeToPath({ shape: 'polygon', width: 100, height: 100, points: 6 }, 0, 30)).not.toBe(a);
    expect(a.startsWith('M ')).toBe(true);
  });
  it('rejects non-positive geometry loudly', () => {
    expect(() => shapeToPath({ shape: 'star', width: 0, height: 10 }, 0, 30)).toThrow();
  });
});
