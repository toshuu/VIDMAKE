/** Render INDIA-FEST2: ChatGPT ReelSpec JSON, engine-compiled. Cast aliases map AI names to extracted rows. */
import { renderFrame, validateTimeline } from '../../packages/core/dist/index.js';
import { renderToMp4 } from '../../packages/encoding/dist/index.js';
import { decodeAudioToPCM, mixTracks, probeImage } from '../../packages/media/dist/index.js';
import {
  SkiaRenderer, createGrainTile, createSkiaMeasurer, registerFontFile,
  skiaTransitionApplier, preloadImages,
} from '../../packages/renderer-skia/dist/index.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileReel } from '../../packages/reelspec/dist/index.js';
import { readFileSync } from 'node:fs';

const DIR = dirname(fileURLToPath(import.meta.url));
const OUT = join(DIR, '../../output/india-fest2');
mkdirSync(OUT, { recursive: true });

const FONTS = '/kaggle/working/x80-video-engine/examples/india-reel/fonts';
for (const [f, fam] of [
  ['Inter-400.ttf', 'Inter'], ['Inter-500.ttf', 'Inter'], ['Inter-600.ttf', 'Inter'],
  ['Inter-700.ttf', 'Inter'], ['Inter-800.ttf', 'Inter'],
  ['Poppins-600.ttf', 'Poppins'], ['Poppins-700.ttf', 'Poppins'],
]) {
  registerFontFile(join(FONTS, f), fam);
}

const CAST = { DandiyaWoman: 'lehenga', DholMan: 'kurta', DiyaWoman: 'sari', TempleDancer: 'mundu', FestivalWoman: 'lehenga' };
const entries = {};
for (const cast of new Set(Object.values(CAST))) {
  for (let f = 0; f < 5; f += 1) {
    entries[`2x-${cast}-${f}`] = join(DIR, `sprites/2x/${cast}-${f}.png`);
  }
}
for (const n of ['diya', 'dandiya', 'dhol', 'flowers', 'lantern']) {
  entries[`prop2x-${n}`] = join(DIR, `sprites/props2x/${n}.png`);
}
for (const n of ['diya', 'dandiya', 'dhol']) {
  entries[`ic-${n}`] = join(DIR, `sprites/props2x/${n}.png`);
}
const images = await preloadImages(entries);
const dims = new Map();
for (const [id, src] of Object.entries(entries)) {
  const info = await probeImage(src);
  dims.set(id, { width: info.width, height: info.height });
}
console.log(`preloaded ${images.size} sprites+props`);

const grain = createGrainTile(660, 1080, { seed: 33, amount: 0.5 });
const renderer = new SkiaRenderer();
const measure = createSkiaMeasurer();
const measureFn = (text, size, weight, ls = 0, family = 'Inter') =>
  measure.measure(text, { fontFamily: family, fontSize: size, fontWeight: weight, letterSpacing: ls }).width;
const spec = JSON.parse(readFileSync(join(DIR, '../../examples/reelspec/specs/india-fest2.json'), 'utf8'));
const { plan } = compileReel(spec, { measure: measureFn });
validateTimeline(plan.timeline, plan.composition.root);
console.log('timeline valid (compiled from JSON)');

// Grain lives in the compiled plan (grainRef per act) — no render-side append.
const alias = (src) => {
  const m = /^india-festival\/([A-Za-z]+)-(\d)$/.exec(src);
  if (m) {
    const row = CAST[m[1]];
    if (row === undefined) throw new Error(`unknown cast ${m[1]}`);
    return `2x-${row}-${m[2]}`;
  }
  const p = /^india-festival\/([a-z]+)$/.exec(src);
  if (p) return `prop2x-${p[1]}`;
  return src;
};
const options = () => ({
  measureText: measure,
  resolveAsset: (src) => (src === 'grain-tile' ? grain : images.get(alias(src))),
  assetInfo: (src) => dims.get(alias(src)),
  transitionApplier: skiaTransitionApplier(renderer),
});

for (const f of [45, 135, 225, 315, 405]) {
  const s = renderer.createSurface(540, 960);
  renderer.clear(s, '#000000');
  renderFrame(renderer, s, plan, f, options());
  writeFileSync(join(OUT, `frame-${f}.png`), await renderer.encodePng(s));
  renderer.destroySurface(s);
}
console.log('stills done');

const ASSETS = '/kaggle/working/my-video/public/assets';
const whoosh = await decodeAudioToPCM(join(ASSETS, 'whoosh.wav'));
const total = plan.composition.durationInFrames;
const audio = mixTracks(
  [90, 180, 270, 360].map((fromFrame) => ({
    pcm: whoosh.samples, sampleRate: whoosh.sampleRate, channels: whoosh.channels,
    fromFrame, volume: 0.5,
  })),
  { fps: 30, durationFrames: total },
);

const surf = renderer.createSurface(540, 960);
const t = performance.now();
const mp4 = await renderToMp4({
  width: 540, height: 960, fps: 30, frameCount: total,
  renderFrame: (f) => {
    renderer.clear(surf, '#000000');
    renderFrame(renderer, surf, plan, f, options());
    return Buffer.from(renderer.readPixels(surf).data);
  },
  audio: { pcm: audio, sampleRate: 44100, channels: 2 },
  onProgress: (f, n) => { if (f % 90 === 0) console.log(`encode ${f}/${n}`); },
});
renderer.destroySurface(surf);
writeFileSync(join(OUT, 'india-fest2-15s.mp4'), mp4);
console.log(`mp4 ${(mp4.length / 1e6).toFixed(2)}MB in ${((performance.now() - t) / 1000).toFixed(1)}s`);
