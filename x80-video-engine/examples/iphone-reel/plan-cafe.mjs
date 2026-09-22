/**
 * Café premium reel — 10s, 540x960, 30fps. No reference to copy: original
 * design using the same premium primitives (gradient scrims/dividers,
 * text shadows, spaced kickers, expo-out motion).
 * Acts: pour 90f → menu 110f → quote 60f → visit 40f. One leaf per act.
 */
import { Easing } from '../../packages/core/dist/index.js';

export const FONT = 'Cafe Inter';
export const SERIF = 'Cafe Playfair';
const W = 540;
const H = 960;

const EASE = Easing.bezier(0.16, 1, 0.3, 1);
const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
const leaf = (ref) => ({ kind: 'leaf', ref });
const seq = (from, durationInFrames, children) => ({ kind: 'sequence', from, durationInFrames, children });
const anim = (inputRange, outputRange) => ({
  binding: 'interpolate', inputRange, outputRange, options: { ...CLAMP, easing: EASE },
});
const fade = (a, b, dir = 1) =>
  dir > 0 ? anim([a, b], [0, 1]) : anim([a, b], [1, 0]);

export const CLIP_A = 'cafe-cut2';
export const GRAIN = 'grain-tile';
export const CLIP_B = 'cafe-cut3';
export const CLIP_C = 'cafe-cut4';

const INK = '#f7f3ec';
const CREAM = '#d8c9ae';
const DIM = '#a89e8d';

const scrimBottom = {
  kind: 'linear', angle: 180,
  stops: [
    { offset: 0, color: 'rgba(0,0,0,0)' },
    { offset: 0.45, color: 'rgba(0,0,0,0.28)' },
    { offset: 1, color: 'rgba(0,0,0,0.88)' },
  ],
};
const hairline = {
  kind: 'linear', angle: 90,
  stops: [
    { offset: 0, color: 'rgba(216,201,174,0)' },
    { offset: 0.5, color: 'rgba(216,201,174,0.55)' },
    { offset: 1, color: 'rgba(216,201,174,0)' },
  ],
};
const goldBar = {
  kind: 'linear', angle: 180,
  stops: [
    { offset: 0, color: '#e8c37a' },
    { offset: 1, color: '#9a6b2f' },
  ],
};

export function buildCafePremium() {
  return {
    composition: {
      id: 'cafe-premium-10s', width: W, height: H, fps: 30, durationInFrames: 300,
      root: {
        id: 'root', type: 'container',
        children: [
          // A — the pour (local 0..90)
          {
            id: 'actA', type: 'container', opacity: fade(80, 90, -1),
            children: [
              { id: 'a-clip', type: 'video', src: CLIP_A, width: W, height: H, fit: 'cover', loop: true },
              { id: 'a-scrim', type: 'rect', width: W, height: H, fill: scrimBottom },
              {
                id: 'a-kicker', type: 'text', text: 'BREW BAR — EST. 2016',
                fontFamily: FONT, fontSize: 20, letterSpacing: 6, fill: CREAM,
                x: 48, y: anim([5, 25], [640, 625]), opacity: fade(5, 20),
              },
              {
                id: 'a-title', type: 'text', text: 'Slow mornings,\npoured slow.',
                fontFamily: FONT, fontSize: 62, fontWeight: 700, fill: INK,
                lineHeight: 1.05, x: 44,
                y: anim([10, 32], [700, 668]), opacity: fade(10, 28),
                shadow: { color: 'rgba(0,0,0,0.6)', blur: 24, offsetY: 6 },
              },
              {
                id: 'a-rule', type: 'rrect', width: 120, height: 3, radius: 1.5,
                fill: goldBar, x: 48, y: 872,
                scaleX: anim([30, 55], [0, 1]), anchorX: 0, anchorY: 1,
                opacity: fade(30, 42),
              },
              {
                id: 'a-grain', type: 'image', src: GRAIN, width: 660, height: 1080,
                opacity: 0.09, blendMode: 'overlay',
                x: anim([0, 89], [-40, -100]),
                y: anim([0, 89], [-30, -90]),
              },
            ],
          },
          // B — menu (local 0..110)
          {
            id: 'actB', type: 'container', opacity: fade(100, 110, -1),
            children: [
              { id: 'b-clip', type: 'video', src: CLIP_B, width: W, height: H, fit: 'cover', loop: true },
              { id: 'b-scrim', type: 'rect', width: W, height: H, fill: scrimBottom },
              {
                id: 'b-kicker', type: 'text', text: 'ON THE MENU',
                fontFamily: FONT, fontSize: 19, letterSpacing: 7, fill: CREAM,
                x: 48, y: 300, opacity: fade(0, 12),
              },
              ...[
                ['Oat Latte', '4.2'], ['Espresso', '3.0'], ['Pour Over', '4.8'],
              ].map(([item, price], i) => {
                const start = 8 + i * 18;
                const y = 360 + i * 92;
                // Marker swash behind the hero item (rough-notation Highlight
                // equivalent): translucent gold wash, drawn first, grows in.
                const marker = i === 0 ? [{
                  id: 'b-mark0', type: 'rrect', width: 168, height: 48, radius: 6,
                  fill: 'rgba(232, 195, 122, 0.8)', x: 38, y: y - 7,
                  scaleX: anim([start + 4, start + 18], [0, 1]),
                  anchorX: 0, anchorY: 0,
                }] : [];
                return {
                  id: `b-row${i}`, type: 'container',
                  x: anim([start, start + 16], [-24, 0]),
                  opacity: anim([start, start + 12], [0, 1]),
                  children: [
                    ...marker,
                    {
                      id: `b-item${i}`, type: 'text', text: item,
                      fontFamily: FONT, fontSize: 34, fontWeight: 700, fill: INK,
                      x: 48, y,
                    },
                    {
                      id: `b-price${i}`, type: 'text', text: price,
                      fontFamily: FONT, fontSize: 30, fill: CREAM,
                      x: 440, y: y + 2,
                    },
                    { id: `b-line${i}`, type: 'rect', width: 444, height: 1, fill: hairline, x: 48, y: y + 58 },
                  ],
                };
              }),
              {
                id: 'b-grain', type: 'image', src: GRAIN, width: 660, height: 1080,
                opacity: 0.09, blendMode: 'overlay',
                x: anim([0, 109], [-110, -50]),
                y: anim([0, 109], [-40, -100]),
              },
            ],
          },
          // C — quote over ambience (local 0..60)
          {
            id: 'actC', type: 'container', opacity: fade(50, 60, -1),
            children: [
              {
                id: 'c-clip', type: 'video', src: CLIP_C, width: W, height: H, fit: 'cover', loop: true,
                scaleX: anim([0, 59], [1, 1.08]),
                scaleY: anim([0, 59], [1, 1.08]),
                anchorX: 270, anchorY: 480,
              },
              { id: 'c-scrim', type: 'rect', width: W, height: H, fill: scrimBottom },
              {
                id: 'c-quote', type: 'text', text: '“First pour,\nbest hour.”',
                fontFamily: SERIF, fontSize: 64, fill: INK, lineHeight: 1.15,
                textAlign: 'center', maxWidth: W, x: 0, y: 380,
                opacity: fade(8, 24),
                shadow: { color: 'rgba(0,0,0,0.65)', blur: 20, offsetY: 4 },
              },
              {
                id: 'c-attr', type: 'text', text: '— HOUSE SAYING',
                fontFamily: FONT, fontSize: 18, letterSpacing: 5, fill: CREAM,
                textAlign: 'center', maxWidth: W, x: 0, y: 580,
                opacity: fade(18, 32),
              },
              {
                id: 'c-grain', type: 'image', src: GRAIN, width: 660, height: 1080,
                opacity: 0.09, blendMode: 'overlay',
                x: anim([0, 59], [-60, -110]),
                y: anim([0, 59], [-100, -50]),
              },
            ],
          },
          // D — visit card (local 0..40)
          {
            id: 'actD', type: 'container',
            children: [
              { id: 'd-bg', type: 'rect', width: W, height: H, fill: '#0d0a06' },
              {
                id: 'd-kicker', type: 'text', text: 'OPEN DAILY 7 — 7',
                fontFamily: FONT, fontSize: 19, letterSpacing: 6, fill: CREAM,
                textAlign: 'center', maxWidth: W, x: 0, y: 380, opacity: fade(0, 12),
              },
              {
                id: 'd-title', type: 'text', text: 'Come thirsty.',
                fontFamily: SERIF, fontSize: 72, fill: INK,
                textAlign: 'center', maxWidth: W, x: 0, y: 420, opacity: fade(6, 20),
              },
              {
                id: 'd-pill', type: 'rrect', width: 210, height: 56, radius: 28,
                fill: goldBar, x: 165, y: 560, opacity: fade(14, 26),
                children: [
                  {
                    id: 'd-cta', type: 'text', text: 'Find us',
                    fontFamily: FONT, fontSize: 26, fontWeight: 700, fill: '#1a1208',
                    textAlign: 'center', maxWidth: 210, x: 0, y: 12,
                  },
                ],
              },
              {
                id: 'd-grain', type: 'image', src: GRAIN, width: 660, height: 1080,
                opacity: 0.07, blendMode: 'overlay',
                x: anim([0, 39], [-80, -100]),
                y: anim([0, 39], [-60, -80]),
              },
            ],
          },
        ],
      },
    },
    timeline: seq(0, 300, [
      seq(0, 90, [leaf('actA')]),
      seq(90, 110, [leaf('actB')]),
      seq(200, 60, [leaf('actC')]),
      seq(260, 40, [leaf('actD')]),
    ]),
  };
}
