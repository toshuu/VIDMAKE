/**
 * M7 pipeline tests: transition leaves blend two scene subtrees at mapped
 * local frames through the backend applier.
 */
import { renderFrame } from '@x80/core';
import type { VideoPlan } from '@x80/core';
import { describe, expect, it } from 'vitest';
import { SkiaRenderer, skiaTransitionApplier } from '../src/index.js';

const renderer = new SkiaRenderer();
const applier = skiaTransitionApplier(renderer);

const plan = (type: string, params?: Record<string, unknown>): VideoPlan => ({
  composition: {
    id: 'm7',
    width: 320,
    height: 240,
    fps: 30,
    durationInFrames: 90,
    root: {
      id: 'root',
      type: 'container',
      children: [
        { id: 'cardA', type: 'rect', width: 320, height: 240, fill: '#a33c2a' },
        { id: 'cardB', type: 'rect', width: 320, height: 240, fill: '#2456c8' },
      ],
    },
  },
  timeline: {
    kind: 'sequence',
    from: 0,
    durationInFrames: 90,
    children: [
      {
        kind: 'transition',
        from: 30,
        durationInFrames: 30,
        type,
        params,
        a: 'cardA',
        b: 'cardB',
        aFreeze: 29,
      },
    ],
  },
});

const render = async (p: VideoPlan, frame: number) => {
  const surface = renderer.createSurface(320, 240);
  try {
    renderFrame(renderer, surface, p, frame, { transitionApplier: applier });
    return renderer.readPixels(surface);
  } finally {
    renderer.destroySurface(surface);
  }
};

const avg = (fb: { data: Uint8ClampedArray }): [number, number, number] => {
  let r = 0;
  let g = 0;
  let b = 0;
  const n = fb.data.length / 4;
  for (let i = 0; i < fb.data.length; i += 4) {
    r += fb.data[i] as number;
    g += fb.data[i + 1] as number;
    b += fb.data[i + 2] as number;
  }
  return [r / n, g / n, b / n];
};

describe('M7 pipeline', () => {
  it('fade midpoint ≈ average of cards', async () => {
    const mid = await render(plan('fade'), 45);
    const [r, g, b] = avg(mid);
    // A (163,60,42) + B (36,86,200) at 0.5 → (99.5, 73, 121)
    expect(r).toBeGreaterThan(85);
    expect(r).toBeLessThan(115);
    expect(b).toBeGreaterThan(105);
    expect(b).toBeLessThan(135);
    expect(g).toBeGreaterThan(60);
    expect(g).toBeLessThan(90);
  });

  it('endpoints hold scenes', async () => {
    const start = await render(plan('slide', { direction: 'left' }), 30);
    const [r] = avg(start);
    expect(r).toBeGreaterThan(150); // cardA red dominates
    const end = await render(plan('slide', { direction: 'left' }), 59);
    const [r2, , b2] = avg(end);
    expect(b2).toBeGreaterThan(r2); // cardB blue dominates
  });

  it('missing applier throws a wiring error', async () => {
    const surface = renderer.createSurface(320, 240);
    try {
      expect(() => renderFrame(renderer, surface, plan('fade'), 45, {})).toThrow(
        'transitionApplier',
      );
    } finally {
      renderer.destroySurface(surface);
    }
  });

  it('unknown transition type throws', async () => {
    await expect(render(plan('nope'), 45)).rejects.toThrow('Unknown transition');
  });
});
