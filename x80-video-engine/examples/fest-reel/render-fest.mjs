/** Render FEST2-NAVRATRI: new-sheet reel (dandiya/dholman/sari/mundu + props). */
import { renderFrame, validateTimeline } from '../../packages/core/dist/index.js';
import { renderToMp4 } from '../../packages/encoding/dist/index.js';
import { decodeAudioToPCM, mixTracks, probeImage } from '../../packages/media/dist/index.js';
import {
  SkiaRenderer, createGrainTile, createSkiaMeasurer, registerFontFile,
  skiaTransitionApplier, preloadImages,
} from '../../packages/renderer-skia/dist/index.js';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkSpec, compileReel, validateSpec } from '../../packages/reelspec/dist/index.js';

const DIR = dirname(fileURLToPath(import.meta.url));
const OUT = join(DIR, '../../output/fest2-navratri');
mkdirSync(OUT, { recursive: true });

const FONTS = '/kaggle/working/x80-video-engine/examples/india-reel/fonts';
for (const [f, fam] of [
  ['Inter-400.ttf', 'Inter'], ['Inter-500.ttf', 'Inter'], ['Inter-600.ttf', 'Inter'],
  ['Inter-700.ttf', 'Inter'], ['Inter-800.ttf', 'Inter'],
  ['Poppins-600.ttf', 'Poppins'], ['Poppins-700.ttf', 'Poppins'],
]) {
  registerFontFile(join(FONTS, f), fam);
}
registerFontFile('/kaggle/working/x80-video-engine/fonts/cache/rozha-one/400-normal.ttf', 'Rozha One');

const CAST = { DandiyaWoman: 'dandiya', DholMan: 'dholman', SariWoman: 'sari', MunduMan: 'mundu' };
const entries = {};
for (const [cast, row] of Object.entries(CAST)) {
  for (let f = 0; f < 5; f += 1) {
    entries[`fest2-${cast.toLowerCase()}-${f}`] = join(DIR, `sprites/cells/${row}-${f}.png`);
  }
}
for (const n of ['diya', 'dandiya', 'dhol', 'flowers', 'lantern']) {
  entries[`fest2prop-${n}`] = join(DIR, `sprites/props/${n}.png`);
}
const images = await preloadImages(entries);
const dims = new Map();
for (const [id, src] of Object.entries(entries)) {
  const info = await probeImage(src);
  dims.set(id, { width: info.width, height: info.height });
}
console.log(`preloaded ${images.size} fest2 sprites+props`);

const spec = JSON.parse(readFileSync(join(DIR, '../reelspec/specs/fest2-navratri.json'), 'utf8'));
const errs = validateSpec(spec);
if (errs.length > 0) throw new Error(`validate:\n- ${errs.join('\n- ')}`);
const issues = checkSpec(spec);
console.log(`checkSpec: ${issues.length === 0 ? 'silent' : issues.map((i) => `${i.path}: ${i.message}`).join(' | ')}`);

const grain = createGrainTile(660, 1080, { seed: 44, amount: 0.5 });
const renderer = new SkiaRenderer();
const measure = createSkiaMeasurer();
const measureFn = (text, size, weight, ls = 0, family = 'Inter') =>
  measure.measure(text, { fontFamily: family, fontSize: size, fontWeight: weight, letterSpacing: ls }).width;
const a = JSON.stringify(compileReel(spec, { measure: measureFn }).plan);
const { plan, decisions, total } = compileReel(spec, { measure: measureFn });
if (JSON.stringify(plan) !== a) throw new Error('compile nondeterministic');
validateTimeline(plan.timeline, plan.composition.root);
console.log(`compiled: ${total}f, decisions: ${decisions.length}`);
writeFileSync(join(OUT, 'decisions.json'), JSON.stringify(decisions, null, 1));

const alias = (src) => {
  const m = /^fest2\/([A-Za-z]+)-(\d)$/.exec(src);
  if (m) return `fest2-${m[1].toLowerCase()}-${m[2]}`;
  const p = /^fest2\/([a-z]+)$/.exec(src);
  if (p) return `fest2prop-${p[1]}`;
  return src;
};
const options = () => ({
  measureText: measure,
  resolveAsset: (src) => (src === 'grain-tile' ? grain : images.get(alias(src))),
  assetInfo: (src) => dims.get(alias(src)),
  transitionApplier: skiaTransitionApplier(renderer),
});

for (const f of [30, 120, 210, 300, 400]) {
  const s = renderer.createSurface(540, 960);
  renderer.clear(s, '#000000');
  renderFrame(renderer, s, plan, f, options());
  writeFileSync(join(OUT, `frame-${f}.png`), await renderer.encodePng(s));
  renderer.destroySurface(s);
  console.log(`frame-${f} ok`);
}

const ASSETS = '/kaggle/working/my-video/public/assets';
const whoosh = await decodeAudioToPCM(join(ASSETS, 'whoosh.wav'));
const audio = mixTracks(
  [90, 210, 330].map((fromFrame) => ({
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
writeFileSync(join(OUT, 'fest2-navratri-15s.mp4'), mp4);
console.log(`mp4 ${(mp4.length / 1e6).toFixed(2)}MB in ${((performance.now() - t) / 1000).toFixed(1)}s magic=${mp4.subarray(4, 8).toString()}`);
