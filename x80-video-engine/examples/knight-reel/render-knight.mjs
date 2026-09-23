/** Render THE OATH: preload the knight 2x set, stills + 15s MP4. */
import { renderFrame } from '../../packages/core/dist/index.js';
import { validateTimeline } from '../../packages/core/dist/index.js';
import { renderToMp4 } from '../../packages/encoding/dist/index.js';
import { decodeAudioToPCM, mixTracks, probeImage } from '../../packages/media/dist/index.js';
import {
  SkiaRenderer, createGrainTile, createSkiaMeasurer, registerFontFile,
  skiaTransitionApplier, preloadImages,
} from '../../packages/renderer-skia/dist/index.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildKnightOath } from './plan-knight.mjs';

const DIR = dirname(fileURLToPath(import.meta.url));
const OUT = join(DIR, '../../output/knight-oath');
mkdirSync(OUT, { recursive: true });

const FONTS = '/kaggle/working/x80-video-engine/examples/india-reel/fonts';
for (const [f, fam] of [
  ['Inter-400.ttf', 'Inter'], ['Inter-500.ttf', 'Inter'], ['Inter-600.ttf', 'Inter'],
  ['Inter-700.ttf', 'Inter'],
  ['Poppins-600.ttf', 'Poppins'], ['Poppins-700.ttf', 'Poppins'], ['Inter-800.ttf', 'Inter'],
]) {
  registerFontFile(join(FONTS, f), fam);
}

const NAMES = ['march', 'charge', 'leap', 'road', 'oath'];
const entries = {};
for (const n of NAMES) {
  for (let f = 0; f < 5; f += 1) {
    entries[`k2-${n}-${f}`] = join(DIR, `sprites/2x/${n}-${f}.png`);
  }
}
const images = await preloadImages(entries);
const dims = new Map();
for (const [id, src] of Object.entries(entries)) {
  const info = await probeImage(src);
  dims.set(id, { width: info.width, height: info.height });
}
console.log(`preloaded ${images.size} sprites`);

const grain = createGrainTile(660, 1080, { seed: 9, amount: 0.5 });
const renderer = new SkiaRenderer();
const measure = createSkiaMeasurer();
const measureFn = (text, size, weight, ls = 0, family = 'Inter') =>
  measure.measure(text, { fontFamily: family, fontSize: size, fontWeight: weight, letterSpacing: ls }).width;
const plan = buildKnightOath(measureFn);
validateTimeline(plan.timeline, plan.composition.root);
console.log('timeline valid');

const grainNode = {
  id: 'grain', type: 'image', src: 'grain-tile', width: 660, height: 1080,
  opacity: 0.07, blendMode: 'overlay', x: -40, y: -30,
};
// Attach grain inside each act (painter order: draw last within act).
for (const act of plan.composition.root.children) {
  if (act.id !== 'chrome' && act.children) {
    act.children.push({ ...grainNode, id: `${act.id}-grain` });
  }
}

const options = () => ({
  measureText: measure,
  resolveAsset: (src) => (src === 'grain-tile' ? grain : images.get(src)),
  assetInfo: (src) => dims.get(src),
  transitionApplier: skiaTransitionApplier(renderer),
});

for (const f of [45, 135, 225, 315, 420]) {
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
const cuts = [90, 180, 270, 360].map((fromFrame) => ({
  pcm: whoosh.samples, sampleRate: whoosh.sampleRate, channels: whoosh.channels,
  fromFrame, volume: 0.5,
}));
const audio = mixTracks(cuts, { fps: 30, durationFrames: total });

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
writeFileSync(join(OUT, 'knight-oath-15s.mp4'), mp4);
console.log(`mp4 ${(mp4.length / 1e6).toFixed(2)}MB in ${((performance.now() - t) / 1000).toFixed(1)}s`);
