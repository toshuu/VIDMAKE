/**
 * M9.3 — Faceless explainer (120f): sequenced kinetic text beats with
 * bullet dots plus a persistent phrase-highlight caption track.
 */
import type { VideoPlan } from '@x80/core';
import { ACCENT, BG, DIM, FONT, H, INK, W, leaf, plan, seq, words } from './shared.js';

const fade = (from: number, to: number) => ({
  binding: 'interpolate' as const,
  inputRange: [from, to],
  outputRange: [0, 1],
  options: { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const },
});

export const buildExplainer = (): VideoPlan => {
  const beats: Array<{ id: string; dot: string; text: string; at: number }> = [
    { id: 'beat1', dot: 'dot1', text: '1. Grind fresh beans', at: 0 },
    { id: 'beat2', dot: 'dot2', text: '2. Bloom for 30 seconds', at: 35 },
    { id: 'beat3', dot: 'dot3', text: '3. Pour slow circles', at: 70 },
  ];
  return plan(
    'm9-explainer',
    120,
    {
      id: 'root',
      type: 'container',
      children: [
        { id: 'bg', type: 'rect', width: W, height: H, fill: BG },
        {
          id: 'kicker',
          type: 'text',
          text: 'POUR-OVER IN 3 STEPS',
          fontFamily: FONT,
          fontSize: 30,
          fontWeight: 700,
          fill: ACCENT,
          x: 48,
          y: 140,
        },
        ...beats.flatMap((b, i) => [
          {
            id: b.dot,
            type: 'circle' as const,
            radius: 14,
            fill: ACCENT,
            x: 48,
            y: 250 + i * 120,
            opacity: fade(b.at, b.at + 10),
          },
          {
            id: b.id,
            type: 'text' as const,
            text: b.text,
            fontFamily: FONT,
            fontSize: 38,
            fill: INK,
            x: 90,
            y: 232 + i * 120,
            maxWidth: 410,
            opacity: fade(b.at, b.at + 10),
          },
        ]),
        {
          id: 'captions',
          type: 'caption',
          x: 48,
          y: 640,
          captions: words([
            ['Three', 0, 500],
            ['steps', 500, 1000],
            ['to', 1000, 1300],
            ['a', 1300, 1450],
            ['better', 1450, 2000],
            ['cup', 2000, 2500],
            ['every', 2500, 2900],
            ['morning', 2900, 3500],
          ]),
          combineMs: 4000,
          highlight: 'phrase',
          fontFamily: FONT,
          fontSize: 36,
          fill: DIM,
          highlightFill: INK,
          maxWidth: 444,
        },
      ],
    },
    seq(0, 120, [
      leaf('bg'),
      leaf('kicker'),
      seq(0, 40, [leaf('dot1'), leaf('beat1')]),
      seq(35, 40, [leaf('dot2'), leaf('beat2')]),
      seq(70, 50, [leaf('dot3'), leaf('beat3')]),
      seq(0, 120, [leaf('captions')]),
    ]),
  );
};
