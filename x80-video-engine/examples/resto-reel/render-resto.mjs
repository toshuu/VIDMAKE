/** Render VRINDAVAN LAWNS: venue clips + icon chips + CTA, stills + 15s MP4. */
import { renderFrame, validateTimeline } from '../../packages/core/dist/index.js';
import { renderToMp4 } from '../../packages/encoding/dist/index.js';
import {
  decodeAudioToPCM, decodeVideoFrames, mixTracks, probeImage, probeVideo,
} from '../../packages/media/dist/index.js';
import {
  SkiaRenderer, createGrainTile, createSkiaMeasurer, registerFontFile,
  skiaTransitionApplier, preloadImages, framesToCanvases, clipResolver,
} from '../../packages/renderer-skia/dist/index.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildVrindavan, CLIP_SIGN, CLIP_BUFFET, CLIP_TABLES, CLIP_ENTRY, CLIP_GODS, GRAIN,
} from './plan-resto.mjs';

const DIR = dirname(fileURLToPath(import.meta.url));
const NOCHIPS = process.argv.includes('nochips');
const OUT = join(DIR, NOCHIPS ? '../../output/vrindavan-nochips' : '../../output/vrindavan');
mkdirSync(OUT, { recursive: true });

const FONTS = '/kaggle/working/x80-video-engine/examples/india-reel/fonts';
for (const [f, fam] of [
  ['Inter-400.ttf', 'Inter'], ['Inter-500.ttf', 'Inter'], ['Inter-600.ttf', 'Inter'],
  ['Inter-700.ttf', 'Inter'],
  ['Poppins-600.ttf', 'Poppins'], ['Poppins-700.ttf', 'Poppins'], ['Inter-800.ttf', 'Inter'],
  ['Poppins-600.ttf', 'Poppins'], ['Poppins-700.ttf', 'Poppins'],
]) {
  registerFontFile(join(FONTS, f), fam);
}

const PROX = '/kaggle/working/resto-assets/prox';
const SOURCES = {
  [CLIP_SIGN]: join(PROX, 'v5.mp4'),
  [CLIP_BUFFET]: join(PROX, 'v1.mp4'),
  [CLIP_TABLES]: join(PROX, 'v3.mp4'),
  [CLIP_ENTRY]: join(PROX, 'v2.mp4'),
  [CLIP_GODS]: join(PROX, 'v4.mp4'),
};
const clips = {};
const meta = {};
for (const [id, src] of Object.entries(SOURCES)) {
  const probe = await probeVideo(src);
  const dec = await decodeVideoFrames(src);
  meta[id] = { width: dec.width, height: dec.height, durationSec: probe.durationSec, fps: probe.fps };
  clips[id] = framesToCanvases(dec);
  console.log(`  ${id}: ${dec.width}x${dec.height} ${dec.frames.length}f`);
}

const ICONS = NOCHIPS ? [] : ['hotel', 'cloche', 'chef', 'cocktail', 'menu', 'flowers', 'booking', 'stars'];
const entries = {};
for (const n of ICONS) {
  entries[`ic-${n}`] = join(DIR, `icons/1x/${n}.png`);
}
const images = await preloadImages(entries);
const dims = new Map();
for (const [id, src] of Object.entries(entries)) {
  const info = await probeImage(src);
  dims.set(id, { width: info.width, height: info.height });
}
console.log(`preloaded ${images.size} icons`);

const grain = createGrainTile(660, 1080, { seed: 21, amount: 0.5 });
const renderer = new SkiaRenderer();
const measure = createSkiaMeasurer();
const measureFn = (text, size, weight, ls = 0, family = 'Inter') =>
  measure.measure(text, { fontFamily: family, fontSize: size, fontWeight: weight, letterSpacing: ls }).width;
const plan = buildVrindavan(measureFn, { chips: !NOCHIPS });
validateTimeline(plan.timeline, plan.composition.root);
console.log('timeline valid');

for (const act of plan.composition.root.children) {
  if (act.id !== 'chrome' && act.children) {
    act.children.push({
      id: `${act.id}-grain`, type: 'image', src: GRAIN,
      width: 660, height: 1080, opacity: 0.07, blendMode: 'overlay', x: -40, y: -30,
    });
  }
}

const options = () => ({
  measureText: measure,
  resolveAsset: (src) => (src === GRAIN ? grain : images.get(src)),
  assetInfo: (src) => {
    const m = meta[src];
    if (m) return { width: m.width, height: m.height, durationSec: m.durationSec, fps: m.fps };
    return dims.get(src);
  },
  resolveVideoFrame: clipResolver(clips),
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
writeFileSync(join(OUT, NOCHIPS ? 'vrindavan-nochips-15s.mp4' : 'vrindavan-15s.mp4'), mp4);
console.log(`mp4 ${(mp4.length / 1e6).toFixed(2)}MB in ${((performance.now() - t) / 1000).toFixed(1)}s`);
