/** Kinetic proof (stills only): geometry/filter/blur bindings + overlay fly.
 *  Run: node examples/unlimited/prove-kinetic.mjs → output/unlimited/kinetic/
 */
import { renderFrame } from '../../packages/core/dist/index.js';
import { compileReel } from '../../packages/reelspec/dist/compile.js';
import {
  createSkiaMeasurer, registerFontFile, SkiaRenderer, skiaTransitionApplier,
} from '../../packages/renderer-skia/dist/index.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const IFONTS = '/kaggle/working/x80-video-engine/examples/india-reel/fonts';
registerFontFile(join(IFONTS, 'Inter-800.ttf'), 'Inter');
registerFontFile(join(IFONTS, 'Poppins-700.ttf'), 'Poppins');
const renderer = new SkiaRenderer();
const measure = createSkiaMeasurer();
const options = () => ({ measureText: measure, transitionApplier: skiaTransitionApplier(renderer) });
const anim = (f0, f1, v0, v1) => ({
  binding: 'interpolate', inputRange: [f0, f1], outputRange: [v0, v1],
  options: { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
});

const spec = {
  id: 'kinetic', canvas: { w: 540, h: 960, fps: 30 }, system: 'kinetic-proof',
  concept: {
    palette: { bg: '#0b1026', ink: '#ffffff', accent: '#4ade80', accent2: '#e8b34b', pillBg: '#f2fbf4', pillFg: '#0b1020' },
    faces: { display: 'Inter', hero: 'Inter', kicker: 'Poppins' },
    signature: 'a bar grows, a sun pulses, focus lands, one bird crosses the cut',
    signatureWhy: 'kinetic geometry + animated blur + global-frame overlay proof',
  },
  chrome: false, grain: false,
  durations: [60, 60],
  transitions: [{ type: 'fade', duration: 12 }],
  acts: [
    {
      role: 'charge', duration: 60, layout: 'charge', badge: false,
      nodes: [
        { id: 'bg', type: 'rect', width: 540, height: 960, fill: 'bg' },
        { id: 'sun', type: 'circle', radius: anim(0, 59, 20, 130), x: 140, y: 300, fill: 'accent2', opacity: 0.9 },
        { id: 'bar', type: 'rect', width: anim(0, 59, 0, 476), height: 34, x: 32, y: 640, fill: 'accent' },
        { id: 'label', type: 'text', text: 'CHARGE', fontFamily: 'Poppins', fontSize: 28, fontWeight: 700, letterSpacing: 8, fill: 'ink', x: 34, y: 600 },
      ],
    },
    {
      role: 'focus', duration: 60, layout: 'focus', badge: false,
      nodes: [
        { id: 'bg', type: 'rect', width: 540, height: 960, fill: 'bg' },
        {
          id: 'card', type: 'rrect', width: 440, height: 260, radius: anim(0, 59, 60, 16), x: 50, y: 330,
          fill: '#16204a', filter: { blur: anim(0, 30, 10, 0) },
          children: [
            { id: 'card-t', type: 'text', text: 'FOCUS LANDS', fontFamily: 'Inter', fontSize: 52, fontWeight: 800, fill: 'ink', x: 30, y: 90, maxWidth: 380 },
          ],
        },
      ],
    },
  ],
  overlays: [
    {
      id: 'bird', type: 'circle', radius: 16, fill: 'accent',
      x: anim(30, 90, 60, 480), y: anim(30, 90, 700, 240),
      opacity: anim(30, 40, 0, 1),
    },
  ],
};

const { plan, total } = compileReel(spec);
const dir = '/kaggle/working/x80-video-engine/output/unlimited/kinetic';
mkdirSync(dir, { recursive: true });
for (const f of [10, 55, 65, 100]) {
  const s = renderer.createSurface(540, 960);
  renderer.clear(s, '#000000');
  renderFrame(renderer, s, plan, f, options());
  writeFileSync(join(dir, `frame-${f}.png`), await renderer.encodePng(s));
  renderer.destroySurface(s);
}
writeFileSync(join(dir, 'spec.json'), JSON.stringify(spec, null, 1));
console.log(`kinetic: ${total}f stills=10,55,65,100 KINETIC_OK`);
