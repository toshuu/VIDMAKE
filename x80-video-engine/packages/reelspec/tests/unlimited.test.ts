/**
 * unlimited tests: the AI invents, the engine obeys — presets are shortcuts,
 * never capability boundaries. All pure data (validate + compile), no renderer.
 */
import { describe, expect, it } from 'vitest';
import { compileReel } from '../src/compile.js';
import type { ReelSpec } from '../src/types.js';
import { validateSpec } from '../src/validate.js';

const pal = {
  bg: '#0b1026', ink: '#ffffff', accent: '#4ade80',
  accent2: '#e8b34b', pillBg: '#f2fbf4', pillFg: '#0b1020',
};
const faces = { display: 'Inter', hero: 'Inter', kicker: 'Poppins' };

const base = (): ReelSpec => ({
  id: 'unlimited', canvas: { w: 540, h: 960, fps: 30 }, system: 'free',
  concept: { palette: pal, faces, signature: 'invented', signatureWhy: 'test' },
  durations: [90],
  transitions: [],
  // Minimal valid free act per the Guide (§1.13: empty stages rejected —
  // never silent black): a flat ground subject; tests add nodes on top.
  acts: [{ role: 'invent', duration: 90, layout: 'free', badge: false, subjects: [{ kind: 'bg', style: 'flat' }] }],
});

const planOf = (s: ReelSpec): { composition: { width: number; height: number; fps: number; root: { children: Array<{ id: string; children?: Array<Record<string, unknown>> }> } }; timeline: { children: Array<{ kind: string; ref?: string }> } } =>
  compileReel(s).plan as never;

describe('unlimited canvas + timing', () => {
  it('accepts any canvas in range, any of 24/25/30/60 fps', () => {
    for (const c of [
      { w: 540, h: 960, fps: 30 }, { w: 1080, h: 1920, fps: 30 },
      { w: 720, h: 1280, fps: 60 }, { w: 1080, h: 1080, fps: 24 },
    ] as ReelSpec['canvas'][]) {
      const s = base();
      s.canvas = c;
      expect(validateSpec(s)).toEqual([]);
      const p = planOf(s);
      expect(p.composition.width).toBe(c.w);
      expect(p.composition.fps).toBe(c.fps);
    }
  });

  it('rejects out-of-range canvas', () => {
    const s = base();
    s.canvas = { w: 100, h: 100, fps: 12 };
    expect(validateSpec(s).join()).toMatch(/canvas/);
  });

  it('free systems allow micro-acts; preset systems still demand ≥30f', () => {
    const s = base();
    s.durations = [8];
    s.acts[0]!.duration = 8;
    expect(validateSpec(s)).toEqual([]);
    const preset = base();
    preset.system = 'cinematic';
    preset.acts[0]!.layout = 'giant';
    preset.acts[0]!.title = { lines: [{ text: 'A', fill: 'ink' }], sub: '' };
    preset.acts[0]!.kicker = { text: 'K', style: 'overline' };
    preset.durations = [8];
    preset.acts[0]!.duration = 8;
    expect(validateSpec(preset).join()).toMatch(/≥30/);
  });

  it('transition durations span 2-60', () => {
    const s = base();
    s.durations = [90, 90];
    s.acts.push({ role: 'two', duration: 90, layout: 'free', badge: false, subjects: [{ kind: 'bg', style: 'flat' }] });
    s.transitions = [{ type: 'fade', duration: 48 }];
    expect(validateSpec(s)).toEqual([]);
    expect(planOf(s).timeline.children.some((c) => c.kind === 'transition')).toBe(true);
    const bad = base();
    bad.durations = [90, 90];
    bad.acts.push({ role: 'two', duration: 90, layout: 'free', badge: false, subjects: [{ kind: 'bg', style: 'flat' }] });
    bad.transitions = [{ type: 'fade', duration: 61 }];
    expect(validateSpec(bad).join()).toMatch(/2-60/);
  });
});

describe('unlimited vocabulary', () => {
  it('unknown layouts compose as free under free systems, throw under presets', () => {
    const s = base();
    (s.acts[0] as { layout: string }).layout = 'orbit-atlas';
    s.acts[0]!.nodes = [{ id: 'n', type: 'rect', width: 10, height: 10, fill: '#fff' }];
    expect(validateSpec(s)).toEqual([]);
    const p = base();
    p.system = 'cinematic';
    (p.acts[0] as { layout: string }).layout = 'orbit-atlas';
    expect(validateSpec(p).join()).toMatch(/layout/);
  });

  it('palette words + hsl + #rgb are colors', () => {
    const s = base();
    s.acts[0]!.title = {
      lines: [
        { text: 'A', fill: 'bg' },
        { text: 'B', fill: 'hsl(210, 80%, 60%)' },
        { text: 'C', fill: '#abc' },
      ],
      sub: '',
    };
    expect(validateSpec(s)).toEqual([]);
  });

  it('chrome:false drops the progress bar from plan AND timeline', () => {
    const s = base();
    s.chrome = false;
    s.acts[0]!.nodes = [{ id: 'n', type: 'rect', width: 10, height: 10, fill: '#fff' }];
    const p = planOf(s);
    expect(p.composition.root.children.some((c) => c.id === 'chrome')).toBe(false);
    expect(p.timeline.children.some((c) => (c as { ref?: string }).ref === 'chrome')).toBe(false);
  });
});

describe('composition aids: components, flex, generative nodes', () => {
  it('components instantiate with overrides', () => {
    const s = base();
    s.components = { tag: { id: 'tag', type: 'text', text: 'HI', fontFamily: 'Inter', fontSize: 40, fill: '#fff' } };
    s.acts[0]!.nodes = [{ id: 'a', use: 'tag' }, { id: 'b', use: 'tag', text: 'BYE' }];
    expect(validateSpec(s)).toEqual([]);
    const flat = JSON.stringify(planOf(s));
    expect(flat).toMatch(/HI/);
    expect(flat).toMatch(/BYE/);
  });

  it('unknown components throw loudly', () => {
    const s = base();
    s.acts[0]!.nodes = [{ id: 'a', use: 'ghost' }];
    expect(() => compileReel(s)).toThrow(/unknown component/);
  });

  it('flex columns stack children without manual math', () => {
    const s = base();
    s.acts[0]!.nodes = [{
      id: 'col', type: 'container', layout: { direction: 'column', gap: 10, padding: 20 },
      children: [
        { id: 'r1', type: 'rect', width: 100, height: 40, fill: '#fff' },
        { id: 'r2', type: 'rect', width: 100, height: 40, fill: '#fff' },
      ],
    }];
    expect(validateSpec(s)).toEqual([]);
    const flat = JSON.stringify(planOf(s));
    // layout is consumed (children stacked: 20, 20+40+10) and the key stripped
    expect(flat).toMatch(/"y":20/);
    expect(flat).toMatch(/"y":70/);
    expect(flat).not.toMatch(/"layout":\{"direction"/);
  });

  it('particles expand deterministically to N circles', () => {
    const s = base();
    s.acts[0]!.nodes = [{ id: 'stars', type: 'particles', count: 25, seed: 11 }];
    expect(validateSpec(s)).toEqual([]);
    const a = JSON.stringify(planOf(s));
    const b = JSON.stringify(planOf(s));
    expect(a).toBe(b);
    expect((a.match(/"type":"circle"/g) ?? []).length).toBe(25);
  });

  it('scene3d projects boxes to shaded 2D paths', () => {
    const s = base();
    s.acts[0]!.nodes = [{
      id: 'stage', type: 'scene3d', width: 540, height: 960,
      objects: [{ kind: 'box', x: 0, y: 0, z: 0, w: 160, h: 160, d: 80, color: '#8ab4ff' }],
    }];
    expect(validateSpec(s)).toEqual([]);
    const flat = JSON.stringify(planOf(s));
    expect(flat).toMatch(/-front/);
    expect(flat).toMatch(/-top/);
  });

  it('skew bindings pass through to the plan verbatim', () => {
    const s = base();
    s.acts[0]!.nodes = [{
      id: 'card', type: 'rrect', width: 200, height: 120, radius: 12, fill: '#fff',
      skewX: { binding: 'interpolate', inputRange: [0, 89], outputRange: [-12, 12] },
    }];
    expect(validateSpec(s)).toEqual([]);
    expect(JSON.stringify(planOf(s))).toMatch(/skewX/);
  });

  it('kinetic geometry/filter/blur bindings pass through verbatim', () => {
    const s = base();
    s.acts[0]!.nodes = [
      { id: 'bar', type: 'rect', width: { binding: 'interpolate', inputRange: [0, 89], outputRange: [0, 480] }, height: 60, fill: '#fff' },
      { id: 'pulse', type: 'circle', radius: { binding: 'interpolate', inputRange: [0, 89], outputRange: [10, 90] }, fill: '#fff' },
      { id: 'focus', type: 'rrect', width: 300, height: 200, radius: 16, fill: '#fff', filter: { blur: { binding: 'interpolate', inputRange: [0, 89], outputRange: [12, 0] } } },
      { id: 'veil', type: 'rect', width: 540, height: 960, fill: 'bg', backdropBlur: { binding: 'interpolate', inputRange: [0, 89], outputRange: [0, 20] } },
    ];
    expect(validateSpec(s)).toEqual([]);
    const flat = JSON.stringify(planOf(s));
    expect(flat).toMatch(/"width":\{"binding":"interpolate"/);
    expect(flat).toMatch(/"radius":\{"binding":"interpolate"/);
    expect(flat).toMatch(/"blur":\{"binding":"interpolate"/);
    expect(flat).toMatch(/"backdropBlur":\{"binding":"interpolate"/);
  });

  it('overlays compile to a full-reel container + timeline seq', () => {
    const s = base();
    s.durations = [60, 60];
    s.acts.push({ role: 'two', duration: 60, layout: 'free', badge: false, subjects: [{ kind: 'bg', style: 'flat' }] });
    s.transitions = [{ type: 'fade' }];
    s.overlays = [{
      id: 'fly', type: 'circle', radius: 20, fill: 'accent', y: 480,
      x: { binding: 'interpolate', inputRange: [40, 80], outputRange: [100, 440] },
    }];
    expect(validateSpec(s)).toEqual([]);
    const p = planOf(s);
    expect(p.composition.root.children.some((c) => c.id === 'overlay')).toBe(true);
    expect(p.timeline.children.some(
      (c) => c.kind === 'sequence' && JSON.stringify(c).includes('overlay'),
    )).toBe(true);
    // overlay paints above acts: last scene child before chrome (or last when chrome:false)
    const ids = p.composition.root.children.map((c) => c.id);
    expect(ids.indexOf('overlay')).toBeGreaterThan(ids.indexOf('act2'));
  });

  it('empty overlays are rejected loudly', () => {
    const s = base();
    s.overlays = [];
    expect(validateSpec(s).join()).toMatch(/overlays/);
  });
});
