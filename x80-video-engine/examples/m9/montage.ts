/**
 * M9.5 — Image montage (90f): three stills with cover fit joined by
 * push-cut transitions, caption strip overlay throughout.
 */
import type { VideoPlan } from '@x80/core';
import { DIM, FONT, H, INK, W, leaf, plan, seq, words } from './shared.js';

export const PHOTO_A = 'montage-a';
export const PHOTO_B = 'montage-b';
export const PHOTO_C = 'montage-c';

const photo = (id: string, src: string) => ({
  id,
  type: 'image' as const,
  src,
  width: W,
  height: H,
  fit: 'cover' as const,
});

export const buildMontage = (): VideoPlan =>
  plan(
    'm9-montage',
    90,
    {
      id: 'root',
      type: 'container',
      children: [
        { ...photo('photoA', PHOTO_A) },
        { ...photo('photoB', PHOTO_B) },
        { ...photo('photoC', PHOTO_C) },
        { id: 'shade', type: 'rect', width: W, height: 220, fill: '#0e1626', x: 0, y: 740, opacity: 0.75 },
        {
          id: 'strip',
          type: 'caption',
          x: 40,
          y: 780,
          captions: words([
            ['Water', 0, 400],
            ['is', 400, 600],
            ['life', 600, 1100],
            ['protect', 1100, 1600],
            ['every', 1600, 1900],
            ['drop', 1900, 2400],
          ]),
          combineMs: 5000,
          fontFamily: FONT,
          fontSize: 38,
          fontWeight: 700,
          fill: DIM,
          highlightFill: INK,
          maxWidth: 460,
        },
      ],
    },
    seq(0, 90, [
      seq(0, 28, [leaf('photoA')]),
      {
        kind: 'transition',
        from: 28,
        durationInFrames: 12,
        type: 'push-cut',
        params: { direction: 'left' },
        a: 'photoA',
        b: 'photoB',
        aFreeze: 27,
      } as never,
      seq(40, 18, [leaf('photoB')]),
      {
        kind: 'transition',
        from: 58,
        durationInFrames: 12,
        type: 'push-cut',
        params: { direction: 'left' },
        a: 'photoB',
        b: 'photoC',
        aFreeze: 57,
      } as never,
      seq(70, 20, [leaf('photoC')]),
      seq(0, 90, [leaf('shade'), leaf('strip')]),
    ]),
  );
