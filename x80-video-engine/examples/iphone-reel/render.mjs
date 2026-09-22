/** Render the 10s iPhone reel: preview PNGs + full H.264 MP4. */
import { renderFrame } from '../../packages/core/dist/index.js';
import { renderToMp4 } from '../../packages/encoding/dist/index.js';
import {
  SkiaRenderer, createSkiaMeasurer, registerFontFile, skiaTransitionApplier,
} from '../../packages/renderer-skia/dist/index.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildIphoneReel } from './plan.mjs';

const DIR = dirname(fileURLToPath(import.meta.url));
const OUT = join(DIR, '../../output/iphone-reel');
const FONTS = join(DIR, '../../packages/renderer-skia/tests/fonts');
const FAMILY = 'Reel Noto Sans';

mkdirSync(OUT, { recursive: true });
registerFontFile(join(FONTS, 'NotoSans-Regular.ttf'), FAMILY);
registerFontFile(join(FONTS, 'NotoSans-Bold.ttf'), FAMILY);

const renderer = new SkiaRenderer();
const measure = createSkiaMeasurer();
const plan = buildIphoneReel();
const options = () => ({
  measureText: measure,
  transitionApplier: skiaTransitionApplier(renderer),
});

const t0 = Date.now();
for (const f of [15, 90, 150, 210, 285]) {
  const s = renderer.createSurface(540, 960);
  renderer.clear(s, '#000000');
  renderFrame(renderer, s, plan, f, options());
  writeFileSync(join(OUT, `frame-${f}.png`), await renderer.encodePng(s));
  renderer.destroySurface(s);
}
console.log(`previews done in ${Date.now() - t0}ms`);

// Determinism spot-check: frame 90 twice
{
  const px = [];
  for (let i = 0; i < 2; i++) {
    const s = renderer.createSurface(540, 960);
    renderer.clear(s, '#000000');
    renderFrame(renderer, s, plan, 90, options());
    px.push(Buffer.from(renderer.readPixels(s).data));
    renderer.destroySurface(s);
  }
  console.log('deterministic frame-90:', px[0].equals(px[1]));
}

const surf = renderer.createSurface(540, 960);
const t1 = Date.now();
const mp4 = await renderToMp4({
  width: 540, height: 960, fps: 30, frameCount: 300,
  renderFrame: (f) => {
    renderer.clear(surf, '#000000');
    renderFrame(renderer, surf, plan, f, options());
    return Buffer.from(renderer.readPixels(surf).data);
  },
  onProgress: (f, n) => { if (f % 60 === 0) console.log(`encode ${f}/${n}`); },
});
renderer.destroySurface(surf);
writeFileSync(join(OUT, 'iphone-intro-10s.mp4'), mp4);
console.log(`mp4: ${(mp4.length / 1e6).toFixed(2)} MB, ${Date.now() - t1}ms total, magic=${mp4.subarray(4, 8).toString()}`);
