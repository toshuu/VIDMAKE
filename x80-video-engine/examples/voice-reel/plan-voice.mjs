/**
 * AI voice-calling benefits reel — 15s, 540x960 @30fps = 450 frames.
 * Built by the Planning Department (see ../../planning-dept.md):
 * dot kickers, Inter-800 heroes, glass stat cards, lifted bottom stack.
 *
 *   Act 1 (0-90)    HOOK — vintage mic, "NEVER MISS another call"
 *   Act 2 (90-180)  INSTANT — hands on laptop, "Answers in 2 seconds flat"
 *   Act 3 (180-270) LANGUAGES — connected desk, "Speaks 30+ languages"
 *   Act 4 (270-360) SCALE — busy office, "1000s of calls all at once"
 *   Act 5 (360-450) FINALE — high-five -> handshake, "Closes leads
 *                   while you sleep" + TRY AI CALLING card
 */
import {
  W, H, leaf, seq, anim, fade,
  scrimBottom, grain, centerX, glow,
  centerY, trailingFix, dotKicker, glassCard,
} from '../kit/kit.mjs';

export const FONT = 'Voice Inter';
export const DISP = 'Voice Poppins';
export const GRAIN = 'grain-tile';

export const IMG_HOOK = 'img-hook';
export const IMG_INSTANT = 'img-instant';
export const IMG_LANG = 'img-lang';
export const IMG_SCALE = 'img-scale';
export const IMG_SUCCESS = 'img-success';
export const IMG_DEAL = 'img-deal';

export const DUR = 450;
const ACT = 90;

const BLUE = '#2997ff';
const VIOLET = '#a259ff';
const INK = '#ffffff';
const DIM = 'rgba(240,246,255,0.94)';
const DARK = '#0b1020';
const PILL_BG = '#eef4ff';

// Lifted bottom stack (rule 5: cards end 872, clearance 80 over progress).
const LY = { kicker: 548, hero: 596, sub: 720, cards: 776 };

// Kicker: Poppins 700 spaced caps + blue brand dot on ice pill.
const kick = (id, label, measure, x = 32) =>
  dotKicker(id, label, {
    x, y: LY.kicker, font: DISP, measure, fallbackW: 240,
    capK: 0.57, dotFill: BLUE, bg: PILL_BG,
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
    kick(`${actId}-kick`, kicker, measure),
    ...heroTitle(`${actId}-hero`, l1, l2, accent, size, glowColor),
    sub(`${actId}-sub`, subText),
    statCard(`${actId}-s1`, 32, stats[0][0], stats[0][1], BLUE, 24),
    statCard(`${actId}-s2`, 276, stats[1][0], stats[1][1], INK, 30),
    actBadge(`${actId}-badge`, n),
    grainNode(`${actId}-grain`, ACT),
  ],
});

const GRAD = {
  kind: 'linear', angle: 90,
  stops: [
    { offset: 0, color: BLUE },
    { offset: 1, color: VIOLET },
  ],
};

export function buildVoiceReel(measure) {
  const kickCentered = (id, label) => {
    const node = dotKicker(id, label, {
      x: 0, y: LY.kicker, font: DISP, measure, fallbackW: 330,
      capK: 0.57, dotFill: BLUE, bg: PILL_BG,
    });
    node.x = centerX(node.width);
    return node;
  };
  return {
    composition: {
      id: 'voice-x80-15s', width: W, height: H, fps: 30, durationInFrames: DUR,
      root: {
        id: 'root', type: 'container',
        children: [
          // ACT 1 — hook (local 0..89)
          actShell(
            'act1', 1, IMG_HOOK, 1.0, 1.1,
            'AI VOICE CALLING', 220,
            'NEVER MISS', 'another call', BLUE, 58, 'rgba(41,151,255,0.45)',
            'AI answers every call in 2 seconds\nDay, night, weekend.',
            [['24/7', 'ALWAYS ON'], ['2s', 'AVG ANSWER']],
            measure,
          ),
          // ACT 2 — instant pickup (local 0..89)
          actShell(
            'act2', 2, IMG_INSTANT, 1.1, 1.0,
            'INSTANT PICKUP', 220,
            'Answers in', '2 seconds flat', BLUE, 52, 'rgba(41,151,255,0.45)',
            'No hold music. No missed leads.\nEvery caller heard.',
            [['0', 'MISSED CALLS'], ['10x', 'MORE LEADS']],
            measure,
          ),
          // ACT 3 — languages (local 0..89)
          actShell(
            'act3', 3, IMG_LANG, 1.0, 1.08,
            'EVERY LANGUAGE', 220,
            'Speaks', '30+ languages', VIOLET, 56, 'rgba(162,89,255,0.45)',
            'Hindi, English + 28 more.\nZero accent barriers.',
            [['30+', 'LANGUAGES'], ['4.9', 'CALLER RATING']],
            measure,
          ),
          // ACT 4 — scale (local 0..89)
          actShell(
            'act4', 4, IMG_SCALE, 1.1, 1.0,
            'MASSIVE SCALE', 220,
            '1000s of calls', 'all at once', BLUE, 50, 'rgba(41,151,255,0.45)',
            'One AI team does the work\nof a 100-seat call center.',
            [['-70%', 'CALL COSTS'], ['1000s', 'PARALLEL CALLS']],
            measure,
          ),
          // ACT 5 — finale: high-five -> handshake + end card (local 0..89)
          {
            id: 'act5', type: 'container',
            children: [
              kenBurns('act5-photoA', IMG_SUCCESS, 1.0, 1.1),
              {
                id: 'act5-photoB', type: 'image', src: IMG_DEAL,
                width: W, height: H, fit: 'cover',
                scaleX: anim([0, 89], [1.1, 1.0]),
                scaleY: anim([0, 89], [1.1, 1.0]),
                anchorX: 270, anchorY: 480,
                opacity: anim([40, 54], [0, 1]),
              },
              scrimBottom('act5-scrim'),
              titleGlow('act5-glow', 'rgba(162,89,255,0.30)'),
              kickCentered('act5-kick', 'REVENUE WHILE YOU SLEEP'),
              {
                id: 'act5-l1', type: 'text', text: 'Closes leads', fontFamily: FONT,
                fontSize: 50, fontWeight: 800, fill: INK, lineHeight: 1.05,
                textAlign: 'center', maxWidth: W, x: 0,
                y: anim([6, 24], [622, 596]), opacity: fade(6, 22),
                shadow: { color: 'rgba(0,0,0,0.75)', blur: 25, offsetY: 5 },
              },
              {
                id: 'act5-l2', type: 'text', text: 'while you sleep', fontFamily: FONT,
                fontSize: 50, fontWeight: 800, fill: VIOLET, lineHeight: 1.05,
                textAlign: 'center', maxWidth: W, x: 0,
                y: anim([12, 30], [675, 649]), opacity: fade(12, 26),
                shadow: { color: 'rgba(162,89,255,0.45)', blur: 40, offsetY: 5 },
              },
              {
                ...sub('act5-sub', 'Bookings, reminders, follow-ups\non autopilot.', LY.sub, 16),
                x: 0, maxWidth: W, textAlign: 'center',
              },
              {
                id: 'act5-pill', type: 'rrect', width: 300, height: 54, radius: 27,
                fill: GRAD,
                x: centerX(300), y: 820,
                opacity: fade(52, 64),
                scaleX: anim([52, 66], [0.8, 1]),
                scaleY: anim([52, 66], [0.8, 1]),
                anchorX: 150, anchorY: 27,
                children: [{
                  id: 'act5-pill-t', type: 'text', text: 'TRY AI CALLING',
                  fontFamily: FONT, fontSize: 22, fontWeight: 800, letterSpacing: 3,
                  fill: '#ffffff', textAlign: 'center', maxWidth: 300,
                  x: trailingFix(3), y: centerY(54, 22),
                }],
              },
              actBadge('act5-badge', 5),
              grainNode('act5-grain', ACT),
            ],
          },
          // CHROME — always on top: gradient bar + progress bar.
          {
            id: 'chrome', type: 'container',
            children: [
              { id: 'topbar', type: 'rect', width: W, height: 7, fill: GRAD, x: 0, y: 0 },
              { id: 'prog-bg', type: 'rect', width: W, height: 8, fill: 'rgba(255,255,255,0.18)', x: 0, y: 952 },
              {
                id: 'prog-fill', type: 'rect', width: W, height: 8, x: 0, y: 952,
                fill: GRAD,
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
