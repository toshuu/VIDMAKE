/** Render the premium iPhone port: preview PNGs + full H.264 MP4. */
import { renderFrame } from '../../packages/core/dist/index.js';
import { renderToMp4 } from '../../packages/encoding/dist/index.js';
import { decodeAudioToPCM, mixTracks } from '../../packages/media/dist/index.js';
import {
  SkiaRenderer, createGrainTile, createSkiaMeasurer, registerFontFile, skiaTransitionApplier,
} from '../../packages/renderer-skia/dist/index.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildIphonePremium, FONT, GRAIN } from './plan-premium.mjs';

const DIR = dirname(fileURLToPath(import.meta.url));
const OUT = join(DIR, '../../output/iphone-premium');
mkdirSync(OUT, { recursive: true });
registerFontFile(join(DIR, 'fonts', 'Inter-Regular.ttf'), FONT);
registerFontFile(join(DIR, 'fonts', 'Inter-Bold.ttf'), FONT);

const renderer = new SkiaRenderer();
const measure = createSkiaMeasurer();
const plan = buildIphonePremium();
const grain = createGrainTile(660, 1080, { seed: 21, amount: 0.5 });
const options = () => ({
  measureText: measure,
  resolveAsset: (src) => (src === GRAIN ? grain : undefined),
  transitionApplier: skiaTransitionApplier(renderer),
});

for (const f of [20, 90, 140, 210, 280]) {
  const s = renderer.createSurface(540, 960);
  renderer.clear(s, '#000000');
  renderFrame(renderer, s, plan, f, options());
  writeFileSync(join(OUT, `frame-${f}.png`), await renderer.encodePng(s));
  renderer.destroySurface(s);
}
console.log('previews done');

const surf = renderer.createSurface(540, 960);
// SFX accents on act cuts (product spot stays music-free by taste).
const whoosh = await decodeAudioToPCM(join(DIR, '../../..', 'my-video/public/assets/whoosh.wav'));
const sfx = mixTracks(
  [75, 180, 255].map((fromFrame) => ({
    pcm: whoosh.samples, sampleRate: whoosh.sampleRate, channels: whoosh.channels,
    fromFrame, volume: 0.4,
  })),
  { fps: 30, durationFrames: 300 },
);
const t = performance.now();
const mp4 = await renderToMp4({
  width: 540, height: 960, fps: 30, frameCount: 300,
  renderFrame: (f) => {
    renderer.clear(surf, '#000000');
    renderFrame(renderer, surf, plan, f, options());
    return Buffer.from(renderer.readPixels(surf).data);
  },
  audio: { pcm: sfx, sampleRate: 44100, channels: 2 },
  onProgress: (f, n) => { if (f % 60 === 0) console.log(`encode ${f}/${n}`); },
});
renderer.destroySurface(surf);
writeFileSync(join(OUT, 'iphone-premium-10s.mp4'), mp4);
console.log(`mp4 ${(mp4.length / 1e6).toFixed(2)}MB in ${((performance.now() - t) / 1000).toFixed(1)}s magic=${mp4.subarray(4, 8).toString()}`);
