/**
 * M9.2 — Café/lifestyle reel (120f): real clip (cut2.mp4) under a
 * vignette grade, title card, then a slide transition into a still
 * photo card with a quote.
 */
import type { VideoPlan } from '@x80/core';
import { FONT, H, INK, W, leaf, plan, seq } from './shared.js';

export const CAFE_CLIP_SRC = 'cafe-cut2';
export const CAFE_PHOTO_SRC = 'cafe-photo';

export const buildCafeReel = (): VideoPlan =>
  plan(
    'm9-cafe-reel',
    120,
    {
      id: 'root',
      type: 'container',
      children: [
        {
          id: 'sceneA',
          type: 'container',
          children: [
            {
              id: 'clip',
              type: 'video',
              src: CAFE_CLIP_SRC,
              width: W,
              height: H,
              fit: 'cover',
            },
            { id: 'grade', type: 'effectLayer', effect: { type: 'vignette', params: { strength: 0.45 } } },
            {
              id: 'title',
              type: 'text',
              text: 'slow mornings',
              fontFamily: FONT,
              fontSize: 64,
              fontWeight: 700,
              fill: INK,
              x: 48,
              y: 700,
              opacity: { binding: 'interpolate', inputRange: [10, 30], outputRange: [0, 1], options: { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } },
            },
          ],
        },
        {
          id: 'sceneB',
          type: 'container',
          children: [
            { id: 'still', type: 'image', src: CAFE_PHOTO_SRC, width: W, height: H, fit: 'cover' },
            {
              id: 'quote',
              type: 'text',
              text: 'first pour, best hour',
              fontFamily: FONT,
              fontSize: 44,
              fontStyle: 'italic',
              fill: INK,
              x: 48,
              y: 760,
              maxWidth: 450,
            },
          ],
        },
      ],
    },
    seq(0, 120, [
      seq(0, 55, [leaf('sceneA')]),
      {
        kind: 'transition',
        from: 55,
        durationInFrames: 20,
        type: 'slide',
        params: { direction: 'left' },
        a: 'sceneA',
        b: 'sceneB',
        aFreeze: 54,
      } as never,
      seq(75, 45, [leaf('sceneB')]),
    ]),
  );
