/**
 * prove-batch2: TEST PASS ROUND 2 renderer. 12 briefs × free-system specs →
 * validate + checkSpec + compile (deterministic) + MP4 + stills +
 * decisions/meta records. No new engine features used beyond what the
 * architecture already offers.
 */
import { checkSpec, compileReel, validateSpec } from '../../packages/reelspec/dist/index.js';
import { renderFrame, validateTimeline } from '../../packages/core/dist/index.js';
import { renderToMp4 } from '../../packages/encoding/dist/index.js';
import {
  SkiaRenderer, createSkiaMeasurer, registerFontFile,
  skiaTransitionApplier,
} from '../../packages/renderer-skia/dist/index.js';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const SPEC_DIR = join(DIR, '../reelspec/specs/batch2');
const OUT = '/kaggle/working/x80-video-engine/output/batch-test2';
const FONTS_CACHE = '/kaggle/working/x80-video-engine/fonts/cache';
const INDIA_FONTS = '/kaggle/working/x80-video-engine/examples/india-reel/fonts';

for (const [f, fam] of [
  ['Inter-400.ttf', 'Inter'], ['Inter-500.ttf', 'Inter'], ['Inter-600.ttf', 'Inter'],
  ['Inter-700.ttf', 'Inter'], ['Inter-800.ttf', 'Inter'],
  ['Poppins-600.ttf', 'Poppins'], ['Poppins-700.ttf', 'Poppins'],
].map(([f, fam]) => [join(INDIA_FONTS, f), fam])) {
  registerFontFile(f, fam);
}
registerFontFile(join(INDIA_FONTS, 'Poppins-800.ttf'), 'Poppins');
for (const [slug, fam, combos] of [
  ['rozha-one', 'Rozha One', ['400-normal']],
  ['bebas-neue', 'Bebas Neue', ['400-normal']],
  ['ibm-plex-mono', 'IBM Plex Mono', ['400-normal', '500-normal', '600-normal', '700-normal']],
  ['manrope', 'Manrope', ['400-normal', '500-normal', '600-normal', '700-normal', '800-normal']],
  ['space-grotesk', 'Space Grotesk', ['400-normal', '500-normal', '600-normal', '700-normal']],
]) {
  for (const c of combos) registerFontFile(join(FONTS_CACHE, slug, `${c}.ttf`), fam);
}
console.log('[batch] fonts registered');

const briefs = JSON.parse(readFileSync(join(SPEC_DIR, 'briefs.json'), 'utf8'));
const renderer = new SkiaRenderer();
const measure = createSkiaMeasurer();
const measureFn = (text, size, weight, ls = 0, family = 'Inter') =>
  measure.measure(text, { fontFamily: family, fontSize: size, fontWeight: weight, letterSpacing: ls }).width;

const ids = Object.keys(briefs).filter((k) => !k.startsWith('_'));
let failed = 0;
for (const id of ids) {
  const t0 = performance.now();
  const spec = JSON.parse(readFileSync(join(SPEC_DIR, `${id}.json`), 'utf8'));
  const errs = validateSpec(spec);
  if (errs.length > 0) {
    console.log(`${id}: VALIDATE FAIL\n- ${errs.join('\n- ')}`);
    failed += 1;
    continue;
  }
  const issues = checkSpec(spec);
  const a = JSON.stringify(compileReel(spec, { measure: measureFn }).plan);
  const b = JSON.stringify(compileReel(spec, { measure: measureFn }).plan);
  if (a !== b) {
    console.log(`${id}: COMPILE NONDETERMINISTIC`);
    failed += 1;
    continue;
  }
  const { plan, decisions, total } = compileReel(spec, { measure: measureFn });
  try {
    validateTimeline(plan.timeline, plan.composition.root);
  } catch (e) {
    console.log(`${id}: TIMELINE FAIL ${e.message}`);
    failed += 1;
    continue;
  }
  const dir = join(OUT, id);
  mkdirSync(dir, { recursive: true });
  copyFileSync(join(SPEC_DIR, `${id}.json`), join(dir, 'spec.json'));
  writeFileSync(join(dir, 'decisions.json'), JSON.stringify(decisions, null, 1));
  writeFileSync(join(dir, 'meta.json'), JSON.stringify({
    brief: briefs[id].brief, category: briefs[id].category, strategy: briefs[id].strategy,
    system: spec.system, layouts: spec.acts.map((x) => x.layout),
    checkSpec: issues, totalFrames: total,
  }, null, 1));
  const opts = {
    measureText: measure,
    resolveAsset: () => { throw new Error('no assets in batch'); },
    assetInfo: () => undefined,
    resolveVideoFrame: () => { throw new Error('no video in batch'); },
    transitionApplier: skiaTransitionApplier(renderer),
  };
  const comp = plan.composition;
  for (const f of [30, 90, 150]) {
    const paint = (frame) => {
      const s = renderer.createSurface(comp.width, comp.height);
      renderer.clear(s, '#000000');
      renderFrame(renderer, s, plan, frame, opts);
      return s;
    };
    const s1 = paint(f);
    const png1 = Buffer.from(await renderer.encodePng(s1));
    renderer.destroySurface(s1);
    const s2 = paint(f);
    const png2 = Buffer.from(await renderer.encodePng(s2));
    renderer.destroySurface(s2);
    if (!png1.equals(png2)) {
      console.log(`${id} frame-${f}: NONDETERMINISTIC`);
      failed += 1;
      continue;
    }
    writeFileSync(join(dir, `frame-${f}.png`), png1);
  }
  const surf = renderer.createSurface(comp.width, comp.height);
  const mp4 = await renderToMp4({
    width: comp.width, height: comp.height, fps: comp.fps, frameCount: total,
    renderFrame: (f) => {
      renderer.clear(surf, '#000000');
      renderFrame(renderer, surf, plan, f, opts);
      return Buffer.from(renderer.readPixels(surf).data);
    },
  });
  renderer.destroySurface(surf);
  const magic = mp4.subarray(4, 8).toString();
  writeFileSync(join(dir, `${id}-6s.mp4`), mp4);
  console.log(`${id}: mp4 ${(mp4.length / 1e6).toFixed(2)}MB magic=${magic} stills=3/${3} check=${issues.length} in ${((performance.now() - t0) / 1000).toFixed(0)}s`);
  if (magic !== 'ftyp') {
    console.log(`${id}: BAD MP4 MAGIC`);
    failed += 1;
  }
}
if (failed > 0) {
  console.log(`BATCH2 FAIL (${failed})`);
  process.exit(1);
}
console.log(`BATCH2 PASS: ${ids.length}/${ids.length} videos rendered`);
