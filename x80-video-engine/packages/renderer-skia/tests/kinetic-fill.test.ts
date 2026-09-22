/** Animated fills + kinetic type through the compositor (no backend math). */
import { renderFrame } from '@x80/core';
import type { VideoPlan } from '@x80/core';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SkiaRenderer, registerFontFile } from '../src/index.js';

const DIR = dirname(fileURLToPath(import.meta.url));
registerFontFile(join(DIR, 'fonts', 'NotoSans-Regular.ttf'), 'Grad Noto Sans');
registerFontFile(join(DIR, 'fonts', 'NotoSans-Bold.ttf'), 'Grad Noto Sans');

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

const lit = (b: Buffer): number => {
  let n = 0;
  for (let i = 0; i < b.length; i += 4) {
    if ((b[i] as number) + (b[i + 1] as number) + (b[i + 2] as number) > 60) {
      n += 1;
    }
  }
  return n;
};

describe('animated fills + kinetic type', () => {
  it('color binding cross-fades a rect over frames', () => {
    const plan: VideoPlan = {
      composition: {
        id: 't', width: 200, height: 120, fps: 30, durationInFrames: 20,
        root: {
          id: 'root', type: 'container',
          children: [{
            id: 'box', type: 'rect', width: 200, height: 120,
            fill: {
              binding: 'color',
              inputRange: [0, 19],
              colorStops: ['#ff0000', '#0000ff'],
              options: { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
            } as never,
          }],
        },
      },
      timeline: { kind: 'sequence', from: 0, durationInFrames: 20, children: [{ kind: 'leaf', ref: 'box' }] } as never,
    };
    const early = render(plan, 0);
    const late = render(plan, 19);
    expect(early.equals(late)).toBe(false);
    // frame 0 ~ red: red channel dominates at center
    const c = (10 * 200 + 100) * 4;
    expect(early[c] as number).toBeGreaterThan(200);
    expect(late[(c + 2)] as number).toBeGreaterThan(200);
    expect(render(plan, 0).equals(early)).toBe(true);
  });

  it('kinetic fontSize grows text over frames', () => {
    const plan: VideoPlan = {
      composition: {
        id: 't', width: 200, height: 120, fps: 30, durationInFrames: 11,
        root: {
          id: 'root', type: 'container',
          children: [{
            id: 'txt', type: 'text', text: 'BIG',
            fontFamily: 'Grad Noto Sans', fontWeight: 700, fill: '#ffffff',
            fontSize: {
              binding: 'interpolate', inputRange: [0, 10], outputRange: [12, 48],
              options: { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
            } as never,
            x: 20, y: 20,
          }],
        },
      },
      timeline: { kind: 'sequence', from: 0, durationInFrames: 11, children: [{ kind: 'leaf', ref: 'txt' }] } as never,
    };
    const small = lit(render(plan, 0));
    const big = lit(render(plan, 10));
    expect(big).toBeGreaterThan(small * 2);
  });

  it('bad kinetic fontSize throws loudly', () => {
    const plan: VideoPlan = {
      composition: {
        id: 't', width: 200, height: 120, fps: 30, durationInFrames: 5,
        root: {
          id: 'root', type: 'container',
          children: [{
            id: 'txt', type: 'text', text: 'x',
            fontFamily: 'Grad Noto Sans', fill: '#ffffff',
            fontSize: {
              binding: 'interpolate', inputRange: [0, 4], outputRange: [20, -5],
            } as never,
            x: 0, y: 0,
          }],
        },
      },
      timeline: { kind: 'sequence', from: 0, durationInFrames: 5, children: [{ kind: 'leaf', ref: 'txt' }] } as never,
    };
    expect(() => render(plan, 4)).toThrow(/bad fontSize/);
  });
});
