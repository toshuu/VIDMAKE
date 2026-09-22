/**
 * M9.4 — Motion-graphics-heavy short (90f): spring hero card, orbiting
 * dots on a rotating group, animated glow intensity, marquee bar.
 */
import type { VideoPlan } from '@x80/core';
import { ACCENT, BG, FONT, H, INK, W, leaf, plan, seq } from './shared.js';

export const buildMotionGraphics = (): VideoPlan =>
  plan(
    'm9-motion',
    90,
    {
      id: 'root',
      type: 'container',
      children: [
        { id: 'bg', type: 'rect', width: W, height: H, fill: BG },
        {
          id: 'hero',
          type: 'rrect',
          width: 380,
          height: 240,
          radius: 36,
          fill: '#1d3a5f',
          x: 80,
          y: 300,
          scaleX: { binding: 'spring', from: 0.2, to: 1 },
          scaleY: { binding: 'spring', from: 0.2, to: 1 },
          anchorX: 190,
          anchorY: 120,
          effects: [
            {
              type: 'glow',
              params: {
                strength: { binding: 'interpolate', inputRange: [0, 89], outputRange: [0.2, 0.9] },
                color: '#4da3ff',
              },
            },
          ],
        },
        {
          id: 'orbit',
          type: 'group',
          x: 270,
          y: 420,
          rotation: { binding: 'interpolate', inputRange: [0, 89], outputRange: [0, 180] },
          children: [
            { id: 'sat1', type: 'circle', radius: 22, fill: ACCENT, x: 150, y: -22 },
            { id: 'sat2', type: 'circle', radius: 14, fill: INK, x: -170, y: -14 },
          ],
        },
        {
          id: 'marquee',
          type: 'rect',
          width: 200,
          height: 36,
          fill: ACCENT,
          x: { binding: 'interpolate', inputRange: [0, 89], outputRange: [-200, W] },
          y: 700,
        },
        {
          id: 'label',
          type: 'text',
          text: 'X80 MOTION',
          fontFamily: FONT,
          fontSize: 56,
          fontWeight: 700,
          fill: INK,
          x: 80,
          y: 620,
        },
      ],
    },
    seq(0, 90, [leaf('bg'), leaf('hero'), leaf('orbit'), leaf('marquee'), leaf('label')]),
  );
