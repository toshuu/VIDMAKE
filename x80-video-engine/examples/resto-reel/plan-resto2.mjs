/**
 * VRINDAVAN II — same assets, different eyes. The anti-template reel:
 * varied act durations (60/100/90/80/120), real A/B transitions, NO kicker
 * pills, NO badges, staggered kinetic titles, poster frame, tilted ticket,
 * full-takeover CTA. Proves the engine was never the template — I was.
 */
import {
  W, H, FPS, DUR, leaf, seq, anim, fade,
} from '../sprite-reel/plan-sprite.mjs';
import {
  CLIP_SIGN, CLIP_BUFFET, CLIP_TABLES, CLIP_ENTRY, CLIP_GODS,
} from './plan-resto.mjs';

export { CLIP_SIGN, CLIP_BUFFET, CLIP_TABLES, CLIP_ENTRY, CLIP_GODS };

const DURS = [60, 100, 90, 80, 120];
const B = [0, 60, 160, 250, 330]; // nominal boundaries (sums of DURS)

const footage = (id, src, localDur, from = 1, to = 1.07, loop = 'pingpong') => ({
  id, type: 'video', src, width: W, height: H, fit: 'cover', loop,
  scaleX: anim([0, localDur - 1], [from, to]),
  scaleY: anim([0, localDur - 1], [from, to]),
  anchorX: 270, anchorY: 480,
});

/** Overline: letterspaced caps WITHOUT a pill. */
const overline = (id, text, y = 96, at = 4) => ({
  id, type: 'text', text, fontFamily: 'Poppins',
  fontSize: 24, fontWeight: 700, letterSpacing: 6, fill: '#e8b34b',
  x: 32, y: anim([at, at + 16], [y + 18, y]), opacity: fade(at, at + 12),
  shadow: { color: 'rgba(0,0,0,0.7)', blur: 12, offsetY: 2 },
});

/** Kinetic title: lines rise AND settle scale with staggered delays. */
const ktitle = (id, lines, o = {}) => {
  const size = o.size ?? 64;
  const x = o.x ?? 32;
  const y0 = o.y ?? 560;
  const step = Math.round(size * 1.08);
  const center = o.center ?? false;
  const align = center ? { textAlign: 'center', maxWidth: W, x: 0 } : { x };
  return lines.flatMap((ln, i) => {
    const at = (o.at ?? 6) + i * 9;
    return [{
      id: `${id}-l${i}`, type: 'text', text: ln.text, fontFamily: 'Inter',
      fontSize: size, fontWeight: 800, fill: ln.fill, lineHeight: 1.04,
      ...align, y: anim([at, at + 20], [y0 + i * step + 34, y0 + i * step]),
      opacity: fade(at, at + 14),
      scaleX: anim([at, at + 22], [1.07, 1]),
      scaleY: anim([at, at + 22], [1.07, 1]),
      anchorX: center ? 270 : 60, anchorY: 20,
      shadow: ln.glow
        ? { color: ln.glow, blur: 44, offsetY: 5 }
        : { color: 'rgba(0,0,0,0.78)', blur: 26, offsetY: 5 },
    }];
  });
};

const sub = (id, text, y, at = 16, center = false) => ({
  id, type: 'text', text, fontFamily: 'Inter', fontSize: 26,
  fontWeight: 500, fill: 'rgba(240,244,252,0.94)', lineHeight: 1.4,
  ...(center ? { textAlign: 'center', maxWidth: W, x: 0 } : { x: 32, maxWidth: 460 }),
  y, opacity: fade(at, at + 12),
  shadow: { color: 'rgba(0,0,0,0.7)', blur: 12, offsetY: 2 },
});

/** Giant outlined numeral, cropped by the right edge on purpose. */
const numeral = (id, n, at = 8) => ({
  id, type: 'text', text: n, fontFamily: 'Poppins', fontSize: 300,
  fontWeight: 700, fill: 'rgba(255,255,255,0.07)', lineHeight: 1,
  stroke: 'rgba(255,255,255,0.28)', strokeWidth: 2,
  x: 232, y: 120, opacity: fade(at, at + 16),
});

/** Cool/warm tint veil: per-act grade without pixel loops. */
const tint = (id, color, o = 0.14) => ({
  id, type: 'rect', width: W, height: H, x: 0, y: 0,
  fill: color, opacity: o, blendMode: 'overlay',
});

export function buildVrindavan2(measure) {
  void measure;
  const acts = {};

  // ---- ACT 1 (60f): sign, giant staggered name, no pill, no badge
  acts.a1 = {
    id: 'act1', type: 'container', children: [
      footage('a1-v', CLIP_SIGN, DURS[0]),
      tint('a1-tint', '#3a5a9a', 0.12),
      overline('a1-ol', 'WEDDINGS • EVENTS • FEASTS'),
      ...ktitle('a1', [
        { text: 'VRINDAVAN', fill: '#ffffff' },
        { text: 'LAWNS', fill: '#e8b34b', glow: 'rgba(232,179,75,0.45)' },
      ], { size: 76, y: 200 }),
      sub('a1-sub', 'grand lawns, grand feasts', 372),
    ],
  };

  // ---- ACT 2 (100f): buffet, slide in, lower third + numeral + icon strip
  acts.a2 = {
    id: 'act2', type: 'container', children: [
      footage('a2-v', CLIP_BUFFET, DURS[1], 1.07, 1),
      numeral('a2-num', '02'),
      overline('a2-ol', 'THE GRAND HALL', 470),
      ...ktitle('a2', [
        { text: 'A feast, staged', fill: '#ffffff' },
      ], { size: 60, y: 520 }),
      sub('a2-sub', 'live counters & long spreads', 610),
      ...['cloche', 'chef', 'cocktail'].map((icon, i) => ({
        id: `a2-ic${i}`, type: 'image', src: `ic-${icon}`,
        width: 72, height: 72, fit: 'contain',
        x: 300 + i * 76, y: 800,
        opacity: fade(30 + i * 6, 42 + i * 6),
        shadow: { color: 'rgba(0,0,0,0.6)', blur: 16, offsetY: 4 },
      })),
    ],
  };

  // ---- ACT 3 (90f): tables, dissolve, poster frame
  acts.a3 = {
    id: 'act3', type: 'container', children: [
      footage('a3-v', CLIP_TABLES, DURS[2]),
      tint('a3-tint', '#0a2540', 0.18),
      {
        id: 'a3-frame', type: 'rrect', width: 476, height: 400, radius: 4,
        fill: 'rgba(0,0,0,0)', stroke: '#f3d9a0', strokeWidth: 2,
        x: 32, y: 290, opacity: fade(6, 20),
      },
      ...ktitle('a3', [
        { text: 'Your table', fill: '#ffffff' },
        { text: 'waits', fill: '#4ade80', glow: 'rgba(74,222,128,0.4)' },
      ], { size: 58, center: true, y: 340 }),
      sub('a3-sub', 'crisp linen & soft light', 500, 22, true),
    ],
  };

  // ---- ACT 4 (80f): entrance, slide, tilted ticket stub
  acts.a4 = {
    id: 'act4', type: 'container', children: [
      footage('a4-v', CLIP_ENTRY, DURS[3], 1.07, 1),
      {
        id: 'a4-tick', type: 'rrect', width: 430, height: 230, radius: 10,
        fill: '#f2fbf4', x: 55, y: 590, rotation: -4,
        anchorX: 215, anchorY: 115,
        opacity: fade(8, 20),
        shadow: { color: 'rgba(0,0,0,0.55)', blur: 34, offsetY: 8 },
        children: [
          {
            id: 'a4-tick-t', type: 'text', text: 'ARRIVE GRAND', fontFamily: 'Poppins',
            fontSize: 34, fontWeight: 700, letterSpacing: 3, fill: '#0b1020',
            x: 30, y: 44,
          },
          {
            id: 'a4-tick-s', type: 'text', text: 'drapes, flowers & fanfare', fontFamily: 'Inter',
            fontSize: 24, fontWeight: 500, fill: 'rgba(11,16,32,0.75)',
            x: 30, y: 110,
          },
          {
            id: 'a4-tick-r', type: 'rect', width: 120, height: 8, x: 30, y: 160,
            fill: { kind: 'linear', angle: 90, stops: [{ offset: 0, color: '#e8b34b' }, { offset: 1, color: '#4ade80' }] },
          },
        ],
      },
      overline('a4-ol', 'ACT FOUR', 120),
    ],
  };

  // ---- ACT 5 (120f): statues, zoom-blur, full takeover
  acts.a5 = {
    id: 'act5', type: 'container', children: [
      footage('a5-v', CLIP_GODS, DURS[4]),
      {
        id: 'a5-veil', type: 'rect', width: W, height: H, x: 0,
        y: anim([0, 26], [960, 120]),
        fill: 'rgba(5,7,16,0.88)', opacity: anim([0, 26], [0, 1]),
      },
      overline('a5-ol', 'VRINDAVAN LAWNS', 220, 30),
      ...ktitle('a5', [
        { text: 'Book your', fill: '#ffffff' },
        { text: 'date', fill: '#e8b34b', glow: 'rgba(232,179,75,0.45)' },
      ], { size: 72, center: true, y: 300, at: 30 }),
      {
        id: 'a5-pill', type: 'rrect', width: 360, height: 72, radius: 36,
        fill: { kind: 'linear', angle: 90, stops: [{ offset: 0, color: '#e8b34b' }, { offset: 1, color: '#ffffff' }] },
        x: 90, y: 560,
        opacity: fade(52, 64),
        scaleX: { binding: 'spring', from: 0.7, to: 1 },
        scaleY: { binding: 'spring', from: 0.7, to: 1 },
        anchorX: 180, anchorY: 36,
        children: [{
          id: 'a5-pill-t', type: 'text', text: 'BOOK YOUR DATE', fontFamily: 'Inter',
          fontSize: 26, fontWeight: 800, letterSpacing: 2, fill: '#0b1020',
          textAlign: 'center', maxWidth: 360, x: 1, y: 26,
        }],
      },
      sub('a5-sub', 'the lawns are waiting', 660, 60, true),
    ],
  };

  // ---- timeline: montage cuts with real A/B transitions
  const T = [
    { type: 'slide', params: { direction: 'left' } },
    { type: 'dissolve', params: {} },
    { type: 'slide', params: { direction: 'left' } },
    { type: 'zoom-blur', params: {} },
  ];
  const children = [seq(0, DURS[0] - 8, [leaf('act1')])];
  let total = 0;
  for (const d of DURS) total += d;
  for (let k = 1; k < 5; k += 1) {
    const from = B[k] + 4;
    const dur = k === 4 ? total - from : DURS[k] - 12;
    children.push({
      kind: 'sequence', from, durationInFrames: dur,
      trimBefore: 12, children: [leaf(`act${k + 1}`)],
    });
  }
  const tdefs = [0, 1, 2, 3].map((k) => ({
    kind: 'transition', from: B[k + 1] - 8, durationInFrames: 12,
    type: T[k].type, params: T[k].params,
    a: `act${k + 1}`, b: `act${k + 2}`,
    aFreeze: k === 0 ? DURS[0] - 9 : DURS[k] - 1, easing: 'ease-in-out',
  }));
  for (const t of tdefs) children.push(t);
  children.push(seq(0, total, [leaf('chrome')]));

  return {
    composition: {
      id: 'vrindavan2-15s', width: W, height: H, fps: FPS, durationInFrames: total,
      root: {
        id: 'root', type: 'container',
        children: [
          acts.a1, acts.a2, acts.a3, acts.a4, acts.a5,
          {
            id: 'chrome', type: 'container',
            children: [
              {
                id: 'prog-fill', type: 'rect', width: W, height: 6, x: 0, y: H - 6,
                fill: { kind: 'linear', angle: 90, stops: [{ offset: 0, color: '#e8b34b' }, { offset: 1, color: '#ffffff' }] },
                scaleX: anim([0, total - 1], [0, 1]),
                anchorX: 0, anchorY: 0,
              },
            ],
          },
        ],
      },
    },
    timeline: seq(0, total, children),
  };
}
