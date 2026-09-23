/**
 * X80 premium kit — shared plan builders so every new reel starts premium.
 * Covers the layout work flexbox used to do (column/center), the type
 * scale, the palettes, entrance motions, and the finishing chain
 * (grain + audio). Plans stay declarative data; this file is the only
 * place taste lives.
 */
import { Easing } from '../../packages/core/dist/index.js';

export const W = 540;
export const H = 960;
export const FPS = 30;

export const EASE = Easing.bezier(0.16, 1, 0.3, 1);
export const SPRING = Easing.spring({ damping: 200 });
export const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };

export const APPLE = {
  ink: '#f5f5f7', gray: '#86868b', blue: '#2997ff', purple: '#a259ff',
  deep: '#0a2540', royal: '#3b1d6e', pill: '#0071e3', black: '#000000',
};
export const WARM = {
  ink: '#f7f3ec', cream: '#d8c9ae', dim: '#a89e8d', gold: '#e8c37a',
  bronze: '#9a6b2f', dark: '#0d0a06', black: '#000000',
};

export const leaf = (ref) => ({ kind: 'leaf', ref });
export const seq = (from, durationInFrames, children) => ({ kind: 'sequence', from, durationInFrames, children });
export const anim = (inputRange, outputRange, easing = EASE) => ({
  binding: 'interpolate', inputRange, outputRange, options: { ...CLAMP, easing },
});
export const fade = (a, b, dir = 1) =>
  dir > 0 ? anim([a, b], [0, 1]) : anim([a, b], [1, 0]);

/** flex-column equivalent: stacked y-tops for [height, gap] items. */
export const column = (startY, items) => {
  let y = startY;
  return items.map(([h, gap]) => {
    const top = y;
    y += h + gap;
    return top;
  });
};
export const centerX = (w) => Math.round((W - w) / 2);

/** Stagger helper: ith item starts at `at + i*step` (cube-motion: step 2f). */
export const stagger = (at, i, step = 2) => at + i * step;

/** Rise preset (cube-motion rise ≈19f/13px, opacity 12f). */
export const riseIn = (at, dy = 13, dur = 14) => ({
  y: (y0) => anim([at, at + dur], [y0 + dy, y0]),
  opacity: fade(at, at + 12),
});

/**
 * Animated highlight sweep: marker bar growing left→right behind a word.
 * Pair with laid word boxes (layoutWords) or fixed x/w per word.
 */
export const highlightSweep = (id, { x, y, w, h = 40, fill = 'rgba(232, 195, 122, 0.85)', at = [8, 22] }) => ({
  id, type: 'rrect', width: w, height: h, radius: 6, fill, x, y,
  scaleX: anim(at, [0, 1]), anchorX: 0, anchorY: 0,
  opacity: fade(at[0], at[0] + 8),
});

/**
 * Ticker v2: glass band + hairlines + scrolling text + black edge fades.
 * Small (≤22px), anchored, never hard-edged.
 */
export const ticker = (id, text, {
  x = 0, y, w = W, h = 56, font, size = 20, fill = 'rgba(255,255,255,0.85)',
  fromX = W, toX = -1400, dur = 89, span = [0, 89], fadeIn = [30, 44],
  easing = Easing.linear,
}) => ({
  id, type: 'container', opacity: fade(fadeIn[0], fadeIn[1]),
  children: [
    { id: `${id}-band`, type: 'rect', width: w, height: h, x, y, fill: 'rgba(255,255,255,0.07)', backdropBlur: 4 },
    { id: `${id}-top`, type: 'rect', width: w, height: 1, x, y, fill: 'rgba(255,255,255,0.18)' },
    { id: `${id}-bot`, type: 'rect', width: w, height: 1, x, y: y + h - 1, fill: 'rgba(255,255,255,0.18)' },
    {
      id: `${id}-t`, type: 'text', text, fontFamily: font, fontSize: size,
      fontWeight: 700, fill, x: anim(span, [fromX, toX], easing),
      y: y + Math.round((h - size) / 2) - 1,
    },
    {
      id: `${id}-fl`, type: 'rect', width: 70, height: h, x, y,
      fill: { kind: 'linear', angle: 90, stops: [{ offset: 0, color: 'rgba(0,0,0,0.85)' }, { offset: 1, color: 'rgba(0,0,0,0)' }] },
    },
    {
      id: `${id}-fr`, type: 'rect', width: 70, height: h, x: x + w - 70, y,
      fill: { kind: 'linear', angle: 270, stops: [{ offset: 0, color: 'rgba(0,0,0,0.85)' }, { offset: 1, color: 'rgba(0,0,0,0)' }] },
    },
  ],
});

/**
 * Motion-path sampler: Catmull-Rom through `points` → x/y anim bindings.
 * (GSAP MotionPath technique, baked to pure data — no runtime.)
 */
export const motionPath = (points, frames = 89) => {
  const P = (p0, p1, p2, p3, t) => {
    const t2 = t * t, t3 = t2 * t;
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
  };
  const n = points.length - 1;
  const at = (f) => {
    const u = Math.min(0.9999, Math.max(0, f / frames)) * n;
    const i = Math.min(n - 1, Math.floor(u));
    const t = u - i;
    const g = (k) => points[Math.min(n, Math.max(0, i + k))];
    return [P(g(-1)[0], g(0)[0], g(1)[0], g(2)[0], t), P(g(-1)[1], g(0)[1], g(1)[1], g(2)[1], t)];
  };
  const steps = 8;
  const fr = Array.from({ length: steps + 1 }, (_, k) => Math.round((k * frames) / steps));
  return {
    x: anim(fr, fr.map((f) => Math.round(at(f)[0]))),
    y: anim(fr, fr.map((f) => Math.round(at(f)[1]))),
  };
};

/**
 * Shared-element fly (FLIP technique, plan-side): element travels across
 * a cut. Returns { scene, timeline } — mount scene node in root, timeline
 * node alongside acts. Hide both originals inside [from, from+dur] via
 * their own opacity bindings; this overlay carries the motion.
 */
export const sharedFly = (id, child, { x1, y1, x2, y2, s1 = 1, s2 = 1, from, dur = 12, easing = Easing.linear }) => ({
  scene: {
    id, type: 'container',
    x: anim([0, dur - 1], [x1, x2], easing),
    y: anim([0, dur - 1], [y1, y2], easing),
    scaleX: anim([0, dur - 1], [s1, s2], easing),
    scaleY: anim([0, dur - 1], [s1, s2], easing),
    anchorX: 0, anchorY: 0,
    children: [child],
  },
  timeline: seq(from, dur, [leaf(id)]),
});
export const kicker = (id, text, { x = 48, y, size = 19, ls = 7, fill, font, fadeIn = [0, 12] }) => ({
  id, type: 'text', text, fontFamily: font, fontSize: size, letterSpacing: ls, fill,
  x, y, opacity: fade(fadeIn[0], fadeIn[1]),
});

/**
 * Optical label y for caps/digit text in a box of height h.
 * Canvas `top` puts caps ~1px above the em top (at 14px); measured on-canvas,
 * not derived from font tables.
 */
export const centerY = (h, size) => Math.round(h / 2 - size * 0.32);

/** Centered + letterSpaced labels carry a trailing space after the last
 *  glyph; shift right half of it to recenter the visible ink. */
export const trailingFix = (ls) => ls / 2;

/**
 * Dot kicker pill: cream pill, saffron brand dot, spaced caps label.
 * Width auto-sizes from the measurer (pass it; fallbackW otherwise).
 * Text is left-boxed after the dot so centering math can't drift it.
 */
export const dotKicker = (id, label, {
  x = 32, y, font, measure, fallbackW = 240, size = 14, ls = 2, h = 34,
  padX = 14, dotD = 8, gap = 6, dotFill = '#ff9933', bg = '#fff7ea',
  fg = '#0b1020', fadeIn = [4, 14], capK = 0.32,
}) => {
  const style = { fontFamily: font, fontSize: size, fontWeight: 700, letterSpacing: ls };
  const n = [...label].length;
  // Engine lays out base + ls per grapheme: the text box must clear the
  // LAID width (base + ls*n), not just the measured base.
  let baseW = fallbackW - padX * 2 - dotD - gap - ls * n - 2;
  if (measure) {
    try { baseW = measure.measure(label, style).width; } catch { /* fallback */ }
  }
  const boxW = Math.ceil(baseW) + ls * n + 2;
  const w = padX + dotD + gap + boxW + padX;
  const tx = padX + dotD + gap;
  // capK: canvas-top → caps-top gap per family (Inter 0.32, Poppins 0.57 —
  // both probed on-canvas, see planning-dept.md rule 1).
  const ty = Math.round(h / 2 - size * capK);
  return {
    id, type: 'rrect', width: w, height: h, radius: h / 2, fill: bg,
    x, y, opacity: fade(fadeIn[0], fadeIn[1]),
    children: [
      {
        id: `${id}-dot`, type: 'circle', radius: dotD / 2,
        x: padX, y: Math.round((h - dotD) / 2), fill: dotFill,
      },
      {
        id: `${id}-t`, type: 'text', text: label, ...style, fill: fg,
        maxWidth: boxW, x: tx, y: ty,
      },
    ],
  };
};

/**
 * Glass card shell: translucent fill + light stroke + backdrop blur.
 * Children (value/label) are composed by the plan; this owns the glass.
 */
export const glassCard = (id, {
  x, y, w, h, radius = 20, fill = 'rgba(255,255,255,0.14)',
  stroke = 'rgba(255,255,255,0.22)', strokeWidth = 1, blur = 5,
  opacity = fade(24, 36), children = [],
}) => ({
  id, type: 'rrect', width: w, height: h, radius, fill, stroke, strokeWidth,
  backdropBlur: blur, x, y, opacity, children,
});

/** Gradient rule that grows from the left (or center with anchor). */
export const rule = (id, { x, y, w = 120, h = 3, fill, grow = [30, 55], anchorX = 0 }) => ({
  id, type: 'rrect', width: w, height: h, radius: h / 2, fill, x, y,
  scaleX: anim(grow, [0, 1]), scaleY: 1, anchorX, anchorY: 1,
  opacity: fade(grow[0], grow[0] + 12),
});

/** Marker swash behind a word (rough-notation Highlight equivalent). */
export const marker = (id, { x, y, w, h = 46, fill = 'rgba(232, 195, 122, 0.8)', at = [8, 22] }) => ({
  id, type: 'rrect', width: w, height: h, radius: 6, fill, x, y,
  scaleX: anim(at, [0, 1]), anchorX: 0, anchorY: 0,
});

/** Bottom scrim for footage legibility (alpha gradient, declarative).
 *  Three-stop knee: reads as a fade, never a band. */
export const scrimBottom = (id, stops) => ({
  id, type: 'rect', width: W, height: H,
  fill: {
    kind: 'linear', angle: 180,
    stops: stops ?? [
      { offset: 0, color: 'rgba(0,0,0,0)' },
      { offset: 0.45, color: 'rgba(0,0,0,0.38)' },
      { offset: 1, color: 'rgba(0,0,0,0.88)' },
    ],
  },
});

/** Ambient color glow: blurred radial disc, screen-blended (CafeReel pattern). */
export const glow = (id, { cx, cy, size, color, blur = 35, opacity = 1 }) => ({
  id, type: 'circle', radius: size / 2, x: Math.round(cx - size / 2), y: Math.round(cy - size / 2),
  opacity, blendMode: 'screen',
  fill: { kind: 'radial', stops: [{ offset: 0, color }, { offset: 1, color: 'rgba(0,0,0,0)' }] },
  filter: { blur },
});

/** Film grain finishing node (needs the baked tile in resolveAsset). */
export const grain = (id, src, { opacity = 0.08, drift = [[0, 89], [-40, -100], [-30, -90]] }) => ({
  id, type: 'image', src, width: 660, height: 1080,
  opacity, blendMode: 'overlay',
  x: anim(drift[0], [drift[1][0], drift[1][1]]),
  y: anim(drift[0], [drift[2][0], drift[2][1]]),
});

/** CTA pill with centered label. */
export const pill = (id, { x, y, w, h, fill, label, font, labelFill, fadeIn = [14, 26] }) => ({
  id, type: 'rrect', width: w, height: h, radius: h / 2, fill, x, y,
  opacity: fade(fadeIn[0], fadeIn[1]),
  children: [{
    id: `${id}-t`, type: 'text', text: label, fontFamily: font,
    fontSize: Math.round(h * 0.42), fontWeight: 700, fill: labelFill,
    textAlign: 'center', maxWidth: w, x: 0, y: Math.round(h * 0.26),
  }],
});

/**
 * Audio finishing chain (pure data): music bed + stingers on cuts.
 * Pass decoded {samples, sampleRate, channels} for bed/sting.
 */
export const audioBed = (bed, sting, { bedVolume = 0.3, stingVolume = 0.5, stingFrames = [], total = 300 }) => (mixTracks) => mixTracks(
  [
    {
      pcm: bed.samples, sampleRate: bed.sampleRate, channels: bed.channels,
      fromFrame: 0, volume: bedVolume, fadeInFrames: 30, fadeOutFrames: 60, durationFrames: total,
    },
    ...stingFrames.map((fromFrame) => ({
      pcm: sting.samples, sampleRate: sting.sampleRate, channels: sting.channels,
      fromFrame, volume: stingVolume,
    })),
  ],
  { fps: FPS, durationFrames: total },
);
