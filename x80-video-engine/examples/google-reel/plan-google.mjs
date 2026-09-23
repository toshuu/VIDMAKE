/**
 * Journey of Google — 10s, 540x960, 30fps, NO audio (per brief).
 * Pre-production: Poppins (Product-Sans stand-in) + Inter vendored;
 * WCAG-checked palette (body gray/white 6.05, dark/white 16.1, white
 * CTAs large-bold only, yellow-"o" logotype exemption noted);
 * all cliparts hand-built vector (Chrome/Gmail/Android/sparkle/bars).
 * Acts: 1998 (70f) → products (80f) → scale (80f) → Gemini era (70f).
 */
import {
  W, H, leaf, seq, anim, fade, centerX,
  kicker, rule, scrimBottom, grain, pill,
} from '../kit/kit.mjs';
import { Easing } from '../../packages/core/dist/index.js';

export const DISPLAY = 'Google Poppins';
export const FONT = 'Google Inter';
export const GRAIN = 'grain-tile';

const BLUE = '#4285F4', RED = '#EA4335', YELLOW = '#FBBC05', GREEN = '#34A853';
const INK = '#202124', GRAY = '#5F6368', LIGHT = '#F8F9FA', SUBDK = '#9AA0A6';
const EASE = Easing.bezier(0.16, 1, 0.3, 1);

// --- vector clipart builders (local coords, place with x/y) ---
const polar = (cx, cy, r, deg) => {
  const t = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(t), cy + r * Math.sin(t)];
};
const arc = (cx, cy, r, a0, a1) => {
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  return `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
};

/** Chrome mark: 3 color arcs + white ring + blue core. Fits ~120px box. */
export const chromeLogo = (id, cx, cy, s = 1, delay = 0) => ({
  id, type: 'container', x: cx, y: cy,
  scaleX: { binding: 'spring', from: 0.4, to: 1, delay },
  scaleY: { binding: 'spring', from: 0.4, to: 1, delay },
  anchorX: 0, anchorY: 0, opacity: fade(delay, delay + 12),
  children: [
    { id: `${id}-r`, type: 'path', d: arc(0, 0, 38 * s, -150, -30), fill: undefined, stroke: RED, strokeWidth: 22 * s },
    { id: `${id}-y`, type: 'path', d: arc(0, 0, 38 * s, -30, 90), fill: undefined, stroke: YELLOW, strokeWidth: 22 * s },
    { id: `${id}-g`, type: 'path', d: arc(0, 0, 38 * s, 90, 210), fill: undefined, stroke: GREEN, strokeWidth: 22 * s },
    { id: `${id}-w`, type: 'circle', radius: 29 * s, fill: '#ffffff', x: -29 * s, y: -29 * s },
    { id: `${id}-b`, type: 'circle', radius: 19 * s, fill: BLUE, x: -19 * s, y: -19 * s },
  ],
});

/** Mail mark: gray envelope + red chevron. ~90x64 box at (x, y). */
export const mailLogo = (id, x, y, s = 1) => ({
  id, type: 'container', x, y,
  children: [
    { id: `${id}-box`, type: 'rrect', width: 90 * s, height: 64 * s, radius: 10 * s, fill: '#ffffff', stroke: '#DADCE0', strokeWidth: 4 * s, x: 0, y: 0 },
    { id: `${id}-v`, type: 'path', d: `M ${15 * s} ${20 * s} L ${45 * s} ${42 * s} L ${75 * s} ${20 * s}`, fill: undefined, stroke: RED, strokeWidth: 8 * s },
  ],
});

/** Android mark (~110px tall at (x, y) top-center). */
export const androidLogo = (id, x, y, s = 1) => ({
  id, type: 'container', x, y,
  children: [
    { id: `${id}-al`, type: 'rect', width: 6 * s, height: 26 * s, fill: GREEN, x: -24 * s, y: -4 * s, rotation: -25, anchorX: 3 * s, anchorY: 26 * s },
    { id: `${id}-ar`, type: 'rect', width: 6 * s, height: 26 * s, fill: GREEN, x: 18 * s, y: -4 * s, rotation: 25, anchorX: 3 * s, anchorY: 26 * s },
    { id: `${id}-head`, type: 'path', d: `M ${-28 * s} ${26 * s} A ${28 * s} ${28 * s} 0 0 1 ${28 * s} ${26 * s} Z`, fill: GREEN, stroke: undefined, strokeWidth: undefined },
    { id: `${id}-e1`, type: 'circle', radius: 3.5 * s, fill: '#ffffff', x: -15 * s, y: 8 * s },
    { id: `${id}-e2`, type: 'circle', radius: 3.5 * s, fill: '#ffffff', x: 8 * s, y: 8 * s },
    { id: `${id}-body`, type: 'rrect', width: 56 * s, height: 62 * s, radius: 12 * s, fill: GREEN, x: -28 * s, y: 30 * s },
    { id: `${id}-arm1`, type: 'rrect', width: 11 * s, height: 44 * s, radius: 5 * s, fill: GREEN, x: -43 * s, y: 32 * s },
    { id: `${id}-arm2`, type: 'rrect', width: 11 * s, height: 44 * s, radius: 5 * s, fill: GREEN, x: 32 * s, y: 32 * s },
    { id: `${id}-leg1`, type: 'rrect', width: 13 * s, height: 30 * s, radius: 6 * s, fill: GREEN, x: -22 * s, y: 92 * s },
    { id: `${id}-leg2`, type: 'rrect', width: 13 * s, height: 30 * s, radius: 6 * s, fill: GREEN, x: 9 * s, y: 92 * s },
  ],
});

/** Gemini sparkle, R px, gradient fill. Centered at (0,0) — place with x/y. */
export const sparkle = (id, R, fill) => ({
  id, type: 'path',
  d: `M 0 ${-R} C ${R * 0.12} ${-R * 0.28} ${R * 0.28} ${-R * 0.12} ${R} 0 C ${R * 0.28} ${R * 0.12} ${R * 0.12} ${R * 0.28} 0 ${R} C ${-R * 0.12} ${R * 0.28} ${-R * 0.28} ${R * 0.12} ${-R} 0 C ${-R * 0.28} ${-R * 0.12} ${-R * 0.12} ${-R * 0.28} 0 ${-R} Z`,
  fill, stroke: undefined, strokeWidth: undefined,
});

const LETTERS = [
  ['G', BLUE], ['o', RED], ['o', YELLOW], ['g', BLUE], ['l', GREEN], ['e', RED],
];
const LW = [68, 62, 62, 64, 30, 62];
const LX0 = Math.round((W - (68 + 62 + 62 + 64 + 30 + 62 + 5 * 2)) / 2);

export function buildGoogleJourney() {
  // cumulative letter x positions
  let lx = LX0;
  const letterX = LW.map((w) => {
    const x = lx;
    lx += w + 2;
    return x;
  });
  return {
    composition: {
      id: 'google-journey-10s', width: W, height: H, fps: 30, durationInFrames: 300,
      root: {
        id: 'root', type: 'container',
        children: [
          // A — 1998 (local 0..70), paper white
          {
            id: 'actA', type: 'container', opacity: fade(60, 70, -1),
            children: [
              { id: 'a-bg', type: 'rect', width: W, height: H, fill: '#ffffff' },
              kicker('a-kicker', 'SEPTEMBER 1998 · MENLO PARK', {
                x: 62, y: 196, size: 18, ls: 5, fill: GRAY, font: FONT,
              }),
              ...LETTERS.map(([ch, fill], i) => ({
                id: `a-l${i}`, type: 'text', text: ch,
                fontFamily: DISPLAY, fontSize: 92, fontWeight: 700, fill,
                lineHeight: 1, x: letterX[i], y: 246,
                opacity: fade(6 + i * 3, 16 + i * 3),
                scaleX: { binding: 'spring', from: 0.3, to: 1, delay: 6 + i * 3 },
                scaleY: { binding: 'spring', from: 0.3, to: 1, delay: 6 + i * 3 },
                anchorX: 33, anchorY: 33,
              })),
              {
                id: 'a-sub', type: 'text', text: 'Two students. One mission.',
                fontFamily: FONT, fontSize: 26, fill: GRAY, x: 70, y: 384,
                opacity: fade(24, 38),
              },
              {
                id: 'a-bar', type: 'rrect', width: 444, height: 64, radius: 32,
                fill: '#ffffff', stroke: '#DADCE0', strokeWidth: 2, x: 48, y: 452,
                opacity: fade(30, 42),
              },
              {
                id: 'a-lens', type: 'circle', radius: 10, fill: undefined, stroke: GRAY, strokeWidth: 4, x: 66, y: 474,
                opacity: fade(30, 42),
              },
              {
                id: 'a-q', type: 'text', text: 'what is google?',
                fontFamily: FONT, fontSize: 26, fill: INK, x: 96, y: 468,
                opacity: fade(34, 46),
              },
              {
                id: 'a-cursor', type: 'rect', width: 4, height: 34, fill: BLUE, x: 302, y: 467,
                opacity: anim([40, 47, 55, 62, 69], [1, 0, 1, 0, 1], undefined),
              },
              rule('a-rule', {
                x: centerX(190), y: 580, w: 190, fill: {
                  kind: 'linear', angle: 90,
                  stops: [{ offset: 0, color: BLUE }, { offset: 0.38, color: RED }, { offset: 0.68, color: YELLOW }, { offset: 1, color: GREEN }],
                }, grow: [40, 60], anchorX: 95,
              }),
              grain('a-grain', GRAIN, { opacity: 0.06, drift: [[0, 69], [-40, -100], [-30, -90]] }),
            ],
          },
          // B — products (local 0..80), light
          {
            id: 'actB', type: 'container', opacity: fade(70, 80, -1),
            children: [
              { id: 'b-bg', type: 'rect', width: W, height: H, fill: LIGHT },
              kicker('b-kicker', 'BUILT FOR EVERYONE', {
                x: 48, y: 150, size: 19, ls: 7, fill: BLUE, font: FONT,
              }),
              ...[
                { name: 'Chrome', sub: 'Browse', logo: 'chrome' },
                { name: 'Gmail', sub: 'Mail', logo: 'mail' },
                { name: 'Android', sub: 'Mobile', logo: 'droid' },
              ].map((app, i) => {
                const start = 8 + i * 10;
                const cx = 30 + i * 165;
                const logoNode = app.logo === 'chrome'
                  ? { ...chromeLogo(`b-logo${i}`, cx + 75, 330, 0.85, start), y: anim([start, start + 20], [400, 330], EASE) }
                  : app.logo === 'mail'
                    ? { id: `b-logo${i}`, type: 'container', x: cx + 30, y: anim([start, start + 20], [400, 315], EASE), opacity: fade(start, start + 12), children: [mailLogo(`b-m${i}`, 0, 0, 1)] }
                    : { id: `b-logo${i}`, type: 'container', x: cx + 75, y: anim([start, start + 20], [400, 285], EASE), opacity: fade(start, start + 12), children: [androidLogo(`b-d${i}`, 0, 0, 0.8)] };
                return {
                  id: `b-card${i}`, type: 'container',
                  children: [
                    {
                      id: `b-box${i}`, type: 'rrect', width: 150, height: 230, radius: 22,
                      fill: '#ffffff', x: cx, y: anim([start, start + 20], [470, 250], EASE),
                      opacity: fade(start, start + 12),
                      shadow: { color: 'rgba(32,33,36,0.18)', blur: 24, offsetY: 10 },
                    },
                    logoNode,
                    {
                      id: `b-name${i}`, type: 'text', text: app.name,
                      fontFamily: DISPLAY, fontSize: 25, fontWeight: 600, fill: INK,
                      textAlign: 'center', maxWidth: 150, x: cx, y: 408,
                      opacity: fade(start + 6, start + 18),
                    },
                    {
                      id: `b-sub${i}`, type: 'text', text: app.sub,
                      fontFamily: FONT, fontSize: 19, fill: GRAY,
                      textAlign: 'center', maxWidth: 150, x: cx, y: 442,
                      opacity: fade(start + 6, start + 18),
                    },
                  ],
                };
              }),
              grain('b-grain', GRAIN, { opacity: 0.06, drift: [[0, 79], [-100, -50], [-50, -100]] }),
              ...[BLUE, RED, YELLOW, GREEN].map((c, i) => ({
                id: `b-dot${i}`, type: 'circle', radius: 8, fill: c,
                x: 228 + i * 32, y: 542,
                opacity: fade(40 + i * 4, 50 + i * 4),
              })),
              {
                id: 'b-foot', type: 'text', text: 'One account. Every product.',
                fontFamily: FONT, fontSize: 23, fill: GRAY,
                textAlign: 'center', maxWidth: W, x: 0, y: 572,
                opacity: fade(44, 56),
              },
            ],
          },
          // C — scale (local 0..80), dark
          {
            id: 'actC', type: 'container', opacity: fade(70, 80, -1),
            children: [
              { id: 'c-bg', type: 'rect', width: W, height: H, fill: INK },
              kicker('c-kicker', 'TODAY', {
                x: 48, y: 220, size: 19, ls: 7, fill: '#8AB4F8', font: FONT,
              }),
              {
                id: 'c-stat', type: 'text', text: '8.5B',
                fontFamily: DISPLAY, fontSize: 148, fontWeight: 700, fill: '#ffffff',
                lineHeight: 1, x: 40, y: 270,
                scaleX: { binding: 'spring', from: 0.6, to: 1 },
                scaleY: { binding: 'spring', from: 0.6, to: 1 },
                anchorX: 190, anchorY: 53,
                opacity: fade(4, 18),
              },
              {
                id: 'c-sub', type: 'text', text: 'searches every\nsingle day.',
                fontFamily: FONT, fontSize: 34, fontWeight: 700, fill: '#ffffff', lineHeight: 1.15, x: 48,
                y: anim([12, 30], [500, 472]), opacity: fade(12, 28),
              },
              ...[BLUE, RED, YELLOW, GREEN].map((c, i) => ({
                id: `c-dot${i}`, type: 'circle', radius: 11, fill: c,
                x: 205 + i * 44, y: 649,
                opacity: anim([0, 10, 20, 30, 40, 50, 60, 70, 79], Array.from({ length: 9 }, (_, k) => ((k + i) % 2 === 0 ? 0.25 : 1)), undefined),
              })),
              grain('c-grain', GRAIN, { opacity: 0.09, drift: [[0, 79], [-60, -110], [-100, -50]] }),
            ],
          },
          // D — Gemini era (local 0..70), white
          {
            id: 'actD', type: 'container',
            children: [
              { id: 'd-bg', type: 'rect', width: W, height: H, fill: '#ffffff' },
              kicker('d-kicker', '1998 → TODAY', {
                x: 114, y: 190, size: 19, ls: 7, fill: GRAY, font: FONT, fadeIn: [0, 12],
              }),
              {
                id: 'd-spark', type: 'container', x: 270, y: 330,
                scaleX: anim([8, 30, 52, 69], [0.6, 1, 0.85, 1], EASE),
                scaleY: anim([8, 30, 52, 69], [0.6, 1, 0.85, 1], EASE),
                anchorX: 0, anchorY: 0, opacity: fade(8, 20),
                children: [{
                  ...sparkle('d-star', 44, '#6E8FD8'),
                  shadow: { color: 'rgba(110, 143, 216, 0.55)', blur: 36 },
                }],
              },
              {
                id: 'd-title', type: 'text', text: 'The Gemini era.',
                fontFamily: DISPLAY, fontSize: 58, fontWeight: 700,
                fill: {
                  kind: 'linear', angle: 90,
                  stops: [{ offset: 0, color: BLUE }, { offset: 1, color: '#9B72CB' }],
                },
                lineHeight: 1.1, textAlign: 'center', maxWidth: W, x: 0, y: 410,
                opacity: fade(14, 28),
              },
              pill('d-pill', {
                x: centerX(230), y: 580, w: 230, h: 60, fill: BLUE,
                label: 'Try Gemini', font: FONT, labelFill: '#ffffff', fadeIn: [22, 34],
              }),
              {
                id: 'd-foot', type: 'text', text: '25 years of organizing the\nworld’s information.',
                fontFamily: FONT, fontSize: 21, fill: GRAY, lineHeight: 1.4,
                textAlign: 'center', maxWidth: W, x: 0, y: 690,
                opacity: fade(26, 40),
              },
              grain('d-grain', GRAIN, { opacity: 0.06, drift: [[0, 69], [-80, -100], [-60, -80]] }),
            ],
          },
        ],
      },
    },
    timeline: seq(0, 300, [
      seq(0, 70, [leaf('actA')]),
      seq(70, 80, [leaf('actB')]),
      seq(150, 80, [leaf('actC')]),
      seq(230, 70, [leaf('actD')]),
    ]),
  };
}
