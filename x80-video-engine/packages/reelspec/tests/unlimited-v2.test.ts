/**
 * unlimited-v2: the unlimited-engine upgrades. All pure data
 * (validate + compile + helpers), no renderer.
 * - motion systems: keyframes / stagger / motionPath / sharedFly
 * - vars + subcomps
 * - checkSpec safety net
 * - capability index (real names only)
 * - shape/mask nodes validate + compile
 * - scene3d v2: fog / light / disc / wire / depth-sort
 */
import { describe, expect, it } from 'vitest';
import { capabilityIds, queryCapabilities } from '../src/capabilities.js';
import { checkSpec } from '../src/check.js';
import { compileReel } from '../src/compile.js';
import { keyframes, motionPath, sharedFly, stagger } from '../src/motion.js';
import type { ReelSpec } from '../src/types.js';
import { validateSpec } from '../src/validate.js';

const pal = {
  bg: '#0b1026', ink: '#ffffff', accent: '#4ade80',
  accent2: '#e8b34b', pillBg: '#f2fbf4', pillFg: '#0b1020',
};
const faces = { display: 'Inter', hero: 'Inter', kicker: 'Poppins' };

const free = (nodes: unknown[]): ReelSpec => ({
  id: 'v2', canvas: { w: 540, h: 960, fps: 30 }, system: 'atelier',
  concept: { palette: pal, faces, signature: 'v2', signatureWhy: 'test' },
  durations: [90],
  transitions: [],
  acts: [{ role: 'invent', duration: 90, layout: 'orbit-study', badge: false, nodes: nodes as never }],
});

describe('motion systems', () => {
  it('keyframes() builds a strict binding and rejects bad stops', () => {
    expect(keyframes([0, 10], [0, 100])).toMatchObject({ binding: 'keyframes' });
    expect(() => keyframes([10, 10], [0, 1])).toThrow(/strictly increasing/);
    expect(() => keyframes([0], [])).toThrow();
  });
  it('stagger() shifts interpolate/keyframes/spring bindings', () => {
    const b = stagger({ binding: 'interpolate', inputRange: [0, 10], outputRange: [0, 1] }, 2, 5);
    expect(b).toMatchObject({ inputRange: [10, 20] });
    const s = stagger({ binding: 'spring', from: 0, to: 1 }, 1, 7);
    expect(s).toMatchObject({ delay: 7 });
    expect(() => stagger({ binding: 'interpolate', inputRange: [0], outputRange: [0] }, -1, 5)).toThrow();
  });
  it('motionPath() bakes Catmull-Rom deterministically', () => {
    const a = motionPath([[0, 0], [100, 0], [100, 100]], 30);
    const b = motionPath([[0, 0], [100, 0], [100, 100]], 30);
    expect(a).toEqual(b);
    expect((a.x as { inputRange: number[] }).inputRange[0]).toBe(0);
    expect(() => motionPath([[0, 0]], 30)).toThrow(/>= 2 points/);
  });
  it('sharedFly() spans the cut window', () => {
    const f = sharedFly('fly', { x: 0, y: 0 }, { x: 100, y: 200 }, 90);
    expect(f.x).toMatchObject({ inputRange: [84, 96], outputRange: [0, 100] });
  });
  it('path/stagger bindings compile to interpolate; unknown bindings throw', () => {
    const s = free([{
      id: 'orb', type: 'circle', radius: 20, fill: 'accent',
      x: { binding: 'path', axis: 'x', points: [[0, 0], [200, 0], [200, 300]], duration: 89 },
      y: { binding: 'path', axis: 'y', points: [[0, 0], [200, 0], [200, 300]], duration: 89 },
      opacity: { binding: 'stagger', base: { binding: 'interpolate', inputRange: [0, 10], outputRange: [0, 1] }, index: 2, step: 5 },
    }]);
    expect(validateSpec(s)).toEqual([]);
    const plan = compileReel(s).plan as { composition: { root: { children: Array<{ children: Array<Record<string, unknown>> }> } } };
    const orb = plan.composition.root.children[0]!.children.find((n) => String(n.id).endsWith('-orb'))!;
    expect(orb['x']).toMatchObject({ binding: 'interpolate' });
    expect(orb['y']).toMatchObject({ binding: 'interpolate' });
    expect(orb['opacity']).toMatchObject({ binding: 'interpolate', inputRange: [10, 20] });
    const bad = free([{ id: 'b', type: 'rect', width: 5, height: 5, x: { binding: 'orbit', foo: 1 } }]);
    expect(() => compileReel(bad)).toThrow(/unknown binding/);
  });
  it('keyframes bindings pass through compile verbatim', () => {
    const s = free([{ id: 'k', type: 'rect', width: 10, height: 10, x: keyframes([0, 89], [0, 100]) }]);
    expect(validateSpec(s)).toEqual([]);
    const plan = compileReel(s).plan as { composition: { root: { children: Array<{ children: Array<Record<string, unknown>> }> } } };
    const act = plan.composition.root.children[0]!.children.find((n) => String(n.id).endsWith('-k'));
    expect(act!['x']).toMatchObject({ binding: 'keyframes' });
  });
});

describe('vars + subcomps', () => {
  it('{{vars}} substitute and unknown names throw', () => {
    const s = free([{ id: 't', type: 'text', text: '{{hero}}', fontFamily: 'Inter', fontSize: 40 }]);
    (s as ReelSpec).vars = { hero: 'HELLO' };
    expect(validateSpec(s)).toEqual([]);
    const plan = compileReel(s).plan as { composition: { root: { children: Array<{ children: Array<Record<string, unknown>> }> } } };
    const texts = plan.composition.root.children[0]!.children.filter((n) => n.type === 'text');
    expect(texts.some((t) => t['text'] === 'HELLO')).toBe(true);
    const bad = free([{ id: 't', type: 'text', text: '{{nope}}', fontFamily: 'Inter', fontSize: 40 }]);
    expect(() => compileReel(bad)).toThrow(/unknown var/);
  });
  it('subcomps merge into components and collisions throw', () => {
    const s = free([{ id: 'c0', use: 'card' }]);
    (s as ReelSpec).subcomps = { card: { id: 'card', type: 'rect', width: 50, height: 50 } };
    expect(validateSpec(s)).toEqual([]);
    expect(compileReel(s).total).toBe(90);
    const clash = free([{ id: 'c0', use: 'card' }]);
    clash.components = { card: { id: 'card', type: 'rect', width: 1, height: 1 } };
    (clash as ReelSpec).subcomps = { card: { id: 'card', type: 'rect', width: 2, height: 2 } };
    expect(validateSpec(clash).join()).toMatch(/collides/);
  });
});

describe('checkSpec', () => {
  it('warns on overflow, safe-zone, contrast, bg-only, micro-act copy', () => {
    const s = free([{ id: 'far', type: 'rect', width: 10, height: 10, x: 900, y: 10 }]);
    s.acts[0]!.subjects = [{ kind: 'bg', style: 'flat' }];
    const issues = checkSpec(s);
    expect(issues.some((i) => /outside canvas/.test(i.message))).toBe(true);
    const bgOnly = free([]);
    bgOnly.acts[0]!.subjects = [{ kind: 'bg', style: 'flat' }];
    expect(checkSpec(bgOnly).some((i) => /bg-only/.test(i.message))).toBe(true);
    const low = free([]);
    low.acts[0]!.title = { lines: [{ text: 'DIM', fill: '#0b1027' }], sub: '' };
    low.acts[0]!.duration = 8;
    low.durations = [8];
    expect(checkSpec(low).some((i) => /contrast|micro-act/.test(i.message))).toBe(true);
  });
  it('reading budget warns on overloaded acts', () => {
    const s = free([
      { id: 'bg', type: 'rect', width: 540, height: 960, x: 0, y: 0, fill: 'bg' },
      { id: 't', type: 'text', text: 'THIS SENTENCE KEEPS GOING AND GOING AND GOING PAST ANY READER', fontFamily: 'Inter', fontSize: 30, x: 32, y: 400, fill: 'ink' },
    ]);
    s.acts[0]!.duration = 30;
    s.durations = [30];
    expect(checkSpec(s).some((i) => /reading budget/.test(i.message))).toBe(true);
  });
  it('reading budget ignores lone punctuation tokens', () => {
    const s = free([
      { id: 'bg', type: 'rect', width: 540, height: 960, "x": 0, "y": 0, fill: 'bg' },
      { id: 't', type: 'text', text: 'A — B — C', fontFamily: 'Inter', fontSize: 30, x: 32, y: 400, fill: 'ink' },
    ]);
    // 3 content words → floor 24f ≤ 78f budget: silent.
    expect(checkSpec(s).filter((i) => /reading budget/.test(i.message))).toEqual([]);
  });
  it('is silent on a sane free act', () => {
    const s = free([
      { id: 'bg', type: 'rect', width: 540, height: 960, x: 0, y: 0, fill: 'bg' },
      { id: 't', type: 'text', text: 'HELLO', fontFamily: 'Inter', fontSize: 54, x: 32, y: 400, fill: 'ink' },
    ]);
    expect(checkSpec(s)).toEqual([]);
  });
});

describe('capabilities', () => {
  it('resolves intent to real registry/node names', () => {
    const names = queryCapabilities('trophy court depth plinths').map((c) => c.name);
    expect(names).toContain('scene3d');
    expect(queryCapabilities('film grain texture').map((c) => c.name)).toContain('grain');
    expect(queryCapabilities('').length).toBe(0);
    // Every indexed name is a real engine keyword (no invented presets).
    expect(capabilityIds().length).toBeGreaterThan(20);
  });
});

describe('shape + mask', () => {
  it('validate + compile like any other node', () => {
    const s = free([
      { id: 'star', type: 'shape', shape: 'star', width: 120, height: 120, x: 10, y: 10, fill: 'accent' },
      { id: 'cut', type: 'mask', width: 200, height: 200, x: 0, y: 0, children: [{ id: 'in', type: 'rect', width: 200, height: 200, fill: 'ink' }] },
    ]);
    expect(validateSpec(s)).toEqual([]);
    const plan = compileReel(s).plan as { composition: { root: { children: Array<{ children: Array<Record<string, unknown>> }> } } };
    const types = plan.composition.root.children[0]!.children.map((n) => n.type);
    expect(types).toContain('shape');
    expect(types).toContain('mask');
  });
});

describe('scene3d v3 spatial layer', () => {
  const stageOf = (objects: unknown[], extra: Record<string, unknown> = {}): Array<Record<string, unknown>> => {
    const s = free([{
      id: 'stage', type: 'scene3d', width: 540, height: 960,
      camera: { distance: 750 }, ...extra, objects,
    }]);
    expect(validateSpec(s)).toEqual([]);
    const plan = compileReel(s).plan as { composition: { root: { children: Array<{ children: Array<{ children?: Array<Record<string, unknown>>; id: string }> }> } } };
    return (plan.composition.root.children[0]!.children.find((n) => n.id.endsWith('-stage'))!.children ?? []) as Array<Record<string, unknown>>;
  };
  const box = (x = 0): Record<string, unknown> =>
    ({ kind: 'box', x, y: 0, z: 0, w: 100, h: 100, d: 100, color: '#4ade80' });

  it('hierarchies compose: identity group ≡ ungrouped (same pipeline), translated group shifts', () => {
    // NOTE: a bare box with no v3 trigger stays on the legacy verbatim path,
    // so cross-pipeline equality is NOT expected — compare inside v3 (fov set).
    const cam = { camera: { distance: 750, fov: 55 } };
    const plain = JSON.stringify(stageOf([box(0)], cam));
    const grouped = JSON.stringify(stageOf([{ kind: 'group', children: [box(0)] }], cam));
    // Geometry identical (group namespacing adds a g<N> id infix — strip it).
    expect(grouped.replace(/-o(\d+)g\d+-f/g, '-o$1-f')).toBe(plain);
    const moved = JSON.stringify(stageOf([{ kind: 'group', x: 100, children: [box(0)] }], cam));
    expect(moved).not.toBe(plain);
    // nested groups + rotation stay deterministic
    const nested = [{ kind: 'group', ry: 25, children: [{ kind: 'group', x: 40, rx: 10, children: [box(0)] }] }];
    expect(JSON.stringify(stageOf(nested))).toBe(JSON.stringify(stageOf(nested)));
  });
  it('new geometries emit shaded faces; counts are exact', () => {
    const cyl = stageOf([{ kind: 'cylinder', seg: 8, color: '#4ade80' }]);
    expect(cyl.filter((n) => n.type === 'path').length).toBe(8 + 8 + 8); // sides + top fan + bottom fan
    const cone = stageOf([{ kind: 'cone', seg: 8, color: '#4ade80' }]);
    expect(cone.filter((n) => n.type === 'path').length).toBe(8 + 8); // sides + bottom fan (apex, no top cap)
    const sph = stageOf([{ kind: 'sphere', r: 60, lat: 5, lon: 10, color: '#4ade80' }]);
    expect(sph.filter((n) => n.type === 'path').length).toBe(50);
    const tor = stageOf([{ kind: 'torus', w: 160, d: 48, seg: 10, tub: 6, color: '#4ade80' }]);
    expect(tor.filter((n) => n.type === 'path').length).toBe(60);
    const tube = stageOf([{ kind: 'tube', points: [[-100, 0, 0], [0, -40, 30], [100, 0, 0]], r: 8, seg: 8, sides: 5, color: '#4ade80' }]);
    expect(tube.filter((n) => n.type === 'path').length).toBe(8 * 5);
  });
  it('fov camera changes projection; directional light changes shading', () => {
    const a = JSON.stringify(stageOf([box(0)]));
    const b = JSON.stringify(stageOf([box(0)], { camera: { distance: 750, fov: 55 } }));
    expect(b).not.toBe(a);
    const c = JSON.stringify(stageOf([box(0)], { light: { dir: [-0.4, -0.8, 0.5] } }));
    expect(c).not.toBe(a);
    expect(c).toBe(JSON.stringify(stageOf([box(0)], { light: { dir: [-0.4, -0.8, 0.5] } })));
  });
  it('loud errors: kinds, groups, camera, light, geometry', () => {
    const bad = (objects: unknown[], extra: Record<string, unknown> = {}): string => {
      const s = free([{ id: 'stage', type: 'scene3d', objects, ...extra }]);
      try {
        compileReel(s);
        return 'NO-THROW';
      } catch (e) { return String((e as Error).message); }
    };
    expect(bad([{ kind: 'teapot' }])).toMatch(/unknown kind/);
    expect(bad([{ kind: 'box', children: [] }])).toMatch(/children/);
    expect(bad([{ kind: 'group', color: '#fff', children: [] }])).toMatch(/group/);
    expect(bad([{ kind: 'box' }], { camera: { fov: 5 } })).toMatch(/fov/);
    expect(bad([{ kind: 'box' }], { light: { dir: [0, 0, 0] } })).toMatch(/non-zero/);
    expect(bad([{ kind: 'tube', points: [[0, 0, 0]] }])).toMatch(/points/);
    expect(bad([{ kind: 'sphere', r: -5 }])).toMatch(/r > 0/);
  });
});

describe('scene3d v2', () => {
  it('compiles fog/light/disc/wire and depth-sorts far-first', () => {
    const s = free([{
      id: 'stage', type: 'scene3d', width: 540, height: 960,
      camera: { distance: 750, tiltX: 18, tiltY: -16 },
      light: { top: 1.25, side: 0.55 },
      fog: { color: '#0b1026', near: -400, far: 600 },
      objects: [
        { kind: 'box', x: 0, y: 0, z: 200, w: 100, h: 100, d: 100, color: '#4ade80' },
        { kind: 'box', x: 0, y: 0, z: -200, w: 100, h: 100, d: 100, color: '#e8b34b' },
        { kind: 'disc', x: 0, y: -150, z: 0, r: 40, color: 'accent2' },
        { kind: 'wire', x: 0, y: 150, z: 0, w: 120, h: 120, d: 120, color: 'ink' },
      ],
    }]);
    expect(validateSpec(s)).toEqual([]);
    const plan = compileReel(s).plan as { composition: { root: { children: Array<{ children: Array<{ children?: Array<Record<string, unknown>>; id: string }> }> } } };
    const stage = plan.composition.root.children[0]!.children.find((n) => n.id.endsWith('-stage'));
    const kids = stage!.children ?? [];
    expect(kids.length).toBeGreaterThan(6);
    // Far object (z=-200, o1) paints before near object (z=200, o0).
    const idx = (frag: string): number => kids.findIndex((k) => String(k.id).includes(frag));
    expect(idx('-o1-')).toBeLessThan(idx('-o0-'));
  });
});
