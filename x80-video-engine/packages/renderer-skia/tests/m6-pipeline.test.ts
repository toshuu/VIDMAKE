/**
 * M6 pipeline tests: node.effects flow through temp surfaces under the
 * node's own transform, with animated params resolved per local frame.
 */
import { renderFrame } from '@x80/core';
import type { SceneNode, VideoPlan } from '@x80/core';
import { describe, expect, it } from 'vitest';
import { SkiaRenderer } from '../src/index.js';

const renderer = new SkiaRenderer();

const planWith = (effects: Array<{ type: string; params?: Record<string, unknown>; disabled?: boolean }>): VideoPlan => ({
  composition: {
    id: 'm6-pipe',
    width: 320,
    height: 240,
    fps: 30,
    durationInFrames: 60,
    root: {
      id: 'root',
      type: 'container',
      children: [
        { id: 'bg', type: 'rect', width: 320, height: 240, fill: '#0e1626' },
        {
          id: 'box',
          type: 'rect',
          width: 120,
          height: 120,
          fill: '#e5484d',
          x: 40,
          y: 40,
          effects,
        } as SceneNode,
      ],
    },
  },
  timeline: {
    kind: 'sequence',
    from: 0,
    durationInFrames: 60,
    children: [{ kind: 'leaf', ref: 'bg' }, { kind: 'leaf', ref: 'box' }],
  },
});

const render = async (plan: VideoPlan, frame: number) => {
  const surface = renderer.createSurface(320, 240);
  try {
    renderFrame(renderer, surface, plan, frame, {});
    return renderer.readPixels(surface);
  } finally {
    renderer.destroySurface(surface);
  }
};

const diffCount = (a: Uint8ClampedArray, b: Uint8ClampedArray): number => {
  let n = 0;
  for (let i = 0; i < a.length; i += 4) {
    if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) {
      n += 1;
    }
  }
  return n;
};

describe('M6 pipeline', () => {
  it('blur effect changes pixels deterministically', async () => {
    const plain = await render(planWith([]), 10);
    const fx = await render(planWith([{ type: 'blur', params: { radius: 10 } }]), 10);
    const fx2 = await render(planWith([{ type: 'blur', params: { radius: 10 } }]), 10);
    expect(diffCount(plain.data, fx.data)).toBeGreaterThan(1000);
    expect(Buffer.from(fx.data).equals(Buffer.from(fx2.data))).toBe(true);
  });

  it('disabled effect matches no effect', async () => {
    const plain = await render(planWith([]), 10);
    const off = await render(planWith([{ type: 'blur', params: { radius: 10 }, disabled: true }]), 10);
    expect(Buffer.from(plain.data).equals(Buffer.from(off.data))).toBe(true);
  });

  it('animated params resolve per local frame', async () => {
    const plan = planWith([
      {
        type: 'brightness',
        params: {
          amount: { binding: 'interpolate', inputRange: [0, 30], outputRange: [0, 0.5] },
        },
      },
    ]);
    const f0 = await render(plan, 0);
    const f30 = await render(plan, 30);
    // Frame 0: amount 0 → identical to plain.
    const plain = await render(planWith([]), 0);
    expect(Buffer.from(f0.data).equals(Buffer.from(plain.data))).toBe(true);
    expect(diffCount(f0.data, f30.data)).toBeGreaterThan(1000);
  });

  it('unknown effect type throws at render', async () => {
    await expect(render(planWith([{ type: 'nope' }]), 10)).rejects.toThrow('Unknown effect');
  });

  it('duotone + vignette compose through the pipeline', async () => {
    const fx = await render(
      planWith([
        { type: 'duotone', params: { dark: '#001122', light: '#ffdd88' } },
        { type: 'vignette', params: { strength: 0.6 } },
      ]),
      10,
    );
    const plain = await render(planWith([]), 10);
    expect(diffCount(plain.data, fx.data)).toBeGreaterThan(5000);
  });
});
