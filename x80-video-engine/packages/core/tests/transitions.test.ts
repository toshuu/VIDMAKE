/**
 * M7 core tests: transition nodes resolve windows, eased progress,
 * and A/B local-frame mapping (freeze default, continue mode).
 */
import { describe, expect, it } from 'vitest';
import { collectLeaves, resolveTimeline } from '../src/timeline/resolve.js';
import type { TimelineNode } from '../src/timeline/types.js';

const COMP = 300;

const tr = (over: Partial<Extract<TimelineNode, { kind: 'transition' }>> = {}): TimelineNode => ({
  kind: 'transition',
  from: 60,
  durationInFrames: 30,
  type: 'fade',
  a: 'sceneA',
  b: 'sceneB',
  aFreeze: 59,
  ...over,
});

const infoAt = (root: TimelineNode, frame: number) => {
  const leaves = collectLeaves(resolveTimeline(root, frame, COMP));
  return leaves[0]?.transition;
};

describe('TransitionNode', () => {
  it('inactive outside its window', () => {
    expect(collectLeaves(resolveTimeline(tr(), 59, COMP))).toHaveLength(0);
    expect(collectLeaves(resolveTimeline(tr(), 90, COMP))).toHaveLength(0);
  });

  it('linear progress + freeze/continue mapping', () => {
    const at60 = infoAt(tr(), 60);
    expect(at60?.progress).toBe(0);
    expect(at60?.aFrame).toBe(59);
    expect(at60?.bFrame).toBe(0);
    const at75 = infoAt(tr(), 75);
    expect(at75?.progress).toBeCloseTo(0.5, 9);
    expect(at75?.aFrame).toBe(59);
    expect(at75?.bFrame).toBe(15);
    // End is inclusive: frame 89 → progress 29/30 (window ends ceil(60+30-1)=89).
    expect(infoAt(tr(), 89)?.progress).toBeCloseTo(29 / 30, 9);
  });

  it('easing names shape progress', () => {
    expect(infoAt(tr({ easing: 'ease-in' }), 75)?.progress).toBeCloseTo(0.25, 9);
    expect(infoAt(tr({ easing: 'ease-out' }), 75)?.progress).toBeCloseTo(0.75, 9);
    expect(infoAt(tr({ easing: 'ease-in-out' }), 75)?.progress).toBeCloseTo(0.5, 9);
    expect(infoAt(tr({ easing: 'smooth' }), 75)?.progress).toBeCloseTo(0.5, 9);
  });

  it('continue mode plays A through with offset', () => {
    const at = infoAt(tr({ aMode: 'continue', aOffset: 100 }), 75);
    expect(at?.aFrame).toBe(115);
    expect(at?.bFrame).toBe(15);
  });

  it('bOffset shifts B', () => {
    expect(infoAt(tr({ bOffset: 5 }), 60)?.bFrame).toBe(5);
  });

  it('validation is loud', () => {
    expect(() => infoAt(tr({ durationInFrames: 0 }), 60)).toThrow('positive finite');
    expect(() => infoAt(tr({ durationInFrames: Infinity }), 60)).toThrow('positive finite');
    expect(() => infoAt(tr({ aMode: 'freeze' as never, aFreeze: undefined }), 60)).toThrow('aFreeze');
    expect(() => infoAt(tr({ type: '' }), 60)).toThrow('non-empty type');
    expect(() => infoAt(tr({ easing: 'bounce' as never }), 75)).toThrow('Unknown transition easing');
  });
});
