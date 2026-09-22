/** Render the café premium reel (real clips + stills-free, all motion). */
import { renderFrame } from '../../packages/core/dist/index.js';
import { renderToMp4 } from '../../packages/encoding/dist/index.js';
import { decodeAudioToPCM, decodeVideoFrames, mixTracks, probeVideo } from '../../packages/media/dist/index.js';
import {
  SkiaRenderer, createGrainTile, createSkiaMeasurer, registerFontFile, skiaTransitionApplier,
  framesToCanvases, clipResolver,
} from '../../packages/renderer-skia/dist/index.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCafePremium, FONT, SERIF, GRAIN, CLIP_A, CLIP_B, CLIP_C } from './plan-cafe.mjs';

const DIR = dirname(fileURLToPath(import.meta.url));
const OUT = join(DIR, '../../output/cafe-premium');
mkdirSync(OUT, { recursive: true });
registerFontFile(join(DIR, 'fonts', 'Inter-Regular.ttf'), FONT);
registerFontFile(join(DIR, 'fonts', 'Inter-Bold.ttf'), FONT);
registerFontFile(join(DIR, 'fonts', 'Playfair-Italic-Medium.ttf'), SERIF);
registerFontFile(join(DIR, 'fonts', 'Playfair-Italic-Bold.ttf'), SERIF);

const CAFE = '/kaggle/working/my-video/public/cafe';
// Short cuts only: full-length ambience/decor would decode gigabytes of RGBA.
// 1080p cuts decode at 540x960 proxies (same 9:16 aspect, 1/4 the bytes).
const SOURCES = {
  [CLIP_A]: { src: join(CAFE, 'cut2.mp4'), scale: undefined },
  [CLIP_B]: { src: join(CAFE, 'cut3.mp4'), scale: { width: 540, height: 960 } },
  [CLIP_C]: { src: join(CAFE, 'cut4.mp4'), scale: { width: 540, height: 960 } },
};

const tPrep = performance.now();
const clips = {};
const meta = {};
for (const [id, { src, scale }] of Object.entries(SOURCES)) {
  const probe = await probeVideo(src);
  const dec = await decodeVideoFrames(src, undefined, scale ? { scale } : undefined);
  // assetInfo MUST describe the decoded handles (proxy dims), not the
  // container: the compositor builds its source-crop rect from it.
  meta[id] = { width: dec.width, height: dec.height, durationSec: probe.durationSec, fps: probe.fps };
  clips[id] = framesToCanvases(dec);
}
console.log(`assets decoded in ${((performance.now() - tPrep) / 1000).toFixed(1)}s`);
for (const [id, m] of Object.entries(meta)) {
  console.log(`  ${id}: ${m.width}x${m.height} ${m.fps}fps ${m.durationSec.toFixed(1)}s`);
}

const renderer = new SkiaRenderer();
const measure = createSkiaMeasurer();
const plan = buildCafePremium();
const tGrain = performance.now();
const grain = createGrainTile(660, 1080, { seed: 11, amount: 0.55 });
console.log(`grain tile baked in ${(performance.now() - tGrain).toFixed(0)}ms (one-time)`);
const options = () => ({
  measureText: measure,
  resolveAsset: (src) => (src === GRAIN ? grain : undefined),
  assetInfo: (src) => {
    const m = meta[src];
    return m ? { width: m.width, height: m.height, durationSec: m.durationSec, fps: m.fps } : undefined;
  },
  resolveVideoFrame: clipResolver(clips),
  transitionApplier: skiaTransitionApplier(renderer),
});

for (const f of [30, 130, 230, 280]) {
  const s = renderer.createSurface(540, 960);
  renderer.clear(s, '#000000');
  renderFrame(renderer, s, plan, f, options());
  writeFileSync(join(OUT, `frame-${f}.png`), await renderer.encodePng(s));
  renderer.destroySurface(s);
}
console.log('previews done');

const surf = renderer.createSurface(540, 960);

// Sound bed: cafe music under all 10s + whoosh stingers on act cuts.
const tAudio = performance.now();
const CAFE_DIR = '/kaggle/working/my-video/public/cafe';
const ASSETS_DIR = '/kaggle/working/my-video/public/assets';
const bed = await decodeAudioToPCM(join(CAFE_DIR, 'music.mp3'));
const whoosh = await decodeAudioToPCM(join(ASSETS_DIR, 'whoosh.wav'));
const mix = mixTracks(
  [
    { pcm: bed.samples, sampleRate: bed.sampleRate, channels: bed.channels, fromFrame: 0, volume: 0.32, fadeInFrames: 30, fadeOutFrames: 60, durationFrames: 300 },
    { pcm: whoosh.samples, sampleRate: whoosh.sampleRate, channels: whoosh.channels, fromFrame: 90, volume: 0.5 },
    { pcm: whoosh.samples, sampleRate: whoosh.sampleRate, channels: whoosh.channels, fromFrame: 200, volume: 0.5 },
    { pcm: whoosh.samples, sampleRate: whoosh.sampleRate, channels: whoosh.channels, fromFrame: 260, volume: 0.45 },
  ],
  { fps: 30, durationFrames: 300 },
);
console.log(`audio mixed in ${(performance.now() - tAudio).toFixed(0)}ms`);
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
writeFileSync(join(OUT, 'cafe-premium-10s.mp4'), mp4);
console.log(`mp4 ${(mp4.length / 1e6).toFixed(2)}MB in ${((performance.now() - t) / 1000).toFixed(1)}s magic=${mp4.subarray(4, 8).toString()}`);
