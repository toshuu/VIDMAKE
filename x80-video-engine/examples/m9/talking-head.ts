/**
 * M9.1 — Talking-head short (90f): portrait placeholder, sliding
 * lower-third name bar, word-highlight captions.
 */
import type { VideoPlan } from '@x80/core';
import { ACCENT, BG, DIM, FONT, H, INK, W, leaf, plan, seq, words } from './shared.js';

export const buildTalkingHead = (): VideoPlan =>
  plan(
    'm9-talking-head',
    90,
    {
      id: 'root',
      type: 'container',
      children: [
        { id: 'bg', type: 'rect', width: W, height: H, fill: BG },
        {
          id: 'shoulders',
          type: 'rrect',
          width: 420,
          height: 300,
          radius: 90,
          fill: '#274060',
          x: 60,
          y: 560,
        },
        { id: 'head', type: 'circle', radius: 110, fill: '#c8a882', x: 160, y: 330 },
        {
          id: 'bar',
          type: 'rect',
          width: 460,
          height: 120,
          fill: '#16283f',
          x: { binding: 'interpolate', inputRange: [0, 20], outputRange: [-460, 40], options: { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } },
          y: 780,
        },
        {
          id: 'name',
          type: 'text',
          text: 'AVA — MORNING BREW',
          fontFamily: FONT,
          fontSize: 34,
          fontWeight: 700,
          fill: INK,
          x: 64,
          y: 800,
          opacity: { binding: 'interpolate', inputRange: [10, 25], outputRange: [0, 1], options: { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } },
        },
        {
          id: 'role',
          type: 'text',
          text: 'cafe vlog · ep 12',
          fontFamily: FONT,
          fontSize: 26,
          fill: DIM,
          x: 64,
          y: 848,
          opacity: { binding: 'interpolate', inputRange: [15, 30], outputRange: [0, 1], options: { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } },
        },
        {
          id: 'captions',
          type: 'caption',
          x: 40,
          y: 120,
          captions: words([
            ['Morning', 0, 350],
            ['brew', 350, 650],
            ['tastes', 650, 950],
            ['better', 950, 1300],
            ['with', 1300, 1500],
            ['you', 1500, 1900],
          ]),
          combineMs: 4000,
          fontFamily: FONT,
          fontSize: 40,
          fontWeight: 700,
          fill: DIM,
          highlightFill: ACCENT,
          maxWidth: 460,
        },
      ],
    },
    seq(0, 90, [
      leaf('bg'),
      leaf('shoulders'),
      leaf('head'),
      seq(5, 85, [leaf('bar'), leaf('name'), leaf('role')]),
      seq(0, 70, [leaf('captions')]),
    ]),
  );
