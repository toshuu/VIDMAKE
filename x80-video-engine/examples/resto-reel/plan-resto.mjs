/**
 * VRINDAVAN LAWNS — restaurant/banquet hall promo, 15s 540x960.
 * Real hall footage (5 venue clips) + icon chips from the conforming
 * restaurant asset sheet + kicker/title/sub system + BOOK YOUR DATE ask.
 */
import {
  W, H, FPS, DUR, ACT, leaf, seq, anim, fade,
  sky, stars, ground, kicker, title, titleLow, badge, chip, chipRow,
} from '../sprite-reel/plan-sprite.mjs';

export const CLIP_SIGN = 'clip-sign';
export const CLIP_BUFFET = 'clip-buffet';
export const CLIP_TABLES = 'clip-tables';
export const CLIP_ENTRY = 'clip-entry';
export const CLIP_GODS = 'clip-gods';
export const GRAIN = 'grain-tile';

const CREAM = '#f3d9a0';

/** Full-bleed footage with a slow push-in (Ken Burns). */
const footage = (id, src, localDur, from = 1, to = 1.07, loop = 'pingpong') => ({
  id, type: 'video', src, width: W, height: H, fit: 'cover', loop,
  scaleX: anim([0, localDur - 1], [from, to]),
  scaleY: anim([0, localDur - 1], [from, to]),
  anchorX: 270, anchorY: 480,
});

/** Legibility scrims: top for titles, bottom for chips/CTA.
 *  Three-stop knees — the old two-stop line read as a flat band, never
 *  as a fade (dept scrim rule). */
const scrims = (id) => ([
  {
    id: `${id}-sc-top`, type: 'rect', width: W, height: 420, x: 0, y: 0,
    fill: {
      kind: 'linear', angle: 180,
      stops: [
        { offset: 0, color: 'rgba(4,6,16,0.82)' },
        { offset: 0.55, color: 'rgba(4,6,16,0.38)' },
        { offset: 1, color: 'rgba(4,6,16,0)' },
      ],
    },
  },
  {
    id: `${id}-sc-bot`, type: 'rect', width: W, height: 480, x: 0, y: 480,
    fill: {
      kind: 'linear', angle: 0,
      stops: [
        { offset: 0, color: 'rgba(4,6,16,0)' },
        { offset: 0.45, color: 'rgba(4,6,16,0.38)' },
        { offset: 1, color: 'rgba(4,6,16,0.85)' },
      ],
    },
  },
]);

const ctaPill = (id, label, sub) => ([
  {
    id: `${id}-sub2`, type: 'text', text: sub, fontFamily: 'Inter', fontSize: 19,
    fontWeight: 500, fill: 'rgba(240,244,252,0.94)', lineHeight: 1.4,
    textAlign: 'center', maxWidth: W, x: 0, y: 726, opacity: fade(16, 28),
    shadow: { color: 'rgba(0,0,0,0.7)', blur: 12, offsetY: 2 },
  },
  {
    id, type: 'rrect', width: 330, height: 58, radius: 29,
    fill: {
      kind: 'linear', angle: 90,
      stops: [{ offset: 0, color: '#e8b34b' }, { offset: 1, color: '#ffffff' }],
    },
    x: Math.round((W - 330) / 2), y: 786,
    opacity: fade(28, 40),
    scaleX: anim([28, 42], [0.8, 1]),
    scaleY: anim([28, 42], [0.8, 1]),
    anchorX: 165, anchorY: 29,
    children: [{
      id: `${id}-t`, type: 'text', text: label, fontFamily: 'Inter',
      fontSize: 22, fontWeight: 800, letterSpacing: 2, fill: '#0b1020',
      textAlign: 'center', maxWidth: 330, x: 1, y: 21,
    }],
  },
]);

export function buildVrindavan(measure, opts = {}) {
  const chipsOn = opts.chips !== false;
  const K = (id, label, o) => kicker(id, label, { measure, ...(o ?? {}) });
  const acts = {};
  acts.a1 = {
    id: 'act1', type: 'container', children: [
      footage('a1-v', CLIP_SIGN, ACT),
      ...scrims('a1'),
      K('a1-kick', 'WEDDINGS • EVENTS • FEASTS'),
      ...title('a1', 'Vrindavan', 'Lawns', 'grand lawns, grand feasts'),
      ...(chipsOn ? chip('a1-chip', 'hotel', 440, 620) : []),
      badge('act1', 1),
    ],
  };
  acts.a2 = {
    id: 'act2', type: 'container', children: [
      footage('a2-v', CLIP_BUFFET, ACT, 1.07, 1),
      ...scrims('a2'),
      K('a2-kick', 'THE GRAND HALL'),
      ...title('a2', 'A feast,', 'staged', 'live counters & long spreads'),
      ...(chipsOn ? chipRow('a2-trio', ['cloche', 'chef', 'cocktail'], 270, 640) : []),
      badge('act2', 2),
    ],
  };
  acts.a3 = {
    id: 'act3', type: 'container', children: [
      footage('a3-v', CLIP_TABLES, ACT),
      ...scrims('a3'),
      K('a3-kick', 'SET FOR YOU'),
      ...titleLow('a3', 'Your table', 'waits', 'crisp linen & soft light'),
      ...(chipsOn ? chip('a3-chip', 'menu', 440, 380) : []),
      badge('act3', 3),
    ],
  };
  acts.a4 = {
    id: 'act4', type: 'container', children: [
      footage('a4-v', CLIP_ENTRY, ACT, 1.07, 1),
      ...scrims('a4'),
      K('a4-kick', 'ARRIVE GRAND'),
      ...title('a4', 'An entry to', 'remember', 'drapes, flowers & fanfare'),
      ...(chipsOn ? chip('a4-chip', 'flowers', 100, 620) : []),
      badge('act4', 4),
    ],
  };
  acts.a5 = {
    id: 'act5', type: 'container', children: [
      footage('a5-v', CLIP_GODS, ACT),
      ...scrims('a5'),
      K('a5-kick', 'BLESSINGS & BOOKINGS'),
      ...title('a5', 'Book your', 'date', 'the lawns are waiting'),
      ...(chipsOn ? chip('a5-chip', 'booking', 100, 600) : []),
      ...ctaPill('a5-pill', 'BOOK YOUR DATE', ''),
      badge('act5', 5),
    ],
  };

  return {
    composition: {
      id: 'vrindavan-15s', width: W, height: H, fps: FPS, durationInFrames: DUR,
      root: {
        id: 'root', type: 'container',
        children: [
          acts.a1, acts.a2, acts.a3, acts.a4, acts.a5,
          {
            id: 'chrome', type: 'container',
            children: [
              { id: 'prog-bg', type: 'rect', width: W, height: 6, fill: 'rgba(255,255,255,0.18)', x: 0, y: H - 6 },
              {
                id: 'prog-fill', type: 'rect', width: W, height: 6, x: 0, y: H - 6,
                fill: {
                  kind: 'linear', angle: 90,
                  stops: [{ offset: 0, color: '#e8b34b' }, { offset: 1, color: '#ffffff' }],
                },
                scaleX: anim([0, DUR - 1], [0, 1]),
                anchorX: 0, anchorY: 0,
              },
            ],
          },
        ],
      },
    },
    timeline: seq(0, DUR, [
      seq(0, ACT, [leaf('act1')]),
      seq(ACT, ACT, [leaf('act2')]),
      seq(ACT * 2, ACT, [leaf('act3')]),
      seq(ACT * 3, ACT, [leaf('act4')]),
      seq(ACT * 4, ACT, [leaf('act5')]),
      seq(0, DUR, [leaf('chrome')]),
    ]),
  };
}
