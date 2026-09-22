/**
 * M2 timeline parity: Sequence / Series / Loop / Freeze / Still.
 * Expectations derived from reference formulas verified against the
 * installed reference sources (Sequence.js, series/index.js, loop/index.js,
 * freeze.js, use-current-frame.js) on 2026-09-22.
 */
import { describe, expect, it } from 'vitest';
import {
  collectLeaves,
  resolveTimeline,
  validateComposition,
} from '../src/timeline/resolve.js';
import type { TimelineNode } from '../src/timeline/types.js';

const COMP = 300;

const leaf = (ref: string, id?: string): TimelineNode => ({ kind: 'leaf', ref, id });

const leavesAt = (root: TimelineNode, frame: number, comp = COMP) =>
  collectLeaves(resolveTimeline(root, frame, comp));

describe('Sequence', () => {
  it('basic offset + window', () => {
    const root: TimelineNode = {
      kind: 'sequence',
      from: 40,
      durationInFrames: 60,
      children: [leaf('a')],
    };
    expect(leavesAt(root, 39)).toHaveLength(0);
    expect(leavesAt(root, 40)).toEqual([
      expect.objectContaining({ ref: 'a', localFrame: 0 }),
    ]);
    expect(leavesAt(root, 99)[0]).toMatchObject({ ref: 'a', localFrame: 59 });
    expect(leavesAt(root, 100)).toHaveLength(0);
  });

  it('nested offsets accumulate', () => {
    const root: TimelineNode = {
      kind: 'sequence',
      from: 10,
      durationInFrames: 200,
      children: [
        { kind: 'sequence', from: 20, durationInFrames: 100, children: [leaf('deep')] },
      ],
    };
    // global 50 → local 50 - (10 + 20) = 20
    expect(leavesAt(root, 50)[0]).toMatchObject({ localFrame: 20 });
    expect(leavesAt(root, 29)).toHaveLength(0);
    expect(leavesAt(root, 130)).toHaveLength(0);
  });

  it('visibility uses raw duration prop, actualDuration is clipped', () => {
    const root: TimelineNode = {
      kind: 'sequence',
      from: 250,
      durationInFrames: 100,
      children: [leaf('tail')],
    };
    const resolved = resolveTimeline(root, 290, COMP);
    expect(resolved.timing.durationInFrames).toBe(50); // min(300-250, 100)
    expect(resolved.timing.visible).toBe(true); // raw window Οι [250, 349]
    expect(leavesAt(root, 290)[0]).toMatchObject({ localFrame: 40 });
  });

  it('trimBefore shifts local content, window still uses from', () => {
    const root: TimelineNode = {
      kind: 'sequence',
      from: 10,
      trimBefore: 5,
      durationInFrames: 50,
      children: [leaf('t')],
    };
    // local = 10 - (0 + (10-5)) = 5 at first visible frame
    expect(leavesAt(root, 10)[0]).toMatchObject({ localFrame: 5 });
    expect(leavesAt(root, 9)).toHaveLength(0);
  });

  it('negative from pre-rolls; child offset cancels part (documented example)', () => {
    const root: TimelineNode = {
      kind: 'sequence',
      from: -20,
      durationInFrames: 100,
      children: [
        { kind: 'sequence', from: 10, durationInFrames: 100, children: [leaf('m')] },
      ],
    };
    const outer = resolveTimeline(root, 0, COMP);
    expect(outer.timing.cumulatedNegativeFrom).toBe(-20);
    const inner = outer.children[0] as (typeof outer.children)[number];
    expect(inner?.timing.cumulatedNegativeFrom).toBe(-10);
    // global 0 → local 0 - (-20 + 10) = 10
    expect(leavesAt(root, 0)[0]).toMatchObject({ localFrame: 10 });
  });

  it('float durations use ceil for the end threshold', () => {
    const root: TimelineNode = {
      kind: 'sequence',
      from: 0,
      durationInFrames: 10.5,
      children: [leaf('f')],
    };
    expect(leavesAt(root, 10)).toHaveLength(1); // ceil(9.5) = 10
    expect(leavesAt(root, 11)).toHaveLength(0);
  });

  it('hidden prunes the subtree', () => {
    const root: TimelineNode = {
      kind: 'sequence',
      from: 0,
      durationInFrames: 10,
      hidden: true,
      children: [leaf('h')],
    };
    expect(leavesAt(root, 5)).toHaveLength(0);
  });

  it('width/height overrides scope descendants', () => {
    const root: TimelineNode = {
      kind: 'sequence',
      from: 0,
      durationInFrames: 10,
      width: 540,
      children: [leaf('w')],
    };
    const resolved = resolveTimeline(root, 0, COMP);
    expect(resolved.timing.width).toBe(540);
    expect(resolved.timing.height).toBeNull();
  });

  it('validation mirrors reference conditions', () => {
    expect(() =>
      resolveTimeline({ kind: 'sequence', durationInFrames: 0, children: [] }, 0, COMP),
    ).toThrow('durationInFrames must be positive');
    expect(() =>
      resolveTimeline({ kind: 'sequence', from: Infinity, children: [] }, 0, COMP),
    ).toThrow('"from" prop of a sequence must be finite');
    expect(() =>
      resolveTimeline({ kind: 'sequence', trimBefore: -1, children: [] }, 0, COMP),
    ).toThrow('"trimBefore" prop of <Sequence /> must be greater than or equal to 0');
  });
});

describe('Series', () => {
  const series: TimelineNode = {
    kind: 'series',
    children: [
      { durationInFrames: 60, children: [leaf('A')] },
      { durationInFrames: 30, children: [leaf('B')] },
      { durationInFrames: Infinity, children: [leaf('C')] },
    ],
  };

  it('plays children back to back', () => {
    expect(leavesAt(series, 0)[0]).toMatchObject({ ref: 'A', localFrame: 0 });
    expect(leavesAt(series, 59)[0]).toMatchObject({ ref: 'A', localFrame: 59 });
    expect(leavesAt(series, 60)[0]).toMatchObject({ ref: 'B', localFrame: 0 });
    expect(leavesAt(series, 89)[0]).toMatchObject({ ref: 'B', localFrame: 29 });
    expect(leavesAt(series, 90)[0]).toMatchObject({ ref: 'C', localFrame: 0 });
    expect(leavesAt(series, 200)[0]).toMatchObject({ ref: 'C', localFrame: 110 });
  });

  it('supports overlap (negative) and gap (positive) offsets', () => {
    const root: TimelineNode = {
      kind: 'series',
      children: [
        { durationInFrames: 60, children: [leaf('A')] },
        { durationInFrames: 30, offset: -10, children: [leaf('B')] },
      ],
    };
    // B starts at 60 - 10 = 50
    expect(leavesAt(root, 49).map((l) => l.ref)).toEqual(['A']);
    expect(leavesAt(root, 50).map((l) => l.ref).sort()).toEqual(['A', 'B']);
    const gap: TimelineNode = {
      kind: 'series',
      children: [
        { durationInFrames: 10, children: [leaf('A')] },
        { durationInFrames: 10, offset: 5, children: [leaf('B')] },
      ],
    };
    expect(leavesAt(gap, 12)).toHaveLength(0);
    expect(leavesAt(gap, 15)[0]).toMatchObject({ ref: 'B', localFrame: 0 });
  });

  it('rejects Infinity anywhere but last + non-integer offsets', () => {
    expect(() =>
      leavesAt(
        { kind: 'series', children: [{ durationInFrames: Infinity, children: [leaf('x')] }, { durationInFrames: 5, children: [leaf('y')] }] },
        0,
      ),
    ).toThrow();
    expect(() =>
      leavesAt(
        { kind: 'series', children: [{ durationInFrames: 5, offset: 0.5, children: [leaf('x')] }] },
        0,
      ),
    ).toThrow();
  });
});

describe('Loop', () => {
  const loop: TimelineNode = {
    kind: 'loop',
    durationInFrames: 30,
    children: [leaf('L')],
  };

  it('repeats local 0..duration-1', () => {
    expect(leavesAt(loop, 0, 100)[0]).toMatchObject({ localFrame: 0 });
    expect(leavesAt(loop, 29, 100)[0]).toMatchObject({ localFrame: 29 });
    expect(leavesAt(loop, 30, 100)[0]).toMatchObject({ localFrame: 0 });
    expect(leavesAt(loop, 45, 100)[0]).toMatchObject({ localFrame: 15 });
    expect(leavesAt(loop, 75, 100)[0]).toMatchObject({ localFrame: 15 });
  });

  it('exposes iteration info', () => {
    const resolved = resolveTimeline(loop, 75, 100);
    expect(resolved.loop).toMatchObject({ iteration: 2, durationInFrames: 30 });
  });

  it('times caps the repetitions', () => {
    const timed: TimelineNode = {
      kind: 'loop',
      durationInFrames: 30,
      times: 2,
      children: [leaf('L')],
    };
    expect(leavesAt(timed, 45, 100)[0]).toMatchObject({ localFrame: 15 });
    expect(leavesAt(timed, 75, 100)).toHaveLength(0);
  });

  it('rejects bad times', () => {
    expect(() =>
      leavesAt({ kind: 'loop', durationInFrames: 10, times: 1.5, children: [] }, 0, 100),
    ).toThrow('must be an integer');
    expect(() =>
      leavesAt({ kind: 'loop', durationInFrames: 10, times: -1, children: [] }, 0, 100),
    ).toThrow('must be at least 0');
  });
});

describe('Freeze / Still', () => {
  it('Freeze pins descendants to the chosen frame', () => {
    const root: TimelineNode = {
      kind: 'freeze',
      frame: 10,
      children: [leaf('f')],
    };
    expect(leavesAt(root, 0)[0]).toMatchObject({ localFrame: 10 });
    expect(leavesAt(root, 50)[0]).toMatchObject({ localFrame: 10 });
    expect(leavesAt(root, 299)[0]).toMatchObject({ localFrame: 10 });
  });

  it('Freeze active=false passes through; fn form receives local frame', () => {
    const off: TimelineNode = {
      kind: 'freeze',
      frame: 10,
      active: false,
      children: [leaf('f')],
    };
    expect(leavesAt(off, 50)[0]).toMatchObject({ localFrame: 50 });
    const seen: number[] = [];
    const fn: TimelineNode = {
      kind: 'freeze',
      frame: 7,
      active: (f) => {
        seen.push(f);
        return f > 100;
      },
      children: [leaf('f')],
    };
    expect(leavesAt(fn, 50)[0]).toMatchObject({ localFrame: 50 });
    expect(leavesAt(fn, 150)[0]).toMatchObject({ localFrame: 7 });
    expect(seen).toEqual([50, 150]);
  });

  it('Sequence freeze prop pins its subtree', () => {
    const root: TimelineNode = {
      kind: 'sequence',
      from: 20,
      durationInFrames: 100,
      freeze: 5,
      children: [leaf('s')],
    };
    expect(leavesAt(root, 20)[0]).toMatchObject({ localFrame: 5 });
    expect(leavesAt(root, 60)[0]).toMatchObject({ localFrame: 5 });
  });

  it('Still exposes local frame 0 (and only frame 0 exists)', () => {
    const root: TimelineNode = { kind: 'still', children: [leaf('st')] };
    expect(leavesAt(root, 0)[0]).toMatchObject({ localFrame: 0 });
    expect(leavesAt(root, 40)).toHaveLength(0);
  });

  it('Freeze requires a finite frame', () => {
    expect(() => leavesAt({ kind: 'freeze', frame: NaN, children: [] }, 0)).toThrow();
    expect(() => leavesAt({ kind: 'freeze', frame: Infinity, children: [] }, 0)).toThrow();
  });
});

describe('Composition', () => {  it('validates dimensions', () => {
    expect(() =>
      validateComposition({ id: 'x', width: 0, height: 1920, fps: 30, durationInFrames: 300 }),
    ).toThrow('invalid width');
    expect(() =>
      validateComposition({ id: 'x', width: 1080, height: 1920, fps: 30, durationInFrames: 300 }),
    ).not.toThrow();
  });
});
