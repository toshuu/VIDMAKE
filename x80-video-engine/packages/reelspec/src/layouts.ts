/**
 * Layout systems: spec acts → scene nodes. Pure data constructors.
 * Faces doctrine: display = titles that SHOUT (ktitle, emblem marks);
 * hero = text that TALKS (subs, pills, quotes); kicker = labels that TAG
 * (kickers, overlines, numerals, tickers, lockups, ticket heads).
 */
import type {
  ActTitle, ReelConcept, SubjectSpec,
} from './types.js';

export type Node = Record<string, unknown>;
export type Measure = (text: string, size: number, weight: number, ls: number, family: string) => number;

export interface Ctx {
  W: number;
  H: number;
  faces: ReelConcept['faces'];
  pal: ReelConcept['palette'];
  measure?: Measure;
  decisions: Array<{ path: string; choice: string; why: string }>;
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
  fill === 'ink' ? pal.ink : fill === 'accent' ? pal.accent : fill;

/* ---------- shared atoms ---------- */

export const kickerPill = (
  ctx: Ctx, actId: string, label: string, accent: string, y = 84, x = 32,
): Node => {
  const size = 14;
  const ls = 2;
  const tw = ctx.measure !== undefined
    ? ctx.measure(label, size, 700, ls, ctx.faces.kicker)
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
        id: `${actId}-kick-t`, type: 'text', text: label, fontFamily: ctx.faces.kicker,
        fontSize: size, fontWeight: 700, letterSpacing: ls, fill: '#f3d9a0',
        x: 30, y: 9,
      },
    ],
  };
};

export const overline = (ctx: Ctx, id: string, text: string, y = 96, at = 4): Node => ({
  id, type: 'text', text, fontFamily: ctx.faces.kicker,
  fontSize: 24, fontWeight: 700, letterSpacing: 6, fill: ctx.pal.accent2,
  x: 32, y: anim([at, at + 16], [y + 18, y]), opacity: fade(at, at + 12),
  shadow: { color: 'rgba(0,0,0,0.7)', blur: 12, offsetY: 2 },
});

export const heroTitle = (
  ctx: Ctx, id: string, title: ActTitle, o: { x?: number; y?: number; size?: number; maxW?: number; center?: boolean } = {},
): Node[] => {
  const maxW = o.maxW ?? 420;
  const size = autoFit(ctx, id, title.lines.map((ln) => ln.text), o.size ?? 46, maxW, ctx.faces.hero, 800);
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
      id: `${id}-t${i + 1}`, type: 'text', text: ln.text, fontFamily: ctx.faces.hero,
      fontSize: size, fontWeight: 800, fill: inkOf(ln.fill, ctx.pal), lineHeight: 1.05,
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
      id: `${id}-l${i}`, type: 'text', text: ln.text, fontFamily: face,
      fontSize: size, fontWeight: 800, fill: inkOf(ln.fill, ctx.pal), lineHeight: 1.04,
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
