/**
 * M9.6 — Caption-heavy short (90f): full-screen TikTok captions with
 * typewriter reveal + word highlight over animated level bars.
 * Doubles as the end-to-end MP4 proof composition.
 */
import type { VideoPlan } from '@x80/core';
import { ACCENT, BG, DIM, FONT, H, INK, W, leaf, plan, seq, words } from './shared.js';

const bars = Array.from({ length: 24 }, (_, i) => ({
  id: `bar${i}`,
  type: 'rect' as const,
  width: 14,
  height: 60 + ((i * 37) % 140),
  fill: i % 4 === 0 ? ACCENT : '#274060',
  x: 30 + i * 20,
  y: 800,
  opacity: {
    binding: 'interpolate' as const,
    inputRange: [0, 30, 60, 89],
    outputRange: [0.35, 1, 0.5, 0.9],
  },
}));

export const buildCaptionHeavy = (): VideoPlan =>
  plan(
    'm9-caption-heavy',
    90,
    {
      id: 'root',
      type: 'container',
      children: [
        { id: 'bg', type: 'rect', width: W, height: H, fill: BG },
        ...bars,
        {
          id: 'kicker',
          type: 'text',
          text: 'READ ALONG',
          fontFamily: FONT,
          fontSize: 28,
          fontWeight: 700,
          fill: ACCENT,
          x: 48,
          y: 96,
        },
        {
          id: 'captions',
          type: 'caption',
          x: 48,
          y: 220,
          captions: words([
            ['Every', 0, 300],
            ['great', 300, 600],
            ['video', 600, 900],
            ['starts', 900, 1200],
            ['with', 1200, 1400],
            ['a', 1400, 1500],
            ['single', 1500, 1900],
            ['frame', 1900, 2300],
            ['make', 2300, 2600],
            ['yours', 2600, 2900],
            ['count', 2900, 3300],
          ]),
          combineMs: 2500,
          maxCharsPerLine: 18,
          highlight: 'word',
          reveal: 'typewriter',
          fontFamily: FONT,
          fontSize: 52,
          fontWeight: 700,
          fill: DIM,
          highlightFill: INK,
          background: '#16283f',
          activeBackground: '#3a2f00',
          backgroundPadding: 10,
          backgroundRadius: 14,
          maxWidth: 444,
          enterFadeMs: 120,
        },
      ],
    },
    seq(0, 90, [leaf('bg'), ...bars.map((b) => leaf(b.id)), leaf('kicker'), leaf('captions')]),
  );
