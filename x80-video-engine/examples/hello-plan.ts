import type { VideoPlan } from '@x80/core';

// M0 example: a trivial video expressed as typed data (no React).
// 1080x1920, 30fps, 10s. Proves the contract layer compiles and resolves.
export const helloPlan: VideoPlan = {
  composition: {
    id: 'hello',
    width: 1080,
    height: 1920,
    fps: 30,
    durationInFrames: 300,
    root: {
      id: 'root',
      type: 'container',
      children: [
        {
          id: 'bg',
          type: 'rect',
          width: 1080,
          height: 1920,
          fill: '#111111',
        },
        {
          id: 'title',
          type: 'text',
          text: 'Hello, X80',
          fontFamily: 'Inter',
          fontSize: 96,
          fill: '#ffffff',
          x: 120,
          y: 900,
        },
      ],
    },
  },
  timeline: {
    kind: 'sequence',
    from: 0,
    durationInFrames: 300,
    children: [
      {
        kind: 'sequence',
        from: 30,
        durationInFrames: 90,
        children: [{ kind: 'leaf', ref: 'title' }],
      },
    ],
  },
  assets: [{ id: 'font-inter', type: 'font', src: 'Inter' }],
};
