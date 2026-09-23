/**
 * Authoring validation + baked path morphs.
 */
import { describe, expect, it } from 'vitest';
import { bakeMorph, validateTimeline } from '../src/index.js';
import type { TimelineNode } from '../src/index.js';

const scene = (ids: string[]) => ({
  id: 'root',
  type: 'container' as const,
  children: ids.map((id) => ({ id, type: 'rect' as const, width: 10, height: 10 })),
});

describe('validateTimeline', () => {
  it('passes montage-style chains and chrome overlays', () => {
    const tl: TimelineNode = {
      kind: 'sequence', from: 0, durationInFrames: 90,
      children: [
        { kind: 'sequence', from: 0, durationInFrames: 28, children: [{ kind: 'leaf', ref: 'a' }] },
        { kind: 'transition', from: 28, durationInFrames: 12, type: 'fade', a: 'a', b: 'b', aFreeze: 27 },
        { kind: 'sequence', from: 40, durationInFrames: 50, trimBefore: 12, children: [{ kind: 'leaf', ref: 'b' }] },
        { kind: 'sequence', from: 0, durationInFrames: 90, children: [{ kind: 'leaf', ref: 'chrome' }] },
      ],
    };
    expect(() => validateTimeline(tl, scene(['root', 'a', 'b', 'chrome']) as never)).not.toThrow();
  });

  it('throws on overlapping seq leaf + transition over the same scene', () => {
    const tl: TimelineNode = {
      kind: 'sequence', from: 0, durationInFrames: 100,
      children: [
        { kind: 'sequence', from: 80, durationInFrames: 20, children: [{ kind: 'leaf', ref: 'b' }] },
        { kind: 'transition', from: 82, durationInFrames: 12, type: 'fade', a: 'a', b: 'b', aFreeze: 81 },
      ],
    };
    expect(() => validateTimeline(tl, scene(['root', 'a', 'b']) as never)).toThrow(/overlap/i);
  });

  it('throws on freeze pins outside the shown range', () => {
    const tl: TimelineNode = {
      kind: 'sequence', from: 0, durationInFrames: 100,
      children: [
        { kind: 'sequence', from: 0, durationInFrames: 82, children: [{ kind: 'leaf', ref: 'a' }] },
        { kind: 'transition', from: 82, durationInFrames: 12, type: 'fade', a: 'a', b: 'b', aFreeze: 89 },
        { kind: 'sequence', from: 94, durationInFrames: 6, children: [{ kind: 'leaf', ref: 'b' }] },
      ],
    };
    expect(() => validateTimeline(tl, scene(['root', 'a', 'b']) as never)).toThrow(/outside its shown range/);
  });

  it('allows continue mode without aFreeze', () => {
    const tl: TimelineNode = {
      kind: 'sequence', from: 0, durationInFrames: 100,
      children: [
        { kind: 'sequence', from: 0, durationInFrames: 82, children: [{ kind: 'leaf', ref: 'a' }] },
        { kind: 'transition', from: 82, durationInFrames: 12, type: 'fade', a: 'a', b: 'b', aMode: 'continue' },
        { kind: 'sequence', from: 94, durationInFrames: 6, children: [{ kind: 'leaf', ref: 'b' }] },
      ],
    };
    expect(() => validateTimeline(tl, scene(['root', 'a', 'b']) as never)).not.toThrow();
  });
});

describe('bakeMorph', () => {
  const square = 'M0 0L100 0L100 100L0 100Z';
  const diamond = 'M50 0L100 50L50 100L0 50Z';

  it('hits endpoints exactly and lerps the midpoint', () => {
    const frames = bakeMorph(square, diamond, 5);
    expect(frames).toHaveLength(5);
    expect(frames[0]).toBe('M0 0L100 0L100 100L0 100Z');
    expect(frames[4]).toBe('M50 0L100 50L50 100L0 50Z');
    expect(frames[2]).toBe('M25 0L100 25L75 100L0 75Z');
  });

  it('bakes deterministically', () => {
    expect(bakeMorph(square, diamond, 9)).toEqual(bakeMorph(square, diamond, 9));
  });

  it('throws loudly on mismatched structure or bad specs', () => {
    expect(() => bakeMorph('M0 0L10 0', diamond, 5)).toThrow(/differ/);
    expect(() => bakeMorph('M0 0l10 0L10 10', diamond, 5)).toThrow(/absolute/);
    expect(() => bakeMorph('M0 0Q10 10 20 20', diamond, 5)).toThrow(/M\/L\/C\/Z/);
    expect(() => bakeMorph(square, diamond, 1)).toThrow(/frameCount/);
  });
});
