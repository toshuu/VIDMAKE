/**
 * iPhone premium port — 1:1 of my-video IphonePromoVertical (1080x1920)
 * halved to 540x960, 10s @ 30fps = 300 frames.
 * Acts: title 75f → features 105f → phone 75f → endcard 45f.
 * One timeline leaf per act container (no double-draw); scene fades live
 * on the act containers; all child timings are act-local bindings.
 *
 * Deltas vs the reference (logged, not silent):
 * - Noto/SF Pro → Liberation Sans (Arial metrics; closest on this box).
 * - Perceptual-scale springs → plain springs (same damping intent).
 * - CTA pulse (sin wall-clock) → interpolate keyframes of sin(f/6).
 * - Easing fns in bindings are code, not pure JSON (plan.mjs is code).
 */
import { Easing } from '../../packages/core/dist/index.js';

const W = 540;
const H = 960;
const DUR = 300;
export const FONT = 'Premium Inter';
export const GRAIN = 'grain-tile';

const EASE = Easing.bezier(0.16, 1, 0.3, 1);
const SPRING = Easing.spring({ damping: 200 });
const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };

const leaf = (ref) => ({ kind: 'leaf', ref });
const seq = (from, durationInFrames, children) => ({ kind: 'sequence', from, durationInFrames, children });
const anim = (inputRange, outputRange, easing) => ({
  binding: 'interpolate', inputRange, outputRange, options: { ...CLAMP, easing },
});
const fade = (a, b, dir = 1) =>
  dir > 0 ? anim([a, b], [0, 1], EASE) : anim([a, b], [1, 0], EASE);

const BLUE = '#2997ff';
const PURPLE = '#a259ff';
const INK = '#f5f5f7';
const GRAY = '#86868b';
const gradH = { kind: 'linear', angle: 90, stops: [{ offset: 0, color: BLUE }, { offset: 1, color: PURPLE }] };
const gradV = { kind: 'linear', angle: 180, stops: [{ offset: 0, color: BLUE }, { offset: 1, color: PURPLE }] };

export function buildIphonePremium() {
  return {
    composition: {
      id: 'iphone-premium-10s', width: W, height: H, fps: 30, durationInFrames: DUR,
      root: {
        id: 'root', type: 'container',
        children: [
          // ACT 1 — title (local 0..75)
          {
            id: 'act1', type: 'container', opacity: fade(65, 75, -1),
            children: [
              { id: 'a1-bg', type: 'rect', width: W, height: H, fill: '#000000' },
              {
                id: 'a1-kicker', type: 'text', text: 'INTRODUCING',
                fontFamily: FONT, fontSize: 20, letterSpacing: 9, fill: GRAY,
                textAlign: 'center', maxWidth: W, x: 0,
                y: anim([5, 25], [425, 410], EASE), opacity: fade(5, 20),
              },
              {
                id: 'a1-hero', type: 'text', text: 'iPhone',
                fontFamily: FONT, fontSize: 95, fontWeight: 700, fill: INK,
                lineHeight: 1, textAlign: 'center', maxWidth: W, x: 0, y: 439,
                shadow: { color: 'rgba(90, 140, 255, 0.55)', blur: 45 },
                opacity: fade(10, 25),
                scaleX: { binding: 'spring', from: 0.6, to: 1, delay: 15 },
                scaleY: { binding: 'spring', from: 0.6, to: 1, delay: 15 },
                anchorX: 270, anchorY: 34,
              },
              {
                id: 'a1-rule', type: 'rrect', width: 190, height: 2, radius: 1,
                fill: gradH, x: 175, y: 551,
                scaleX: anim([30, 55], [0, 1], EASE), scaleY: 1,
                anchorX: 95, anchorY: 1, opacity: fade(30, 40),
             },
              {
                id: 'a1-grain', type: 'image', src: GRAIN, width: 660, height: 1080,
                opacity: 0.07, blendMode: 'overlay',
                x: anim([0, 74], [-40, -100], EASE),
                y: anim([0, 74], [-30, -90], EASE),
              },
            ],
          },
          // ACT 2 — features (local 0..105)
          {
            id: 'act2', type: 'container', opacity: fade(95, 105, -1),
            children: [
              { id: 'a2-bg', type: 'rect', width: W, height: H, fill: '#050507' },
              {
                id: 'a2-kicker', type: 'text', text: 'WHY IPHONE',
                fontFamily: FONT, fontSize: 19, letterSpacing: 7, fill: BLUE,
                x: 55, y: 305, opacity: fade(0, 12),
              },
              ...[0, 1, 2].map((i) => {
                const start = 5 + i * 30;
                const feats = [
                  ['Titanium design', 'So strong. So light. So Pro.'],
                  ['A17 Pro chip', 'A monster win for gaming.'],
                  ['48MP Pro camera', 'Every shot. Masterpiece.'],
                ][i];
                const rowY = 354 + i * 109;
                return {
                  id: `a2-row${i}`, type: 'container',
                  x: anim([start, start + 16], [-30, 0], EASE),
                  opacity: anim([start, start + 12], [0, 1], EASE),
                  children: [
                    {
                      id: `a2-bar${i}`, type: 'rrect', width: 4, height: 60, radius: 2,
                      fill: gradV, x: 55, y: rowY,
                      scaleX: 1,
                      scaleY: { binding: 'spring', from: 0, to: 1, delay: start },
                      anchorX: 2, anchorY: 30,
                    },
                    {
                      id: `a2-title${i}`, type: 'text', text: feats[0],
                      fontFamily: FONT, fontSize: 31, fontWeight: 700, fill: INK,
                      x: 71, y: rowY - 4,
                    },
                    {
                      id: `a2-sub${i}`, type: 'text', text: feats[1],
                      fontFamily: FONT, fontSize: 19, fill: GRAY,
                      x: 71, y: rowY + 35,
                    },
                  ],
                };
              }),
              {
                id: 'a2-grain', type: 'image', src: GRAIN, width: 660, height: 1080,
                opacity: 0.07, blendMode: 'overlay',
                x: anim([0, 104], [-100, -50], EASE),
                y: anim([0, 104], [-50, -100], EASE),
              },
            ],
          },
          // ACT 3 — phone (local 0..75)
          {
            id: 'act3', type: 'container', opacity: fade(67, 75, -1),
            children: [
              { id: 'a3-bg', type: 'rect', width: W, height: H, fill: '#000000' },
              {
                id: 'a3-h1', type: 'text', text: 'Beyond',
                fontFamily: FONT, fontSize: 60, fontWeight: 700, fill: INK,
                lineHeight: 1.05, textAlign: 'center', maxWidth: W, x: 0,
                y: anim([0, 18], [263, 238], EASE), opacity: fade(0, 12),
              },
              {
                id: 'a3-h2', type: 'text', text: 'Pro.',
                fontFamily: FONT, fontSize: 60, fontWeight: 700, fill: gradH,
                lineHeight: 1.05, textAlign: 'center', maxWidth: W, x: 0,
                y: anim([10, 28], [326, 301], EASE), opacity: fade(10, 22),
              },
              {
                id: 'a3-phone', type: 'container',
                x: 192, y: anim([5, 38], [512, 402], SPRING),
                scaleX: 0.92, scaleY: 0.92, anchorX: 77, anchorY: 157,
                opacity: fade(5, 18),
                children: [
                  {
                    id: 'a3-frame', type: 'rrect', width: 155, height: 315, radius: 26,
                    fill: {
                      kind: 'linear', angle: 145,
                      stops: [
                        { offset: 0, color: '#8e8e93' },
                        { offset: 0.4, color: '#3a3a3c' },
                        { offset: 0.7, color: '#d4d4d8' },
                        { offset: 1, color: '#636366' },
                      ],
                    },
                    shadow: { color: 'rgba(41, 151, 255, 0.35)', blur: 60, offsetY: 20 },
                    x: 0, y: 0,
                  },
                  {
                    id: 'a3-screen', type: 'rrect', width: 143, height: 303, radius: 21,
                    fill: {
                      kind: 'linear', angle: 160,
                      stops: [
                        { offset: 0, color: '#0a2540' },
                        { offset: 0.55, color: '#3b1d6e' },
                        { offset: 1, color: '#000000' },
                      ],
                    },
                    x: 6, y: 6,
                  },
                  {
                    id: 'a3-island', type: 'rrect', width: 55, height: 15, radius: 7.5,
                    fill: '#000000', x: 50, y: 17,
                  },
                  {
                    id: 'a3-time', type: 'text', text: '9:41',
                    fontFamily: FONT, fontSize: 28, fontWeight: 700, fill: '#ffffff',
                    textAlign: 'center', maxWidth: 155, x: 0, y: 43,
                  },
                  {
                    id: 'a3-label', type: 'text', text: 'iPhone',
                    fontFamily: FONT, fontSize: 17, fill: '#a8c7fa',
                    textAlign: 'center', maxWidth: 155, x: 0, y: 79,
                  },
                ],
              },
              {
                id: 'a3-grain', type: 'image', src: GRAIN, width: 660, height: 1080,
                opacity: 0.07, blendMode: 'overlay',
                x: anim([0, 74], [-60, -110], EASE),
                y: anim([0, 74], [-100, -60], EASE),
              },
            ],
          },
          // ACT 4 — end card (local 0..45)
          {
            id: 'act4', type: 'container',
            children: [
              { id: 'a4-bg', type: 'rect', width: W, height: H, fill: '#000000' },
              {
                id: 'a4-title', type: 'text', text: 'iPhone',
                fontFamily: FONT, fontSize: 75, fontWeight: 700, fill: INK,
                lineHeight: 1, textAlign: 'center', maxWidth: W, x: 0, y: 391,
                shadow: { color: 'rgba(162, 89, 255, 0.5)', blur: 35 },
                opacity: fade(0, 12),
                scaleX: { binding: 'spring', from: 0.7, to: 1 },
                scaleY: { binding: 'spring', from: 0.7, to: 1 },
                anchorX: 270, anchorY: 27,
              },
              {
                id: 'a4-price', type: 'text', text: 'From $799. Pre-order now.',
                fontFamily: FONT, fontSize: 22, fill: GRAY,
                textAlign: 'center', maxWidth: W, x: 0, y: 475,
                opacity: fade(12, 24),
              },
              {
                id: 'a4-pill', type: 'rrect', width: 125, height: 46, radius: 23,
                fill: '#0071e3', x: 207, y: 523, opacity: fade(20, 32),
                scaleX: anim([0, 9, 19, 28, 38], [1, 1.025, 1, 0.975, 1], undefined),
                scaleY: anim([0, 9, 19, 28, 38], [1, 1.025, 1, 0.975, 1], undefined),
                anchorX: 62, anchorY: 23,
                children: [
                  {
                    id: 'a4-buy', type: 'text', text: 'Buy',
                    fontFamily: FONT, fontSize: 22, fontWeight: 700, fill: '#ffffff',
                    textAlign: 'center', maxWidth: 125, x: 0, y: 10,
                  },
                ],
              },
              {
                id: 'a4-grain', type: 'image', src: GRAIN, width: 660, height: 1080,
                opacity: 0.07, blendMode: 'overlay',
                x: anim([0, 44], [-90, -110], EASE),
                y: anim([0, 44], [-60, -80], EASE),
              },
            ],
          },
        ],
      },
    },
    timeline: seq(0, DUR, [
      seq(0, 75, [leaf('act1')]),
      seq(75, 105, [leaf('act2')]),
      seq(180, 75, [leaf('act3')]),
      seq(255, 45, [leaf('act4')]),
    ]),
  };
}
