/**
 * M9.7 — Product promo (100f): glowing product card, spring price tag,
 * sliding feature rows, iris transition into the end card.
 */
import type { VideoPlan } from '@x80/core';
import { ACCENT, BG, FONT, INK, W, leaf, plan, seq } from './shared.js';

const slideIn = (from: number, to: number) => ({
  binding: 'interpolate' as const,
  inputRange: [0, 20],
  outputRange: [from, to],
  options: { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const },
});

export const buildProductPromo = (): VideoPlan =>
  plan(
    'm9-product-promo',
    100,
    {
      id: 'root',
      type: 'container',
      children: [
        {
          id: 'pitch',
          type: 'container',
          children: [
            { id: 'bg', type: 'rect', width: W, height: 960, fill: BG },
            {
              id: 'card',
              type: 'rrect',
              width: 400,
              height: 400,
              radius: 48,
              fill: '#1d3a5f',
              x: 70,
              y: 150,
              scaleX: { binding: 'spring', from: 0.3, to: 1 },
              scaleY: { binding: 'spring', from: 0.3, to: 1 },
              anchorX: 200,
              anchorY: 200,
              effects: [{ type: 'glow', params: { strength: 0.5, color: '#4da3ff' } }],
            },
            {
              id: 'buds',
              type: 'text',
              text: 'AURA BUDS',
              fontFamily: FONT,
              fontSize: 60,
              fontWeight: 700,
              fill: INK,
              x: 70,
              y: 580,
            },
            {
              id: 'price',
              type: 'text',
              text: '$79',
              fontFamily: FONT,
              fontSize: 84,
              fontWeight: 700,
              fill: ACCENT,
              x: 70,
              y: 660,
              scaleX: { binding: 'spring', from: 0.3, to: 1, delay: 10 },
              scaleY: { binding: 'spring', from: 0.3, to: 1, delay: 10 },
              anchorX: 40,
              anchorY: 40,
            },
            {
              id: 'feat1',
              type: 'text',
              text: '· 36h battery',
              fontFamily: FONT,
              fontSize: 32,
              fill: INK,
              x: slideIn(-300, 70),
              y: 780,
            },
            {
              id: 'feat2',
              type: 'text',
              text: '· noise cancelling',
              fontFamily: FONT,
              fontSize: 32,
              fill: INK,
              x: slideIn(-300, 70),
              y: 828,
            },
          ],
        },
        {
          id: 'endcard',
          type: 'container',
          children: [
            { id: 'endbg', type: 'rect', width: W, height: 960, fill: '#16283f' },
            {
              id: 'cta',
              type: 'text',
              text: 'SHOP NOW',
              fontFamily: FONT,
              fontSize: 72,
              fontWeight: 700,
              fill: ACCENT,
              x: 90,
              y: 430,
            },
          ],
        },
      ],
    },
    seq(0, 100, [
      seq(0, 75, [
        leaf('bg'),
        leaf('card'),
        leaf('buds'),
        leaf('price'),
        seq(10, 65, [leaf('feat1')]),
        seq(20, 55, [leaf('feat2')]),
      ]),
      {
        kind: 'transition',
        from: 75,
        durationInFrames: 25,
        type: 'iris',
        params: {},
        a: 'pitch',
        b: 'endcard',
        aFreeze: 74,
      } as never,
    ]),
  );
