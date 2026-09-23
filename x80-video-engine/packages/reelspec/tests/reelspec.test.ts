/**
 * reelspec tests: validation gate, timeline assembly, compile determinism.
 * No renderer imports — pure data in, pure data out.
 */
import { describe, expect, it } from 'vitest';
import { compileReel } from '../src/compile.js';
import { assembleTimeline } from '../src/timeline.js';
import type { ReelSpec } from '../src/types.js';
import { validateSpec } from '../src/validate.js';

const pal = {
  bg: '#0b1026', ink: '#ffffff', accent: '#4ade80',
  accent2: '#e8b34b', pillBg: '#f2fbf4', pillFg: '#0b1020',
};
const faces = { display: 'Inter', hero: 'Inter', kicker: 'Poppins' };

const mini = (): ReelSpec => ({
  id: 'mini', canvas: { w: 540, h: 960, fps: 30 }, system: 'cinematic',
  concept: {
    palette: pal, faces,
    signature: 'giant name', signatureWhy: 'size is the memory',
  },
  durations: [60, 90],
  transitions: [{ type: 'dissolve' }],
  acts: [
    {
      role: 'hook', duration: 60, layout: 'giant',
      kicker: { text: 'HELLO', style: 'overline' },
      title: { lines: [{ text: 'Big', fill: 'ink' }], sub: 'small' },
      subjects: [{ kind: 'footage', clip: 'c1' }],
    },
    {
      role: 'cta', duration: 90, layout: 'takeover',
      kicker: { text: 'BYE', style: 'overline' },
      title: { lines: [{ text: 'End', fill: 'accent' }], sub: 'over' },
      cta: 'GO', subjects: [{ kind: 'footage', clip: 'c2' }],
    },
  ],
});

describe('validateSpec', () => {
  it('accepts a complete spec', () => {
    expect(validateSpec(mini())).toEqual([]);
  });

  it('rejects wrong canvas, bad durations, bad transitions', () => {
    const s = mini();
    s.canvas = { w: 1080, h: 1920, fps: 30 };
    expect(validateSpec(s).join()).toMatch(/canvas/);
    const s2 = mini();
    s2.durations = [60];
    expect(validateSpec(s2).join()).toMatch(/durations/);
    const s3 = mini();
    s3.transitions = [];
    expect(validateSpec(s3).join()).toMatch(/transitions/);
  });

  it('rejects unknown layouts, subjects, truncation marks', () => {
    const s = mini();
    (s.acts[0] as { layout: string }).layout = 'carousel';
    expect(validateSpec(s).join()).toMatch(/layout/);
    const s2 = mini();
    s2.acts[0]!.title.lines[0]!.text = 'cut…';
    expect(validateSpec(s2).join()).toMatch(/truncation/);
    const s3 = mini();
    (s3.acts[0] as { subjects: Array<{ kind: string }> }).subjects = [{ kind: 'hologram' }];
    expect(validateSpec(s3).join()).toMatch(/subject kind/);
  });

  it('caps icons at a trio and demands boxes for flipbooks', () => {
    const s = mini();
    s.acts[0]!.subjects = [{ kind: 'icons', mode: 'trio', icons: ['a', 'b', 'c', 'd'], at: [0, 0] }];
    expect(validateSpec(s).join()).toMatch(/trio/);
    const s2 = mini();
    (s2.acts[0] as { subjects: unknown }).subjects = [{ kind: 'flipbook', cast: 'x' }];
    expect(validateSpec(s2).join()).toMatch(/box/);
  });
});

describe('assembleTimeline', () => {
  it('builds the montage pattern with correct freezes', () => {
    const { children, total } = assembleTimeline(
      ['a1', 'a2', 'a3'], [60, 100, 90], [{ type: 'slide' }, { type: 'dissolve' }],
    );
    expect(total).toBe(250);
    expect(children).toHaveLength(3 + 2 + 1); // seqs + transitions + chrome
    const t0 = children.find((c) => c.kind === 'transition') as { from: number; aFreeze: number };
    expect(t0.from).toBe(52); // 60-8
    expect(t0.aFreeze).toBe(51); // 60-9
    const seqs = children.filter((c) => c.kind === 'sequence');
    expect(seqs[1]).toMatchObject({ from: 64, durationInFrames: 88, trimBefore: 12 });
  });

  it('throws on mismatched inputs', () => {
    expect(() => assembleTimeline(['a'], [60], [])).not.toThrow();
    expect(() => assembleTimeline(['a', 'b'], [60, 60], [])).toThrow(/transitions/);
  });
});

describe('compileReel', () => {
  it('throws loudly on invalid specs', () => {
    const s = mini();
    s.system = 'operatic' as ReelSpec['system'];
    expect(() => compileReel(s)).toThrow(/invalid ReelSpec/);
  });

  it('is deterministic: same JSON → same plan bytes', () => {
    const a = JSON.stringify(compileReel(mini()).plan);
    const b = JSON.stringify(compileReel(mini()).plan);
    expect(a).toBe(b);
    expect(compileReel(mini()).total).toBe(150);
  });

  it('every decision carries a WHY', () => {
    for (const d of compileReel(mini()).decisions) {
      expect(d.why.length).toBeGreaterThan(5);
    }
  });

  it('omits badge and kicker when told to', () => {
    const s = mini();
    s.acts[0]!.badge = false;
    s.acts[0]!.kicker = null;
    const plan = compileReel(s).plan as {
      composition: { root: { children: Array<{ id: string; children: { id: string }[] }> } };
    };
    const ids = plan.composition.root.children[0]!.children.map((c) => c.id);
    expect(ids.some((i) => i.includes('badge'))).toBe(false);
    expect(ids.some((i) => i.includes('kick') || i.includes('ol'))).toBe(false);
  });
});
