/** Render the X80 India reel: preview stills + full 15s H.264 MP4. */
import { renderFrame } from '../../packages/core/dist/index.js';
import { renderToMp4 } from '../../packages/encoding/dist/index.js';
import { decodeAudioToPCM, mixTracks, probeImage } from '../../packages/media/dist/index.js';
import {
  SkiaRenderer, createGrainTile, createSkiaMeasurer, registerFontFile, skiaTransitionApplier,
  preloadImages,
} from '../../packages/renderer-skia/dist/index.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildIndiaReel, FONT, DISP, GRAIN, DUR,
  IMG_MUMBAI, IMG_RAIL, IMG_HIGHWAY, IMG_AIRPORT, IMG_UPI, IMG_ROCKET, IMG_SOLAR,
} from './plan-india.mjs';

const DIR = dirname(fileURLToPath(import.meta.url));
const OUT = join(DIR, '../../output/india-x80');
mkdirSync(OUT, { recursive: true });

registerFontFile(join(DIR, 'fonts', 'Inter-400.ttf'), FONT);
registerFontFile(join(DIR, 'fonts', 'Inter-500.ttf'), FONT);
registerFontFile(join(DIR, 'fonts', 'Inter-600.ttf'), FONT);
registerFontFile(join(DIR, 'fonts', 'Inter-700.ttf'), FONT);
registerFontFile(join(DIR, 'fonts', 'Inter-800.ttf'), FONT);
registerFontFile(join(DIR, 'fonts', 'Poppins-600.ttf'), DISP);
registerFontFile(join(DIR, 'fonts', 'Poppins-700.ttf'), DISP);

const INDIA = '/kaggle/working/my-video/public/india';
const entries = {
  [IMG_MUMBAI]: join(INDIA, 'mumbai.jpg'),
  [IMG_RAIL]: join(INDIA, 'rail.jpg'),
  [IMG_HIGHWAY]: join(INDIA, 'highway.jpg'),
  [IMG_AIRPORT]: join(INDIA, 'airport.jpg'),
  [IMG_UPI]: join(INDIA, 'upi4.jpg'),
  [IMG_ROCKET]: join(INDIA, 'rocket.jpg'),
  [IMG_SOLAR]: join(INDIA, 'solar.jpg'),
};
const images = await preloadImages(entries);
const dims = new Map();
for (const [id, src] of Object.entries(entries)) {
  const info = await probeImage(src);
  dims.set(id, { width: info.width, height: info.height });
}
console.log('assets ready:', [...dims].map(([k, v]) => `${k} ${v.width}x${v.height}`).join(', '));

const grain = createGrainTile(660, 1080, { seed: 80, amount: 0.5 });

const renderer = new SkiaRenderer();
const measure = createSkiaMeasurer();
const plan = buildIndiaReel(measure);
const options = () => ({
  measureText: measure,
  resolveAsset: (src) => (src === GRAIN ? grain : images.get(src)),
  assetInfo: (src) => dims.get(src),
  transitionApplier: skiaTransitionApplier(renderer),
});

// Mid-act previews: hook, rail, roads, digital, finale.
for (const f of [45, 135, 225, 315, 405, 440]) {
  const s = renderer.createSurface(540, 960);
  renderer.clear(s, '#000000');
  renderFrame(renderer, s, plan, f, options());
  writeFileSync(join(OUT, `frame-${f}.png`), await renderer.encodePng(s));
  renderer.destroySurface(s);
}
console.log('previews done');

// Audio: low whoosh bed (mirrors the Remotion cut) + stingers on the 4 cuts.
const ASSETS = '/kaggle/working/my-video/public/assets';
const whoosh = await decodeAudioToPCM(join(ASSETS, 'whoosh.wav'));
const mix = mixTracks(
  [
    {
      pcm: whoosh.samples, sampleRate: whoosh.sampleRate, channels: whoosh.channels,
      fromFrame: 0, volume: 0.1, fadeInFrames: 20, fadeOutFrames: 40, durationFrames: DUR,
    },
    ...[90, 180, 270, 360].map((fromFrame) => ({
      pcm: whoosh.samples, sampleRate: whoosh.sampleRate, channels: whoosh.channels,
      fromFrame, volume: 0.5,
    })),
  ],
  { fps: 30, durationFrames: DUR },
);

const surf = renderer.createSurface(540, 960);
const t = performance.now();
const mp4 = await renderToMp4({
  width: 540, height: 960, fps: 30, frameCount: DUR,
  renderFrame: (f) => {
    renderer.clear(surf, '#000000');
    renderFrame(renderer, surf, plan, f, options());
    return Buffer.from(renderer.readPixels(surf).data);
  },
  audio: { pcm: mix, sampleRate: 44100, channels: 2 },
  onProgress: (f, n) => { if (f % 90 === 0) console.log(`encode ${f}/${n}`); },
});
renderer.destroySurface(surf);
writeFileSync(join(OUT, 'india-x80-15s.mp4'), mp4);
console.log(`mp4 ${(mp4.length / 1e6).toFixed(2)}MB in ${((performance.now() - t) / 1000).toFixed(1)}s magic=${mp4.subarray(4, 8).toString()}`);
