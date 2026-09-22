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

/** Spaced kicker line. */
export const kicker = (id, text, { x = 48, y, size = 19, ls = 7, fill, font, fadeIn = [0, 12] }) => ({
  id, type: 'text', text, fontFamily: font, fontSize: size, letterSpacing: ls, fill,
  x, y, opacity: fade(fadeIn[0], fadeIn[1]),
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

/** Bottom scrim for footage legibility (alpha gradient, declarative). */
export const scrimBottom = (id, stops) => ({
  id, type: 'rect', width: W, height: H,
  fill: {
    kind: 'linear', angle: 180,
    stops: stops ?? [
      { offset: 0, color: 'rgba(0,0,0,0)' },
      { offset: 0.45, color: 'rgba(0,0,0,0.28)' },
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
