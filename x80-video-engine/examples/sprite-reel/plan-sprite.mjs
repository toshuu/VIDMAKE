/**
 * THE SPRITE PARADE — 5-act pixel story reel, 15s 540x960.
 * Hand-authored for the supplied 5x5 sprite sheet (wizard, girl, bird,
 * pirate, robot x 5 frames each). Flipbook animation: stacked frames with
 * looping opacity pulses inside moving containers. 3x art at 1:1 (fit none)
 * for heroes, 2x for the finale lineup.
 */
export const W = 540;
export const H = 960;
export const FPS = 30;
export const DUR = 450;
export const ACT = 90;

const anim = (inputRange, outputRange) => ({
  binding: 'interpolate',
  inputRange,
  outputRange,
  options: { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
});
export { anim };
const fade = (a, b, dir = 1) => (dir > 0 ? anim([a, b], [0, 1]) : anim([a, b], [1, 0]));
export { fade };
export const leaf = (ref) => ({ kind: 'leaf', ref });
export const seq = (from, durationInFrames, children) => ({
  kind: 'sequence', from, durationInFrames, children,
});

// Sprite intrinsic boxes (normalized, bottom-aligned): [w3,h3,w2,h2]
export const BOX = {
  wizard: [276, 438, 184, 292],
  girl: [276, 366, 184, 244],
  bird: [312, 303, 208, 202],
  pirate: [285, 384, 190, 256],
  robot: [267, 423, 178, 282],
};
const src = (name, f, scale) => `spr${scale}-${name}-${f}`;

/**
 * Flipbook: stacked frames, each visible in looping windows.
 * order: frame indices in play order; rate: frames per sprite-frame;
 * dur: local duration; at: start offset. Half-frame ramps = crisp flips.
 */
export const flip = (id, name, scale, o = {}) => {
  const dur = o.dur ?? ACT;
  const rate = o.rate ?? 6;
  const order = o.order ?? [0, 1, 2, 3, 4];
  const at = o.at ?? 0;
  const hold = o.hold ?? false; // one-shot: play once, last frame holds
  // o.box overrides the intrinsic box (other casts, e.g. the knight).
  // o.srcPrefix overrides the asset id scheme (default spr{scale}-).
  const [w3, h3, w2, h2] = BOX[name] ?? [0, 0, 0, 0];
  const s = o.box ?? (scale === 2 ? [w2, h2] : [w3, h3]);
  const mkSrc = (f) => (o.src !== undefined ? o.src : (o.srcPrefix !== undefined ? `${o.srcPrefix}-${name}-${f}` : src(name, f, scale)));
  return order.map((f, i) => {
    // Strictly-increasing keys (engine requirement): merge on collision.
    const ins = [];
    const outs = [];
    const push = (k, v) => {
      const last = ins.length - 1;
      if (last >= 0 && k <= ins[last]) {
        outs[last] = Math.max(outs[last], v);
        return;
      }
      ins.push(k);
      outs.push(v);
    };
    push(0, 0);
    const cycles = hold ? 1 : Infinity;
    for (let k = 0; k * order.length * rate + at < dur && k < cycles; k += 1) {
      const a = at + k * order.length * rate + i * rate;
      const lastSlot = hold && i === order.length - 1;
      const b = lastSlot ? dur - 1 : Math.min(a + rate, dur - 1);
      if (a >= dur - 1) break;
      // Overlapping flips: ramps straddle window edges so neighbors
      // crossfade (sum ~1) — no black single-frame dips on boundaries.
      // (Same-node windows sit a full cycle apart; only clamps can merge.)
      push(Math.max(a - 0.5, 0), 0);
      push(a, 1);
      push(b, 1);
      push(Math.min(b + 0.5, dur - 1), 0);
    }
    const li = ins.length - 1;
    if (ins[li] >= dur - 1) outs[li] = 0;
    else push(dur - 1, 0);
    return {
      id: `${id}-s${i}`, type: 'image', src: mkSrc(f),
      width: s[0], height: s[1], fit: 'none', x: 0, y: 0,
      opacity: anim(ins, outs),
    };
  });
};

/** Static pose (single frame). */
export const pose = (id, name, f, scale, o = {}) => {
  const [w3, h3, w2, h2] = BOX[name] ?? [0, 0, 0, 0];
  const s = o.box ?? (scale === 2 ? [w2, h2] : [w3, h3]);
  const psrc = o.src !== undefined ? o.src : (o.srcPrefix !== undefined ? `${o.srcPrefix}-${name}-${f}` : src(name, f, scale));
  return {
    id, type: 'image', src: psrc,
    width: s[0], height: s[1], fit: 'none', x: 0, y: 0,
    opacity: o.opacity ?? fade(...(o.fadeIn ?? [0, 8])),
  };
};

const NIGHT_TOP = '#0b1026';
const NIGHT_MID = '#241647';
const CREAM = '#f3d9a0';
const INK = '#f2f4fa';

export const sky = (id) => ([
  {
    id: `${id}-bg`, type: 'rect', width: W, height: H,
    fill: {
      kind: 'linear', angle: 180,
      stops: [
        { offset: 0, color: NIGHT_TOP },
        { offset: 0.62, color: NIGHT_MID },
        { offset: 1, color: '#0a0d1a' },
      ],
    },
  },
  {
    id: `${id}-moon`, type: 'circle', radius: 48, x: 404, y: 72,
    fill: '#f4ecd4', opacity: fade(4, 16),
  },
  {
    id: `${id}-moonglow`, type: 'circle', radius: 78, x: 374, y: 42,
    opacity: 0.5, blendMode: 'screen',
    fill: { kind: 'radial', stops: [{ offset: 0, color: '#f4ecd4' }, { offset: 1, color: 'rgba(0,0,0,0)' }] },
  },
]);

const STARS = [
  [40, 60], [120, 140], [200, 80], [300, 120], [360, 60], [500, 220],
  [60, 300], [160, 380], [260, 300], [420, 330], [500, 420], [90, 470],
  [230, 470], [330, 430], [470, 500],
];
export const stars = (id, at = 6) => STARS.map(([x, y], i) => ({
  id: `${id}-st${i}`, type: 'rect', width: i % 3 === 0 ? 3 : 2, height: i % 3 === 0 ? 3 : 2,
  x, y, fill: '#ffffff', opacity: anim([0, 1], [0, 0.35 + (i % 4) * 0.15]),
}));

export const ground = (id, gy = 790) => ([
  { id: `${id}-gnd`, type: 'rect', width: W, height: H - gy, x: 0, y: gy, fill: '#0d1f14' },
  { id: `${id}-gln`, type: 'rect', width: W, height: 2, x: 0, y: gy, fill: '#3f6b4f' },
  ...[40, 150, 300, 430].map((x, i) => ({
    id: `${id}-tuft${i}`, type: 'rect', width: 14, height: 4, x, y: gy - 6 - (i % 2) * 4,
    fill: '#2c4f38',
  })),
]);

/**
 * Measure fn: (text, size, weight, ls, family) => px width. Render scripts
 * pass a Skia-backed one; without it kickers fall back to estimates.
 * Pills ALWAYS size from measured ink (dept rule #4) minus the trailing
 * letterSpacing the canvas adds after the last glyph (dept rule #2).
 */
export const kickMeasure = (measure, label, size = 14, ls = 2) => {
  const tw = measure !== undefined && measure !== null
    ? measure(label, size, 700, ls, 'Poppins')
    : label.length * (size * 0.66 + ls);
  return Math.ceil(16 + 8 + 6 + tw - ls + 16);
};

export const kicker = (id, label, o = {}) => {
  const y = o.y ?? 84;
  const w = kickMeasure(o.measure, label);
  const x = o.x ?? 32;
  return {
    id, type: 'rrect', width: w, height: 34, radius: 17,
    fill: '#10141f', stroke: 'rgba(255,255,255,0.16)', strokeWidth: 1,
    x, y, opacity: fade(4, 14),
    children: [
      { id: `${id}-dot`, type: 'circle', radius: 4, x: 16, y: 13, fill: '#4ade80' },
      {
        id: `${id}-t`, type: 'text', text: label, fontFamily: 'Poppins',
        fontSize: 14, fontWeight: 700, letterSpacing: 2, fill: CREAM,
        x: 30, y: 9,
      },
    ],
  };
};

export const title = (id, l1, l2, sub, o = {}) => {
  const size = o.size ?? 46;
  const maxW = o.maxW ?? 420;
  const step = Math.round(size * 1.05);
  return [
  {
    id: `${id}-t1`, type: 'text', text: l1, fontFamily: 'Inter', fontSize: size,
    fontWeight: 800, fill: '#ffffff', lineHeight: 1.05, x: 32, maxWidth: maxW,
    y: anim([6, 24], [158, 132]), opacity: fade(6, 22),
    shadow: { color: 'rgba(0,0,0,0.75)', blur: 25, offsetY: 5 },
  },
  ...(l2 !== '' ? [{
    id: `${id}-t2`, type: 'text', text: l2, fontFamily: 'Inter', fontSize: size,
    fontWeight: 800, fill: '#4ade80', lineHeight: 1.05, x: 32, maxWidth: maxW,
    y: anim([12, 30], [158 + step, 132 + step]), opacity: fade(12, 26),
    shadow: { color: 'rgba(74,222,128,0.4)', blur: 40, offsetY: 5 },
  }] : []),
  {
    id: `${id}-sub`, type: 'text', text: sub, fontFamily: 'Inter', fontSize: 19,
    fontWeight: 500, fill: 'rgba(240,244,252,0.94)', lineHeight: 1.4,
    x: 32, maxWidth: maxW, y: o.subY ?? 252, opacity: fade(16, 28),
    shadow: { color: 'rgba(0,0,0,0.7)', blur: 12, offsetY: 2 },
  },
];};

/** Lower-third title treatment: for acts whose subject fills the frame
 *  (tables, crowds). Same voice, different placement — never the same
 *  stack five times running (dept variety rule). */
export const titleLow = (id, l1, l2, sub) => ([
  {
    id: `${id}-t1`, type: 'text', text: l1, fontFamily: 'Inter', fontSize: 54,
    fontWeight: 800, fill: '#ffffff', lineHeight: 1.02, x: 32, maxWidth: 476,
    y: anim([6, 24], [614, 588]), opacity: fade(6, 22),
    shadow: { color: 'rgba(0,0,0,0.8)', blur: 25, offsetY: 5 },
  },
  ...(l2 !== '' ? [{
    id: `${id}-t2`, type: 'text', text: l2, fontFamily: 'Inter', fontSize: 54,
    fontWeight: 800, fill: '#4ade80', lineHeight: 1.02, x: 32, maxWidth: 476,
    y: anim([12, 30], [672, 646]), opacity: fade(12, 26),
    shadow: { color: 'rgba(74,222,128,0.4)', blur: 40, offsetY: 5 },
  }] : []),
  {
    id: `${id}-sub`, type: 'text', text: sub, fontFamily: 'Inter', fontSize: 19,
    fontWeight: 500, fill: 'rgba(240,244,252,0.94)', lineHeight: 1.4,
    x: 32, maxWidth: 476, y: 716, opacity: fade(16, 28),
    shadow: { color: 'rgba(0,0,0,0.75)', blur: 12, offsetY: 2 },
  },
]);

export const badge = (actId, n) => ({
  id: `${actId}-badge`, type: 'rrect', width: 72, height: 30, radius: 15,
  fill: 'rgba(0,0,0,0.45)', x: 436, y: 28, opacity: fade(0, 8),
  children: [{
    id: `${actId}-badge-t`, type: 'text', text: `${n} / 5`, fontFamily: 'Inter',
    fontSize: 13, fontWeight: 700, fill: 'rgba(255,255,255,0.9)',
    textAlign: 'center', maxWidth: 72, x: 0, y: 10,
  }],
});

/** Icon chip: cream disc + contained icon + hairline ring. */
export const chip = (id, icon, cx, cy, r = 62, at = 20, srcP = 'ic') => ([
  {
    id, type: 'circle', radius: r, x: cx - r, y: cy - r,
    fill: '#f2fbf4', stroke: 'rgba(255,255,255,0.5)', strokeWidth: 2,
    opacity: fade(at, at + 12),
    scaleX: anim([at, at + 14], [0.7, 1]),
    scaleY: anim([at, at + 14], [0.7, 1]),
    anchorX: r, anchorY: r,
    shadow: { color: 'rgba(0,0,0,0.5)', blur: 30, offsetY: 6 },
  },
  {
    id: `${id}-ic`, type: 'image', src: `${srcP}-${icon}`,
    width: r * 2 - 44, height: r * 2 - 44, fit: 'contain',
    x: cx - (r - 22), y: cy - (r - 22),
    opacity: fade(at + 4, at + 16),
  },
]);

/** Icon trio: three small discs for spec-heavy acts. Staggered entrances. */
export const chipRow = (id, icons, cx, cy, r = 40, at = 20, srcP = 'ic') => icons.flatMap((icon, i) => chip(
  `${id}-${i}`, icon, cx + (i - 1) * (r * 2 + 14), cy, r, at + i * 5, srcP,
));

const GY = 790; // ground line: every foot plants here
const gy2 = (h) => GY - h; // sprite-box top for 2x heights
const gy3 = (h) => GY - h;

export function buildSpriteParade(measure) {
  const acts = {};
  // ---- ACT 1: Pip runs in (wizard 3x run cycle, enters left, stops center-left)
  acts.a1 = {
    id: 'act1', type: 'container', children: [
      ...sky('a1'), ...stars('a1'), ...ground('a1'),
      {
        id: 'a1-pip', type: 'container',
        x: anim([0, 62, 89], [-280, 132, 132], ),
        y: gy3(438), opacity: fade(0, 6),
        children: flip('a1-pip', 'wizard', 3, { rate: 6 }),
      },
      kicker('a1-kick', 'ACT ONE • PIP', { measure }),
      ...title('a1', 'Pip runs in', '', 'late for the parade'),
      badge('act1', 1),
    ],
  };
  // ---- ACT 2: Mia twirls in (girl 3x dance center; Pip 2x watches left)
  acts.a2 = {
    id: 'act2', type: 'container', children: [
      ...sky('a2'), ...stars('a2'), ...ground('a2'),
      {
        id: 'a2-pip', type: 'container', x: 24, y: gy2(292), opacity: fade(0, 8),
        children: [pose('a2-pip-p', 'wizard', 3, 2)],
      },
      {
        id: 'a2-mia', type: 'container', x: 232, y: gy3(366), opacity: fade(6, 16),
        children: flip('a2-mia', 'girl', 3, { rate: 8, order: [0, 1, 2, 3, 4, 3, 2, 1] }),
      },
      kicker('a2-kick', 'ACT TWO • MIA', { measure }),
      ...title('a2', 'Mia twirls in', '', 'she dances ahead'),
      badge('act2', 2),
    ],
  };
  // ---- ACT 3: Sky brings news (bird 3x flies across; both watch)
  acts.a3 = {
    id: 'act3', type: 'container', children: [
      ...sky('a3'), ...stars('a3'), ...ground('a3'),
      {
        id: 'a3-pip', type: 'container', x: 40, y: gy2(292), opacity: fade(0, 8),
        children: [pose('a3-pip-p', 'wizard', 3, 2)],
      },
      {
        id: 'a3-mia', type: 'container', x: 316, y: gy2(244), opacity: fade(0, 8),
        children: [pose('a3-mia-p', 'girl', 0, 2)],
      },
      {
        id: 'a3-sky', type: 'container',
        x: anim([0, 89], [-320, 620], ),
        y: anim([0, 22, 45, 67, 89], [420, 340, 380, 320, 360]),
        opacity: fade(0, 6),
        children: flip('a3-sky', 'bird', 3, { rate: 5 }),
      },
      kicker('a3-kick', 'ACT THREE • SKY', { measure }),
      ...title('a3', 'Sky brings news', '', 'the parade is starting'),
      badge('act3', 3),
    ],
  };
  // ---- ACT 4: Patch blocks the path (pirate 3x drops in; jump frames mid-fall)
  acts.a4 = {
    id: 'act4', type: 'container', children: [
      ...sky('a4'), ...stars('a4'), ...ground('a4'),
      {
        id: 'a4-pip', type: 'container', x: 16, y: gy2(292), opacity: fade(0, 8),
        children: [pose('a4-pip-p', 'wizard', 3, 2)],
      },
      {
        id: 'a4-mia', type: 'container', x: 340, y: gy2(244), opacity: fade(0, 8),
        children: [pose('a4-mia-p', 'girl', 0, 2)],
      },
      {
        id: 'a4-pat', type: 'container', x: 128,
        y: anim([0, 26, 34, 89], [-390, 406, 398, 398]),
        opacity: fade(0, 4),
        children: [
          ...flip('a4-pat', 'pirate', 3, {
            rate: 6, at: 0, dur: 34, order: [1, 2, 1, 2],
          }),
          ...flip('a4-pat2', 'pirate', 3, {
            rate: 14, at: 34, dur: ACT, order: [3, 4, 3, 4],
          }),
        ],
      },
      kicker('a4-kick', 'ACT FOUR • PATCH', { measure }),
      ...title('a4', 'Patch blocks', 'the path', 'toll: one dance'),
      badge('act4', 4),
    ],
  };
  // ---- ACT 5: Bolt marches in, full lineup (2x ground row + bird victory lap)
  const line = [
    ['wizard', 3, 24, 498], ['girl', 0, 128, 546],
    ['pirate', 4, 232, 534], ['robot', 0, 336, 508],
  ];
  acts.a5 = {
    id: 'act5', type: 'container', children: [
      ...sky('a5'), ...stars('a5'), ...ground('a5'),
      {
        id: 'a5-sky', type: 'container',
        x: anim([0, 45, 89], [-220, 200, 420]),
        y: anim([0, 45, 89], [420, 360, 420]),
        opacity: fade(0, 8),
        children: flip('a5-sky', 'bird', 2, { rate: 5 }),
      },
      ...line.slice(0, 3).map(([name, f, x, y], i) => ({
        id: `a5-m${i}`, type: 'container', x, y, opacity: fade(4 + i * 4, 16 + i * 4),
        children: [pose(`a5-m${i}-p`, name, f, 2)],
      })),
      {
        id: 'a5-bolt', type: 'container',
        x: anim([0, 45, 89], [620, 336, 336]),
        y: 508, opacity: fade(0, 6),
        children: [
          ...flip('a5-bolt', 'robot', 2, { rate: 6, at: 0, dur: 48 }),
          pose('a5-bolt-p', 'robot', 0, 2, { fadeIn: [44, 54] }),
        ],
      },
      kicker('a5-kick', 'FINALE • BOLT', { measure }),
      ...title('a5', 'Bolt joins in', '', 'the sprite parade begins'),
      {
        id: 'a5-end', type: 'rrect', width: 190, height: 54, radius: 27,
        fill: '#f2fbf4', x: Math.round((W - 190) / 2), y: 836,
        opacity: fade(52, 64),
        scaleX: anim([52, 66], [0.8, 1]),
        scaleY: anim([52, 66], [0.8, 1]),
        anchorX: 95, anchorY: 27,
        children: [{
          id: 'a5-end-t', type: 'text', text: 'THE END', fontFamily: 'Inter',
          fontSize: 22, fontWeight: 800, letterSpacing: 3, fill: '#0b1020',
          textAlign: 'center', maxWidth: 190, x: 1.5, y: 20,
        }],
      },
      badge('act5', 5),
    ],
  };

  return {
    composition: {
      id: 'sprite-parade-15s', width: W, height: H, fps: FPS, durationInFrames: DUR,
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
