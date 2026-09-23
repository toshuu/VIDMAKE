/**
 * compileReel: ReelSpec JSON → VideoPlan data, deterministically.
 * No agentic choices: every pixel on screen traces to a spec field.
 * Returns the plan plus a decisions log (path/choice/why per act).
 */
import { assembleTimeline } from './timeline.js';
import {
  badge, bgSubject, emblemSubject, flipSubject, footageSubject, grainRef, heroTitle,
  iconsSubject, kickerPill, kineticTitle, lockup, numeral, overline,
  pillCta, propsSubject, subLine, tickerSubject, tintVeil,
  type Ctx, type Measure, type Node,
} from './layouts.js';
import type { ActSpec, ReelSpec, SubjectSpec } from './types.js';
import { validateSpec } from './validate.js';

export interface CompileOutput {
  plan: unknown;
  decisions: Array<{ path: string; choice: string; why: string }>;
  total: number;
}

const posterFrame = (ctx: Ctx, id: string): Node => ({
  id: `${id}-frame`, type: 'rrect', width: 476, height: 400, radius: 4,
  fill: 'rgba(0,0,0,0)', stroke: '#f3d9a0', strokeWidth: 2,
  x: 32, y: 290, opacity: { binding: 'interpolate', inputRange: [6, 20], outputRange: [0, 1], options: { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } },
});

const ticketCard = (
  ctx: Ctx, id: string,
  t: { title: string; sub: string; x: number; y: number; w: number; h: number; rotation: number; rule?: [string, string] | boolean },
): Node => ({
  id, type: 'rrect', width: t.w, height: t.h, radius: 10,
  fill: '#f2fbf4', x: t.x, y: t.y, rotation: t.rotation,
  anchorX: t.w / 2, anchorY: t.h / 2,
  opacity: { binding: 'interpolate', inputRange: [8, 20], outputRange: [0, 1], options: { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } },
  shadow: { color: 'rgba(0,0,0,0.55)', blur: 34, offsetY: 8 },
  children: [
    {
      id: `${id}-t`, type: 'text', text: t.title, fontFamily: ctx.faces.kicker,
      fontSize: 34, fontWeight: 700, letterSpacing: 3, fill: '#0b1020',
      x: 30, y: 44,
    },
    {
      id: `${id}-s`, type: 'text', text: t.sub, fontFamily: ctx.faces.hero,
      fontSize: 24, fontWeight: 500, fill: 'rgba(11,16,32,0.75)',
      x: 30, y: 110,
    },
    {
      id: `${id}-r`, type: 'rect', width: 120, height: 8, x: 30, y: 160,
      fill: { kind: 'linear', angle: 90, stops: (Array.isArray(t.rule) ? t.rule : [ctx.pal.accent, ctx.pal.accent2]).map((c, i) => ({ offset: i, color: c })) },
    },
  ],
});

const veilRise = (ctx: Ctx, id: string): Node => ({
  id, type: 'rect', width: ctx.W, height: ctx.H, x: 0,
  y: { binding: 'interpolate', inputRange: [0, 26], outputRange: [960, 120], options: { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } },
  fill: 'rgba(5,7,16,0.88)',
  opacity: { binding: 'interpolate', inputRange: [0, 26], outputRange: [0, 1], options: { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } },
});

const buildSubjects = (ctx: Ctx, actId: string, act: ActSpec, dur: number): Node[] => {
  const out: Node[] = [];
  // bg subjects paint first regardless of spec order ( Ruled: ground before figures).
  for (const s of (act.subjects ?? []).filter((x) => x.kind === 'bg')) {
    out.push(...bgSubject(ctx, `${actId}-bg`, s as Extract<SubjectSpec, { kind: 'bg' }>));
  }
  (act.subjects ?? []).filter((x) => x.kind !== 'bg').forEach((s, si) => {
    const sid = `${actId}-s${si}`;
    if (s.kind === 'footage') {
      out.push(...footageSubject(ctx, `${actId}-v`, s, dur));
      if (s.tint !== undefined) {
        out.push({
          id: `${actId}-tint`, type: 'rect', width: ctx.W, height: ctx.H, x: 0, y: 0,
          fill: s.tint.color, opacity: s.tint.opacity, blendMode: 'overlay',
        });
      }
    } else if (s.kind === 'flipbook') {
      out.push(flipSubject(ctx, sid, s, dur));
    } else if (s.kind === 'icons') {
      out.push(...iconsSubject(ctx, sid, s));
    } else if (s.kind === 'emblem') {
      out.push(...emblemSubject(ctx, sid, s));
    } else if (s.kind === 'ticker') {
      out.push(...tickerSubject(ctx, sid, s));
    } else if (s.kind === 'props') {
      out.push(...propsSubject(ctx, sid, s));
    }
  });
  return out;
};

const kickerNodes = (ctx: Ctx, actId: string, act: ActSpec): Node[] => {
  if (act.kicker === undefined || act.kicker === null) return [];
  if (act.kicker.style === 'overline') {
    return [overline(ctx, `${actId}-ol`, act.kicker.text, act.kicker.y ?? 96, act.kicker.at ?? 4)];
  }
  return [kickerPill(ctx, `${actId}-kick`, act.kicker.text, ctx.pal.accent)];
};

const buildAct = (ctx: Ctx, act: ActSpec, n: number, dur: number): Node => {
  const actId = `act${n + 1}`;
  const kids: Node[] = [];
  kids.push(...buildSubjects(ctx, actId, act, dur));

  if (act.layout === 'stack' || act.layout === 'lowtitle') {
    kids.push(...kickerNodes(ctx, actId, act));
    const big = act.layout === 'lowtitle';
    kids.push(...heroTitle(ctx, actId, act.title, {
      size: act.titleSize ?? (big ? 68 : 46),
      y: act.titleY ?? (big ? 588 : 132),
      center: act.center,
    }));
    kids.push(subLine(ctx, `${actId}-sub`, act.title.sub,
      act.subY ?? (big ? 716 : 252), act.center));
  } else if (act.layout === 'giant' || act.layout === 'lower3rd') {
    kids.push(...kickerNodes(ctx, actId, act));
    kids.push(...kineticTitle(ctx, actId, act.title, {
      size: act.titleSize ?? 64,
      center: act.center,
      y: act.titleY ?? (act.layout === 'giant' ? 200 : 560),
    }));
    kids.push(subLine(ctx, `${actId}-sub`, act.title.sub,
      act.subY ?? (act.layout === 'giant' ? 372 : 610), act.center, 26, act.subAt ?? 16));
    if (act.layout === 'lower3rd' && act.design?.numeral !== undefined) {
      kids.push(numeral(ctx, `${actId}-num`, act.design.numeral));
    }
  } else if (act.layout === 'poster') {
    if (act.design?.frame !== false) kids.push(posterFrame(ctx, actId));
    kids.push(...kickerNodes(ctx, actId, act));
    kids.push(...kineticTitle(ctx, actId, act.title, {
      size: act.titleSize ?? 58, center: true, y: 340,
    }));
    kids.push(subLine(ctx, `${actId}-sub`, act.title.sub, act.subY ?? 500, true, 26, act.subAt ?? 22));
  } else if (act.layout === 'ticket') {
    if (act.design?.ticket !== undefined) kids.push(ticketCard(ctx, `${actId}-tick`, act.design.ticket));
    kids.push(...kickerNodes(ctx, actId, act));
  } else if (act.layout === 'takeover') {
    if (act.design?.veil !== false) kids.push(veilRise(ctx, `${actId}-veil`));
    kids.push(...kickerNodes(ctx, actId, act));
    kids.push(...kineticTitle(ctx, actId, act.title, {
      size: act.titleSize ?? 72, center: true, y: 300, at: 30,
    }));
    if (act.cta !== undefined && act.cta !== null) {
      kids.push(pillCta(ctx, `${actId}-pill`, act.cta,
        act.ctaAt?.y ?? 560, act.ctaAt?.at ?? [52, 64],
        act.ctaAt?.size ?? 22, act.ctaAt?.h ?? 58, act.ctaAt?.spring ?? false));
    }
    kids.push(subLine(ctx, `${actId}-sub`, act.title.sub, act.subY ?? 660, true, 26, act.subAt ?? 60));
    if (act.lockup !== undefined && act.lockup !== null) {
      kids.push(lockup(ctx, `${actId}-lock`, act.lockup, 724));
    }
  }
  if (act.badge !== false) kids.push(badge(actId, n + 1));
  kids.push(grainRef(actId));
  ctx.decisions.push({
    path: actId, choice: `${act.role}/${act.layout}`,
    why: `${act.role} beat in ${act.layout} treatment; subjects: ${(act.subjects ?? []).map((s) => s.kind).join('+') || 'type-only'}`,
  });
  return { id: actId, type: 'container', children: kids };
};

export const compileReel = (
  spec: ReelSpec,
  opts: { measure?: Measure } = {},
): CompileOutput => {
  const errs = validateSpec(spec);
  if (errs.length > 0) {
    throw new Error(`invalid ReelSpec (${spec.id}):\n- ${errs.join('\n- ')}`);
  }
  const decisions: CompileOutput['decisions'] = [];
  const ctx: Ctx = {
    W: spec.canvas.w, H: spec.canvas.h,
    faces: spec.concept.faces, pal: spec.concept.palette,
    measure: opts.measure, decisions,
  };
  decisions.push({
    path: 'concept', choice: `${spec.system} + ${spec.concept.palette.bg}`,
    why: spec.concept.signatureWhy,
  });
  const sceneActs = spec.acts.map((a, i) => buildAct(ctx, a, i, spec.durations[i]!));
  const actIds = sceneActs.map((a) => String(a.id));
  const { children, total } = assembleTimeline(
    actIds, spec.durations,
    spec.transitions.map((t) => ({ type: t.type, params: t.params })),
  );
  if (spec.audio?.stingers !== undefined && spec.audio.stingers !== 'cuts') {
    decisions.push({ path: 'audio', choice: 'custom stingers', why: 'spec lists explicit frames' });
  }
  const plan = {
    composition: {
      id: spec.id, width: spec.canvas.w, height: spec.canvas.h, fps: spec.canvas.fps,
      durationInFrames: total,
      root: {
        id: 'root', type: 'container',
        children: [
          ...sceneActs,
          {
            id: 'chrome', type: 'container',
            children: [
              {
                id: 'prog-fill', type: 'rect', width: spec.canvas.w, height: 6, x: 0, y: spec.canvas.h - 6,
                fill: { kind: 'linear', angle: 90, stops: [{ offset: 0, color: spec.concept.palette.accent }, { offset: 1, color: '#ffffff' }] },
                scaleX: {
                  binding: 'interpolate', inputRange: [0, total - 1], outputRange: [0, 1],
                  options: { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
                },
                anchorX: 0, anchorY: 0,
              },
            ],
          },
        ],
      },
    },
    timeline: { kind: 'sequence', from: 0, durationInFrames: total, children },
  };
  return { plan, decisions, total };
};
