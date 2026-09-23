/**
 * Backdrop blur: CSS `backdrop-filter: blur()` equivalent.
 * Blurs already-painted pixels inside a node's bbox before it paints.
 */
import { renderFrame } from '@x80/core';
import { describe, expect, it } from 'vitest';
import { SkiaRenderer } from '../src/index.js';

const renderer = new SkiaRenderer();

const hardEdge = () => {
  const s = renderer.createSurface(200, 120);
  renderer.clear(s, '#000000');
  // Left half red, right half blue — a hard vertical edge at x=100.
  renderer.drawRect(s, 0, 0, 100, 120, { fill: '#ff0000' });
  renderer.drawRect(s, 100, 0, 100, 120, { fill: '#0000ff' });
  return s;
};

const inkAt = (s: ReturnType<SkiaRenderer['createSurface']>, x: number, y: number) => {
  const d = renderer.readPixels(s).data;
  const i = (y * 200 + x) * 4;
  return [d[i]!, d[i + 1]!, d[i + 2]!];
};

describe('backdrop blur (blurRegion)', () => {
  it('radius 0 is a no-op', () => {
    const a = hardEdge();
    const before = Buffer.from(renderer.readPixels(a).data);
    renderer.blurRegion!(a, { x: 60, y: 20, width: 80, height: 80 }, 0);
    expect(Buffer.from(renderer.readPixels(a).data).equals(before)).toBe(true);
    renderer.destroySurface(a);
  });

  it('softens a hard edge deterministically', () => {
    const a = hardEdge();
    renderer.blurRegion!(a, { x: 60, y: 20, width: 80, height: 80 }, 6);
    const after = Buffer.from(renderer.readPixels(a).data);
    const b = hardEdge();
    renderer.blurRegion!(b, { x: 60, y: 20, width: 80, height: 80 }, 6);
    expect(Buffer.from(renderer.readPixels(b).data).equals(after)).toBe(true);
    // Edge pixel was pure red; after blur it mixes with blue.
    const [r, , bl] = inkAt(a, 98, 60);
    expect(r).toBeLessThan(255);
    expect(bl).toBeGreaterThan(0);
    // Far outside the region stays untouched.
    expect(inkAt(a, 10, 60)).toEqual([255, 0, 0]);
    expect(inkAt(a, 190, 60)).toEqual([0, 0, 255]);
    renderer.destroySurface(a);
    renderer.destroySurface(b);
  });

  it('negative or non-finite radii throw loudly', () => {
    const s = hardEdge();
    expect(() => renderer.blurRegion!(s, { x: 0, y: 0, width: 10, height: 10 }, -1)).toThrow();
    expect(() => renderer.blurRegion!(s, { x: 0, y: 0, width: 10, height: 10 }, NaN)).toThrow();
    renderer.destroySurface(s);
  });

  it('compositor frosts the card backdrop, then paints the card', () => {
    const plan = {
      composition: {
        id: 'frost', width: 200, height: 120, fps: 30, durationInFrames: 1,
        root: {
          id: 'root', type: 'container',
          children: [
            { id: 'bg', type: 'rect', width: 200, height: 120, fill: '#ff0000' },
            {
              id: 'card', type: 'rrect', width: 80, height: 60, radius: 12, x: 60, y: 30,
              fill: 'rgba(255,255,255,0.4)', backdropBlur: 6,
            },
          ],
        },
      },
      timeline: {
        kind: 'sequence', from: 0, durationInFrames: 1,
        children: [{ kind: 'leaf', ref: 'root' }],
      },
    } as never;
    const s = renderer.createSurface(200, 120);
    renderer.clear(s, '#000000');
    renderFrame(renderer, s, plan, 0, {});
    const [r, g, b] = inkAt(s, 100, 60);
    // Frosted red: translucent white over red → pinkish, fully painted.
    expect(r).toBeGreaterThan(200);
    expect(g).toBeGreaterThan(80);
    expect(b).toBeGreaterThan(80);
    renderer.destroySurface(s);
  });

  it('compositor rejects backdropBlur on unsupported nodes', () => {
    const plan = {
      composition: {
        id: 'bad', width: 100, height: 100, fps: 30, durationInFrames: 1,
        root: {
          id: 'root', type: 'container',
          children: [
            {
              id: 't', type: 'text', text: 'hi', fontFamily: 'sans',
              fontSize: 20, fill: '#fff', backdropBlur: 4,
            },
          ],
        },
      },
      timeline: {
        kind: 'sequence', from: 0, durationInFrames: 1,
        children: [{ kind: 'leaf', ref: 'root' }],
      },
    } as never;
    const s = renderer.createSurface(100, 100);
    expect(() => renderFrame(renderer, s, plan, 0, {})).toThrow();
    renderer.destroySurface(s);
  });
});
