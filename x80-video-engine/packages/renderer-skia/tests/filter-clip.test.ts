/** Declarative filters + rounded clips: native, deterministic, loud errors. */
import { renderFrame } from '@x80/core';
import type { VideoPlan } from '@x80/core';
import { describe, expect, it } from 'vitest';
import { SkiaRenderer } from '../src/index.js';

const renderer = new SkiaRenderer();

const render = (plan: VideoPlan, frame: number): Buffer => {
  const s = renderer.createSurface(200, 120);
  try {
    renderer.clear(s, '#000000');
    renderFrame(renderer, s, plan, frame, {});
    return Buffer.from(renderer.readPixels(s).data);
  } finally {
    renderer.destroySurface(s);
  }
};

const glowPlan = (filter?: object): VideoPlan => ({
  composition: {
    id: 't', width: 200, height: 120, fps: 30, durationInFrames: 5,
    root: {
      id: 'root', type: 'container',
      children: [{
        id: 'glow', type: 'circle', radius: 20, fill: '#ff4444', x: 80, y: 40,
        ...(filter === undefined ? {} : { filter }),
      } as never],
    },
  },
  timeline: { kind: 'sequence', from: 0, durationInFrames: 5, children: [{ kind: 'leaf', ref: 'glow' }] } as never,
});

describe('declarative filters + rounded clips', () => {
  it('blur spreads light deterministically (wider than unblurred)', () => {
    const plain = render(glowPlan(), 0);
    const blurred = render(glowPlan({ blur: 12 }), 0);
    expect(plain.equals(blurred)).toBe(false);
    const spread = (b: Buffer): number => {
      let n = 0;
      for (let i = 0; i < b.length; i += 4) {
        if ((b[i] as number) > 12) {
          n += 1;
        }
      }
      return n;
    };
    expect(spread(blurred)).toBeGreaterThan(spread(plain));
    expect(render(glowPlan({ blur: 12 }), 0).equals(blurred)).toBe(true);
  });

  it('brightness grade lifts pixels', () => {
    const plain = render(glowPlan(), 0);
    const graded = render(glowPlan({ brightness: 1.6 }), 0);
    expect(graded.equals(plain)).toBe(false);
  });

  it('bad filters throw loudly', () => {
    expect(() => render(glowPlan({ blur: -3 }), 0)).toThrow(/finite and >= 0/);
    expect(() => render(glowPlan({}), 0)).toThrow(/no operation/);
  });

  it('rounded clip cuts corners', () => {
    const plan: VideoPlan = {
      composition: {
        id: 't', width: 100, height: 100, fps: 30, durationInFrames: 2,
        root: {
          id: 'root', type: 'container',
          children: [{
            id: 'box', type: 'rect', width: 100, height: 100, fill: '#ffffff',
            x: 0, y: 0, clip: { x: 10, y: 10, width: 80, height: 80, radius: 20 },
          }],
        },
      },
      timeline: { kind: 'sequence', from: 0, durationInFrames: 2, children: [{ kind: 'leaf', ref: 'box' }] } as never,
    };
    const s = renderer.createSurface(100, 100);
    try {
      renderer.clear(s, '#000000');
      renderFrame(renderer, s, plan, 0, {});
      const { data } = renderer.readPixels(s);
      // corner of the clip box stays black (rounded away), center is lit
      expect(data[(10 * 100 + 10) * 4] as number).toBeLessThan(40);
      expect(data[(50 * 100 + 50) * 4] as number).toBeGreaterThan(200);
    } finally {
      renderer.destroySurface(s);
    }
  });
});
