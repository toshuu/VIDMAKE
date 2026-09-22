/** Assets-ready timing: prep once, warm up, then time 300f render + encode. */
import { renderFrame } from '../../packages/core/dist/index.js';
import { renderToMp4 } from '../../packages/encoding/dist/index.js';
import {
  SkiaRenderer, createSkiaMeasurer, registerFontFile, skiaTransitionApplier,
} from '../../packages/renderer-skia/dist/index.js';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildIphoneReel } from './plan.mjs';

const DIR = dirname(fileURLToPath(import.meta.url));
const OUT = join(DIR, '../../output/iphone-reel');
const FONTS = join(DIR, '../../packages/renderer-skia/tests/fonts');
const FAMILY = 'Reel Noto Sans';

// 1. Asset prep (timed): fonts + measurer + renderer + plan + surface
let t = performance.now();
registerFontFile(join(FONTS, 'NotoSans-Regular.ttf'), FAMILY);
registerFontFile(join(FONTS, 'NotoSans-Bold.ttf'), FAMILY);
const renderer = new SkiaRenderer();
const measure = createSkiaMeasurer();
const plan = buildIphoneReel();
const surf = renderer.createSurface(540, 960);
const options = { measureText: measure, transitionApplier: skiaTransitionApplier(renderer) };
const prepMs = performance.now() - t;

// 2. Warmup (JIT + measure/string caches hot), untimed output
t = performance.now();
for (const f of [0, 75, 150, 225, 299]) {
  renderer.clear(surf, '#000000');
  renderFrame(renderer, surf, plan, f, options);
  renderer.readPixels(surf);
}
const warmupMs = performance.now() - t;

// 3. Render-only, assets ready: 300 frames, per-frame timing
const per = [];
t = performance.now();
for (let f = 0; f < 300; f++) {
  const f0 = performance.now();
  renderer.clear(surf, '#000000');
  renderFrame(renderer, surf, plan, f, options);
  renderer.readPixels(surf);
  per.push(performance.now() - f0);
}
const renderMs = performance.now() - t;
per.sort((a, b) => a - b);
const avg = renderMs / 300;
console.log(JSON.stringify({
  prepMs: +prepMs.toFixed(1),
  warmup5fMs: +warmupMs.toFixed(1),
  render300fMs: +renderMs.toFixed(1),
  avgMsPerFrame: +avg.toFixed(3),
  p50Ms: +per[150].toFixed(3),
  worstMs: +per[299].toFixed(3),
  renderFps: +(1000 / avg).toFixed(1),
}, null, 1));

// 4. Full encode, assets ready (same surface, same plan, caches hot)
t = performance.now();
const mp4 = await renderToMp4({
  width: 540, height: 960, fps: 30, frameCount: 300,
  renderFrame: (f) => {
    renderer.clear(surf, '#000000');
    renderFrame(renderer, surf, plan, f, options);
    return Buffer.from(renderer.readPixels(surf).data);
  },
});
const encodeMs = performance.now() - t;
renderer.destroySurface(surf);
writeFileSync(join(OUT, 'iphone-intro-10s-ready.mp4'), mp4);
console.log(JSON.stringify({
  encode300fMs: +encodeMs.toFixed(1),
  encodeFps: +(300 / (encodeMs / 1000)).toFixed(1),
  mp4MB: +(mp4.length / 1e6).toFixed(3),
  magic: mp4.subarray(4, 8).toString(),
}, null, 1));
