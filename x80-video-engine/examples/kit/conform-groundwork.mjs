/** X80 twin of my-video GroundworkCompare (540x960, frame 0). */
import { renderFrame } from '../../packages/core/dist/index.js';
import {
  SkiaRenderer, createSkiaMeasurer, registerFontFile,
} from '../../packages/renderer-skia/dist/index.js';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const OUT = join(DIR, '../../output/water-proof');
registerFontFile(join(DIR, '../iphone-reel/fonts', 'LiberationSans-Regular.ttf'), 'Conform Sans');
registerFontFile(join(DIR, '../iphone-reel/fonts', 'LiberationSans-Bold.ttf'), 'Conform Sans');

const F = 'Conform Sans';
const plan = {
  composition: {
    id: 'gw', width: 540, height: 960, fps: 30, durationInFrames: 30,
    root: {
      id: 'root', type: 'container',
      children: [
        { id: 'bg', type: 'rect', width: 540, height: 960, fill: '#000000' },
        {
          id: 'glow', type: 'circle', radius: 180, x: 90, y: 120,
          blendMode: 'screen',
          fill: { kind: 'radial', outer: 0.709, stops: [{ offset: 0, color: 'rgba(47,127,224,0.55)' }, { offset: 1, color: 'rgba(0,0,0,0)' }] },
          filter: { blur: 35 },
        },
        {
          id: 'bar', type: 'rrect', width: 380, height: 8, radius: 4, x: 80, y: 560,
          fill: { kind: 'linear', angle: 90, stops: [{ offset: 0, color: '#2997ff' }, { offset: 1, color: '#a259ff' }] },
        },
        {
          id: 'pro', type: 'text', text: 'Pro.', fontFamily: F, fontSize: 96, fontWeight: 700,
          lineHeight: 1, textAlign: 'center', maxWidth: 540, x: 0, y: 590,
          fill: { kind: 'linear', angle: 90, stops: [{ offset: 0, color: '#2997ff' }, { offset: 1, color: '#a259ff' }] },
        },
        {
          id: 'card', type: 'rrect', width: 300, height: 120, radius: 24, x: 120, y: 730,
          fill: '#13253f',
          shadow: { color: 'rgba(41, 151, 255, 0.35)', blur: 60, offsetY: 20 },
        },
        {
          id: 'kick', type: 'text', text: 'INTRODUCING', fontFamily: F, fontSize: 20,
          letterSpacing: 9, fill: '#86868b', textAlign: 'center', maxWidth: 540, x: 0, y: 60,
        },
      ],
    },
  },
  timeline: {
    kind: 'sequence', from: 0, durationInFrames: 30,
    children: ['bg', 'glow', 'bar', 'pro', 'card', 'kick'].map((ref) => ({ kind: 'leaf', ref })),
  },
};

const renderer = new SkiaRenderer();
const s = renderer.createSurface(540, 960);
renderer.clear(s, '#000000');
renderFrame(renderer, s, plan, 0, { measureText: createSkiaMeasurer() });
writeFileSync(join(OUT, 'conform-x80.png'), await renderer.encodePng(s));
renderer.destroySurface(s);
console.log('x80 twin written');
