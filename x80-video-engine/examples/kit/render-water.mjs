/** Render the kit-only water proof reel (stills + grain + audio). */
import { renderFrame } from '../../packages/core/dist/index.js';
import { renderToMp4 } from '../../packages/encoding/dist/index.js';
import { decodeAudioToPCM, mixTracks } from '../../packages/media/dist/index.js';
import { probeImage } from '../../packages/media/dist/index.js';
import {
  SkiaRenderer, createGrainTile, createSkiaMeasurer, registerFontFile, skiaTransitionApplier,
  preloadImages,
} from '../../packages/renderer-skia/dist/index.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildWaterProof, FONT, SERIF, GRAIN, IMG_A, IMG_B, IMG_C } from './plan-water.mjs';
import { audioBed } from '../kit/kit.mjs';

const DIR = dirname(fileURLToPath(import.meta.url));
const OUT = join(DIR, '../../output/water-proof');
mkdirSync(OUT, { recursive: true });
registerFontFile(join(DIR, '../iphone-reel/fonts', 'Inter-Regular.ttf'), FONT);
registerFontFile(join(DIR, '../iphone-reel/fonts', 'Inter-Bold.ttf'), FONT);
registerFontFile(join(DIR, '../iphone-reel/fonts', 'Playfair-Italic-Medium.ttf'), SERIF);

const ASSETS = '/kaggle/working/my-video/public/assets';
const entries = {
  [IMG_A]: join(ASSETS, 'cracked-mud.jpg'),
  [IMG_B]: join(ASSETS, 'drought.jpg'),
  [IMG_C]: join(ASSETS, 'woman-water.jpg'),
};
const images = await preloadImages(entries);
const dims = new Map();
for (const [id, src] of Object.entries(entries)) {
  const info = await probeImage(src);
  dims.set(id, { width: info.width, height: info.height });
}
const grain = createGrainTile(660, 1080, { seed: 31, amount: 0.5 });

const renderer = new SkiaRenderer();
const measure = createSkiaMeasurer();
const plan = buildWaterProof();
const options = () => ({
  measureText: measure,
  resolveAsset: (src) => (src === GRAIN ? grain : images.get(src)),
  assetInfo: (src) => dims.get(src),
  transitionApplier: skiaTransitionApplier(renderer),
});

for (const f of [30, 120, 210, 275]) {
  const s = renderer.createSurface(540, 960);
  renderer.clear(s, '#000000');
  renderFrame(renderer, s, plan, f, options());
  writeFileSync(join(OUT, `frame-${f}.png`), await renderer.encodePng(s));
  renderer.destroySurface(s);
}
console.log('previews done');

const bed = await decodeAudioToPCM(join(ASSETS, 'trickle.ogg'));
const sting = await decodeAudioToPCM(join(ASSETS, 'whoosh.wav'));
const mix = audioBed(bed, sting, { bedVolume: 0.5, stingVolume: 0.45, stingFrames: [80, 180, 250] })(mixTracks);

const surf = renderer.createSurface(540, 960);
const t = performance.now();
const mp4 = await renderToMp4({
  width: 540, height: 960, fps: 30, frameCount: 300,
  renderFrame: (f) => {
    renderer.clear(surf, '#000000');
    renderFrame(renderer, surf, plan, f, options());
    return Buffer.from(renderer.readPixels(surf).data);
  },
  audio: { pcm: mix, sampleRate: 44100, channels: 2 },
  onProgress: (f, n) => { if (f % 60 === 0) console.log(`encode ${f}/${n}`); },
});
renderer.destroySurface(surf);
writeFileSync(join(OUT, 'water-proof-10s.mp4'), mp4);
console.log(`mp4 ${(mp4.length / 1e6).toFixed(2)}MB in ${((performance.now() - t) / 1000).toFixed(1)}s magic=${mp4.subarray(4, 8).toString()}`);
