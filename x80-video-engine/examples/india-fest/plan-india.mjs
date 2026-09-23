/**
 * INDIA, LANDF OF FESTIVALS — ChatGPT-planned dossier, engine-built.
 * 15s 540x960. Four dance rows (lehenga/kurta/sari/mundu) + prop row
 * (diya/flowers/lantern). Procedural celebration backgrounds (no bg
 * stills were supplied); whooshes on cuts (no music bed supplied).
 * Deviations from dossier logged at the bottom and in the summary.
 */
import {
  W, H, FPS, DUR, ACT, leaf, seq, anim, fade,
  flip, kicker, kickMeasure, title, badge,
} from '../sprite-reel/plan-sprite.mjs';

const P2 = 'in2';
const P1 = 'in1';
const BOX2 = {
  lehenga: [426, 444], kurta: [348, 446], sari: [408, 426], mundu: [370, 450],
};
const BOX1 = {
  lehenga: [213, 222], kurta: [174, 223], sari: [204, 213], mundu: [185, 225],
};
const GY = 790;
const g = (h) => GY - h;

/** Celebration background: base gradient + warm light cluster + stars. */
const festBg = (id, top, mid, glowC, glowY = 620, stars = true) => ([
  {
    id: `${id}-sky`, type: 'rect', width: W, height: H,
    fill: {
      kind: 'linear', angle: 180,
      stops: [
        { offset: 0, color: top },
        { offset: 0.6, color: mid },
        { offset: 1, color: '#070a18' },
      ],
    },
  },
  {
    id: `${id}-glow`, type: 'circle', radius: 300, x: -30, y: glowY - 300,
    opacity: 0.55, blendMode: 'screen',
    fill: { kind: 'radial', stops: [{ offset: 0, color: glowC }, { offset: 1, color: 'rgba(0,0,0,0)' }] },
  },
  ...(stars ? [
    [40, 90], [130, 60], [230, 110], [330, 70], [430, 120], [500, 80],
    [90, 200], [300, 180], [460, 220],
  ].map(([x, y], i) => ({
    id: `${id}-st${i}`, type: 'rect', width: 2, height: 2, x, y,
    fill: '#ffffff', opacity: 0.3 + (i % 4) * 0.12,
  })) : []),
]);

/** Keyword ticker (band shot). */
const ticker = (id, items, y = 470, at = 24) => ([
  { id: `${id}-band`, type: 'rect', width: W, height: 56, x: 0, y, fill: 'rgba(255,255,255,0.07)', stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1, backdropBlur: 4, opacity: fade(at, at + 14) },
  { id: `${id}-band-t`, type: 'rect', width: W, height: 1, x: 0, y, fill: 'rgba(255,255,255,0.18)' },
  { id: `${id}-band-b`, type: 'rect', width: W, height: 1, x: 0, y: y + 55, fill: 'rgba(255,255,255,0.18)' },
  {
    id: `${id}-mq`, type: 'text', text: items, fontFamily: 'Poppins',
    fontSize: 20, fontWeight: 700, fill: 'rgba(255,255,255,0.85)',
    x: anim([at - 12, 179], [540, -900], true), y: y + 14, opacity: fade(at, at + 14),
  },
  { id: `${id}-fdl`, type: 'rect', width: 70, height: 56, x: 0, y, fill: { kind: 'linear', angle: 90, stops: [{ offset: 0, color: 'rgba(0,0,0,0.85)' }, { offset: 1, color: 'rgba(0,0,0,0)' }] } },
  { id: `${id}-fdr`, type: 'rect', width: 70, height: 56, x: W - 70, y, fill: { kind: 'linear', angle: 270, stops: [{ offset: 0, color: 'rgba(0,0,0,0.85)' }, { offset: 1, color: 'rgba(0,0,0,0)' }] } },
]);

const diyaGlow = (id, x, y, at = 10, flicker = true) => ([
  {
    id: `${id}-gl`, type: 'circle', radius: 60, x: x - 60, y: y - 60,
    opacity: flicker
      ? anim([at, at + 20, at + 45, Math.min(at + 70, 88), 89], [0, 0.5, 0.35, 0.5, 0.45])
      : fade(at, at + 14),
    blendMode: 'screen',
    fill: { kind: 'radial', stops: [{ offset: 0, color: '#ffb347' }, { offset: 1, color: 'rgba(0,0,0,0)' }] },
  },
  {
    id: `${id}-diy`, type: 'image', src: 'prop-diya',
    width: 142, height: 160, fit: 'contain', x: x - 71, y: y - 80,
    opacity: fade(at, at + 14),
  },
]);

export function buildIndiaFest(measure) {
  const K = (id, label, o) => kicker(id, label, { measure, ...(o ?? {}) });
  const F2 = (id, name, o) => flip(id, name, 2, {
    box: BOX2[name], srcPrefix: P2, ...(o ?? {}),
  });
  const F1 = (id, name, o) => flip(id, name, 2, {
    box: BOX1[name], srcPrefix: P1, ...(o ?? {}),
  });
  const acts = {};

  // ---- ACT 1: hook — one smile, intimate indigo + diya trio
  acts.a1 = {
    id: 'act1', type: 'container', children: [
      ...festBg('a1', '#0d0a24', '#1c1440', 'rgba(255,179,71,0.55)', 660),
      ...diyaGlow('a1-d1', 90, 640), ...diyaGlow('a1-d2', 270, 680, 16), ...diyaGlow('a1-d3', 450, 640, 22),
      {
        id: 'a1-hero', type: 'container', x: 57, y: g(444), opacity: fade(4, 16),
        children: F2('a1-hero', 'lehenga', { rate: 18, order: [0, 0, 4, 4] }),
      },
      K('a1-kick', 'LAND OF FESTIVALS'),
      ...title('a1', 'India is seriously', 'a land of festivals', 'India itself', { size: 36, maxW: 440 }),
      badge('act1', 1),
    ],
  };

  // ---- ACT 2: band — staggered 1x lineup + ticker
  const line2 = [
    ['lehenga', 10, 568], ['kurta', 125, 567], ['sari', 240, 577], ['mundu', 355, 565],
  ];
  acts.a2 = {
    id: 'act2', type: 'container', children: [
      ...festBg('a2', '#120a2e', '#2b1650', 'rgba(255,120,180,0.4)', 600),
      ...line2.map(([name, x, y], i) => ({
        id: `a2-m${i}`, type: 'container', x, y, opacity: fade(4 + i * 5, 16 + i * 5),
        children: F1(`a2-m${i}`, name, { rate: 7 }),
      })),
      ...ticker('a2', 'FESTIVALS • FUN • INDIA'),
      K('a2-kick', 'FUN • INDIA'),
      ...title('a2', 'Festivals', 'are fun', 'young ones'),
      badge('act2', 2),
    ],
  };

  // ---- ACT 3: quote — sari center, two soft silhouettes, floating diya
  acts.a3 = {
    id: 'act3', type: 'container', children: [
      ...festBg('a3', '#1c0d14', '#3a1620', 'rgba(255,150,90,0.5)', 640),
      {
        id: 'a3-l', type: 'container', x: 10, y: g(223), opacity: anim([0, 89], [0, 0.35]),
        children: F1('a3-l', 'kurta', { rate: 12, order: [0, 0] }),
      },
      {
        id: 'a3-r', type: 'container', x: 345, y: g(225), opacity: anim([0, 89], [0, 0.35]),
        children: F1('a3-r', 'mundu', { rate: 12, order: [0, 0] }),
      },
      {
        id: 'a3-hero', type: 'container', x: 66, y: g(426), opacity: fade(6, 18),
        children: F2('a3-hero', 'sari', { rate: 14, order: [0, 0, 4, 4] }),
      },
      {
        id: 'a3-diy', type: 'container',
        x: 380, y: anim([10, 89], [520, 430]), opacity: fade(14, 28),
        children: [pose('a3-diy-p')],
      },
      K('a3-kick', 'LOVING INDIA', { x: Math.round((W - kickMeasure(measure, 'LOVING INDIA')) / 2) }),
      {
        id: 'a3-q1', type: 'text', text: 'Loving', fontFamily: 'Inter', fontSize: 64,
        fontWeight: 800, fill: '#ffffff', lineHeight: 1.02,
        textAlign: 'center', maxWidth: W, x: 0, y: anim([8, 26], [176, 150]), opacity: fade(8, 24),
        shadow: { color: 'rgba(0,0,0,0.75)', blur: 25, offsetY: 5 },
      },
      {
        id: 'a3-q2', type: 'text', text: 'India', fontFamily: 'Inter', fontSize: 64,
        fontWeight: 800, fill: '#f3d9a0', lineHeight: 1.02,
        textAlign: 'center', maxWidth: W, x: 0, y: anim([14, 32], [244, 218]), opacity: fade(14, 28),
        shadow: { color: 'rgba(243,217,160,0.4)', blur: 40, offsetY: 5 },
      },
      badge('act3', 3),
    ],
  };

  // ---- ACT 4: emblem — I-mark + orbit + lineup + rising lantern
  acts.a4 = {
    id: 'act4', type: 'container', children: [
      ...festBg('a4', '#140a28', '#331a55', 'rgba(255,190,90,0.65)', 560),
      {
        id: 'a4-halo', type: 'circle', radius: 120, x: 150, y: 260,
        opacity: 0.5, blendMode: 'screen',
        fill: { kind: 'radial', stops: [{ offset: 0, color: '#f3d9a0' }, { offset: 1, color: 'rgba(0,0,0,0)' }] },
      },
      {
        id: 'a4-ring', type: 'circle', radius: 84, x: 186, y: 296,
        fill: 'rgba(0,0,0,0)', stroke: '#f3d9a0', strokeWidth: 3, opacity: fade(6, 20),
      },
      {
        id: 'a4-sat', type: 'circle', radius: 8,
        x: anim([0, 22, 45, 67, 89], [365, 270, 175, 270, 365]),
        y: anim([0, 22, 45, 67, 89], [420, 515, 420, 325, 420]),
        fill: '#f3d9a0', opacity: fade(12, 26),
      },
      {
        id: 'a4-mark', type: 'text', text: 'I', fontFamily: 'Poppins',
        fontSize: 110, fontWeight: 700, fill: '#ffffff',
        textAlign: 'center', maxWidth: 168, x: 186, y: 322, opacity: fade(8, 22),
        shadow: { color: 'rgba(0,0,0,0.6)', blur: 30, offsetY: 4 },
      },
      ...[
        ['mundu', 10, 565], ['lehenga', 125, 568], ['kurta', 245, 567], ['sari', 350, 577],
      ].map(([name, x, y], i) => ({
        id: `a4-m${i}`, type: 'container', x, y, opacity: fade(20 + i * 4, 32 + i * 4),
        children: F1(`a4-m${i}`, name, { rate: 8, order: [3, 4, 3, 4] }),
      })),
      {
        id: 'a4-lant', type: 'container',
        x: 400, y: anim([0, 89], [620, 200]), opacity: fade(10, 24),
        children: [pose('a4-lant-p')],
      },
      K('a4-kick', 'INDIA ITSELF'),
      ...title('a4', 'A land of', 'festivals', 'glorify • young • fun', { size: 40, maxW: 440, subY: 246 }),
      badge('act4', 4),
    ],
  };

  // ---- ACT 5: ctaCard — group + rising lanterns + pill + lockup
  acts.a5 = {
    id: 'act5', type: 'container', children: [
      ...festBg('a5', '#100a26', '#2a1748', 'rgba(255,190,90,0.6)', 600),
      { id: 'a5-gnd', type: 'rect', width: W, height: 320, x: 0, y: 640, fill: '#0a0d1a' },
      { id: 'a5-gln', type: 'rect', width: W, height: 2, x: 0, y: 640, fill: '#6b5a3f' },
      ...[
        ['lehenga', 10, 568], ['kurta', 125, 567], ['sari', 240, 577], ['mundu', 355, 565],
      ].map(([name, x, y], i) => ({
        id: `a5-m${i}`, type: 'container', x, y: 640 - [222, 223, 213, 225][i], opacity: fade(4 + i * 4, 16 + i * 4),
        children: F1(`a5-m${i}`, name, { rate: 10, order: [4, 4, 0, 0] }),
      })),
      {
        id: 'a5-l1', type: 'container',
        x: 10, y: anim([0, 89], [520, 140]), opacity: fade(8, 22),
        children: [pose('a5-l1-p')],
      },
      {
        id: 'a5-l2', type: 'container',
        x: 403, y: anim([0, 89], [560, 180]), opacity: fade(14, 28),
        children: [pose('a5-l2-p')],
      },
      K('a5-kick', 'FINALE • INDIA'),
      {
        id: 'a5-pill', type: 'rrect', width: 360, height: 58, radius: 29,
        fill: { kind: 'linear', angle: 90, stops: [{ offset: 0, color: '#4ade80' }, { offset: 1, color: '#ffffff' }] },
        x: Math.round((W - 360) / 2), y: 700,
        opacity: fade(28, 40),
        scaleX: anim([28, 42], [0.8, 1]),
        scaleY: anim([28, 42], [0.8, 1]),
        anchorX: 180, anchorY: 29,
        children: [{
          id: 'a5-pill-t', type: 'text', text: 'COME JOIN THE FUN', fontFamily: 'Inter',
          fontSize: 22, fontWeight: 800, letterSpacing: 2, fill: '#0b1020',
          textAlign: 'center', maxWidth: 360, x: 1, y: 21,
        }],
      },
      {
        id: 'a5-lock', type: 'text', text: 'INDIA ITSELF', fontFamily: 'Poppins',
        fontSize: 26, fontWeight: 700, letterSpacing: 6, fill: '#f3d9a0',
        textAlign: 'center', maxWidth: W, x: 3, y: 780, opacity: fade(40, 54),
        shadow: { color: 'rgba(0,0,0,0.7)', blur: 12, offsetY: 2 },
      },
      badge('act5', 5),
    ],
  };

  return {
    composition: {
      id: 'india-fest-15s', width: W, height: H, fps: FPS, durationInFrames: DUR,
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
                fill: { kind: 'linear', angle: 90, stops: [{ offset: 0, color: '#4ade80' }, { offset: 1, color: '#f3d9a0' }] },
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

// Pose helper with exact-src props (diya/lantern floats).
function pose(id) {
  const sizes = {
    'a3-diy-p': [142, 160], 'a4-lant-p': [127, 171],
    'a5-l1-p': [127, 171], 'a5-l2-p': [127, 171],
  };
  const srcs = {
    'a3-diy-p': 'prop1-diya', 'a4-lant-p': 'prop1-lantern',
    'a5-l1-p': 'prop1-lantern', 'a5-l2-p': 'prop1-lantern',
  };
  const [w, h] = sizes[id];
  return {
    id, type: 'image', src: srcs[id], width: w, height: h, fit: 'none', x: 0, y: 0,
  };
}
