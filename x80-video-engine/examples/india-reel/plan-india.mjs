/**
 * India development reel — 15s, 540x960 @30fps = 450 frames.
 * Built by the Planning Department (see ../../planning-dept.md):
 * dot kickers, Inter-800 heroes, glass stat cards, lifted bottom stack.
 *
 *   Act 1 (0-90)    HOOK — Gateway of India, "INDIA IS BUILDING FAST"
 *   Act 2 (90-180)  RAIL — "Vande Bharat in every corner"
 *   Act 3 (180-270) ROADS & SKY — highway -> airport crossfade
 *   Act 4 (270-360) DIGITAL — phone, "UPI pays every second"
 *   Act 5 (360-450) FINALE — rocket -> solar crossfade + NEW INDIA 2026 card
 */
import {
  W, H, leaf, seq, anim, fade,
  scrimBottom, grain, pill, centerX, glow,
  centerY, trailingFix, dotKicker, glassCard,
} from '../kit/kit.mjs';

export const FONT = 'India Inter';
export const DISP = 'India Poppins';
export const GRAIN = 'grain-tile';

export const IMG_MUMBAI = 'img-mumbai';
export const IMG_RAIL = 'img-rail';
export const IMG_HIGHWAY = 'img-highway';
export const IMG_AIRPORT = 'img-airport';
export const IMG_UPI = 'img-upi';
export const IMG_ROCKET = 'img-rocket';
export const IMG_SOLAR = 'img-solar';

export const DUR = 450;
const ACT = 90;

const CREAM = '#fff7ea';
const SAFFRON = '#ff9933';
const GREEN = '#22c55e';
const INK = '#ffffff';
const DIM = 'rgba(255,247,234,0.94)';
const DARK = '#0b1020';

// Lifted bottom stack (rule 5: cards end 872, clearance 80 over progress).
const LY = { kicker: 548, hero: 596, sub: 720, cards: 776 };

// Kicker: Poppins 700 spaced caps + saffron brand dot.
const kick = (id, label, measure, x = 32) =>
  dotKicker(id, label, {
    x, y: LY.kicker, font: DISP, measure, fallbackW: 240, capK: 0.57,
  });

// Two-line hero title with an accented second line (Inter 800 + dual shadow).
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

// Glass stat card: frosted fill + hairline stroke + backdrop blur,
// Poppins value + Inter label optically centered as a group.
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

// Ken Burns push on a cover image (act-local frames 0..89).
const kenBurns = (id, src, from = 1.0, to = 1.1) => ({
  id, type: 'image', src, width: W, height: H, fit: 'cover',
  scaleX: anim([0, 89], [from, to]),
  scaleY: anim([0, 89], [from, to]),
  anchorX: 270, anchorY: 480,
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

const grainNode = (id, localDur) =>
  grain(id, GRAIN, {
    opacity: 0.08,
    drift: [[0, localDur - 1], [-40, -100], [-30, -90]],
  });

const titleGlow = (id, color) =>
  glow(id, { cx: 270, cy: 660, size: 440, color, blur: 45, opacity: 1 });

// Full act shell: photo + scrim + glow + dot kicker + hero + sub + stats.
const actShell = (actId, n, img, from, to, kicker, fallbackW, l1, l2, accent, size, glowColor, subText, stats, measure) => ({
  id: actId, type: 'container', opacity: fade(ACT - 8, ACT, -1),
  children: [
    kenBurns(`${actId}-photo`, img, from, to),
    scrimBottom(`${actId}-scrim`),
    titleGlow(`${actId}-glow`, glowColor),
    { ...kick(`${actId}-kick`, kicker, measure), },
    ...heroTitle(`${actId}-hero`, l1, l2, accent, size, glowColor),
    sub(`${actId}-sub`, subText),
    statCard(`${actId}-s1`, 32, stats[0][0], stats[0][1], SAFFRON, 24),
    statCard(`${actId}-s2`, 276, stats[1][0], stats[1][1], INK, 30),
    actBadge(`${actId}-badge`, n),
    grainNode(`${actId}-grain`, ACT),
  ],
});

export function buildIndiaReel(measure) {
  const kickCentered = (id, label) => {
    const node = dotKicker(id, label, { x: 0, y: LY.kicker, font: DISP, measure, fallbackW: 330, capK: 0.57 });
    node.x = centerX(node.width);
    return node;
  };
  return {
    composition: {
      id: 'india-x80-15s', width: W, height: H, fps: 30, durationInFrames: DUR,
      root: {
        id: 'root', type: 'container',
        children: [
          // ACT 1 — hook (local 0..89)
          actShell(
            'act1', 1, IMG_MUMBAI, 1.0, 1.1,
            'INDIA 2026 \u2022 15 SEC REEL', 300,
            'INDIA IS', 'BUILDING FAST', SAFFRON, 58, 'rgba(255,153,51,0.45)',
            'Metros \u2022 Expressways \u2022 UPI \u2022 Space\nWatch till the end.',
            [['3rd', 'LARGEST ECONOMY PUSH'], ['1.4B', 'DREAMS, ONE MISSION']],
            measure,
          ),
          // ACT 2 — rail (local 0..89)
          actShell(
            'act2', 2, IMG_RAIL, 1.1, 1.0,
            'RAIL REVOLUTION', 220,
            'Vande Bharat', 'in every corner', INK, 46, 'rgba(255,255,255,0.35)',
            '100+ Vande Bharat trains\nMetro in 20+ cities.',
            [['100+', 'VANDE BHARAT'], ['20+', 'METRO CITIES']],
            measure,
          ),
          // ACT 3 — roads & sky with mid-act crossfade (local 0..89)
          {
            id: 'act3', type: 'container', opacity: fade(ACT - 8, ACT, -1),
            children: [
              kenBurns('act3-photoA', IMG_HIGHWAY, 1.0, 1.1),
              {
                id: 'act3-photoB', type: 'image', src: IMG_AIRPORT,
                width: W, height: H, fit: 'cover',
                scaleX: anim([0, 89], [1.1, 1.0]),
                scaleY: anim([0, 89], [1.1, 1.0]),
                anchorX: 270, anchorY: 480,
                opacity: anim([44, 58], [0, 1]),
              },
              scrimBottom('act3-scrim'),
              titleGlow('act3-glow', 'rgba(34,197,94,0.28)'),
              kick('act3-kick', 'ROADS & SKIES', measure),
              ...heroTitle('act3-hero', 'Expressways', 'to new airports', GREEN, 50, 'rgba(34,197,94,0.45)'),
              {
                ...sub('act3-subA', 'Delhi\u2013Mumbai, Ganga E-way\n150,000 km of highways.'),
                opacity: anim([44, 58], [1, 0]),
              },
              {
                ...sub('act3-subB', '150+ airports \u2022 UDAN links\nsmall cities to the sky.'),
                opacity: anim([44, 58], [0, 1]),
              },
              statCard('act3-s1', 32, '150K km', 'HIGHWAYS', SAFFRON, 24),
              statCard('act3-s2', 276, '150+', 'AIRPORTS', INK, 30),
              actBadge('act3-badge', 3),
              grainNode('act3-grain', ACT),
            ],
          },
          // ACT 4 — digital (local 0..89)
          actShell(
            'act4', 4, IMG_UPI, 1.0, 1.08,
            'DIGITAL INDIA', 196,
            'UPI pays', 'every second', SAFFRON, 56, 'rgba(255,153,51,0.45)',
            '14B UPI txns a month\n100+ unicorns \u2022 5G in 500+ cities.',
            [['14B', 'UPI / MONTH'], ['100+', 'UNICORNS']],
            measure,
          ),
          // ACT 5 — finale: rocket -> solar, centered + end card (local 0..89)
          {
            id: 'act5', type: 'container',
            children: [
              kenBurns('act5-photoA', IMG_ROCKET, 1.0, 1.1),
              {
                id: 'act5-photoB', type: 'image', src: IMG_SOLAR,
                width: W, height: H, fit: 'cover',
                scaleX: anim([0, 89], [1.1, 1.0]),
                scaleY: anim([0, 89], [1.1, 1.0]),
                anchorX: 270, anchorY: 480,
                opacity: anim([40, 54], [0, 1]),
              },
              scrimBottom('act5-scrim'),
              titleGlow('act5-glow', 'rgba(255,153,51,0.30)'),
              kickCentered('act5-kick', 'SPACE \u2022 GREEN \u2022 NEW INDIA'),
              {
                id: 'act5-l1', type: 'text', text: 'Chandrayaan', fontFamily: FONT,
                fontSize: 52, fontWeight: 800, fill: INK, lineHeight: 1.05,
                textAlign: 'center', maxWidth: W, x: 0,
                y: anim([6, 24], [622, 596]), opacity: fade(6, 22),
                shadow: { color: 'rgba(0,0,0,0.75)', blur: 25, offsetY: 5 },
              },
              {
                id: 'act5-l2', type: 'text', text: 'to Solar leader', fontFamily: FONT,
                fontSize: 52, fontWeight: 800, fill: SAFFRON, lineHeight: 1.05,
                textAlign: 'center', maxWidth: W, x: 0,
                y: anim([12, 30], [677, 651]), opacity: fade(12, 26),
                shadow: { color: 'rgba(255,153,51,0.45)', blur: 40, offsetY: 5 },
              },
              {
                ...sub('act5-subA', 'Moon south pole \u2022 Aditya Sun mission\nGaganyaan is next.', LY.sub, 16),
                x: 0, maxWidth: W, textAlign: 'center',
                opacity: anim([40, 54], [1, 0]),
              },
              {
                ...sub('act5-subB', 'World #3 in solar \u2022 200 GW\nclean energy and counting.', LY.sub, 16),
                x: 0, maxWidth: W, textAlign: 'center',
                opacity: anim([40, 54], [0, 1]),
              },
              (() => {
                const h = 54, size = 22, ls = 3;
                const label = 'NEW INDIA 2026';
                return {
                  id: 'act5-pill', type: 'rrect', width: 300, height: h, radius: h / 2,
                  fill: {
                    kind: 'linear', angle: 90,
                    stops: [
                      { offset: 0, color: '#FF9933' },
                      { offset: 0.5, color: '#ffffff' },
                      { offset: 1, color: '#22c55e' },
                    ],
                  },
                  x: centerX(300), y: 820,
                  opacity: fade(52, 64),
                  scaleX: anim([52, 66], [0.8, 1]),
                  scaleY: anim([52, 66], [0.8, 1]),
                  anchorX: 150, anchorY: 27,
                  children: [{
                    id: 'act5-pill-t', type: 'text', text: label,
                    fontFamily: FONT, fontSize: size, fontWeight: 800, letterSpacing: ls,
                    fill: DARK, textAlign: 'center', maxWidth: 300,
                    x: trailingFix(ls), y: centerY(h, size),
                  }],
                };
              })(),
              actBadge('act5-badge', 5),
              grainNode('act5-grain', ACT),
            ],
          },
          // CHROME — always on top: tricolor bar + progress bar.
          {
            id: 'chrome', type: 'container',
            children: [
              { id: 'tri-s', type: 'rect', width: 180, height: 7, fill: '#FF9933', x: 0, y: 0 },
              { id: 'tri-w', type: 'rect', width: 180, height: 7, fill: '#FFFFFF', x: 180, y: 0 },
              { id: 'tri-g', type: 'rect', width: 180, height: 7, fill: '#138808', x: 360, y: 0 },
              { id: 'prog-bg', type: 'rect', width: W, height: 8, fill: 'rgba(255,255,255,0.18)', x: 0, y: 952 },
              {
                id: 'prog-fill', type: 'rect', width: W, height: 8, x: 0, y: 952,
                fill: {
                  kind: 'linear', angle: 90,
                  stops: [
                    { offset: 0, color: '#FF9933' },
                    { offset: 0.5, color: '#ffffff' },
                    { offset: 1, color: '#138808' },
                  ],
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
