/**
 * Layout systems: spec acts → scene nodes. Pure data constructors.
 * Faces doctrine: display = titles that SHOUT (ktitle, emblem marks);
 * hero = text that TALKS (subs, pills, quotes); kicker = labels that TAG
 * (kickers, overlines, numerals, tickers, lockups, ticket heads).
 */
import type {
  ActTitle, ReelConcept, SubjectSpec,
} from './types.js';
import { motionPath, stagger } from './motion.js';

export type Node = Record<string, unknown>;
export type Measure = (text: string, size: number, weight: number, ls: number, family: string) => number;

export interface Ctx {
  W: number;
  H: number;
  faces: ReelConcept['faces'];
  pal: ReelConcept['palette'];
  measure?: Measure;
  decisions: Array<{ path: string; choice: string; why: string }>;
  /** Reel system (for open-ended layout fallback: unknown layouts compose as free). */
  system?: string;
  /** Spec-level reusable fragments (see ReelSpec.components). */
  components?: Record<string, unknown>;
  /** False skips the per-act grain overlay (clean vector looks). */
  grain?: boolean;
}

const anim = (inputRange: number[], outputRange: number[]): unknown => ({
  binding: 'interpolate',
  inputRange,
  outputRange,
  options: { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
});
const fade = (a: number, b: number, dir = 1): unknown =>
  (dir > 0 ? anim([a, b], [0, 1]) : anim([a, b], [1, 0]));

/** Strictly-increasing keyframes (engine requirement): merge on collision. */
const keys = (): { ins: number[]; outs: number[]; push: (k: number, v: number) => void } => {
  const ins: number[] = [];
  const outs: number[] = [];
  const push = (k: number, v: number): void => {
    const last = ins.length - 1;
    if (last >= 0 && k <= ins[last]!) {
      outs[last] = Math.max(outs[last]!, v);
      return;
    }
    ins.push(k);
    outs.push(v);
  };
  return { ins, outs, push };
};

export const boxWH = (b: [number, number] | { w: number; h: number }): [number, number] =>
  (Array.isArray(b) ? b : [b.w, b.h]);

/**
 * Auto-fit: shrink a hero size until every line measures within maxW.
 * Guarantees complete words on screen — the compiler never wraps a
 * designed line and never clips it. Logs the shrink visibly.
 */
export const autoFit = (
  ctx: Ctx, id: string, lines: string[], size: number, maxW: number,
  face: string, weight: number,
): number => {
  if (ctx.measure === undefined) return size;
  let s = size;
  const fits = (px: number): boolean => lines.every(
    (ln) => ctx.measure!(ln, px, weight, 0, face) <= maxW,
  );
  while (s > 30 && !fits(s)) s -= 2;
  if (s !== size) {
    ctx.decisions.push({
      path: `${id}.autofit`, choice: `hero ${size}→${s}px`,
      why: 'auto-fit: shrink to fit the design width, never wrap or clip words',
    });
  }
  return s;
};

const inkOf = (fill: string, pal: ReelConcept['palette']): string =>
  fill === 'ink' ? pal.ink : fill === 'accent' ? pal.accent : fill === 'accent2' ? pal.accent2 : fill;

/* ---------- shared atoms ---------- */

export const kickerPill = (
  ctx: Ctx, actId: string, label: string, accent: string, y = 84, x = 32, face?: string,
): Node => {
  const size = 14;
  const ls = 2;
  const fam = face ?? ctx.faces.kicker;
  const tw = ctx.measure !== undefined
    ? ctx.measure(label, size, 700, ls, fam)
    : label.length * (size * 0.66 + ls);
  const w = Math.ceil(16 + 8 + 6 + tw - ls + 16);
  ctx.decisions.push({
    path: `${actId}.kicker`, choice: `dot pill w=${w}`,
    why: 'measured ink minus trailing ls; dot restores the brand mark',
  });
  return {
    id: `${actId}-kick`, type: 'rrect', width: w, height: 34, radius: 17,
    fill: '#10141f', stroke: 'rgba(255,255,255,0.16)', strokeWidth: 1,
    x, y, opacity: fade(4, 14),
    children: [
      { id: `${actId}-kick-dot`, type: 'circle', radius: 4, x: 16, y: 13, fill: accent },
      {
        id: `${actId}-kick-t`, type: 'text', text: label, fontFamily: fam,
        fontSize: size, fontWeight: 700, letterSpacing: ls, fill: '#f3d9a0',
        x: 30, y: 9,
      },
    ],
  };
};

export const overline = (ctx: Ctx, id: string, text: string, y = 96, at = 4, face?: string): Node => ({
  id, type: 'text', text, fontFamily: face ?? ctx.faces.kicker,
  fontSize: 24, fontWeight: 700, letterSpacing: 6, fill: ctx.pal.accent2,
  x: 32, y: anim([at, at + 16], [y + 18, y]), opacity: fade(at, at + 12),
  shadow: { color: 'rgba(0,0,0,0.7)', blur: 12, offsetY: 2 },
});

export const heroTitle = (
  ctx: Ctx, id: string, title: ActTitle, o: { x?: number; y?: number; size?: number; maxW?: number; center?: boolean; face?: string } = {},
): Node[] => {
  const maxW = o.maxW ?? 420;
  const heroFace = o.face ?? ctx.faces.hero;
  const size = autoFit(ctx, id, title.lines.map((ln) => ln.text), o.size ?? 46, maxW, heroFace, 800);
  const step = Math.round(size * 1.08);
  const y0 = o.y ?? 132;
  const align = o.center === true
    ? { textAlign: 'center', maxWidth: ctx.W, x: 0 }
    : { x: o.x ?? 32, maxWidth: maxW };
  const out: Node[] = [];
  title.lines.forEach((ln, i) => {
    const at = 6 + i * 9;
    const gc = ln.glow ?? (ln.fill === 'accent' ? ctx.pal.accent : null);
    out.push({
      id: `${id}-t${i + 1}`, type: 'text', text: ln.text, fontFamily: ln.face ?? heroFace,
      fontSize: size, fontWeight: ln.weight ?? 800, fill: inkOf(ln.fill, ctx.pal), lineHeight: 1.05,
      ...align, y: anim([at, at + 18], [y0 + i * step + 26, y0 + i * step]), opacity: fade(at, at + 16),
      shadow: gc !== null
        ? { color: gc, blur: 40, offsetY: 5 }
        : { color: 'rgba(0,0,0,0.75)', blur: 25, offsetY: 5 },
    });
  });
  return out;
};

/** Kinetic title: lines rise AND settle scale, staggered (cinematic). */
export const kineticTitle = (
  ctx: Ctx, id: string, title: ActTitle,
  o: { size?: number; x?: number; y?: number; center?: boolean; at?: number; face?: string } = {},
): Node[] => {
  const maxW = o.center === true ? 476 : 470;
  const size = autoFit(ctx, id, title.lines.map((ln) => ln.text), o.size ?? 64, maxW, o.face ?? ctx.faces.display, 800);
  const step = Math.round(size * 1.08);
  const y0 = o.y ?? 560;
  const face = o.face ?? ctx.faces.display;
  const align = o.center === true
    ? { textAlign: 'center', maxWidth: ctx.W, x: 0 }
    : { x: o.x ?? 32 };
  return title.lines.flatMap((ln, i) => {
    const at = (o.at ?? 6) + i * 9;
    const gc = ln.glow ?? (ln.fill === 'accent' ? ctx.pal.accent : null);
    return [{
      id: `${id}-l${i}`, type: 'text', text: ln.text, fontFamily: ln.face ?? face,
      fontSize: size, fontWeight: ln.weight ?? 800, fill: inkOf(ln.fill, ctx.pal), lineHeight: 1.04,
      ...align,
      y: anim([at, at + 20], [y0 + i * step + 34, y0 + i * step]),
      opacity: fade(at, at + 14),
      scaleX: anim([at, at + 22], [1.07, 1]),
      scaleY: anim([at, at + 22], [1.07, 1]),
      anchorX: o.center === true ? 270 : 60, anchorY: 20,
      shadow: gc !== null
        ? { color: gc, blur: 44, offsetY: 5 }
        : { color: 'rgba(0,0,0,0.78)', blur: 26, offsetY: 5 },
    }];
  });
};

export const subLine = (
  ctx: Ctx, id: string, text: string, y: number, center = false, size = 26, at = 16,
): Node => ({
  id, type: 'text', text, fontFamily: ctx.faces.hero, fontSize: size,
  fontWeight: 500, fill: 'rgba(240,244,252,0.94)', lineHeight: 1.4,
  ...(center ? { textAlign: 'center', maxWidth: ctx.W, x: 0 } : { x: 32, maxWidth: 460 }),
  y, opacity: fade(at, at + 12),
  shadow: { color: 'rgba(0,0,0,0.7)', blur: 12, offsetY: 2 },
});

const subStack = (
  ctx: Ctx, id: string, text: string, y = 252, at = 16,
): Node => ({
  id, type: 'text', text, fontFamily: ctx.faces.hero, fontSize: 19,
  fontWeight: 500, fill: 'rgba(240,244,252,0.94)', lineHeight: 1.4,
  x: 32, maxWidth: 420, y, opacity: fade(at, at + 12),
  shadow: { color: 'rgba(0,0,0,0.7)', blur: 12, offsetY: 2 },
});

export const numeral = (ctx: Ctx, id: string, n: string, at = 8): Node => ({
  id, type: 'text', text: n, fontFamily: ctx.faces.kicker, fontSize: 300,
  fontWeight: 700, fill: 'rgba(255,255,255,0.07)', lineHeight: 1,
  stroke: 'rgba(255,255,255,0.28)', strokeWidth: 2,
  x: 232, y: 120, opacity: fade(at, at + 16),
});

export const tintVeil = (ctx: Ctx, id: string, color: string, o = 0.14): Node => ({
  id, type: 'rect', width: ctx.W, height: ctx.H, x: 0, y: 0,
  fill: color, opacity: o, blendMode: 'overlay',
});

export const badge = (actId: string, n: number): Node => ({
  id: `${actId}-badge`, type: 'rrect', width: 72, height: 30, radius: 15,
  fill: 'rgba(0,0,0,0.45)', x: 436, y: 28, opacity: fade(0, 8),
  children: [{
    id: `${actId}-badge-t`, type: 'text', text: `${n} / 5`, fontFamily: 'Inter',
    fontSize: 13, fontWeight: 700, fill: 'rgba(255,255,255,0.9)',
    textAlign: 'center', maxWidth: 72, x: 0, y: 10,
  }],
});

export const grainRef = (actId: string): Node => ({
  id: `${actId}-grain`, type: 'image', src: 'grain-tile',
  width: 660, height: 1080, opacity: 0.07, blendMode: 'overlay', x: -40, y: -30,
});

/* ---------- subjects ---------- */

const motionXY = (m: unknown): unknown => {
  if (typeof m === 'number') return m;
  const mm = m as { from: number; to: number; at: [number, number] };
  return anim(mm.at, [mm.from, mm.to]);
};

export const bgSubject = (
  ctx: Ctx, id: string, s: Extract<SubjectSpec, { kind: 'bg' }>,
): Node[] => {
  if (s.style === 'flat') {
    return [{ id, type: 'rect', width: ctx.W, height: ctx.H, x: 0, y: 0, fill: s.color ?? '#0b1026' }];
  }
  const top = s.top ?? '#0d0a24';
  const mid = s.mid ?? '#1c1440';
  const glow = s.glow ?? 'rgba(255,179,71,0.5)';
  return [
    {
      id, type: 'rect', width: ctx.W, height: ctx.H, x: 0, y: 0,
      fill: { kind: 'linear', angle: 180, stops: [{ offset: 0, color: top }, { offset: 0.6, color: mid }, { offset: 1, color: '#070a18' }] },
    },
    {
      id: `${id}-glow`, type: 'circle', radius: 300, x: -30, y: 320,
      opacity: 0.55, blendMode: 'screen',
      fill: { kind: 'radial', stops: [{ offset: 0, color: glow }, { offset: 1, color: 'rgba(0,0,0,0)' }] },
    },
  ];
};

export const footageSubject = (
  ctx: Ctx, id: string, s: Extract<SubjectSpec, { kind: 'footage' }>, localDur: number,
): Node[] => {
  void ctx;
  const [from, to] = s.zoom ?? [1, 1.07];
  return [{
    id, type: 'video', src: s.clip, width: 540, height: 960, fit: 'cover', loop: 'pingpong',
    scaleX: anim([0, localDur - 1], [from, to]),
    scaleY: anim([0, localDur - 1], [from, to]),
    anchorX: 270, anchorY: 480,
  }];
};

export const flipSubject = (
  ctx: Ctx, id: string,
  s: Extract<SubjectSpec, { kind: 'flipbook' }>, dur: number,
): Node => {
  void ctx;
  const rate = s.rate ?? 6;
  const order = s.order ?? [0, 1, 2, 3, 4];
  const at = s.at ?? 0;
  const hold = s.hold ?? false;
  const extra = hold === true ? 0 : (typeof hold === 'number' ? hold : 0);
  const cycleLen = order.length * rate + (hold === true ? 0 : extra);
  const [bw, bh] = boxWH(s.box);
  const pre = (s.srcPrefix ?? 'spr').replace(/\/$/, '');
  const srcOf = (f: number): string => `${pre}/${s.cast}-${f}`;
  const kids: Node[] = order.map((f, i) => {
    const { ins, outs, push } = keys();
    push(0, 0);
    const cycles = hold === true ? 1 : Number.POSITIVE_INFINITY;
    for (let k = 0; k * cycleLen + at < dur && k < cycles; k += 1) {
      const a = at + k * cycleLen + i * rate;
      const lastSlot = i === order.length - 1;
      const b = (hold === true && lastSlot) ? dur - 1 : Math.min(a + rate + (lastSlot ? extra : 0), dur - 1);
      if (a >= dur - 1) break;
      push(Math.max(a - 0.5, 0), 0);
      push(a, 1);
      push(b, 1);
      push(Math.min(b + 0.5, dur - 1), 0);
    }
    const li = ins.length - 1;
    if (ins[li]! >= dur - 1) outs[li] = 0;
    else push(dur - 1, 0);
    return {
      id: `${id}-s${i}`, type: 'image', src: srcOf(f),
      width: bw, height: bh, fit: 'contain', x: 0, y: 0,
      opacity: anim(ins, outs),
    };
  });
  return {
    id, type: 'container',
    x: motionXY(s.x), y: motionXY(s.y),
    ...(s.scale === undefined ? {} : {
      scaleX: s.scale, scaleY: s.scale,
      anchorX: bw / 2, anchorY: bh / 2,
    }),
    opacity: fade(0, 6),
    children: kids,
  };
};

export const iconsSubject = (
  ctx: Ctx, id: string, s: Extract<SubjectSpec, { kind: 'icons' }>,
): Node[] => {
  void ctx;
  const [cx, cy] = Array.isArray(s.at)
    ? s.at
    : (s.mode === 'trio' ? [270, 800] : s.mode === 'strip' ? [300, 800] : [440, 620]);
  const atDefaulted = !Array.isArray(s.at);
  if (atDefaulted) {
    ctx.decisions.push({
      path: `${id}.anchor`, choice: `[${cx},${cy}]`,
      why: `${s.mode} anchor defaulted (spec gave timing, not position) — visible here, never silent`,
    });
  }
  const at0 = s.entranceAt ?? 20;
  const pre = s.srcPrefix ?? 'ic';
  if (s.mode === 'trio') {
    const r = s.r ?? 40;
    return s.icons.flatMap((icon, i) => disc(id, `${id}-${i}`, icon, pre,
      cx + (i - 1) * (r * 2 + 14), cy, r, at0 + i * 5));
  }
  if (s.mode === 'strip') {
    return s.icons.map((icon, i) => ({
      id: `${id}-st${i}`, type: 'image', src: `${pre}-${icon}`,
      width: 72, height: 72, fit: 'contain',
      x: cx + i * 76, y: cy,
      opacity: fade(at0 + i * 6, at0 + 12 + i * 6),
      shadow: { color: 'rgba(0,0,0,0.6)', blur: 16, offsetY: 4 },
    }));
  }
  const r = s.r ?? 62;
  return disc(id, id, s.icons[0]!, pre, cx, cy, r, at0);
};

const disc = (
  id: string, nid: string, icon: string, pre: string,
  cx: number, cy: number, r: number, at: number,
): Node[] => ([
  {
    id: nid, type: 'circle', radius: r, x: cx - r, y: cy - r,
    fill: '#f2fbf4', stroke: 'rgba(255,255,255,0.5)', strokeWidth: 2,
    opacity: fade(at, at + 12),
    scaleX: anim([at, at + 14], [0.7, 1]),
    scaleY: anim([at, at + 14], [0.7, 1]),
    anchorX: r, anchorY: r,
    shadow: { color: 'rgba(0,0,0,0.5)', blur: 30, offsetY: 6 },
  },
  {
    id: `${nid}-ic`, type: 'image', src: `${pre}-${icon}`,
    width: r * 2 - 44, height: r * 2 - 44, fit: 'contain',
    x: cx - (r - 22), y: cy - (r - 22),
    opacity: fade(at + 4, at + 16),
  },
]);

export const emblemSubject = (
  ctx: Ctx, id: string, s: Extract<SubjectSpec, { kind: 'emblem' }>,
): Node[] => {
  const [cx, cy] = s.at;
  const r = s.r ?? 84;
  void ctx;
  return [
    {
      id: `${id}-halo`, type: 'circle', radius: r + 36, x: cx - r - 36, y: cy - r - 36,
      opacity: 0.5, blendMode: 'screen',
      fill: { kind: 'radial', stops: [{ offset: 0, color: '#f3d9a0' }, { offset: 1, color: 'rgba(0,0,0,0)' }] },
    },
    {
      id: `${id}-ring`, type: 'circle', radius: r, x: cx - r, y: cy - r,
      fill: 'rgba(0,0,0,0)', stroke: '#f3d9a0', strokeWidth: 3, opacity: fade(6, 20),
    },
    {
      id: `${id}-sat`, type: 'circle', radius: 8,
      x: anim([0, 22, 45, 67, 89], [cx + 95, cx, cx - 95, cx, cx + 95]),
      y: anim([0, 22, 45, 67, 89], [cy, cy + 95, cy, cy - 95, cy]),
      fill: '#f3d9a0', opacity: fade(12, 26),
    },
    {
      id: `${id}-mark`, type: 'text', text: s.mark, fontFamily: ctx.faces.display,
      fontSize: 110, fontWeight: 700, fill: '#ffffff',
      textAlign: 'center', maxWidth: r * 2, x: cx - r, y: cy - 58, opacity: fade(8, 22),
      shadow: { color: 'rgba(0,0,0,0.6)', blur: 30, offsetY: 4 },
    },
  ];
};

export const tickerSubject = (
  ctx: Ctx, id: string, s: Extract<SubjectSpec, { kind: 'ticker' }>,
): Node[] => {
  void ctx;
  const y = s.y ?? 470;
  const at = s.at ?? 24;
  return [
    { id: `${id}-band`, type: 'rect', width: 540, height: 56, x: 0, y, fill: 'rgba(255,255,255,0.07)', stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1, backdropBlur: 4, opacity: fade(at, at + 14) },
    { id: `${id}-band-t`, type: 'rect', width: 540, height: 1, x: 0, y, fill: 'rgba(255,255,255,0.18)' },
    { id: `${id}-band-b`, type: 'rect', width: 540, height: 1, x: 0, y: y + 55, fill: 'rgba(255,255,255,0.18)' },
    {
      id: `${id}-mq`, type: 'text', text: s.items, fontFamily: 'Poppins',
      fontSize: 20, fontWeight: 700, fill: 'rgba(255,255,255,0.85)',
      x: anim([at - 12, 179], [540, -900]), y: y + 14, opacity: fade(at, at + 14),
    },
    { id: `${id}-fdl`, type: 'rect', width: 70, height: 56, x: 0, y, fill: { kind: 'linear', angle: 90, stops: [{ offset: 0, color: 'rgba(0,0,0,0.85)' }, { offset: 1, color: 'rgba(0,0,0,0)' }] } },
    { id: `${id}-fdr`, type: 'rect', width: 70, height: 56, x: 470, y, fill: { kind: 'linear', angle: 270, stops: [{ offset: 0, color: 'rgba(0,0,0,0.85)' }, { offset: 1, color: 'rgba(0,0,0,0)' }] } },
  ];
};

export const propsSubject = (
  _ctx: Ctx, id: string, s: Extract<SubjectSpec, { kind: 'props' }>,
): Node[] => s.items.map((p, i) => {
  const [bw, bh] = boxWH(p.box);
  const fl: [number, number] | undefined =
    p.float === true ? [-40, 0] : Array.isArray(p.float) ? p.float : undefined;
  return {
    id: `${id}-p${i}`, type: 'image', src: p.src,
    width: bw, height: bh, fit: 'contain', x: p.x, y: p.y,
    opacity: fade(p.at ?? 10, (p.at ?? 10) + 14),
    ...(fl === undefined ? {} : {
      y: anim([p.at ?? 10, 89], [p.y, p.y + fl[0]]),
      x: fl[1] === 0 ? p.x : anim([p.at ?? 10, 89], [p.x, p.x + fl[1]]),
    }),
  };
});

export const pillCta = (
  ctx: Ctx, id: string, label: string, y: number, at: [number, number],
  size = 22, h = 58, spring = false,
): Node => ({
  id, type: 'rrect', width: 360, height: h, radius: h / 2,
  fill: { kind: 'linear', angle: 90, stops: [{ offset: 0, color: ctx.pal.accent }, { offset: 1, color: '#ffffff' }] },
  x: Math.round((ctx.W - 360) / 2), y,
  opacity: fade(at[0], at[1]),
  scaleX: spring
    ? { binding: 'spring', from: 0.7, to: 1 }
    : anim([at[0], at[1] + 2], [0.8, 1]),
  scaleY: spring
    ? { binding: 'spring', from: 0.7, to: 1 }
    : anim([at[0], at[1] + 2], [0.8, 1]),
  anchorX: 180, anchorY: h / 2,
  children: [{
    id: `${id}-t`, type: 'text', text: label, fontFamily: ctx.faces.hero,
    fontSize: size, fontWeight: 800, letterSpacing: 2, fill: '#0b1020',
    textAlign: 'center', maxWidth: 360, x: 1, y: size === 22 ? 21 : 26,
  }],
});

export const lockup = (ctx: Ctx, id: string, text: string, y: number, at = 40): Node => ({
  id, type: 'text', text, fontFamily: ctx.faces.kicker,
  fontSize: 26, fontWeight: 700, letterSpacing: 6, fill: ctx.pal.accent2,
  textAlign: 'center', maxWidth: ctx.W, x: 3, y, opacity: fade(at, at + 14),
  shadow: { color: 'rgba(0,0,0,0.7)', blur: 12, offsetY: 2 },
});

/* ---------- open-composition helpers (flex / components / generative) ---------- */

/** Deterministic seeded RNG (mulberry32): same seed → same layout, every run. */
const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const clone = (v: Record<string, unknown>): Record<string, unknown> => JSON.parse(JSON.stringify(v)) as Record<string, unknown>;

const namespaced = (actId: string, node: Record<string, unknown>): string => {
  const rawId = typeof node.id === 'string' && node.id.length > 0 ? node.id : 'node';
  return rawId.startsWith(`${actId}-`) ? rawId : `${actId}-${rawId.replace(/\//g, '-')}`;
};

const pickPos = (o: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const k of ['x', 'y', 'scaleX', 'scaleY', 'rotation', 'skewX', 'skewY', 'opacity', 'anchorX', 'anchorY', 'blendMode', 'filter', 'clip']) {
    if (o[k] !== undefined) out[k] = o[k];
  }
  return out;
};

const extentOf = (n: Node): { w: number; h: number } => {
  const r = n as { width?: unknown; height?: unknown; radius?: unknown };
  if (typeof r.width === 'number' && typeof r.height === 'number') return { w: r.width, h: r.height };
  if (typeof r.radius === 'number') return { w: r.radius * 2, h: r.radius * 2 };
  return { w: 0, h: 0 };
};

/**
 * Measure-free flex: stack children along one axis using declared extents.
 * Children with explicit x/y keep them; the rest are placed with gap/padding.
 * `align` shifts the cross axis relative to the container origin.
 */
const applyFlex = (
  kids: Node[],
  layout: { direction?: string; gap?: number; align?: string; padding?: number },
): Node[] => {
  const dir = layout.direction === 'row' ? 'row' : 'column';
  const gap = typeof layout.gap === 'number' ? layout.gap : 12;
  const pad = typeof layout.padding === 'number' ? layout.padding : 0;
  let cursor = pad;
  return kids.map((k) => {
    const kk = k as Record<string, unknown>;
    const { w, h } = extentOf(k);
    void w;
    if (dir === 'column') {
      if (kk.y === undefined) kk.y = Math.round(cursor);
      if (kk.x === undefined) {
        kk.x = layout.align === 'center' ? 0 : layout.align === 'end' ? 0 : pad;
      }
      cursor += h + gap;
    } else {
      if (kk.x === undefined) kk.x = Math.round(cursor);
      if (kk.y === undefined) kk.y = pad;
      cursor += (extentOf(k).w) + gap;
    }
    return k;
  });
};

/** Shade a #rrggbb color by a factor (for 3D face darkening). Falls back verbatim. */
const shade = (color: string, f: number): string => {
  const m = /^#([0-9a-fA-F]{6})$/.exec(color);
  if (!m) return color;
  const n = parseInt(m[1]!, 16);
  const r = Math.max(0, Math.min(255, Math.round(((n >> 16) & 255) * f)));
  const g = Math.max(0, Math.min(255, Math.round(((n >> 8) & 255) * f)));
  const b = Math.max(0, Math.min(255, Math.round((n & 255) * f)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};

/**
 * `{type:'particles'}` → container of seeded circles.
 * Fields: count 1-400, seed, area {w,h}, at [x,y], size [min,max],
 * colors[], twinkle bool. Static positions + wrap-phase twinkle; the
 * planner animates the parent container for drift/fall/rise.
 */
const expandParticles = (ctx: Ctx, actId: string, node: Record<string, unknown>): Node => {
  const count = typeof node.count === 'number' ? Math.max(1, Math.min(400, Math.floor(node.count))) : 60;
  const seed = typeof node.seed === 'number' ? node.seed : 7;
  const area = (node.area as { w?: number; h?: number } | undefined) ?? { w: ctx.W, h: ctx.H };
  const at = (node.at as [number, number] | undefined) ?? [0, 0];
  const size = (node.size as [number, number] | undefined) ?? [1.5, 3.5];
  const colors = (Array.isArray(node.colors) ? node.colors : ['#ffffff']) as string[];
  const twinkle = node.twinkle !== false;
  const rnd = mulberry32(seed * 2654435761 % 4294967296);
  const kids: Node[] = [];
  for (let i = 0; i < count; i += 1) {
    const px = Math.round((at[0] ?? 0) + rnd() * (area.w ?? ctx.W));
    const py = Math.round((at[1] ?? 0) + rnd() * (area.h ?? ctx.H));
    const r = size[0]! + rnd() * (size[1]! - size[0]!);
    const color = resolveAlias(colors[i % colors.length], ctx.pal) as string;
    const phase = i % 2 === 0;
    kids.push({
      id: `${actId}-${String(node.id ?? 'p')}-p${i}`,
      type: 'circle', radius: Math.round(r * 10) / 10, x: px, y: py,
      fill: color,
      opacity: twinkle
        ? { binding: 'interpolate', inputRange: [0, 90], outputRange: phase ? [0.25, 1] : [1, 0.25], options: { extrapolateLeft: 'wrap', extrapolateRight: 'wrap' } }
        : 0.9,
    });
  }
  const out: Node = { id: namespaced(actId, node), type: 'container', ...pickPos(node), children: kids };
  return out;
};

/** Lerp two #rrggbb colors (fog mix). Falls back verbatim on non-hex. */
const mixHex = (a: string, b: string, t: number): string => {
  const pa = /^#([0-9a-fA-F]{6})$/.exec(a);
  const pb = /^#([0-9a-fA-F]{6})$/.exec(b);
  if (!pa || !pb) return t < 0.5 ? a : b;
  const na = parseInt(pa[1]!, 16);
  const nb = parseInt(pb[1]!, 16);
  const r = Math.round(((na >> 16) & 255) * (1 - t) + ((nb >> 16) & 255) * t);
  const g = Math.round(((na >> 8) & 255) * (1 - t) + ((nb >> 8) & 255) * t);
  const bl = Math.round((na & 255) * (1 - t) + (nb & 255) * t);
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0')}`;
};

/**
 * v3 spatial math (Three.js-derived algorithms, native X80 implementation,
 * zero dependencies): hierarchical T·R·S composition, XYZ Euler rotations,
 * perspective divide, parametric geometries, Lambert directional shading,
 * 3D Catmull-Rom sampling. All CPU, all frame-pure, all deterministic.
 * Deliberately NOT the Three.js runtime: no WebGL/GL driver dependency
 * (driver-dependent pixels would break same-JSON→same-bytes across
 * machines), no DOM/RAF/wall-clock, no GPU/infra work.
 */
type V3 = [number, number, number];
type Mat4 = number[]; // row-major 4x4

const mIdent = (): Mat4 => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

const mMul = (a: Mat4, b: Mat4): Mat4 => {
  const o = new Array(16).fill(0) as number[];
  for (let r = 0; r < 4; r += 1) {
    for (let c = 0; c < 4; c += 1) {
      o[r * 4 + c] = a[r * 4]! * b[c]! + a[r * 4 + 1]! * b[4 + c]! + a[r * 4 + 2]! * b[8 + c]! + a[r * 4 + 3]! * b[12 + c]!;
    }
  }
  return o;
};

/** Compose T·Rx·Ry·Rz·S (XYZ Euler, degrees) — mirrors Object3D semantics. */
const mCompose = (p: V3, e: V3, s: V3): Mat4 => {
  const [ax, ay, az] = [e[0] * Math.PI / 180, e[1] * Math.PI / 180, e[2] * Math.PI / 180];
  const [cx, sx] = [Math.cos(ax), Math.sin(ax)];
  const [cy, sy] = [Math.cos(ay), Math.sin(ay)];
  const [cz, sz] = [Math.cos(az), Math.sin(az)];
  // R = Rx·Ry·Rz
  const r00 = cy * cz; const r01 = -cy * sz; const r02 = sy;
  const r10 = sx * sy * cz + cx * sz; const r11 = -sx * sy * sz + cx * cz; const r12 = -sx * cy;
  const r20 = -cx * sy * cz + sx * sz; const r21 = cx * sy * sz + sx * cz; const r22 = cx * cy;
  return [
    r00 * s[0], r01 * s[1], r02 * s[2], p[0],
    r10 * s[0], r11 * s[1], r12 * s[2], p[1],
    r20 * s[0], r21 * s[1], r22 * s[2], p[2],
    0, 0, 0, 1,
  ];
};

const xPt = (m: Mat4, p: V3): V3 => [
  m[0]! * p[0] + m[1]! * p[1] + m[2]! * p[2] + m[3]!,
  m[4]! * p[0] + m[5]! * p[1] + m[6]! * p[2] + m[7]!,
  m[8]! * p[0] + m[9]! * p[1] + m[10]! * p[2] + m[11]!,
];

/** Rotation-only transform for normals (uniform-scale assumption, documented). */
const xDir = (m: Mat4, n: V3): V3 => {
  const v: V3 = [
    m[0]! * n[0] + m[1]! * n[1] + m[2]! * n[2],
    m[4]! * n[0] + m[5]! * n[1] + m[6]! * n[2],
    m[8]! * n[0] + m[9]! * n[1] + m[10]! * n[2],
  ];
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

const num3 = (o: Record<string, unknown>, k: string): number | null => {
  const v = o[k];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
};

interface Xf { m: Mat4; bare: boolean }

/** Parse per-object transform; bare = identity (legacy verbatim path stays). */
const parseXform = (o: Record<string, unknown>): Xf => {
  const rx = num3(o, 'rx') ?? 0;
  const ry = num3(o, 'ry') ?? 0;
  const rz = num3(o, 'rz') ?? 0;
  const s = num3(o, 's');
  const sx = num3(o, 'sx') ?? s ?? 1;
  const sy = num3(o, 'sy') ?? s ?? 1;
  const sz = num3(o, 'sz') ?? s ?? 1;
  for (const [k, v] of [['rx', rx], ['ry', ry], ['rz', rz], ['sx', sx], ['sy', sy], ['sz', sz]] as const) {
    if (!Number.isFinite(v)) throw new Error(`scene3d: ${k} must be finite`);
  }
  if (sx <= 0 || sy <= 0 || sz <= 0) throw new Error('scene3d: scale must be > 0');
  const bare = rx === 0 && ry === 0 && rz === 0 && sx === 1 && sy === 1 && sz === 1;
  const p: V3 = [num3(o, 'x') ?? 0, num3(o, 'y') ?? 0, num3(o, 'z') ?? 0];
  return { m: mCompose(p, [rx, ry, rz], [sx, sy, sz]), bare };
};

/** Lambert factor from a directional light (three.js MeshLambertMaterial idea). */
const lambert = (n: V3, dir: V3, ambient: number): number => {
  const d = Math.max(0, n[0] * dir[0] + n[1] * dir[1] + n[2] * dir[2]);
  return Math.max(0, Math.min(1.5, ambient + (1 - ambient) * d));
};

interface Face { pts: V3[]; n: V3 }

/** Parametric geometries → faces with outward analytic normals. */
const geoBox = (w: number, h: number, d: number): Face[] => {
  const x = w / 2; const y = h / 2; const z = d / 2;
  const q = (pts: V3[], n: V3): Face => ({ pts, n });
  return [
    q([[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]], [0, 0, 1]),
    q([[-x, -y, -z], [-x, y, -z], [x, y, -z], [x, -y, -z]], [0, 0, -1]),
    q([[-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z]], [-1, 0, 0]),
    q([[x, -y, -z], [x, y, -z], [x, y, z], [x, -y, z]], [1, 0, 0]),
    q([[-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z]], [0, -1, 0]),
    q([[-x, y, -z], [-x, y, z], [x, y, z], [x, y, -z]], [0, 1, 0]),
  ];
};

const geoCyl = (rT: number, rB: number, h: number, seg: number): Face[] => {
  const faces: Face[] = [];
  const ring = (r: number, y: number): V3[] => {
    const pts: V3[] = [];
    for (let i = 0; i < seg; i += 1) {
      const a = (2 * Math.PI * i) / seg;
      pts.push([r * Math.cos(a), y, r * Math.sin(a)]);
    }
    return pts;
  };
  const top = ring(rT, -h / 2); // -y is up on screen; top cap faces -y
  const bot = ring(rB, h / 2);
  for (let i = 0; i < seg; i += 1) {
    const j = (i + 1) % seg;
    const a = (2 * Math.PI * i) / seg;
    const n: V3 = [Math.cos(a), 0, Math.sin(a)];
    faces.push({ pts: [top[i]!, top[j]!, bot[j]!, bot[i]!], n });
  }
  const fan = (ringPts: V3[], center: V3, n: V3): void => {
    for (let i = 0; i < seg; i += 1) {
      faces.push({ pts: [center, ringPts[i]!, ringPts[(i + 1) % seg]!], n });
    }
  };
  if (rT > 0) fan(top, [0, -h / 2, 0], [0, -1, 0]);
  if (rB > 0) fan(bot.slice().reverse(), [0, h / 2, 0], [0, 1, 0]);
  return faces;
};

const geoSphere = (r: number, lat: number, lon: number): Face[] => {
  const faces: Face[] = [];
  const pt = (la: number, lo: number): { p: V3; n: V3 } => {
    const phi = (la / lat) * Math.PI; // 0 = north (-y)
    const th = (lo / lon) * 2 * Math.PI;
    const n: V3 = [Math.sin(phi) * Math.cos(th), -Math.cos(phi), Math.sin(phi) * Math.sin(th)];
    return { p: [n[0] * r, n[1] * r, n[2] * r], n };
  };
  for (let la = 0; la < lat; la += 1) {
    for (let lo = 0; lo < lon; lo += 1) {
      const a = pt(la, lo); const b = pt(la, lo + 1);
      const c = pt(la + 1, lo + 1); const e = pt(la + 1, lo);
      faces.push({ pts: [a.p, b.p, c.p, e.p], n: a.n });
    }
  }
  return faces;
};

const geoTorus = (R: number, r: number, seg: number, tub: number): Face[] => {
  const faces: Face[] = [];
  const pt = (u: number, v: number): { p: V3; n: V3 } => {
    const a = (u / seg) * 2 * Math.PI;
    const b = (v / tub) * 2 * Math.PI;
    // screen-space torus lies in the x/y plane (hole faces the viewer)
    const p: V3 = [(R + r * Math.cos(b)) * Math.cos(a), (R + r * Math.cos(b)) * Math.sin(a), r * Math.sin(b)];
    const n: V3 = [Math.cos(b) * Math.cos(a), Math.cos(b) * Math.sin(a), Math.sin(b)];
    return { p, n };
  };
  for (let u = 0; u < seg; u += 1) {
    for (let v = 0; v < tub; v += 1) {
      const a = pt(u, v); const b = pt(u + 1, v);
      const c = pt(u + 1, v + 1); const e = pt(u, v + 1);
      faces.push({ pts: [a.p, b.p, c.p, e.p], n: a.n });
    }
  }
  return faces;
};

/** 3D Catmull-Rom sample (motionPath's 2D sibling, one dimension up). */
const catmull3 = (pts: V3[], t: number): V3 => {
  const n = pts.length - 1;
  const seg = Math.min(n - 1, Math.max(0, Math.floor(t * n)));
  const u = t * n - seg;
  const p0 = pts[Math.max(0, seg - 1)]!;
  const p1 = pts[seg]!;
  const p2 = pts[seg + 1]!;
  const p3 = pts[Math.min(n, seg + 2)]!;
  const f = (a: number, b: number, c: number, d: number): number =>
    0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);
  return [f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1]), f(p0[2], p1[2], p2[2], p3[2])];
};

/** Ribbon tube along a 3D curve (fixed-up frames, deterministic). */
const geoTube = (ctrl: V3[], r: number, seg: number, sides: number): Face[] => {
  if (ctrl.length < 2) throw new Error('scene3d tube needs >= 2 points');
  if (r <= 0) throw new Error('scene3d tube needs r > 0');
  const faces: Face[] = [];
  const up: V3 = [0, 1, 0];
  let prevN: V3 = [1, 0, 0];
  const rings: V3[][] = [];
  for (let i = 0; i <= seg; i += 1) {
    const t = i / seg;
    const c = catmull3(ctrl, t);
    const c2 = catmull3(ctrl, Math.min(1, t + 0.01));
    let tan: V3 = [c2[0] - c[0], c2[1] - c[1], c2[2] - c[2]];
    const tl = Math.hypot(tan[0], tan[1], tan[2]) || 1;
    tan = [tan[0] / tl, tan[1] / tl, tan[2] / tl];
    // frame normal = normalize(cross(tan, up)), fallback to previous ring
    let n: V3 = [tan[1] * up[2] - tan[2] * up[1], tan[2] * up[0] - tan[0] * up[2], tan[0] * up[1] - tan[1] * up[0]];
    const nl = Math.hypot(n[0], n[1], n[2]);
    n = nl < 1e-6 ? prevN : [n[0] / nl, n[1] / nl, n[2] / nl];
    prevN = n;
    const b: V3 = [tan[1] * n[2] - tan[2] * n[1], tan[2] * n[0] - tan[0] * n[2], tan[0] * n[1] - tan[1] * n[0]];
    const ring: V3[] = [];
    for (let k = 0; k < sides; k += 1) {
      const a = (2 * Math.PI * k) / sides;
      ring.push([
        c[0] + r * (Math.cos(a) * n[0] + Math.sin(a) * b[0]),
        c[1] + r * (Math.cos(a) * n[1] + Math.sin(a) * b[1]),
        c[2] + r * (Math.cos(a) * n[2] + Math.sin(a) * b[2]),
      ]);
    }
    rings.push(ring);
  }
  for (let i = 0; i < rings.length - 1; i += 1) {
    for (let k = 0; k < sides; k += 1) {
      const k2 = (k + 1) % sides;
      const a = rings[i]![k]!; const b = rings[i]![k2]!;
      const c = rings[i + 1]![k2]!; const e = rings[i + 1]![k]!;
      const ux = b[0] - a[0]; const uy = b[1] - a[1]; const uz = b[2] - a[2];
      const vx = e[0] - a[0]; const vy = e[1] - a[1]; const vz = e[2] - a[2];
      let n: V3 = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
      const l = Math.hypot(n[0], n[1], n[2]) || 1;
      n = [n[0] / l, n[1] / l, n[2] / l];
      faces.push({ pts: [a, b, c, e], n });
    }
  }
  return faces;
};

/**
 * `{type:'scene3d'}` v2 → weak-perspective projection into 2D paths.
 * Fields: width/height (stage), camera {distance, tiltX, tiltY},
 * light {top, side} face multipliers, fog {color, near, far},
 * objects[] {kind: box|pillar|plane|disc|wire|points, x,y,z, w,h,d,
 *   color, count, seed, r}.
 * CPU-only, deterministic, depth-sorted (painter's algorithm), fog-mixed.
 * Animate via parent skew/rotation bindings.
 * Future GPU path: implement `Renderer.drawScene3d` with headless-three
 * and keep this JSON shape unchanged.
 */
interface V3Env {
  ctx: Ctx; actId: string; nodeId: string;
  objects: Array<Record<string, unknown>>;
  cx: number; cy: number; tx: number; ty: number;
  focal: number | null; dist: number;
  fogColor: string | null; fogNear: number; fogFar: number;
  dirLight: V3 | null; ambient: number; topF: number; sideF: number;
}

interface V3Item {
  depth: number;
  emit: (emitFace: (d: string, fill: string, key: string) => void, emitDot: (x: number, y: number, r: number, fill: string, key: string) => void, emitEdge: (d: string, stroke: string, key: string) => void) => void;
}

/**
 * v3 scene render: hierarchies baked flat, parametric geometries, Lambert
 * light, perspective-or-weak projection, global painter's sort. New JSON
 * only — the legacy path above handles every pre-v3 spec byte-identically.
 */
const renderScene3dV3 = (env: V3Env): Node[] => {
  const { ctx, actId, nodeId, objects } = env;
  const fogMixD = (base: string, depth: number): string => {
    if (env.fogColor === null) return base;
    const t = Math.max(0, Math.min(1, (depth - env.fogNear) / Math.max(1, env.fogFar - env.fogNear)));
    return mixHex(base, env.fogColor, t * 0.85);
  };
  // Project a world point through the tilt rig, then divide.
  const view = (p: V3): { sx: number; sy: number; s: number; depth: number } => {
    const rx = p[0] * Math.cos(env.ty) + p[2] * Math.sin(env.ty);
    const rz = -p[0] * Math.sin(env.ty) + p[2] * Math.cos(env.ty);
    const ry = p[1] * Math.cos(env.tx) - rz * Math.sin(env.tx);
    const s = env.focal !== null
      ? env.focal / Math.max(50, env.focal + rz)
      : env.dist / Math.max(50, env.dist + rz);
    return { sx: env.cx + rx * s, sy: env.cy + ry * s, s, depth: rz };
  };
  const shadeBy = (resolved: string, nWorld: V3): string => {
    if (env.dirLight !== null) return shade(resolved, lambert(nWorld, env.dirLight, env.ambient));
    // Legacy-style orientation buckets (matches v2's top/side/front spirit).
    const ax = Math.abs(nWorld[0]); const ay = Math.abs(nWorld[1]); const az = Math.abs(nWorld[2]);
    if (ay >= ax && ay >= az) return shade(resolved, nWorld[1] < 0 ? env.topF : 0.5);
    if (ax >= az) return shade(resolved, env.sideF);
    return shade(resolved, nWorld[2] > 0 ? 1 : 0.45);
  };
  const items: Array<{ depth: number; kind: 'face' | 'dot' | 'edge'; d: string; fill: string; x: number; y: number; r: number; key: string }> = [];
  const pushFace = (world: V3[], nWorld: V3, resolved: string, key: string): void => {
    const ps = world.map(view);
    const d = `M ${ps.map((p) => `${p.sx.toFixed(1)} ${p.sy.toFixed(1)}`).join(' L ')} Z`;
    const dc = ps.reduce((a, p) => a + p.depth, 0) / ps.length;
    items.push({ depth: dc, kind: 'face', d, fill: fogMixD(shadeBy(resolved, nWorld), dc), x: 0, y: 0, r: 0, key });
  };
  const collect = (o: Record<string, unknown>, parentM: Mat4, seedBase: number, idx: string): void => {
    const kind = String(o.kind ?? 'box');
    const idp = `${actId}-${nodeId}-o${idx}`;
    if (kind === 'group') {
      for (const k of ['w', 'h', 'd', 'r', 'color', 'count', 'objects', 'points']) {
        if (o[k] !== undefined) throw new Error(`scene3d group '${String(o.id ?? idx)}' takes only transform + children (got ${k})`);
      }
      const ch = o.children;
      if (!Array.isArray(ch)) throw new Error(`scene3d group '${String(o.id ?? idx)}' needs children[]`);
      const xf = parseXform(o);
      const world = mMul(parentM, xf.m);
      const seed = typeof o.seed === 'number' ? o.seed : seedBase;
      ch.forEach((c, ci) => {
        if (c === null || typeof c !== 'object') throw new Error(`scene3d group child ${ci} must be an object`);
        collect(c as Record<string, unknown>, world, seed + ci * 131, `${idx}g${ci}`);
      });
      return;
    }
    if (o.children !== undefined) {
      throw new Error(`scene3d '${kind}' cannot have children (use kind 'group' for hierarchies)`);
    }
    const xf = parseXform(o);
    const world = mMul(parentM, xf.m);
    const base = String(o.color ?? (o as { colors?: unknown }).colors ?? '#8ab4ff');
    const resolved = String(resolveAlias(base, ctx.pal));
    const num = (k: string, fb: number): number => {
      const v = o[k];
      if (v === undefined) return fb;
      if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`scene3d ${kind}.${k} must be a finite number`);
      return v;
    };
    const W2 = (pts: V3[]): V3[] => pts.map((p) => xPt(world, p));
    const NW = (n: V3): V3 => xDir(world, n);
    if (kind === 'points') {
      const w = num('w', 120); const h = num('h', 120); const d = num('d', 60);
      const count = Math.max(1, Math.min(300, Math.floor(num('count', 80))));
      const rnd = mulberry32((typeof o.seed === 'number' ? o.seed : seedBase) * 40503 + 1);
      const x = num('x', 0); const y = num('y', 0); const z = num('z', 0);
      for (let p = 0; p < count; p += 1) {
        const wp = xPt(world, [x + (rnd() - 0.5) * w, y + (rnd() - 0.5) * h, z + (rnd() - 0.5) * d]);
        const v = view(wp);
        items.push({
          depth: v.depth, kind: 'dot', d: '',
          fill: fogMixD(resolved, v.depth),
          x: Math.round(v.sx), y: Math.round(v.sy),
          r: Math.max(0.6, Math.round(1.6 * v.s * 10) / 10), key: `${idp}-p${p}`,
        });
      }
      return;
    }
    if (kind === 'disc') {
      const r = num('r', Math.min(num('w', 120), num('h', 120)) / 2);
      if (r <= 0) throw new Error('scene3d disc needs r > 0');
      const x = num('x', 0); const y = num('y', 0); const z = num('z', 0);
      const ring: V3[] = [];
      for (let i = 0; i < 12; i += 1) {
        const a = (2 * Math.PI * i) / 12;
        ring.push([x + r * Math.cos(a), y + r * Math.sin(a), z]);
      }
      for (let i = 0; i < 12; i += 1) {
        pushFace(W2([[x, y, z], ring[i]!, ring[(i + 1) % 12]!]), NW([0, 0, 1]), resolved, `${idp}-t${i}`);
      }
      return;
    }
    if (kind === 'wire') {
      const w = num('w', 120); const h = num('h', 120); const d = num('d', 60);
      const x = w / 2; const y = h / 2; const z = d / 2;
      const c: V3[] = [[-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z], [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]];
      const E = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
      const wc = c.map((p) => xPt(world, p));
      const sub = E.map(([a, b]) => {
        const pa = view(wc[a]!); const pb = view(wc[b]!);
        return `M ${pa.sx.toFixed(1)} ${pa.sy.toFixed(1)} L ${pb.sx.toFixed(1)} ${pb.sy.toFixed(1)}`;
      }).join(' ');
      const dep = wc.reduce((acc, p) => acc + view(p).depth, 0) / wc.length;
      items.push({ depth: dep, kind: 'edge', d: sub, fill: fogMixD(resolved, dep), x: 0, y: 0, r: 0, key: `${idp}-wire` });
      return;
    }
    // Faceted kinds: local faces → world → project.
    let faces: Face[];
    const w = num('w', 120); const h = num('h', 120); const d = num('d', 60);
    if (w <= 0 || h <= 0 || d <= 0) throw new Error(`scene3d ${kind} needs positive w/h/d`);
    if (kind === 'box' || kind === 'pillar' || kind === 'plane') {
      faces = kind === 'plane'
        ? [{ pts: [[-w / 2, -h / 2, 0], [w / 2, -h / 2, 0], [w / 2, h / 2, 0], [-w / 2, h / 2, 0]], n: [0, 0, 1] }]
        : geoBox(w, h, d);
    } else if (kind === 'cylinder') {
      const seg = Math.max(3, Math.min(24, Math.floor(num('seg', 12))));
      const rT = o.rTop !== undefined || o.r !== undefined ? num('rTop', num('r', Math.min(w, h) / 2)) : Math.min(w, h) / 2;
      const rB = num('rBottom', num('r', Math.min(w, h) / 2));
      if (rT < 0 || rB < 0) throw new Error('scene3d cylinder needs rTop/rBottom >= 0');
      faces = geoCyl(rT, rB, h, seg);
    } else if (kind === 'cone') {
      const seg = Math.max(3, Math.min(24, Math.floor(num('seg', 12))));
      const r = num('r', Math.min(w, h) / 2);
      if (r <= 0) throw new Error('scene3d cone needs r > 0');
      faces = geoCyl(0, r, h, seg);
    } else if (kind === 'sphere') {
      const r = num('r', Math.min(w, h) / 2);
      if (r <= 0) throw new Error('scene3d sphere needs r > 0');
      const lat = Math.max(3, Math.min(10, Math.floor(num('lat', 6))));
      const lon = Math.max(4, Math.min(24, Math.floor(num('lon', 12))));
      faces = geoSphere(r, lat, lon);
    } else if (kind === 'torus') {
      const R = num('R', w / 2 || 80);
      const r = num('r', d / 2 || 24);
      if (R <= 0 || r <= 0) throw new Error('scene3d torus needs R, r > 0');
      const seg = Math.max(6, Math.min(20, Math.floor(num('seg', 12))));
      const tub = Math.max(4, Math.min(12, Math.floor(num('tub', 8))));
      faces = geoTorus(R, r, seg, tub);
    } else if (kind === 'tube') {
      const raw = o.points;
      if (!Array.isArray(raw) || raw.length < 2) throw new Error("scene3d tube needs points[[x,y,z],…] (≥ 2)");
      const ctrl = raw.map((p, pi) => {
        if (!Array.isArray(p) || p.length !== 3 || p.some((v) => typeof v !== 'number' || !Number.isFinite(v))) {
          throw new Error(`scene3d tube.points[${pi}] must be [x, y, z] finite numbers`);
        }
        return p as unknown as V3;
      });
      const r = num('r', 10);
      const seg = Math.max(8, Math.min(32, Math.floor(num('seg', 16))));
      const sides = Math.max(3, Math.min(8, Math.floor(num('sides', 6))));
      faces = geoTube(ctrl, r, seg, sides);
    } else {
      throw new Error(`scene3d unknown kind '${kind}' (box|pillar|plane|disc|wire|points|cylinder|cone|sphere|torus|tube|group)`);
    }
    faces.forEach((f, fi) => {
      pushFace(f.pts.map((p) => xPt(world, p)), xDir(world, f.n), resolved, `${idp}-f${fi}`);
    });
  };
  objects.forEach((o, i) => collect(o, mIdent(), 3, String(i)));
  // Global painter's sort: far → near across the whole stage.
  const sorted = items.sort((a, b) => a.depth - b.depth);
  const kids: Node[] = [];
  for (const it of sorted) {
    if (it.kind === 'face') {
      kids.push({ id: it.key, type: 'path', d: it.d, fill: it.fill });
    } else if (it.kind === 'dot') {
      kids.push({ id: it.key, type: 'circle', radius: it.r, x: it.x, y: it.y, fill: it.fill, opacity: 0.85 });
    } else {
      kids.push({ id: it.key, type: 'path', d: it.d, fill: 'rgba(0,0,0,0)', stroke: it.fill, strokeWidth: 2 });
    }
  }
  return kids as Node[];
};

const expandScene3d = (ctx: Ctx, actId: string, node: Record<string, unknown>): Node => {
  const W = typeof node.width === 'number' ? node.width : ctx.W;
  const H = typeof node.height === 'number' ? node.height : ctx.H;
  const cam = (node.camera as { distance?: number; tiltX?: number; tiltY?: number } | undefined) ?? {};
  const dist = cam.distance ?? 800;
  const tx = ((cam.tiltX ?? 12) * Math.PI) / 180;
  const ty = ((cam.tiltY ?? -18) * Math.PI) / 180;
  const light = (node.light as { top?: number; side?: number } | undefined) ?? {};
  const topF = typeof light.top === 'number' ? light.top : 1.18;
  const sideF = typeof light.side === 'number' ? light.side : 0.62;
  const fog = (node.fog as { color?: string; near?: number; far?: number } | undefined) ?? {};
  const fogColor = typeof fog.color === 'string' ? String(resolveAlias(fog.color, ctx.pal)) : null;
  const fogNear = typeof fog.near === 'number' ? fog.near : -400;
  const fogFar = typeof fog.far === 'number' ? fog.far : 600;
  const fogMix = (base: string, z: number): string => {
    if (fogColor === null) return base;
    const t = Math.max(0, Math.min(1, (z - fogNear) / Math.max(1, fogFar - fogNear)));
    return mixHex(base, fogColor, t * 0.85);
  };
  const cx = (typeof node.x === 'number' ? node.x : 0) + W / 2;
  const cy = (typeof node.y === 'number' ? node.y : 0) + H / 2;
  const proj = (x: number, y: number, z: number): [number, number, number] => {
    const s = dist / Math.max(50, dist + z);
    const rx = x * Math.cos(ty) + z * Math.sin(ty);
    const rz = -x * Math.sin(ty) + z * Math.cos(ty);
    const ry = y * Math.cos(tx) - rz * Math.sin(tx);
    void rz;
    return [cx + rx * s, cy + ry * s, s];
  };
  const objects = (Array.isArray(node.objects) ? node.objects : []) as Array<Record<string, unknown>>;
  // v3 triggers (anything else = legacy verbatim path, byte-identical to v2):
  // true-perspective camera, directional light, subdivided/parametric kinds,
  // groups, or per-object transforms. New JSON only — old specs never trigger.
  const fovRaw = (cam as { fov?: unknown }).fov;
  const fov = fovRaw === undefined ? undefined : Number(fovRaw);
  if (fov !== undefined && (!Number.isFinite(fov) || fov < 10 || fov > 120)) {
    throw new Error('scene3d camera.fov must be 10..120 degrees');
  }
  const dirRaw = (node.light as { dir?: unknown; ambient?: unknown } | undefined);
  let dirLight: V3 | null = null;
  let ambient = 0.35;
  if (dirRaw !== undefined && dirRaw !== null && typeof dirRaw === 'object' && (dirRaw as { dir?: unknown }).dir !== undefined) {
    const dd = (dirRaw as { dir?: unknown }).dir;
    if (!Array.isArray(dd) || dd.length !== 3 || dd.some((v) => typeof v !== 'number' || !Number.isFinite(v))) {
      throw new Error('scene3d light.dir must be [x, y, z] finite numbers');
    }
    const l = Math.hypot(dd[0] as number, dd[1] as number, dd[2] as number);
    if (l < 1e-9) throw new Error('scene3d light.dir must be non-zero');
    dirLight = [(dd[0] as number) / l, (dd[1] as number) / l, (dd[2] as number) / l];
    const am = (dirRaw as { ambient?: unknown }).ambient;
    if (am !== undefined) {
      if (typeof am !== 'number' || !Number.isFinite(am) || am < 0 || am > 1) {
        throw new Error('scene3d light.ambient must be 0..1');
      }
      ambient = am;
    }
  }
  const ALL_KINDS = new Set(['box', 'pillar', 'plane', 'disc', 'wire', 'points', 'cylinder', 'cone', 'sphere', 'torus', 'tube', 'group']);
  const assertKinds = (list: Array<Record<string, unknown>>): void => {
    for (const o of list) {
      const k = String(o.kind ?? 'box');
      if (!ALL_KINDS.has(k)) {
        throw new Error(`scene3d unknown kind '${k}' (box|pillar|plane|disc|wire|points|cylinder|cone|sphere|torus|tube|group)`);
      }
      if (k === 'group') {
        if (!Array.isArray(o.children)) throw new Error('scene3d group needs children[]');
        assertKinds(o.children as Array<Record<string, unknown>>);
      }
    }
  };
  assertKinds(objects);
  const V3_KINDS = new Set(['cylinder', 'cone', 'sphere', 'torus', 'tube', 'group']);
  const isBareObj = (o: Record<string, unknown>): boolean =>
    (o.rx === undefined && o.ry === undefined && o.rz === undefined &&
      o.s === undefined && o.sx === undefined && o.sy === undefined && o.sz === undefined);
  const useV3 = fov !== undefined || dirLight !== null || objects.some((o) =>
    V3_KINDS.has(String(o.kind ?? 'box')) || !isBareObj(o) || o.children !== undefined);
  if (useV3) {
    const focal = fov !== undefined ? (0.5 * H) / Math.tan((fov * Math.PI / 180) / 2) : null;
    const kids = renderScene3dV3({
      ctx, actId, nodeId: String(node.id ?? 's3'), objects,
      cx, cy, tx, ty, focal, dist, fogColor, fogNear, fogFar,
      dirLight, ambient, topF, sideF,
    });
    return { id: namespaced(actId, node), type: 'container', ...pickPos(node), children: kids } as Node;
  }
  // Depth-sort far -> near (painter's algorithm) for correct occlusion.
  const order = objects
    .map((o, i) => ({ o, i, z: typeof o.z === 'number' ? o.z : 0 }))
    .sort((a, b) => a.z - b.z);
  const kids: Node[] = [];
  order.forEach(({ o, i }) => {
    const kind = String(o.kind ?? 'box');
    const x = typeof o.x === 'number' ? o.x : 0;
    const y = typeof o.y === 'number' ? o.y : 0;
    const z = typeof o.z === 'number' ? o.z : 0;
    const w = typeof o.w === 'number' ? o.w : 120;
    const h = typeof o.h === 'number' ? o.h : 120;
    const d = typeof o.d === 'number' ? o.d : 60;
    const base = String(o.color ?? (o as { colors?: unknown }).colors ?? '#8ab4ff');
    const idp = `${actId}-${String(node.id ?? 's3')}-o${i}`;
    if (kind === 'points') {
      const count = Math.max(1, Math.min(300, Math.floor(typeof o.count === 'number' ? o.count : 80)));
      const rnd = mulberry32((typeof o.seed === 'number' ? o.seed : 3) * 40503 + 1);
      for (let p = 0; p < count; p += 1) {
        const lx = (rnd() - 0.5) * w;
        const ly = (rnd() - 0.5) * h;
        const lz = (rnd() - 0.5) * d;
        const [sx, sy, s] = proj(x + lx, y + ly, z + lz);
        kids.push({
          id: `${idp}-p${p}`, type: 'circle',
          radius: Math.max(0.6, Math.round(1.6 * s * 10) / 10),
          x: Math.round(sx), y: Math.round(sy),
          fill: fogMix(String(resolveAlias(base, ctx.pal)), z + lz), opacity: 0.85,
        });
      }
      return;
    }
    if (kind === 'plane') {
      const [ax, ay] = proj(x - w / 2, y - h / 2, z);
      const [bx, by] = proj(x + w / 2, y - h / 2, z);
      const [ccx, ccy] = proj(x + w / 2, y + h / 2, z);
      const [dx, dy] = proj(x - w / 2, y + h / 2, z);
      kids.push({
        id: idp, type: 'path',
        d: `M ${ax.toFixed(1)} ${ay.toFixed(1)} L ${bx.toFixed(1)} ${by.toFixed(1)} L ${ccx.toFixed(1)} ${ccy.toFixed(1)} L ${dx.toFixed(1)} ${dy.toFixed(1)} Z`,
        fill: fogMix(String(resolveAlias(base, ctx.pal)), z),
      });
      return;
    }
    if (kind === 'disc') {
      const r = typeof o.r === 'number' ? o.r : Math.min(w, h) / 2;
      const [sx, sy, s] = proj(x, y, z);
      kids.push({
        id: idp, type: 'circle',
        radius: Math.max(1, Math.round(r * s * 10) / 10),
        x: Math.round(sx), y: Math.round(sy),
        fill: fogMix(String(resolveAlias(base, ctx.pal)), z),
      });
      return;
    }
    // box + pillar: front + top + side faces with lit, fog-mixed fills.
    const [fx0, fy0] = proj(x - w / 2, y - h / 2, z + d / 2);
    const [fx1, fy1] = proj(x + w / 2, y - h / 2, z + d / 2);
    const [fx2, fy2] = proj(x + w / 2, y + h / 2, z + d / 2);
    const [fx3, fy3] = proj(x - w / 2, y + h / 2, z + d / 2);
    const [bx0, by0] = proj(x - w / 2, y - h / 2, z - d / 2);
    const [bx1, by1] = proj(x + w / 2, y - h / 2, z - d / 2);
    const [bx2, by2] = proj(x + w / 2, y + h / 2, z - d / 2);
    const resolved = String(resolveAlias(base, ctx.pal));
    const front = fogMix(resolved, z + d / 2);
    const f = (a: number, b: number, c: number, e: number, g: number, hh: number): string =>
      `M ${a.toFixed(1)} ${b.toFixed(1)} L ${c.toFixed(1)} ${e.toFixed(1)} L ${g.toFixed(1)} ${hh.toFixed(1)} Z`;
    if (kind === 'wire') {
      const edge = fogMix(resolved, z);
      kids.push({ id: `${idp}-wire`, type: 'path', d: `M ${fx0.toFixed(1)} ${fy0.toFixed(1)} L ${fx1.toFixed(1)} ${fy1.toFixed(1)} L ${fx2.toFixed(1)} ${fy2.toFixed(1)} L ${fx3.toFixed(1)} ${fy3.toFixed(1)} Z`, fill: 'rgba(0,0,0,0)', stroke: edge, strokeWidth: 2 });
      return;
    }
    kids.push({ id: `${idp}-top`, type: 'path', d: `${f(fx0, fy0, fx1, fy1, bx1, by1)} L ${bx0.toFixed(1)} ${by0.toFixed(1)} Z`, fill: fogMix(shade(resolved, topF), z) });
    kids.push({ id: `${idp}-side`, type: 'path', d: `${f(fx1, fy1, fx2, fy2, bx2, by2)} L ${bx1.toFixed(1)} ${by1.toFixed(1)} Z`, fill: fogMix(shade(resolved, sideF), z) });
    kids.push({ id: `${idp}-front`, type: 'path', d: `M ${fx0.toFixed(1)} ${fy0.toFixed(1)} L ${fx1.toFixed(1)} ${fy1.toFixed(1)} L ${fx2.toFixed(1)} ${fy2.toFixed(1)} L ${fx3.toFixed(1)} ${fy3.toFixed(1)} Z`, fill: front });
  });
  return { id: namespaced(actId, node), type: 'container', ...pickPos(node), children: kids } as Node;
};

/* ---------- open composition language (free nodes) ---------- */

const PALETTE_ALIASES = new Set(['bg', 'ink', 'accent', 'accent2', 'pillBg', 'pillFg']);

/** Resolve palette aliases anywhere a color is expected (free nodes). */
export const resolveAlias = (c: unknown, pal: ReelConcept['palette']): unknown => {
  if (typeof c !== 'string') return c;
  if (!PALETTE_ALIASES.has(c)) return c;
  return (pal as unknown as Record<string, string>)[c] ?? c;
};

const resolveFill = (fill: unknown, pal: ReelConcept['palette']): unknown => {
  if (fill === null || typeof fill !== 'object' || Array.isArray(fill)) {
    return resolveAlias(fill, pal);
  }
  const f = fill as { kind?: string; stops?: Array<{ offset: number; color: string }> };
  if (Array.isArray(f.stops)) {
    return {
      ...f,
      stops: f.stops.map((s) => ({ ...s, color: resolveAlias(s.color, pal) as string })),
    };
  }
  return fill;
};

const resolveShadow = (sh: unknown, pal: ReelConcept['palette']): unknown => {
  if (sh === null || typeof sh !== 'object') return sh;
  const s = sh as { color?: unknown } & Record<string, unknown>;
  if (s.color === undefined) return sh;
  return { ...s, color: resolveAlias(s.color, pal) };
};

/**
 * compileFreeNode: planner-authored fragment → engine node(s), verbatim.
 * Ids are namespaced per act (`actId-id`, slashes flattened) so acts
 * never collide; palette aliases resolve; animation bindings, gradients,
 * filters, blends, effects and arbitrary children pass through untouched.
 * Deterministic: same input → same output bytes.
 *
 * Open-ended expansions (all frame-pure, no new engine keywords needed):
 * - `{use: name}` instantiates `components[name]` with overrides merged.
 * - `layout: {direction, gap, align, padding}` on container/group stacks
 *   children in a row/column without manual math (HyperFrames-flex idea,
 *   measure-free: extents come from declared width/height/radius).
 * - `{type: 'particles'}` expands to N seeded circles (starfields, dust,
 *   confetti) with wrap-twinkle; planner animates the parent for drift.
 * - `{type: 'scene3d'}` projects declarative boxes/planes/point-clouds
 *   with weak-perspective math into 2D paths (CPU only, no GL). For a
 *   future GPU path, wrap headless-three behind `Renderer.drawScene3d`
 *   and keep this JSON shape — the spec stays identical.
 */
/**
 * Expand JSON-level motion systems to core bindings (compile-time, frame-pure):
 * - `{binding:'path', axis:'x'|'y', points, duration, samples?}` → baked
 *   Catmull-Rom interpolate for that axis (see motion.motionPath).
 * - `{binding:'stagger', base, index, step}` → time-shifted binding.
 * `keyframes`/`interpolate`/`spring`/`color` pass through natively.
 * Deep-walks the fragment so x/y/geometry/filter/effect params all qualify.
 * Unknown binding names throw loudly (never guess).
 */
const expandMotionDeep = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.map(expandMotionDeep);
  if (v === null || typeof v !== 'object') return v;
  const o = v as Record<string, unknown>;
  if (o.binding === 'path') {
    const axis = o.axis;
    const points = o.points as Array<[number, number]>;
    const duration = o.duration as number;
    if (axis !== 'x' && axis !== 'y') {
      throw new Error(`motion path binding needs axis 'x'|'y' (got ${String(axis)})`);
    }
    const baked = motionPath(points, duration, {
      ...(typeof o.samples === 'number' ? { samples: o.samples } : {}),
    });
    return baked[axis];
  }
  if (o.binding === 'stagger') {
    if (o.base === undefined) throw new Error('motion stagger binding needs a base binding');
    if (typeof o.index !== 'number' || typeof o.step !== 'number') {
      throw new Error('motion stagger binding needs numeric index and step');
    }
    return stagger(
      expandMotionDeep(o.base) as never,
      o.index as number,
      o.step as number,
    );
  }
  if (typeof o.binding === 'string' && !['interpolate', 'keyframes', 'spring', 'color'].includes(o.binding)) {
    throw new Error(`unknown binding '${String(o.binding)}' (motion systems: keyframes, path, stagger + interpolate/spring/color)`);
  }
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(o)) out[k] = expandMotionDeep(val);
  return out;
};

export const compileFreeNode = (ctx: Ctx, actId: string, node: Record<string, unknown>): Node => {
  node = expandMotionDeep(node) as Record<string, unknown>;
  // 0. Component instantiation.
  if (typeof node.use === 'string' && node.use.length > 0) {
    const frag = (ctx.components as Record<string, unknown> | undefined)?.[node.use];
    if (frag === undefined) {
      throw new Error(`compileFreeNode: unknown component '${node.use}' (node '${String(node.id)}')`);
    }
    const { use: _u, slots: _s, ...overrides } = node;
    void _u;
    void _s;
    if (Array.isArray(frag)) {
      const kids = (frag as Array<Record<string, unknown>>).map(
        (c, i) => compileFreeNode(ctx, `${actId}-${String(node.id ?? 'use')}`, { ...c, id: `${String((c as { id?: unknown }).id ?? `c${i}`)}` }),
      );
      return { id: namespaced(actId, node), type: 'container', ...pickPos(overrides), children: kids } as Node;
    }
    const base = clone(frag as Record<string, unknown>);
    const compiled = compileFreeNode(ctx, actId, { ...base, ...overrides, id: String(node.id ?? base.id ?? 'use') });
    // Slots: `{slots: {childOrigId: props}}` deep-targets one descendant
    // (e.g. per-instance labels inside a reused card). Matched against the
    // namespaced descendant id; fill/stroke aliases resolve like top-level.
    const slots = (node as { slots?: Record<string, Record<string, unknown>> }).slots;
    if (slots !== undefined && typeof slots === 'object') {
      const descendants: Node[] = [];
      const collect = (n: Node): void => {
        descendants.push(n);
        for (const c of ((n as { children?: Node[] }).children ?? [])) collect(c);
      };
      collect(compiled as Node);
      for (const [origId, props] of Object.entries(slots)) {
        const target = descendants.find((d) => String(d.id) === `${actId}-${origId}` || String(d.id).endsWith(`-${origId}`));
        if (target === undefined) {
          throw new Error(`compileFreeNode: slot '${origId}' not found in component '${String(node.use)}'`);
        }
        for (const [k, v] of Object.entries(props)) {
          (target as Record<string, unknown>)[k] = k === 'fill' ? resolveFill(v, ctx.pal) : k === 'stroke' ? resolveAlias(v, ctx.pal) : v;
        }
        if ((props as { shadow?: unknown }).shadow !== undefined) {
          (target as Record<string, unknown>).shadow = resolveShadow((props as { shadow?: unknown }).shadow, ctx.pal);
        }
      }
    }
    if ((compiled as Record<string, unknown>).slots !== undefined) {
      delete (compiled as Record<string, unknown>).slots;
    }
    // Per-instance suffix: the same component used N times must not share
    // descendant ids (the engine rejects duplicate scene ids loudly).
    const topId = (compiled as { id: string }).id;
    const suffix = `--${String(node.id ?? 'use').replace(/\//g, '-')}`;
    const walk = (n: Node): void => {
      n.id = `${String(n.id)}${suffix}`;
      for (const c of ((n as { children?: Node[] }).children ?? [])) walk(c);
    };
    for (const c of ((compiled as { children?: Node[] }).children ?? [])) walk(c);
    (compiled as { id: string }).id = topId;
    return compiled;
  }
  // 1. Generative expansions.
  if (node.type === 'particles') {
    return expandParticles(ctx, actId, node);
  }
  if (node.type === 'scene3d') {
    return expandScene3d(ctx, actId, node);
  }
  const rawId = typeof node.id === 'string' && node.id.length > 0 ? node.id : 'node';
  const nid = rawId.startsWith(`${actId}-`) ? rawId : `${actId}-${rawId.replace(/\//g, '-')}`;
  const out: Node = { ...node, id: nid };
  for (const k of ['fill', 'stroke'] as const) {
    if (out[k] !== undefined) {
      out[k] = k === 'fill' ? resolveFill(out[k], ctx.pal) : resolveAlias(out[k], ctx.pal);
    }
  }
  if (out.shadow !== undefined) out.shadow = resolveShadow(out.shadow, ctx.pal) as unknown;
  if (Array.isArray(node.children)) {
    let kids = (node.children as Array<Record<string, unknown>>).map(
      (c) => compileFreeNode(ctx, actId, c),
    ) as unknown as Node[];
    const layout = node.layout as { direction?: string; gap?: number; align?: string; padding?: number } | undefined;
    if ((node.type === 'container' || node.type === 'group') && layout !== undefined) {
      kids = applyFlex(kids, layout);
    }
    out.children = kids as unknown;
  } else {
    const layout = node.layout as { direction?: string; gap?: number; align?: string; padding?: number } | undefined;
    if ((node.type === 'container' || node.type === 'group') && layout !== undefined && (out as { children?: unknown }).children === undefined) {
      out.children = [];
    }
    if (out.layout !== undefined) delete (out as Record<string, unknown>).layout;
  }
  if (out.layout !== undefined) delete (out as Record<string, unknown>).layout;
  if (out.use !== undefined) delete (out as Record<string, unknown>).use;
  return out;
};

/** Normalize `nodes` (single or array) into compiled engine nodes. */
export const compileFreeNodes = (
  ctx: Ctx, actId: string, nodes: unknown,
): Node[] => {
  const list = Array.isArray(nodes) ? nodes : [nodes];
  return list.map((n) => compileFreeNode(ctx, actId, n as Record<string, unknown>));
};

/**
 * freeTitle: neutral title atom for free acts (0–8 lines).
 * Preset layouts keep their kinetic/hero treatments; free acts get a
 * plain stacked treatment honoring titleSize/titleY/center/face —
 * planners needing anything wilder use `nodes` text directly.
 */
export const freeTitle = (
  ctx: Ctx, id: string, title: ActTitle, o: { size?: number; x?: number; y?: number; center?: boolean; face?: string } = {},
): Node[] => {
  const maxW = 476;
  const face = o.face ?? ctx.faces.display;
  const size = autoFit(ctx, id, title.lines.map((ln) => ln.text), o.size ?? 54, maxW, face, 800);
  const step = Math.round(size * 1.08);
  const y0 = o.y ?? 200;
  const align = o.center === true
    ? { textAlign: 'center', maxWidth: ctx.W, x: 0 }
    : { x: o.x ?? 32, maxWidth: maxW };
  const out: Node[] = [];
  title.lines.forEach((ln, i) => {
    const at = 6 + i * 9;
    out.push({
      id: `${id}-f${i + 1}`, type: 'text', text: ln.text, fontFamily: ln.face ?? face,
      fontSize: size, fontWeight: ln.weight ?? 800, fill: inkOf(ln.fill, ctx.pal), lineHeight: 1.05,
      ...align, y: anim([at, at + 18], [y0 + i * step + 26, y0 + i * step]), opacity: fade(at, at + 16),
      shadow: { color: 'rgba(0,0,0,0.75)', blur: 25, offsetY: 5 },
    });
  });
  if (title.sub !== '') {
    out.push(subLine(ctx, `${id}-sub`, title.sub, y0 + title.lines.length * step + 24, o.center));
  }
  return out;
};

/**
 * customKicker: free-positioned label atom for `style: custom` (or any
 * non-preset style under a free system). Same overline rendering as the
 * cinematic atom plus planner-controlled size/tracking/x.
 */
export const customKicker = (
  ctx: Ctx, id: string, text: string,
  o: { y?: number; at?: number; x?: number; face?: string; size?: number; letterSpacing?: number } = {},
): Node => ({
  id, type: 'text', text, fontFamily: o.face ?? ctx.faces.kicker,
  fontSize: o.size ?? 24, fontWeight: 700, letterSpacing: o.letterSpacing ?? 6,
  fill: ctx.pal.accent2,
  x: o.x ?? 32, y: anim([(o.at ?? 4), (o.at ?? 4) + 16], [(o.y ?? 96) + 18, (o.y ?? 96)]),
  opacity: fade(o.at ?? 4, (o.at ?? 4) + 12),
  shadow: { color: 'rgba(0,0,0,0.7)', blur: 12, offsetY: 2 },
});
