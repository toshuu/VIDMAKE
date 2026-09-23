/**
 * Compose: beats + shots + concept → VideoPlan data + motion + transitions.
 * Every structural choice pushes a Decision (WHY). Procedural visuals only:
 * shapes, gradients, type, grain hooks — zero supplied assets.
 */
import type {
  Beat, Concept, Decision, Intent, Motion, PlannedAct, Shot, ShotKind, TransitionChoice,
} from './ir.js';
import { Easing } from '@x80/core';
import { wrapDisplay } from './narrative.js';

export interface Measure {
  (text: string, size: number, weight: number, ls?: number, family?: string): number;
}

interface Ctx {
  W: number;
  H: number;
  fps: number;
  measure: Measure;
  decisions: Decision[];
}

const note = (ctx: Ctx, path: string, choice: string, why: string): void => {
  ctx.decisions.push({ path, choice, why });
};

const anim = (inputRange: number[], outputRange: number[], linear = false): unknown => ({
  binding: 'interpolate',
  inputRange,
  outputRange,
  options: linear
    ? { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.linear }
    : { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
});
const fade = (a: number, b: number, dir = 1): unknown =>
  dir > 0 ? anim([a, b], [0, 1]) : anim([a, b], [1, 0]);
const leaf = (ref: string): unknown => ({ kind: 'leaf', ref });
const seq = (from: number, durationInFrames: number, children: unknown[]): unknown => ({
  kind: 'sequence', from, durationInFrames, children,
});

type Node = Record<string, unknown>;

const LY = { kicker: 548, hero: 596, sub: 720, cards: 776 };

const kicker = (ctx: Ctx, actId: string, label: string, accent: string, y = LY.kicker, x = 32): Node => {
  const size = 14;
  const ls = 2;
  // Poppins kickers + measured pills + trailing-ls compensation (dept
  // pairing rule #12, pill rule #4, trailing-space rule #2) — same contract
  // as the hand-reel kickMeasure builder.
  const textW = ctx.measure(label, size, 700, ls, 'Poppins');
  const padX = 16;
  const dotD = 8;
  const gap = 6;
  const boxW = Math.ceil(textW) - ls;
  const w = padX + dotD + gap + boxW + padX;
  ctx.decisions.push({
    path: `${actId}.kicker`, choice: `dot pill w=${w}`,
    why: `measured ${Math.ceil(textW)}px + laid spacing; dot restores the brand mark`,
  });
  return {
    id: `${actId}-kick`, type: 'rrect', width: w, height: 34, radius: 17,
    fill: '#10141f', stroke: 'rgba(255,255,255,0.16)', strokeWidth: 1,
    x, y, opacity: fade(4, 14),
    children: [
      { id: `${actId}-kick-dot`, type: 'circle', radius: dotD / 2, x: padX, y: Math.round((34 - dotD) / 2), fill: accent },
      {
        id: `${actId}-kick-t`, type: 'text', text: label, fontFamily: 'Poppins',
        fontSize: size, fontWeight: 700, letterSpacing: ls, fill: '#f3d9a0',
        maxWidth: boxW, x: padX + dotD + gap, y: 9,
      },
    ],
  };
};

const hero = (
  ctx: Ctx, actId: string, l1: string, l2: string, accent: string,
  size: number, face: string, glow: string, x = 32, y1 = LY.hero, centered = false,
): Node[] => {
  const step = Math.round(size * 1.05);
  const align = centered
    ? { textAlign: 'center', maxWidth: ctx.W, x: 0 }
    : { x };
  // Integrity rule: single-line heroes render one line. The old fallback
  // filled a missing second line with a mid-word slice of the support copy
  // ("AI: the", "English ou…") — truncation rendered as design. Empty stays
  // empty; the critique loop shrinks oversized lines instead of slicing them.
  const lines: Array<{ text: string; accent: boolean; at: number }> = [
    { text: l1, accent: false, at: 6 },
    ...(l2 !== '' ? [{ text: l2, accent: true, at: 12 }] : []),
  ];
  note(ctx, `${actId}.hero`, `"${l1}${l2 !== '' ? ` / ${l2}` : ' (single line)'}" @${size}px`,
    `two-line hero, accent carries the claim word; ${centered ? 'centered finale voice' : 'left-anchored scan column'}`);
  return lines.map((ln, k) => ({
    id: `${actId}-h${k + 1}`, type: 'text', text: ln.text, fontFamily: face, fontSize: size,
    fontWeight: 800, fill: ln.accent ? accent : '#ffffff', lineHeight: 1.05, ...align,
    y: anim([ln.at, ln.at + 18], [y1 + k * step + 26, y1 + k * step]), opacity: fade(ln.at, ln.at + 16),
    shadow: ln.accent
      ? { color: glow, blur: 40, offsetY: 5 }
      : { color: 'rgba(0,0,0,0.75)', blur: 25, offsetY: 5 },
  }));
};

const subNode = (ctx: Ctx, actId: string, text: string, y = LY.sub, at = 16, centered = false): Node => {
  note(ctx, `${actId}.sub`, `19px/500 @${y}`, 'supporting line sits quiet under the hero');
  return {
    id: `${actId}-sub`, type: 'text', text, fontFamily: 'Inter', fontSize: 19,
    fontWeight: 500, fill: 'rgba(240,244,252,0.94)', lineHeight: 1.4,
    ...(centered ? { textAlign: 'center', maxWidth: ctx.W, x: 0 } : { x: 32, maxWidth: 476 }),
    y, opacity: fade(at, at + 12),
    shadow: { color: 'rgba(0,0,0,0.7)', blur: 12, offsetY: 2 },
  };
};

const glassDuel = (
  ctx: Ctx, actId: string, stats: string[], accent: string, at = 24,
): Node[] => {
  note(ctx, `${actId}.stats`, 'frosted duel', 'glass = fill + hairline + backdropBlur; values Poppins, labels Inter');
  return [32, 276].map((x, i) => {
    const [value = '?', label = '?'] = (stats[i] ?? '?|?').split('|');
    return {
      id: `${actId}-s${i + 1}`, type: 'rrect', width: 232, height: 96, radius: 20,
      fill: 'rgba(255,255,255,0.14)', stroke: 'rgba(255,255,255,0.22)', strokeWidth: 1,
      backdropBlur: 5, x, y: LY.cards, opacity: fade(at + i * 6, at + i * 6 + 12),
      children: [
        {
          id: `${actId}-s${i + 1}v`, type: 'text', text: value, fontFamily: 'Poppins',
          fontSize: 30, fontWeight: 700, fill: i === 0 ? accent : '#ffffff',
          textAlign: 'center', maxWidth: 232, x: 0, y: 20,
        },
        {
          id: `${actId}-s${i + 1}l`, type: 'text', text: label, fontFamily: 'Inter',
          fontSize: 12, fontWeight: 600, letterSpacing: 1, fill: 'rgba(255,255,255,0.88)',
          textAlign: 'center', maxWidth: 232, x: 0.5, y: 64,
        },
      ],
    };
  });
};

const emblem = (ctx: Ctx, actId: string, mark: string, accent: string): Node[] => {
  note(ctx, `${actId}.emblem`, `monogram "${mark}" + orbit`,
    'zero-shot emblem: brand initial in a ring, satellite drift = motion without assets');
  const cx = 270;
  const cy = 360;
  const r = 110;
  return [
    {
      id: `${actId}-halo`, type: 'circle', radius: 130, x: cx - 130, y: cy - 130,
      opacity: 0.8, blendMode: 'screen',
      fill: { kind: 'radial', stops: [{ offset: 0, color: accent }, { offset: 1, color: 'rgba(0,0,0,0)' }] },
    },
    {
      id: `${actId}-ring`, type: 'circle', radius: r, x: cx - r, y: cy - r,
      fill: 'rgba(0,0,0,0)', stroke: accent, strokeWidth: 2, opacity: fade(4, 18),
    },
    {
      id: `${actId}-sat`, type: 'circle', radius: 7,
      x: anim([0, 30, 60, 90, 120, 150, 179], [cx + 103, cx + 83, cx + 40, cx - 19, cx - 73, cx - 102, cx - 100]),
      y: anim([0, 30, 60, 90, 120, 150, 179], [cy - 7, cy + 56, cy + 97, cy + 104, cy + 73, cy + 15, cy - 46]),
      fill: accent, opacity: fade(10, 24),
    },
    {
      id: `${actId}-mark`, type: 'text', text: mark, fontFamily: 'Poppins',
      fontSize: 96, fontWeight: 700, fill: '#ffffff',
      textAlign: 'center', maxWidth: 220, x: cx - 110, y: cy - 62, opacity: fade(8, 22),
      shadow: { color: 'rgba(0,0,0,0.6)', blur: 30, offsetY: 4 },
    },
  ];
};

const waveBars = (ctx: Ctx, actId: string, n: number, accent: string, accent2: string): Node[] => {
  note(ctx, `${actId}.wave`, `${n} phase-shifted bars`, 'motion IS the visual — never fully still, anchors the act');
  const P7 = [0.25, 0.5, 0.85, 1, 0.65, 0.4, 0.7];
  const fr = [0, 30, 60, 90, 120, 150, 179];
  const w = 12;
  const h = 110;
  const x0 = Math.round((ctx.W - (n * (w + 5) - 5)) / 2);
  return Array.from({ length: n }, (_, i) => {
    const off = (i * 2) % P7.length;
    return {
      id: `${actId}-wb${i}`, type: 'rrect', width: w, height: h, radius: w / 2,
      fill: {
        kind: 'linear', angle: 180,
        stops: [{ offset: 0, color: accent }, { offset: 1, color: accent2 }],
      },
      x: x0 + i * (w + 5), y: 290, anchorX: w / 2, anchorY: h,
      scaleX: 1,
      scaleY: anim(fr, P7.map((_, k) => P7[(off + k) % P7.length]!)),
      opacity: fade(6 + (i % 5), 18 + (i % 5)),
    };
  });
};

const bandMarquee = (ctx: Ctx, actId: string, items: string, accent: string): Node[] => {
  note(ctx, `${actId}.band`, 'ticker v2', 'keywords as texture: glass + hairlines + edge fades + anchor dot');
  void accent;
  return [
    {
      id: `${actId}-band`, type: 'rect', width: ctx.W, height: 56, x: 0, y: 786,
      fill: 'rgba(255,255,255,0.07)', stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1,
      backdropBlur: 4, opacity: fade(30, 44),
    },
    { id: `${actId}-band-t`, type: 'rect', width: ctx.W, height: 1, x: 0, y: 786, fill: 'rgba(255,255,255,0.18)' },
    { id: `${actId}-band-b`, type: 'rect', width: ctx.W, height: 1, x: 0, y: 841, fill: 'rgba(255,255,255,0.18)' },
    {
      id: `${actId}-mq`, type: 'text', text: items, fontFamily: 'Poppins',
      fontSize: 20, fontWeight: 700, fill: 'rgba(255,255,255,0.85)',
      x: anim([12, 179], [540, -900], true), y: 800, opacity: fade(30, 44),
    },
    {
      id: `${actId}-fdl`, type: 'rect', width: 70, height: 56, x: 0, y: 786,
      fill: { kind: 'linear', angle: 90, stops: [{ offset: 0, color: 'rgba(0,0,0,0.85)' }, { offset: 1, color: 'rgba(0,0,0,0)' }] },
    },
    {
      id: `${actId}-fdr`, type: 'rect', width: 70, height: 56, x: ctx.W - 70, y: 786,
      fill: { kind: 'linear', angle: 270, stops: [{ offset: 0, color: 'rgba(0,0,0,0.85)' }, { offset: 1, color: 'rgba(0,0,0,0)' }] },
    },
  ];
};

const ctaCard = (ctx: Ctx, actId: string, cta: string, accent: string, sub: string): Node[] => {
  // Integrity rule: pills auto-size from measured width (dept rule #4 — no
  // hardcoded widths on text containers). The old fixed 300px pill clipped
  // "GET EARLY ACCESS" on screen. Timing follows the dept rule too: full
  // layout by ~f24, not f52+ (the old pill was still invisible at mid-act).
  const size = 22;
  const ls = 3;
  const textW = ctx.measure(cta, size, 800, ls, 'Inter');
  const laidW = Math.ceil(textW) + ls * [...cta].length;
  const padX = 34;
  const w = Math.min(476, laidW + padX * 2);
  note(ctx, `${actId}.cta`, `pill "${cta}" w=${w}`, 'one action, one pill, spring scale — the ask');
  return [
    subNode(ctx, actId, sub, 640, 12, true),
    {
      id: `${actId}-pill`, type: 'rrect', width: w, height: 54, radius: 27,
      fill: {
        kind: 'linear', angle: 90,
        stops: [{ offset: 0, color: accent }, { offset: 1, color: '#ffffff' }],
      },
      x: Math.round((ctx.W - w) / 2), y: 790,
      opacity: fade(10, 22),
      scaleX: anim([10, 24], [0.8, 1]),
      scaleY: anim([10, 24], [0.8, 1]),
      anchorX: w / 2, anchorY: 27,
      children: [{
        id: `${actId}-pill-t`, type: 'text', text: cta, fontFamily: 'Inter',
        fontSize: size, fontWeight: 800, letterSpacing: ls, fill: '#0b1020',
        textAlign: 'center', maxWidth: w, x: ls / 2, y: 20,
      }],
    },
  ];
};

const grainNode = (actId: string, localDur: number): Node => ({
  id: `${actId}-grain`, type: 'image', src: 'grain-tile', width: 660, height: 1080,
  opacity: 0.08, blendMode: 'overlay',
  x: anim([0, localDur - 1], [-40, -100]),
  y: anim([0, localDur - 1], [-30, -90]),
});

const badge = (actId: string, n: number): Node => ({
  id: `${actId}-badge`, type: 'rrect', width: 72, height: 30, radius: 15,
  fill: 'rgba(0,0,0,0.45)', x: 436, y: 28, opacity: fade(0, 8),
  children: [{
    id: `${actId}-badge-t`, type: 'text', text: `${n} / 5`, fontFamily: 'Inter',
    fontSize: 13, fontWeight: 700, fill: 'rgba(255,255,255,0.9)',
    textAlign: 'center', maxWidth: 72, x: 0, y: 10,
  }],
});

const motionFor = (ctx: Ctx, actId: string, energy: number): { motion: Motion } => {
  const motion: Motion = {
    entrance: 'rise 26px + 12f fade (cube rise preset)',
    entranceWhy: 'every hero rises — nothing pops (canvas-video rule)',
    emphasis: energy >= 3 ? 'signature in continuous motion (satellite/wave/marquee)' : null,
    emphasisWhy: energy >= 3 ? 'peak energy acts never sit still' : 'steady acts hold — restraint is motion too',
  };
  note(ctx, `${actId}.motion`, motion.entrance, motion.entranceWhy);
  return { motion };
};

const transitionFor = (
  ctx: Ctx, from: Beat, to: Beat, last: boolean,
): TransitionChoice => {
  let t: TransitionChoice;
  if (last) {
    t = { type: 'zoom-blur', why: 'climax punch into the ask — the only blur transition on the reel' };
  } else if (from.energy >= 3 || to.energy >= 3) {
    t = { type: 'slide', params: { direction: 'left' }, why: `energy ${from.energy}→${to.energy}: lateral energy carries the cut` };
  } else {
    t = { type: 'dissolve', why: `energy ${from.energy}→${to.energy}: calm hands the scene over softly` };
  }
  note(ctx, `cut ${from.id}→${to.id}`, t.type, t.why);
  return t;
};

export interface ComposeOpts {
  W?: number;
  H?: number;
  fps?: number;
  measure: Measure;
  heroSizes?: Map<string, number>;
}

export const compose = (
  beats: Beat[],
  shots: { kind: Shot['kind']; params: Shot['params'] }[],
  concept: Concept,
  intent: Intent,
  opts: ComposeOpts,
): { plan: unknown; acts: PlannedAct[]; decisions: Decision[] } => {
  const W = opts.W ?? 540;
  const H = opts.H ?? 960;
  const fps = opts.fps ?? 30;
  const ctx: Ctx = { W, H, fps, measure: opts.measure, decisions: [] };
  const pal = concept.palette;

  const buildAct = (beat: Beat, shot: Shot['kind'], params: Shot['params'], n: number): Node => {
    const actId = `act${n + 1}`;
    const heroSize = opts.heroSizes?.get(beat.id)
      ?? (shot === 'statDuel' ? 50 : shot === 'display' ? 56 : 52);
    const maxChars = Math.max(8, Math.floor(476 / (heroSize * 0.66)));
    const wrapped = wrapDisplay(beat.claim, maxChars);
    const wl1 = wrapped[0] ?? '';
    // Integrity: never slice support copy into a hero line. One-line claims
    // render one hero line; overflow lines fold to support via critique.
    const wl2 = wrapped[1] ?? '';
    if (wrapped.length > 2) {
      note(ctx, `${actId}.wrap`, `${wrapped.length} lines→2`, 'overflow lines folded into support (recorded, never clipped)');
    }
    // Integrity: monogram is the brand's initial (shots.ts emblem params),
    // never the CTA initial. Old ctaCard path used intent.cta.charAt(0) and
    // rendered "G" for every brand.
    const mark = String(params['mark'] ?? (((intent.brand ?? intent.topic).trim().charAt(0).toUpperCase() || 'X')));
    // Anchor system (one per act, never mixed inside an act):
    // content acts = LEFT column (kicker/hero/sub/native all x=32);
    // finale acts (ctaCard/emblem) = CENTERED (kicker/hero/sub all centered).
    const centered = shot === 'ctaCard' || shot === 'emblem';
    const kickX = centered ? Math.round((W - 260) / 2) : 32;
    const kids: Node[] = [
      { id: `${actId}-bg`, type: 'rect', width: W, height: H, fill: pal.bg },
      {
        id: `${actId}-amb`, type: 'circle', radius: 280, x: Math.round(W / 2) - 280, y: 140,
        opacity: 1, blendMode: 'screen',
        fill: { kind: 'radial', stops: [{ offset: 0, color: pal.accent }, { offset: 1, color: 'rgba(0,0,0,0)' }] },
      },
    ];
    if (shot === 'emblem') {
      kids.push(...emblem(ctx, actId, mark, pal.accent));
      kids.push(kicker(ctx, actId, `${intent.domain.toUpperCase()} • ${beats.length} ACTS`, pal.accent, LY.kicker, kickX));
      kids.push(...hero(ctx, actId, wl1, wl2, pal.accent, heroSize, concept.displayFace, pal.accent, 32, LY.hero, true));
      kids.push(subNode(ctx, actId, beat.support, LY.sub, 16, true));
    } else if (shot === 'display') {
      kids.push({
        id: `${actId}-ghost`, type: 'text', text: String(n + 1).padStart(2, '0'),
        fontFamily: 'Inter', fontSize: 200, fontWeight: 800, fill: 'rgba(255,255,255,0.07)',
        lineHeight: 1, x: 32, y: 170, opacity: fade(6, 24),
      });
      kids.push(kicker(ctx, actId, intent.domain.toUpperCase(), pal.accent));
      kids.push(...hero(ctx, actId, wl1, wl2, pal.accent, heroSize, concept.displayFace, pal.accent));
      kids.push(subNode(ctx, actId, beat.support));
      if (params['native'] !== undefined) {
        kids.push({
          id: `${actId}-native`, type: 'text', text: String(params['native']),
          fontFamily: 'Hindi', fontSize: 72, fontWeight: 800, fill: pal.accent,
          lineHeight: 1.1, x: 32, maxWidth: 476, y: 320, opacity: fade(10, 26),
        });
      }
    } else if (shot === 'statDuel') {
      kids.push(kicker(ctx, actId, intent.domain.toUpperCase(), pal.accent));
      kids.push(...hero(ctx, actId, wl1, wl2, pal.accent, heroSize, concept.displayFace, pal.accent));
      kids.push(subNode(ctx, actId, beat.support));
      kids.push(...glassDuel(ctx, actId, params['stats'] as string[] ?? [], pal.accent));
    } else if (shot === 'band') {
      kids.push(kicker(ctx, actId, intent.domain.toUpperCase(), pal.accent));
      kids.push(...hero(ctx, actId, wl1, wl2, pal.accent, heroSize, concept.displayFace, pal.accent));
      kids.push(subNode(ctx, actId, beat.support));
      kids.push(...bandMarquee(ctx, actId, String(params['items'] ?? intent.domain), pal.accent));
    } else if (shot === 'wave') {
      kids.push(kicker(ctx, actId, intent.domain.toUpperCase(), pal.accent));
      kids.push(...waveBars(ctx, actId, 24, pal.accent, pal.accent2));
      kids.push(...hero(ctx, actId, wl1, wl2, pal.accent, heroSize, concept.displayFace, pal.accent));
      kids.push(subNode(ctx, actId, beat.support));
    } else if (shot === 'quote') {
      kids.push(kicker(ctx, actId, intent.domain.toUpperCase(), pal.accent));
      kids.push({
        id: `${actId}-q`, type: 'text', text: `“${beat.claim}”`, fontFamily: 'Inter',
        fontSize: 44, fontWeight: 500, fill: '#ffffff', lineHeight: 1.2,
        textAlign: 'center', maxWidth: W, x: 0, y: 380, opacity: fade(8, 24),
      });
      kids.push(subNode(ctx, actId, beat.support));
    } else {
      kids.push(kicker(ctx, actId, intent.domain.toUpperCase(), pal.accent, LY.kicker, kickX));
      kids.push(...emblem(ctx, actId, mark, pal.accent));
      kids.push(...ctaCard(ctx, actId, intent.cta, pal.accent, beat.support));
    }
    const localDur = beat.frames;
    kids.push(badge(actId, n + 1));
    kids.push(grainNode(actId, localDur));
    return { id: actId, type: 'container', children: kids };
  };

  const acts: PlannedAct[] = beats.map((beat, i) => {
    const kind = (shots[i] as Shot).kind;
    const params = (shots[i] as Shot).params;
    const node = buildAct(beat, kind, params, i);
    void node;
    const { motion } = motionFor(ctx, `act${i + 1}`, beat.energy);
    const transitionOut = i < beats.length - 1
      ? transitionFor(ctx, beat, beats[i + 1]!, i === beats.length - 2)
      : null;
    return { beat, shot: shots[i] as Shot, motion, transitionOut };
  });

  // Timeline: montage-style non-overlap + trimBefore continuity.
  // Act k (k>=1) occupies [k*F+4, (k+1)*F-9]; transitions carve 12f
  // [B-8, B+4) at each nominal boundary B; B-local timelines continue
  // through the cut (transition shows 0..11, seq resumes at 12).
  const children: unknown[] = [];
  const TR = 12;
  const F = beats[0]!.frames;
  const total = beats.reduce((s, b) => s + b.frames, 0);
  beats.forEach((beat, i) => {
    if (i === 0) {
      children.push(seq(0, F - 8, [leaf(`act${i + 1}`)]));
    } else {
      const from = i * F + 4;
      const dur = i === beats.length - 1 ? total - from : F - 12;
      children.push({
        kind: 'sequence', from, durationInFrames: dur,
        trimBefore: 12, children: [leaf(`act${i + 1}`)],
      });
    }
    if (i < beats.length - 1) {
      const t = acts[i]!.transitionOut!;
      children.push({
        kind: 'transition', from: (i + 1) * F - 8, durationInFrames: TR,
        type: t.type, ...(t.params ? { params: t.params } : {}),
        a: `act${i + 1}`, b: `act${i + 2}`,
        aFreeze: i === 0 ? F - 9 : F - 1, easing: 'ease-in-out',
      });
    }
  });
  children.push(seq(0, total, [leaf('chrome')]));

  const sceneActs = acts.map((a, i) => buildAct(a.beat, a.shot.kind, a.shot.params, i));
  const plan = {
    composition: {
      id: 'zero-shot', width: W, height: H, fps, durationInFrames: beats.reduce((s, b) => s + b.frames, 0),
      root: {
        id: 'root', type: 'container',
        children: [
          ...sceneActs,
          {
            id: 'chrome', type: 'container',
            children: [
              { id: 'prog-bg', type: 'rect', width: W, height: 8, fill: 'rgba(255,255,255,0.18)', x: 0, y: H - 8 },
              {
                id: 'prog-fill', type: 'rect', width: W, height: 8, x: 0, y: H - 8,
                fill: {
                  kind: 'linear', angle: 90,
                  stops: [{ offset: 0, color: pal.accent }, { offset: 1, color: '#ffffff' }],
                },
                scaleX: anim([0, beats.reduce((s, b) => s + b.frames, 0) - 1], [0, 1], true),
                anchorX: 0, anchorY: 0,
              },
            ],
          },
        ],
      },
    },
    timeline: seq(0, beats.reduce((s, b) => s + b.frames, 0), children),
  };
  return { plan, acts, decisions: ctx.decisions };
};

export type { Motion, PlannedAct, TransitionChoice };
