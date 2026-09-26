/**
 * Open-ended proof: the generation system is NOT template-bound.
 *
 * Every spec below uses ZERO preset layouts (giant/lower3rd/poster/ticket/
 * takeover/stack/lowtitle). They compose novel arrangements purely from the
 * primitive language: free nodes, raw subjects, N-line titles, custom
 * kickers/roles/systems, variable transition durations.
 *
 * If the system were template-based, none of these could compile.
 */
import { describe, expect, it } from 'vitest';
import { compileReel } from '../src/compile.js';
import type { ReelSpec } from '../src/types.js';
import { validateSpec } from '../src/validate.js';

const PRESETS = ['giant', 'lower3rd', 'poster', 'ticket', 'takeover', 'stack', 'lowtitle'];

const pal = {
  bg: '#0b1026', ink: '#ffffff', accent: '#e8b34b',
  accent2: '#4ade80', pillBg: '#f2fbf4', pillFg: '#0b1020',
};
const faces = { display: 'Inter', hero: 'Inter', kicker: 'Poppins' };

const noPresets = (spec: ReelSpec): void => {
  for (const a of spec.acts) {
    expect(PRESETS).not.toContain(a.layout);
  }
  expect(JSON.stringify(spec)).not.toMatch(/"(giant|lower3rd|poster|ticket|takeover|stack|lowtitle)"/);
};

/** Novel 1: concentric mandala — radial glow, orbit ring, spring pop. */
const mandala = (): ReelSpec => ({
  id: 'novel-mandala', canvas: { w: 540, h: 960, fps: 30 }, system: 'free',
  concept: { palette: pal, faces, signature: 'orbit mandala', signatureWhy: 'no preset has concentric orbits' },
  durations: [90, 90],
  transitions: [{ type: 'fade', duration: 16 }],
  acts: [
    {
      role: 'mandala', duration: 90, layout: 'free', badge: false,
      kicker: { text: 'ORBIT STUDY', style: 'custom', y: 64, at: 4, x: 40, size: 20, letterSpacing: 8 },
      nodes: [
        { id: 'ground', type: 'rect', width: 540, height: 960, x: 0, y: 0, fill: 'bg' },
        {
          id: 'halo', type: 'circle', radius: 220, x: 50, y: 300,
          fill: { kind: 'radial', stops: [{ offset: 0, color: 'accent' }, { offset: 1, color: 'rgba(0,0,0,0)' }] },
          opacity: 0.5, blendMode: 'screen',
        },
        {
          id: 'orbits', type: 'group', children: [
            { id: 'ring', type: 'circle', radius: 150, x: 120, y: 370, fill: 'rgba(0,0,0,0)', stroke: 'accent2', strokeWidth: 2 },
            {
              id: 'sat', type: 'circle', radius: 12, fill: 'accent',
              x: { binding: 'interpolate', inputRange: [0, 89], outputRange: [420, 120] },
              y: { binding: 'interpolate', inputRange: [0, 89], outputRange: [520, 520] },
            },
          ],
        },
        {
          id: 'word', type: 'text', text: 'EVERYTHING ORBITS', fontFamily: 'Inter',
          fontSize: { binding: 'spring', from: 20, to: 44 }, fontWeight: 800, fill: 'ink',
          x: 40, y: 760,
        },
      ],
    },
    {
      role: 'resolve', duration: 90, layout: 'free', badge: false,
      title: {
        lines: [
          { text: 'ONE', fill: 'ink' },
          { text: 'TWO', fill: 'accent' },
          { text: 'THREE', fill: 'accent2' },
          { text: 'FOUR', fill: 'ink' },
        ],
        sub: 'four-line stack no preset allows',
      },
      titleSize: 56, titleY: 300, center: true,
      subjects: [{ kind: 'bg', style: 'flat', color: '#0b1026' }],
    },
  ],
});

/** Novel 2: diagonal split — rotated shards, gradient blade, ticker-less wall. */
const diagonal = (): ReelSpec => ({
  id: 'novel-diagonal', canvas: { w: 540, h: 960, fps: 30 }, system: 'atelier',
  concept: { palette: pal, faces, signature: 'diagonal blade', signatureWhy: 'no preset rotates the stage' },
  durations: [120],
  transitions: [],
  acts: [
    {
      role: 'blade', duration: 120, layout: 'custom', badge: false,
      kicker: { text: 'CUT DIAGONALLY', style: 'custom', y: 120, at: 6, x: 300, face: 'Inter' },
      subjects: [
        {
          kind: 'raw',
          nodes: [
            { id: 'shard-a', type: 'rect', width: 700, height: 500, x: -80, y: 100, rotation: -18, anchorX: 350, anchorY: 250, fill: '#141c38' },
            {
              id: 'blade', type: 'rect', width: 700, height: 14, x: -80, y: 470, rotation: -18,
              anchorX: 350, anchorY: 7,
              fill: { kind: 'linear', angle: 90, stops: [{ offset: 0, color: 'accent' }, { offset: 1, color: 'accent2' }] },
            },
          ],
        },
      ],
      nodes: {
        id: 'typecluster', type: 'container', children: [
          {
            id: 'big', type: 'text', text: 'SLASH', fontFamily: 'Inter', fontSize: 120,
            fontWeight: 800, fill: 'ink', x: 36, y: 560,
            opacity: { binding: 'interpolate', inputRange: [6, 24], outputRange: [0, 1], options: { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } },
          },
          {
            id: 'side', type: 'text', text: 'the price, not the quality', fontFamily: 'Inter',
            fontSize: 24, fontWeight: 500, fill: 'rgba(255,255,255,0.85)', x: 300, y: 700, rotation: -18,
          },
          { id: 'chip', type: 'rrect', width: 200, height: 52, radius: 26, x: 36, y: 800, fill: 'accent', filter: { blur: 0, brightness: 1.1 } },
        ],
      },
    },
  ],
});

/** Novel 3: preset + additive nodes — proves presets are extensible, not cages. */
const extendedPreset = (): ReelSpec => ({
  id: 'preset-plus-nodes', canvas: { w: 540, h: 960, fps: 30 }, system: 'cinematic',
  concept: { palette: pal, faces, signature: 'giant plus orbit', signatureWhy: 'preset with invented extras' },
  durations: [60],
  transitions: [],
  acts: [
    {
      role: 'hook', duration: 60, layout: 'giant', badge: false,
      kicker: { text: 'HELLO', style: 'overline' },
      title: { lines: [{ text: 'Big', fill: 'ink' }], sub: 'small' },
      subjects: [{ kind: 'footage', clip: 'c1' }],
      nodes: [
        { id: 'sticker', type: 'circle', radius: 30, x: 460, y: 200, fill: 'accent', blendMode: 'screen' },
      ],
    },
  ],
});

describe('open-ended design system', () => {
  it('novel mandala: zero presets, compiles + deterministic', () => {
    const s = mandala();
    noPresets(s);
    expect(validateSpec(s)).toEqual([]);
    const a = JSON.stringify(compileReel(s).plan);
    const b = JSON.stringify(compileReel(s).plan);
    expect(a).toBe(b);
    const plan = compileReel(s).plan as {
      composition: { root: { children: Array<{ id: string; children: unknown[] }> } };
    };
    // Act 1 carries the invented orbit group; act 2 the 4-line title.
    expect(plan.composition.root.children[0]!.children.length).toBeGreaterThan(3);
    for (const d of compileReel(s).decisions) expect(d.why.length).toBeGreaterThan(5);
  });

  it('novel diagonal: custom system/role/layout, raw subjects, alias resolution', () => {
    const s = diagonal();
    noPresets(s);
    expect(validateSpec(s)).toEqual([]);
    const plan = compileReel(s).plan as {
      composition: { root: { children: Array<{ id: string; children: Array<{ id: string; fill?: unknown }> }> } };
    };
    const ids = plan.composition.root.children[0]!.children.map((c) => c.id);
    // Raw + act nodes namespaced per act, never colliding.
    expect(ids.some((x) => x.includes('shard-a'))).toBe(true);
    expect(ids.some((x) => x.includes('typecluster'))).toBe(true);
    // Palette aliases inside free nodes resolve to real colors.
    const flat = JSON.stringify(plan);
    expect(flat).not.toMatch(/"fill":"bg"/);
    expect(flat).not.toMatch(/"fill":"accent"/);
    expect(flat).toMatch(/#e8b34b/);
  });

  it('variable transition durations reshape the timeline deterministically', () => {
    const s = mandala();
    const t0 = (compileReel(s).plan as { timeline: { children: Array<{ kind: string; from: number; durationInFrames: number }> } })
      .timeline.children.find((c) => c.kind === 'transition')!;
    expect(t0.durationInFrames).toBe(16);
    expect(t0.from).toBe(90 - 12); // bound(90) - (16-4)
    const s2 = mandala();
    s2.transitions = [{ type: 'fade' }]; // default 12
    const t1 = (compileReel(s2).plan as { timeline: { children: Array<{ kind: string; from: number; durationInFrames: number }> } })
      .timeline.children.find((c) => c.kind === 'transition')!;
    expect(t1.durationInFrames).toBe(12);
    expect(t1.from).toBe(90 - 8);
  });

  it('presets accept additive nodes without changing preset pixels', () => {
    const s = extendedPreset();
    expect(validateSpec(s)).toEqual([]);
    const plan = compileReel(s).plan as {
      composition: { root: { children: Array<{ id: string; children: Array<{ id: string }> }> } };
    };
    const ids = plan.composition.root.children[0]!.children.map((c) => c.id);
    expect(ids.some((x) => x.includes('sticker'))).toBe(true);
    expect(ids.some((x) => x.includes('t0') || x.includes('l0'))).toBe(true); // preset title still there
  });

  it('free acts reject empty stages loudly (never silent black)', () => {
    const s = mandala();
    s.acts[0]!.nodes = [];
    s.acts[0]!.subjects = [];
    s.acts[0]!.title = undefined;
    s.acts[0]!.kicker = null;
    expect(validateSpec(s).join()).toMatch(/empty stage/);
  });

  it('custom roles/systems/kickers pass; legacy preset rules still guard presets', () => {
    const bad = mandala();
    bad.system = 'cinematic';
    bad.acts[0]!.layout = 'giant';
    bad.acts[0]!.kicker = { text: 'X', style: 'pill' };
    bad.acts[0]!.title = { lines: [{ text: 'A', fill: 'ink' }], sub: '' };
    // cinematic preset + pill kicker = still rejected (backward compat).
    expect(validateSpec(bad).join()).toMatch(/cinematic preset expects/);
  });
});
