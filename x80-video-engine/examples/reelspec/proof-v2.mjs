/** Pixel-proof: compile vrindavan2.json and byte-compare5 stills vs the hand-built reel. */
import { compileReel, validateSpec } from '../../packages/reelspec/dist/index.js';
import { renderFrame, validateTimeline } from '../../packages/core/dist/index.js';
import {
  decodeVideoFrames, probeImage, probeVideo,
} from '../../packages/media/dist/index.js';
import {
  SkiaRenderer, createGrainTile, createSkiaMeasurer, registerFontFile,
  skiaTransitionApplier, preloadImages, framesToCanvases, clipResolver,
} from '../../packages/renderer-skia/dist/index.js';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const FONTS = '/kaggle/working/x80-video-engine/examples/india-reel/fonts';
for (const [f, fam] of [
  ['Inter-400.ttf', 'Inter'], ['Inter-500.ttf', 'Inter'], ['Inter-600.ttf', 'Inter'],
  ['Inter-700.ttf', 'Inter'], ['Inter-800.ttf', 'Inter'],
  ['Poppins-600.ttf', 'Poppins'], ['Poppins-700.ttf', 'Poppins'],
]) {
  registerFontFile(join(FONTS, f), fam);
}

const spec = JSON.parse(readFileSync(join(DIR, 'specs/vrindavan2.json'), 'utf8'));
const errs = validateSpec(spec);
if (errs.length > 0) throw new Error(errs.join('\n'));

const renderer = new SkiaRenderer();
const measure = createSkiaMeasurer();
const measureFn = (text, size, weight, ls = 0, family = 'Inter') =>
  measure.measure(text, { fontFamily: family, fontSize: size, fontWeight: weight, letterSpacing: ls }).width;
const { plan } = compileReel(spec, { measure: measureFn });
validateTimeline(plan.timeline, plan.composition.root);

const PROX = '/kaggle/working/resto-assets/prox';
const clipFiles = { 'clip-sign': 'v5', 'clip-buffet': 'v1', 'clip-tables': 'v3', 'clip-entry': 'v2', 'clip-gods': 'v4' };
const clips = {};
const meta = {};
for (const [id, f] of Object.entries(clipFiles)) {
  const probe = await probeVideo(join(PROX, `${f}.mp4`));
  const dec = await decodeVideoFrames(join(PROX, `${f}.mp4`));
  meta[id] = { width: dec.width, height: dec.height, durationSec: probe.durationSec, fps: probe.fps };
  clips[id] = framesToCanvases(dec);
}
const entries = {};
for (const n of ['cloche', 'chef', 'cocktail']) {
  entries[`ic-${n}`] = `/kaggle/working/x80-video-engine/examples/resto-reel/icons/1x/${n}.png`;
}
const images = await preloadImages(entries);
const dims = new Map();
for (const [id, src] of Object.entries(entries)) {
  const info = await probeImage(src);
  dims.set(id, { width: info.width, height: info.height });
}
const grain = createGrainTile(660, 1080, { seed: 21, amount: 0.5 });

// Grain already lives in the compiled plan (grainRef per act) —
// unlike hand plans, no render-side append.
const options = () => ({
  measureText: measure,
  resolveAsset: (src) => (src === 'grain-tile' ? grain : images.get(src)),
  assetInfo: (src) => {
    const m = meta[src];
    if (m) return { width: m.width, height: m.height, durationSec: m.durationSec, fps: m.fps };
    return dims.get(src);
  },
  resolveVideoFrame: clipResolver(clips),
  transitionApplier: skiaTransitionApplier(renderer),
});

let mismatches = 0;
for (const f of [45, 135, 225, 315, 405]) {
  const s = renderer.createSurface(540, 960);
  renderer.clear(s, '#000000');
  renderFrame(renderer, s, plan, f, options());
  const png = Buffer.from(await renderer.encodePng(s));
  const { writeFileSync: wf } = await import('node:fs');
  wf(`/tmp/opencode/proof-${f}.png`, png);
  renderer.destroySurface(s);
  const ref = readFileSync(`/kaggle/working/x80-video-engine/output/vrindavan2/frame-${f}.png`);
  const same = png.equals(ref);
  console.log(`frame-${f}: ${same ? 'IDENTICAL' : `DIFFER (${png.length} vs ${ref.length} bytes)`}`);
  if (!same) mismatches += 1;
}
if (mismatches > 0) process.exit(1);
console.log('PIXEL-PROOF PASS: JSON compiles to the exact shipped pixels');
