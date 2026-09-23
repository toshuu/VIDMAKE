/**
 * M5 fit + media-mapping unit tests (pure, backend-free).
 */
import { describe, expect, it } from 'vitest';
import { computeFit, mediaFrameIndexAt } from '../src/compositor/fit.js';

describe('computeFit', () => {
  it('fill stretches', () => {
    expect(computeFit(320, 240, 1080, 1920, 'fill')).toMatchObject({
      sx: 0, sy: 0, sw: 320, sh: 240, dx: 0, dy: 0, dw: 1080, dh: 1920,
    });
  });

  it('cover crops centered', () => {
    const r = computeFit(320, 240, 200, 200, 'cover');
    expect(r.dw).toBe(200);
    expect(r.dh).toBe(200);
    // scale = max(200/320, 200/240) = 0.8333 → sw = 240, sh = 200... wait recompute below
    expect(r.sw).toBeCloseTo(240, 6);
    expect(r.sh).toBeCloseTo(240, 6);
    expect(r.sx).toBeCloseTo(40, 6);
    expect(r.sy).toBeCloseTo(0, 6);
  });

  it('contain letterboxes centered', () => {
    const r = computeFit(320, 240, 200, 200, 'contain');
    expect(r.sw).toBe(320);
    expect(r.sh).toBe(240);
    expect(r.dw).toBeCloseTo(200, 6);
    expect(r.dh).toBeCloseTo(150, 6);
    expect(r.dx).toBeCloseTo(0, 6);
    expect(r.dy).toBeCloseTo(25, 6);
  });

  it('none keeps intrinsic at origin', () => {
    expect(computeFit(320, 240, 1080, 1920, 'none')).toMatchObject({
      dw: 320, dh: 240, dx: 0, dy: 0,
    });
  });

  it('rejects degenerate boxes', () => {
    expect(() => computeFit(0, 240, 100, 100, 'fill')).toThrow();
  });
});

describe('mediaFrameIndexAt', () => {
  it('identity mapping', () => {
    expect(mediaFrameIndexAt(0, 30, 30, 5)).toBe(0);
    expect(mediaFrameIndexAt(30, 30, 30, 5)).toBe(30);
    expect(mediaFrameIndexAt(149, 30, 30, 5)).toBe(149);
  });

  it('clamps to valid range', () => {
    expect(mediaFrameIndexAt(-5, 30, 30, 5)).toBe(0);
    expect(mediaFrameIndexAt(1000, 30, 30, 5)).toBe(149);
  });

  it('startFrom + trimBefore + rate', () => {
    // t = 1 + 0.5 + (30/30)*2 = 3.5s → frame 105 @30fps
    expect(mediaFrameIndexAt(30, 30, 30, 10, {
      startFrom: 1, trimBefore: 0.5, playbackRate: 2,
    })).toBe(105);
  });

  it('loop wraps within trim window', () => {
    // loop [0,2)s: local 90f = 3s → t = 1s → frame 30
    expect(mediaFrameIndexAt(90, 30, 30, 10, {
      trimBefore: 0, trimAfter: 2, loop: true,
    })).toBe(30);
    // local 0 → t = 0
    expect(mediaFrameIndexAt(0, 30, 30, 10, {
      trimBefore: 0, trimAfter: 2, loop: true,
    })).toBe(0);
  });

  it('pingpong runs forward then backward without jumps', () => {
    const at = (local: number): number => mediaFrameIndexAt(local, 30, 30, 10, {
      trimBefore: 0, trimAfter: 2, loop: 'pingpong',
    });
    // window [0,2)s, period 4s: 0→0, 30f→1s, 60f→2s, 90f→1s, 120f→0
    expect(at(0)).toBe(0);
    expect(at(30)).toBe(30);
    expect(at(60)).toBe(60);
    expect(at(90)).toBe(30);
    expect(at(120)).toBe(0);
    // continuity: no jump at the turn (59→60→61 rises through 60)
    expect(at(59)).toBe(59);
    expect(at(61)).toBe(59);
  });

  it('different source fps', () => {
    expect(mediaFrameIndexAt(30, 30, 24, 5)).toBe(24);
  });

  it('rejects bad playbackRate', () => {
    expect(() => mediaFrameIndexAt(0, 30, 30, 5, { playbackRate: 0 })).toThrow();
    expect(() => mediaFrameIndexAt(0, 30, 30, 5, { playbackRate: -1 })).toThrow();
  });
});
