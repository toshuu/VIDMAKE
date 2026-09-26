/**
 * prove-dials: dials-adapted planning test. 3 fresh briefs (locksmith
 * mechanism, storm umbrella, phantom jam) planned under planning-dept §7,
 * rendered through the normal pipeline: validate + checkSpec + compile
 * (deterministic) + stills + MP4 + records.
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
const SPEC_DIR = join(DIR, '../reelspec/specs/dials');
const OUT = '/kaggle/working/x80-video-engine/output/dials-test';
const FONTS_CACHE = '/kaggle/working/x80-video-engine/fonts/cache';
const INDIA_FONTS = '/kaggle/working/x80-video-engine/examples/india-reel/fonts';

for (const [f, fam] of [
  ['Inter-400.ttf', 'Inter'], ['Inter-500.ttf', 'Inter'], ['Inter-600.ttf', 'Inter'],
  ['Inter-700.ttf', 'Inter'], ['Inter-800.ttf', 'Inter'],
].map(([f, fam]) => [join(INDIA_FONTS, f), fam])) {
  registerFontFile(f, fam);
}
for (const [slug, fam, combos] of [
  ['ibm-plex-mono', 'IBM Plex Mono', ['400-normal', '500-normal', '700-normal']],
  ['manrope', 'Manrope', ['400-normal', '500-normal', '600-normal', '700-normal', '800-normal']],
  ['space-grotesk', 'Space Grotesk', ['700-normal']],
]) {
  for (const c of combos) registerFontFile(join(FONTS_CACHE, slug, `${c}.ttf`), fam);
}

const IDS = ['y1-moonphase', 'y2-market', 'y3-anc', 'y4-ninety'];
const renderer = new SkiaRenderer();
const measure = createSkiaMeasurer();
const measureFn = (text, size, weight, ls = 0, family = 'Inter') =>
  measure.measure(text, { fontFamily: family, fontSize: size, fontWeight: weight, letterSpacing: ls }).width;

let failed = 0;
for (const id of IDS) {
  const spec = JSON.parse(readFileSync(join(SPEC_DIR, `${id}.json`), 'utf8'));
  const errs = validateSpec(spec);
  if (errs.length > 0) {
    console.log(`${id}: VALIDATE FAIL\n- ${errs.join('\n- ')}`);
    failed += 1;
    continue;
  }
  const issues = checkSpec(spec);
  console.log(`${id}: validate clean; checkSpec: ${issues.length === 0 ? 'silent' : issues.map((i) => `${i.path}: ${i.message}`).join(' | ')}`);
  const a = JSON.stringify(compileReel(spec, { measure: measureFn }).plan);
  const b = JSON.stringify(compileReel(spec, { measure: measureFn }).plan);
  if (a !== b) {
    console.log(`${id}: COMPILE NONDETERMINISTIC`);
    failed += 1;
    continue;
  }
  const { plan, decisions, total } = compileReel(spec, { measure: measureFn });
  validateTimeline(plan.timeline, plan.composition.root);
  const dir = join(OUT, id);
  mkdirSync(dir, { recursive: true });
  copyFileSync(join(SPEC_DIR, `${id}.json`), join(dir, 'spec.json'));
  writeFileSync(join(dir, 'decisions.json'), JSON.stringify(decisions, null, 1));
  const opts = {
    measureText: measure,
    resolveAsset: () => { throw new Error('no assets in taste test'); },
    assetInfo: () => undefined,
    resolveVideoFrame: () => { throw new Error('no video in taste test'); },
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
  writeFileSync(join(dir, `${id}-6s.mp4`), mp4);
  console.log(`${id}: mp4 ${(mp4.length / 1e6).toFixed(2)}MB magic=${mp4.subarray(4, 8).toString()} stills=3/3`);
}
if (failed > 0) {
  console.log(`DIALS FAIL (${failed})`);
  process.exit(1);
}
console.log('DIALS PASS: 3/3 planned + rendered');
