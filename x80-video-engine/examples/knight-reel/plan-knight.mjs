/**
 * THE OATH — knight story reel, 15s 540x960. Second issue in the night
 * series: same world system as THE SPRITE PARADE, one hero, five moves
 * (march / charge / leap / road / oath) from the conforming sheet.
 * Flipbook + staging reuse plan-sprite.mjs builders verbatim.
 */
import {
  W, H, FPS, DUR, ACT, leaf, seq, anim, fade,
  flip, sky, stars, ground, kicker, title, badge,
} from '../sprite-reel/plan-sprite.mjs';

// Knight 2x intrinsic boxes (normalized, feet-aligned).
const KBOX = {
  march: [220, 344],
  charge: [288, 308],
  leap: [254, 368],
  road: [188, 336],
  oath: [286, 346],
};
const P = 'k2';
const kb = (name) => ({ box: KBOX[name], srcPrefix: P });
const GY = 790;

export function buildKnightOath(measure) {
  const acts = {};
  acts.a1 = {
    id: 'act1', type: 'container', children: [
      ...sky('k1'), ...stars('k1'), ...ground('k1'),
      {
        id: 'k1-kn', type: 'container',
        x: anim([0, 64, 89], [-240, 160, 160]),
        y: GY - 344, opacity: fade(0, 6),
        children: flip('k1-kn', 'march', 2, { rate: 6, ...kb('march') }),
      },
      kicker('k1-kick', 'ACT ONE • MARCH', { measure }),
      ...title('k1', 'The march begins', '', 'dust on his boots'),
      badge('act1', 1),
    ],
  };
  acts.a2 = {
    id: 'act2', type: 'container', children: [
      ...sky('k2'), ...stars('k2'), ...ground('k2'),
      {
        id: 'k2-kn', type: 'container',
        x: anim([0, 89], [-300, 620]),
        y: GY - 308, opacity: fade(0, 6),
        children: flip('k2-kn', 'charge', 2, { rate: 5, ...kb('charge') }),
      },
      kicker('k2-kick', 'ACT TWO • CHARGE', { measure }),
      ...title('k2', 'Charge!', '', 'no time to waste'),
      badge('act2', 2),
    ],
  };
  acts.a3 = {
    id: 'act3', type: 'container', children: [
      ...sky('k3'), ...stars('k3'), ...ground('k3'),
      {
        id: 'k3-kn', type: 'container',
        x: anim([0, 89], [-80, 380]),
        y: anim([0, 18, 40, 62, 89], [422, 300, 280, 422, 422]),
        opacity: fade(0, 6),
        children: flip('k3-kn', 'leap', 2, { rate: 7, ...kb('leap') }),
      },
      kicker('k3-kick', 'ACT THREE • LEAP', { measure }),
      ...title('k3', 'Leap the gap', '', 'steel over stone'),
      badge('act3', 3),
    ],
  };
  acts.a4 = {
    id: 'act4', type: 'container', children: [
      ...sky('k4'), ...stars('k4'), ...ground('k4'),
      {
        id: 'k4-kn', type: 'container',
        x: anim([0, 89], [200, 260]),
        y: GY - 336, opacity: fade(0, 8),
        children: flip('k4-kn', 'road', 2, {
          rate: 10, order: [3, 3, 0, 4, 4, 0], ...kb('road'),
        }),
      },
      kicker('k4-kick', 'ACT FOUR • ROAD', { measure }),
      ...title('k4', 'The long road', '', 'he walks on'),
      badge('act4', 4),
    ],
  };
  acts.a5 = {
    id: 'act5', type: 'container', children: [
      ...sky('k5'), ...stars('k5'), ...ground('k5'),
      {
        id: 'k5-kn', type: 'container', x: 127, y: GY - 346, opacity: fade(0, 8),
        children: flip('k5-kn', 'oath', 2, {
          rate: 12, hold: true, order: [0, 1, 2, 2, 3, 4], ...kb('oath'),
        }),
      },
      kicker('k5-kick', 'FINALE • OATH', { measure }),
      ...title('k5', 'The oath', '', 'the stone remembers'),
      {
        id: 'k5-end', type: 'rrect', width: 190, height: 54, radius: 27,
        fill: '#f2fbf4', x: Math.round((W - 190) / 2), y: 836,
        opacity: fade(60, 72),
        scaleX: anim([60, 74], [0.8, 1]),
        scaleY: anim([60, 74], [0.8, 1]),
        anchorX: 95, anchorY: 27,
        children: [{
          id: 'k5-end-t', type: 'text', text: 'THE END', fontFamily: 'Inter',
          fontSize: 22, fontWeight: 800, letterSpacing: 3, fill: '#0b1020',
          textAlign: 'center', maxWidth: 190, x: 1.5, y: 20,
        }],
      },
      badge('act5', 5),
    ],
  };

  return {
    composition: {
      id: 'knight-oath-15s', width: W, height: H, fps: FPS, durationInFrames: DUR,
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
                  stops: [{ offset: 0, color: '#4ade80' }, { offset: 1, color: '#f3d9a0' }],
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
