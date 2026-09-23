/**
 * Feather Audio AI promo reel — 15s, 540x960 @30fps = 450 frames.
 * Pure motion-graphics reel (no photos): keyed gold logo, waveform,
 * orbit, marquee, glass — plus real act transitions (slide/dissolve/
 * zoom-blur). Planning Department rules apply (see ../../planning-dept.md).
 *
 *   Act 1 (0-81)    HOOK — orbit logo + "The fastest voice AI"
 *   TR 82-93       slide → Act 2
 *   Act 2 (94-171)  ENGINE — waveform + "World's most efficient engine"
 *   TR 172-183     dissolve → Act 3
 *   Act 3 (184-261) HINDI/ENGLISH — namaste display + glass stats
 *   TR 262-273     slide → Act 4
 *   Act 4 (274-351) LANGUAGES — "25 more coming" + marquee band
 *   TR 352-363     zoom-blur → Act 5
 *   Act 5 (364-449) FINALE — logo + "Launching globally soon" + pill
 *
 * Act seqs use trimBefore:12 so B's local timeline continues seamlessly
 * through each 12f transition (montage-style non-overlap, no double-draw).
 */
import {
  W, H, leaf, seq, anim, fade,
  scrimBottom, grain, centerX, glow, rule,
  centerY, trailingFix, dotKicker, glassCard, ticker, sharedFly,
} from '../kit/kit.mjs';
import { Easing } from '../../packages/core/dist/index.js';
import { bakeMorph } from '../../packages/core/dist/index.js';

export const FONT = 'Feather Inter';
export const DISP = 'Feather Poppins';
export const HINDI = 'Feather Hindi';
export const GRAIN = 'grain-tile';

export const IMG_LOGO = 'img-logo';
export const SVG_MIC = 'svg-mic';
export const SVG_ZAP = 'svg-zap';
export const SVG_GLOBE = 'svg-globe';

export const DUR = 900;
const ACT = 180;

const NAVY = '#07080f';
const GOLD = '#e8b34b';
const GOLD_PALE = '#f3d9a0';
const BLUE = '#4aa8ff';
const INK = '#ffffff';
const DIM = 'rgba(240,244,252,0.94)';
const DARK = '#0b1020';

const GRAD_GOLD = {
  kind: 'linear', angle: 90,
  stops: [
    { offset: 0, color: '#8a6a2a' },
    { offset: 1, color: GOLD_PALE },
  ],
};
const GRAD_BAR = {
  kind: 'linear', angle: 180,
  stops: [
    { offset: 0, color: GOLD },
    { offset: 1, color: BLUE },
  ],
};

const LY = { kicker: 548, hero: 596, sub: 720, cards: 776 };

const kick = (id, label, measure, x = 32) =>
  dotKicker(id, label, {
    x, y: LY.kicker, font: DISP, measure, fallbackW: 240,
    capK: 0.57, dotFill: GOLD, bg: '#10141f',
    fg: GOLD_PALE,
  });

const heroTitle = (id, line1, line2, accent, size, glowColor) => {
  const step = Math.round(size * 1.05);
  const y1 = LY.hero;
  const shadow = (color, blur) => ({ color, blur, offsetY: 5 });
  return [
    {
      id: `${id}-l1`, type: 'text', text: line1, fontFamily: FONT,
      fontSize: size, fontWeight: 800, fill: INK, lineHeight: 1.05,
      x: 32, y: anim([6, 24], [y1 + 26, y1]), opacity: fade(6, 22),
      shadow: shadow('rgba(0,0,0,0.75)', 25),
    },
    {
      id: `${id}-l2`, type: 'text', text: line2, fontFamily: FONT,
      fontSize: size, fontWeight: 800, fill: accent, lineHeight: 1.05,
      x: 32, y: anim([12, 30], [y1 + step + 26, y1 + step]), opacity: fade(12, 26),
      shadow: shadow(glowColor, 40),
    },
  ];
};

const sub = (id, text, y = LY.sub, at = 16) => ({
  id, type: 'text', text, fontFamily: FONT, fontSize: 19, fontWeight: 500,
  fill: DIM, lineHeight: 1.4, x: 32, y, maxWidth: 476,
  opacity: fade(at, at + 12),
  shadow: { color: 'rgba(0,0,0,0.7)', blur: 12, offsetY: 2 },
});

const statCard = (id, x, value, label, accent, at) =>
  glassCard(id, {
    x, y: LY.cards, w: 232, h: 96, opacity: fade(at, at + 12),
    children: [
      {
        id: `${id}-v`, type: 'text', text: value, fontFamily: DISP,
        fontSize: 30, fontWeight: 700, fill: accent,
        textAlign: 'center', maxWidth: 232, x: 0, y: 20,
      },
      {
        id: `${id}-l`, type: 'text', text: label, fontFamily: FONT,
        fontSize: 12, fontWeight: 600, letterSpacing: 1, fill: 'rgba(255,255,255,0.88)',
        textAlign: 'center', maxWidth: 232, x: trailingFix(1), y: 64,
      },
    ],
  });

const grainNode = (id, localDur) =>
  grain(id, GRAIN, {
    opacity: 0.08,
    drift: [[0, localDur - 1], [-40, -100], [-30, -90]],
  });

const BADGE = { w: 72, h: 30, size: 13, y: 10 };
const actBadge = (id, n) => ({
  id, type: 'rrect', width: BADGE.w, height: BADGE.h, radius: BADGE.h / 2,
  fill: 'rgba(0,0,0,0.45)', x: 436, y: 28, opacity: fade(0, 8),
  children: [{
    id: `${id}-t`, type: 'text', text: `${n} / 5`, fontFamily: FONT,
    fontSize: BADGE.size, fontWeight: 700, fill: 'rgba(255,255,255,0.9)',
    textAlign: 'center', maxWidth: BADGE.w, x: 0, y: BADGE.y,
  }],
});

const bg = (id) => ({ id, type: 'rect', width: W, height: H, fill: NAVY });
const ambient = (id, color) =>
  glow(id, { cx: 270, cy: 420, size: 560, color, blur: 55, opacity: 1 });

// Waveform: N bars, phase-shifted sine keyframes, anchored to the base.
const P7 = [0.25, 0.5, 0.85, 1, 0.65, 0.4, 0.7];
const waveRange = [0, 30, 60, 90, 120, 150, 179];
const waveform = (id, n, w, h, yBase, x0, at = [6, 18]) =>
  Array.from({ length: n }, (_, i) => {
    const off = (i * 2) % P7.length;
    const out = P7.map((_, k) => P7[(off + k) % P7.length]);
    return {
      id: `${id}-b${i}`, type: 'rrect', width: w, height: h, radius: w / 2,
      fill: GRAD_BAR, x: Math.round(x0 + i * (w + 5)), y: yBase - h,
      anchorX: w / 2, anchorY: h,
      scaleX: 1, scaleY: anim(waveRange, out, Easing.linear),
      opacity: fade(at[0] + (i % 5), at[1] + (i % 5)),
    };
  });

const namePlate = (id, y, size = 24, ls = 8) => ({
  id, type: 'text', text: 'FEATHER AUDIO AI', fontFamily: DISP,
  fontSize: size, fontWeight: 700, letterSpacing: ls, fill: GOLD_PALE,
  textAlign: 'center', maxWidth: W, x: trailingFix(ls), y,
  opacity: fade(10, 24),
});

export function buildFeatherReel(measure) {
  // Morphing sound-wave: sine polyline, phase 0→π baked ping-pong (176f).
  const sineD = (phase) => {
    let d = '';
    for (let i = 0; i < 25; i += 1) {
      const x = 120 + i * 12.5;
      const y = Math.round((735 + 16 * Math.sin(phase + i * 0.55)) * 10) / 10;
      d += `${i === 0 ? 'M' : 'L'}${x} ${y}`;
    }
    return d;
  };
  const morphFwd = bakeMorph(sineD(0), sineD(Math.PI), 88);
  const morphFrames = [...morphFwd, ...morphFwd.slice().reverse()];
  // Shared-element fly: gold sound-chip streaks across cut 1 (172..183).
  const fly = sharedFly('fly-chip',
    {
      id: 'fly-chip-in', type: 'rrect', width: 56, height: 56, radius: 16,
      fill: GRAD_GOLD,
      children: [{
        id: 'fly-chip-ic', type: 'svg', svg: SVG_ZAP, width: 28, height: 28, x: 14, y: 14,
      }],
    },
    { x1: -80, y1: 470, x2: 560, y2: 430, s1: 0.7, s2: 1.1, from: 172, dur: 12 },
  );
  fly.scene.opacity = anim([0, 3, 8, 11], [0, 1, 1, 0]);
  const kickCentered = (id, label, y = LY.kicker) => {
    const node = dotKicker(id, label, {
      x: 0, y, font: DISP, measure, fallbackW: 300,
      capK: 0.57, dotFill: GOLD, bg: '#10141f', fg: GOLD_PALE,
    });
    node.x = centerX(node.width);
    return node;
  };
  return {
    composition: {
      id: 'feather-x80-30s', width: W, height: H, fps: 30, durationInFrames: DUR,
      root: {
        id: 'root', type: 'container',
        children: [
          // ACT 1 — hook: orbit logo + fastest claim (local 0..81)
          {
            id: 'act1', type: 'container',
            children: [
              bg('a1-bg'),
              ambient('a1-amb', 'rgba(232,179,75,0.22)'),
              kickCentered('a1-kick', 'GLOBAL LAUNCH SOON', 140),
              {
                id: 'a1-orbit', type: 'container', x: 150, y: 240,
                children: [
                  {
                    id: 'a1-ring', type: 'circle', radius: 120, x: 0, y: 0,
                    fill: 'rgba(0,0,0,0)', stroke: 'rgba(232,179,75,0.5)', strokeWidth: 2,
                    opacity: fade(4, 18),
                  },
                  // Satellite: explicit keyframed orbit (200° over the act).
                  {
                    id: 'a1-sat', type: 'circle', radius: 7,
                    x: anim([0, 30, 60, 90, 120, 150, 179], [106, 87, 37, -29, -87, -118, -113], Easing.linear),
                    y: anim([0, 30, 60, 90, 120, 150, 179], [-7, 56, 97, 104, 73, 15, -46], Easing.linear),
                    fill: GOLD, opacity: fade(10, 24),
                  },
                ],
              },
              {
                id: 'a1-halo', type: 'circle', radius: 130, x: 140, y: 230,
                opacity: 0.8, blendMode: 'screen',
                fill: { kind: 'radial', stops: [{ offset: 0, color: 'rgba(232,179,75,0.35)' }, { offset: 1, color: 'rgba(0,0,0,0)' }] },
              },
              {
                id: 'a1-logo', type: 'image', src: IMG_LOGO, width: 170, height: 170,
                fit: 'cover', x: 185, y: 275, anchorX: 85, anchorY: 85,
                scaleX: { binding: 'spring', from: 0.5, to: 1 },
                scaleY: { binding: 'spring', from: 0.5, to: 1 },
                opacity: fade(2, 14),
              },
              namePlate('a1-name', 500),
              {
                id: 'a1-h1', type: 'text', text: 'The fastest', fontFamily: FONT,
                fontSize: 58, fontWeight: 800, fill: INK, lineHeight: 1.05,
                x: 32, y: anim([6, 24], [586, 560]), opacity: fade(6, 22),
                shadow: { color: 'rgba(0,0,0,0.75)', blur: 25, offsetY: 5 },
              },
              {
                id: 'a1-h2', type: 'text', text: 'voice AI', fontFamily: FONT,
                fontSize: 58, fontWeight: 800, fill: GOLD, lineHeight: 1.05,
                x: 32, y: anim([12, 30], [647, 621]), opacity: fade(12, 26),
                shadow: { color: 'rgba(232,179,75,0.45)', blur: 40, offsetY: 5 },
              },
              sub('a1-sub', "World's most efficient engine.\nLaunching globally soon.", 700),
              ...waveform('a1-mini', 18, 10, 44, 834, 117),
              {
                id: 'a1-zap', type: 'svg', svg: SVG_ZAP, width: 30, height: 30,
                x: 446, y: 600, opacity: fade(30, 44),
              },
              actBadge('a1-badge', 1),
              grainNode('a1-grain', 173),
            ],
          },
          // ACT 2 — engine: waveform display + efficient claim (local 12..89)
          {
            id: 'act2', type: 'container',
            children: [
              bg('a2-bg'),
              ambient('a2-amb', 'rgba(74,168,255,0.20)'),
              kick('a2-kick', 'THE ENGINE', measure),
              ...waveform('a2-wave', 30, 12, 110, 400, 27),
              ...heroTitle('a2-hero', "World's most", 'efficient engine', GOLD, 46, 'rgba(232,179,75,0.45)'),
              sub('a2-sub', 'Realtime streaming. Zero lag.'),
              statCard('a2-s1', 32, '#1', 'MOST EFFICIENT', GOLD, 24),
              statCard('a2-s2', 276, 'ZERO', 'LAG', INK, 30),
              actBadge('a2-badge', 2),
              grainNode('a2-grain', 180),
            ],
          },
          // ACT 3 — hindi/english display (local 12..89)
          {
            id: 'act3', type: 'container',
            children: [
              bg('a3-bg'),
              ambient('a3-amb', 'rgba(232,179,75,0.20)'),
              kick('a3-kick', 'HINDI \u2022 ENGLISH', measure),
              {
                id: 'a3-mic', type: 'svg', svg: SVG_MIC, width: 64, height: 64,
                x: 238, y: 268, opacity: fade(8, 22),
              },
              {
                id: 'a3-namaste', type: 'text', text: '\u0928\u092E\u0938\u094D\u0924\u0947',
                fontFamily: HINDI, fontSize: 88, fontWeight: 700, fill: GOLD,
                lineHeight: 1.1, textAlign: 'center', maxWidth: W, x: 0, y: 348,
                opacity: fade(10, 26), stroke: '#7a5a1e', strokeWidth: 1,
                shadow: { color: 'rgba(232,179,75,0.4)', blur: 44, offsetY: 4 },
              },
              {
                id: 'a3-hello', type: 'text', text: 'Hello.', fontFamily: FONT,
                fontSize: 54, fontWeight: 800, fill: INK, lineHeight: 1.05,
                textAlign: 'center', maxWidth: W, x: 0,
                y: anim([16, 32], [486, 462]), opacity: fade(16, 30),
                stroke: '#0b1020', strokeWidth: 1,
                shadow: { color: 'rgba(0,0,0,0.75)', blur: 22, offsetY: 4 },
              },
              rule('a3-rule', { x: centerX(120), y: 586, w: 120, fill: GRAD_GOLD, grow: [34, 56], anchorX: 60 }),
              {
                id: 'a3-tag', type: 'text', text: 'Two mother tongues. Zero accent.',
                fontFamily: FONT, fontSize: 24, fontWeight: 500, fill: DIM,
                textAlign: 'center', maxWidth: W, x: 0, y: 612, opacity: fade(30, 44),
              },
              sub('a3-sub', 'The most natural Hindi and English.', 700),
              statCard('a3-s1', 32, '#1', 'HINDI', GOLD, 24),
              statCard('a3-s2', 276, '#1', 'ENGLISH', INK, 30),
              actBadge('a3-badge', 3),
              grainNode('a3-grain', 180),
            ],
          },
          // ACT 4 — 25 languages + marquee band (local 12..89)
          {
            id: 'act4', type: 'container',
            children: [
              bg('a4-bg'),
              ambient('a4-amb', 'rgba(162,89,255,0.22)'),
              {
                id: 'a4-big', type: 'text', text: '25+', fontFamily: DISP,
                fontSize: 150, fontWeight: 700, fill: GOLD, lineHeight: 1,
                textAlign: 'center', maxWidth: W, x: 0, y: 250,
                opacity: fade(8, 24),
                shadow: { color: 'rgba(232,179,75,0.4)', blur: 50, offsetY: 4 },
              },
              {
                id: 'a4-globe-big', type: 'svg', svg: SVG_GLOBE, width: 72, height: 72,
                x: 234, y: 420, opacity: fade(16, 30),
              },
              kick('a4-kick', '25+ MORE SOON', measure),
              ...heroTitle('a4-hero', '25 more', 'languages coming', GOLD, 52, 'rgba(232,179,75,0.45)'),
              sub('a4-sub', 'From Delhi to Berlin \u2014 one voice.'),
              ticker('a4-tick', 'ESPA\u00d1OL \u2022 FRAN\u00c7AIS \u2022 DEUTSCH \u2022 ITALIANO \u2022 PORTUGU\u00caS \u2022 POLSKI \u2022 T\u00dcRK\u00c7E \u2022 DUTCH \u2022 SWEDISH \u2022 HINDI \u2022 ENGLISH \u2022 ', {
                y: 786, font: DISP, span: [12, 179], fromX: 540, toX: -950,
              }),
              {
                id: 'a4-globe', type: 'svg', svg: SVG_GLOBE, width: 40, height: 40,
                x: 20, y: 794, opacity: fade(30, 44),
              },
              actBadge('a4-badge', 4),
              grainNode('a4-grain', 180),
            ],
          },
          // ACT 5 — finale (local 12..97)
          {
            id: 'act5', type: 'container',
            children: [
              bg('a5-bg'),
              ambient('a5-amb', 'rgba(232,179,75,0.24)'),
              kickCentered('a5-kick', 'HEAR THE FUTURE', 140),
              {
                id: 'a5-logo', type: 'image', src: IMG_LOGO, width: 140, height: 140,
                fit: 'cover', x: 200, y: 230, anchorX: 70, anchorY: 70,
                scaleX: { binding: 'spring', from: 0.5, to: 1, delay: 12 },
                scaleY: { binding: 'spring', from: 0.5, to: 1, delay: 12 },
                opacity: fade(12, 24),
              },
              namePlate('a5-name', 390, 22, 6),
              (() => {
                const tw = measure
                  ? measure.measure('globally soon', { fontFamily: FONT, fontSize: 52, fontWeight: 800 }).width
                  : 380;
                const w = Math.ceil(tw) + 24;
                return {
                  id: 'a5-mark', type: 'rrect', width: w, height: 46, radius: 8,
                  fill: 'rgba(232,179,75,0.30)', x: Math.round((W - w) / 2), y: 541,
                  scaleX: anim([58, 74], [0, 1]), anchorX: 0, anchorY: 0,
                  opacity: fade(58, 66),
                };
              })(),
              {
                id: 'a5-l1', type: 'text', text: 'Launching', fontFamily: FONT,
                fontSize: 52, fontWeight: 800, fill: INK, lineHeight: 1.05,
                textAlign: 'center', maxWidth: W, x: 0,
                y: anim([6, 24], [506, 480]), opacity: fade(6, 22),
                shadow: { color: 'rgba(0,0,0,0.75)', blur: 25, offsetY: 5 },
              },
              {
                id: 'a5-l2', type: 'text', text: 'globally soon', fontFamily: FONT,
                fontSize: 52, fontWeight: 800, fill: GOLD, lineHeight: 1.05,
                textAlign: 'center', maxWidth: W, x: 0,
                y: anim([12, 30], [561, 535]), opacity: fade(12, 26),
                shadow: { color: 'rgba(232,179,75,0.45)', blur: 40, offsetY: 5 },
              },
              {
                ...sub('a5-sub', "The world's most efficient voice engine.\n25 languages and counting.", 640, 16),
                x: 0, maxWidth: W, textAlign: 'center',
              },
              {
                id: 'a5-wave', type: 'path', d: morphFrames[0], frames: morphFrames,
                stroke: GOLD, strokeWidth: 3, opacity: fade(70, 84),
              },
              {
                id: 'a5-pill', type: 'rrect', width: 300, height: 54, radius: 27,
                fill: GRAD_GOLD,
                x: centerX(300), y: 790,
                opacity: fade(52, 64),
                scaleX: anim([52, 66], [0.8, 1]),
                scaleY: anim([52, 66], [0.8, 1]),
                anchorX: 150, anchorY: 27,
                children: [{
                  id: 'a5-pill-t', type: 'text', text: 'LAUNCHING SOON',
                  fontFamily: FONT, fontSize: 22, fontWeight: 800, letterSpacing: 3,
                  fill: DARK, textAlign: 'center', maxWidth: 300,
                  x: trailingFix(3), y: centerY(54, 22),
                }],
              },
              actBadge('a5-badge', 5),
              grainNode('a5-grain', 176),
            ],
          },
          fly.scene,
          // CHROME — always on top: gold bar + progress bar.
          {
            id: 'chrome', type: 'container',
            children: [
              { id: 'topbar', type: 'rect', width: W, height: 7, fill: GRAD_GOLD, x: 0, y: 0 },
              { id: 'prog-bg', type: 'rect', width: W, height: 8, fill: 'rgba(255,255,255,0.18)', x: 0, y: 952 },
              {
                id: 'prog-fill', type: 'rect', width: W, height: 8, x: 0, y: 952,
                fill: GRAD_GOLD,
                scaleX: anim([0, DUR - 1], [0, 1]),
                anchorX: 0, anchorY: 0,
              },
            ],
          },
        ],
      },
    },
    timeline: seq(0, DUR, [
      seq(0, 172, [leaf('act1')]),
      { kind: 'transition', from: 172, durationInFrames: 12, type: 'slide', params: { direction: 'left' }, a: 'act1', b: 'act2', aFreeze: 171, easing: 'ease-in-out' },
      { kind: 'sequence', from: 184, durationInFrames: 168, trimBefore: 12, children: [leaf('act2')] },
      { kind: 'transition', from: 352, durationInFrames: 12, type: 'dissolve', a: 'act2', b: 'act3', aFreeze: 179, easing: 'ease-in-out' },
      { kind: 'sequence', from: 364, durationInFrames: 168, trimBefore: 12, children: [leaf('act3')] },
      { kind: 'transition', from: 532, durationInFrames: 12, type: 'slide', params: { direction: 'left' }, a: 'act3', b: 'act4', aFreeze: 179, easing: 'ease-in-out' },
      { kind: 'sequence', from: 544, durationInFrames: 168, trimBefore: 12, children: [leaf('act4')] },
      { kind: 'transition', from: 712, durationInFrames: 12, type: 'zoom-blur', a: 'act4', b: 'act5', aFreeze: 179, easing: 'ease-in-out' },
      { kind: 'sequence', from: 724, durationInFrames: 176, trimBefore: 12, children: [leaf('act5')] },
      fly.timeline,
      seq(0, DUR, [leaf('chrome')]),
    ]),
  };
}
