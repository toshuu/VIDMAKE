/**
 * "Every drop counts" — water-awareness reel, 10s 540x960.
 * Built ONLY from kit parts (no reference, no bespoke nodes beyond
 * kit builders + Ken Burns image motion). Proves new reels start premium.
 */
import {
  W, H, leaf, seq, anim, fade,
  kicker, rule, marker, scrimBottom, glow, grain, pill, centerX,
} from '../kit/kit.mjs';

export const FONT = 'Proof Inter';
export const SERIF = 'Proof Playfair';
export const GRAIN = 'grain-tile';
export const IMG_A = 'photo-mud';
export const IMG_B = 'photo-drought';
export const IMG_C = 'photo-woman';

const INK = '#f5f7f7';
const ICE = '#a8d8f0';
const DEEP = '#04121f';

const gradIce = {
  kind: 'linear', angle: 90,
  stops: [{ offset: 0, color: '#7fd4ff' }, { offset: 1, color: '#2f7fe0' }],
};

// Ken Burns push on a cover image (act-local frames).
const kenBurns = (id, src, localDur, from = 1, to = 1.1) => ({
  id, type: 'image', src, width: W, height: H, fit: 'cover',
  scaleX: anim([0, localDur - 1], [from, to]),
  scaleY: anim([0, localDur - 1], [from, to]),
  anchorX: 270, anchorY: 480,
});

export function buildWaterProof() {
  return {
    composition: {
      id: 'water-proof-10s', width: W, height: H, fps: 30, durationInFrames: 300,
      root: {
        id: 'root', type: 'container',
        children: [
          // A — the cracked earth (local 0..80)
          {
            id: 'actA', type: 'container', opacity: fade(70, 80, -1),
            children: [
              kenBurns('a-photo', IMG_A, 80),
              scrimBottom('a-scrim'),
              kicker('a-kicker', 'A QUIET CRISIS', {
                x: 48, y: 600, size: 20, ls: 8, fill: ICE, font: FONT,
              }),
              {
                id: 'a-title', type: 'text', text: 'The ground\nis thirsty.',
                fontFamily: FONT, fontWeight: 700, fill: INK, lineHeight: 1.05, x: 44,
                fontSize: anim([10, 34], [40, 64]),
                y: anim([10, 32], [676, 648]), opacity: fade(10, 28),
                shadow: { color: 'rgba(0,0,0,0.6)', blur: 24, offsetY: 6 },
              },
              rule('a-rule', { x: 48, y: 880, w: 120, fill: gradIce, grow: [30, 55] }),
              grain('a-grain', GRAIN, {}),
            ],
          },
          // B — the stat (local 0..100)
          {
            id: 'actB', type: 'container', opacity: fade(90, 100, -1),
            children: [
              kenBurns('b-photo', IMG_B, 100, 1.1, 1),
              scrimBottom('b-scrim'),
              glow('b-glow', { cx: 430, cy: 300, size: 420, color: 'rgba(47,127,224,0.5)', blur: 40 }),
              {
                id: 'b-stat', type: 'text', text: '2.2B',
                fontFamily: FONT, fontSize: 150, fontWeight: 700, fill: INK,
                lineHeight: 1, x: 44, y: 380,
                scaleX: { binding: 'spring', from: 0.6, to: 1 },
                scaleY: { binding: 'spring', from: 0.6, to: 1 },
                anchorX: 150, anchorY: 55,
                opacity: fade(4, 18),
                shadow: { color: 'rgba(127,212,255,0.4)', blur: 50 },
              },
              {
                id: 'b-sub', type: 'text', text: 'people lack safe\nwater tonight.',
                fontFamily: FONT, fontSize: 40, fontWeight: 700, fill: INK, lineHeight: 1.1, x: 48,
                y: anim([12, 30], [600, 572]), opacity: fade(12, 28),
              },
              marker('b-mark', { x: 40, y: 608, w: 130, h: 54, at: [26, 44] }),
              grain('b-grain', GRAIN, { drift: [[0, 99], [-110, -50], [-40, -100]] }),
            ],
          },
          // C — the carrier (local 0..70)
          {
            id: 'actC', type: 'container', opacity: fade(60, 70, -1),
            children: [
              kenBurns('c-photo', IMG_C, 70, 1, 1.08),
              scrimBottom('c-scrim'),
              {
                id: 'c-quote', type: 'text', text: '“She walks miles\nfor water.”',
                fontFamily: SERIF, fontSize: 58, fill: INK, lineHeight: 1.15,
                textAlign: 'center', maxWidth: W, x: 0, y: 400,
                opacity: fade(8, 24),
                shadow: { color: 'rgba(0,0,0,0.65)', blur: 20, offsetY: 4 },
              },
              kicker('c-attr', 'EVERY MORNING', {
                x: 120, y: 600, size: 18, ls: 5, fill: ICE, font: FONT, fadeIn: [18, 32],
              }),
              grain('c-grain', GRAIN, { drift: [[0, 69], [-60, -110], [-100, -50]] }),
            ],
          },
          // D — the ask (local 0..50)
          {
            id: 'actD', type: 'container',
            children: [
              { id: 'd-bg', type: 'rect', width: W, height: H, fill: DEEP },
              glow('d-glow', { cx: 270, cy: 430, size: 560, color: 'rgba(47,127,224,0.35)', blur: 45 }),
              {
                id: 'd-title', type: 'text', text: 'Every drop\ncounts.',
                fontFamily: FONT, fontSize: 72, fontWeight: 700, fill: INK, lineHeight: 1.05,
                textAlign: 'center', maxWidth: W, x: 0, y: 330, opacity: fade(4, 18),
              },
              pill('d-pill', {
                x: centerX(190), y: 590, w: 190, h: 56, fill: gradIce,
                label: 'Donate', font: FONT, labelFill: '#04121f', fadeIn: [14, 26],
              }),
              grain('d-grain', GRAIN, { opacity: 0.06, drift: [[0, 49], [-80, -100], [-60, -80]] }),
            ],
          },
        ],
      },
    },
    timeline: seq(0, 300, [
      seq(0, 80, [leaf('actA')]),
      seq(80, 100, [leaf('actB')]),
      seq(180, 70, [leaf('actC')]),
      seq(250, 50, [leaf('actD')]),
    ]),
  };
}
