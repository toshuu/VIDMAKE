/**
 * prove-v3: ADD 2 spatial proof. Three novel free-system reels built on the
 * v3 spatial layer (hierarchies, fov camera, cylinder/cone/sphere/torus/tube,
 * Lambert light) — no preset layouts, three different spatial strategies.
 * Same contract as prove-v2: validate clean, checkSpec reported, compile
 * deterministic, stills byte-deterministic through the normal pipeline.
 */
import { checkSpec, compileReel, validateSpec } from '../../packages/reelspec/dist/index.js';
import { renderFrame, validateTimeline } from '../../packages/core/dist/index.js';
import {
  SkiaRenderer, createSkiaMeasurer, registerFontFile,
  skiaTransitionApplier,
} from '../../packages/renderer-skia/dist/index.js';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
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

const SPECS = ['v3-orrery', 'v3-colonnade', 'v3-vine'];
const FRAMES = [30, 60, 90];
const OUT = '/kaggle/working/x80-video-engine/output/unlimited-v3';

const renderer = new SkiaRenderer();
const measure = createSkiaMeasurer();
const measureFn = (text, size, weight, ls = 0, family = 'Inter') =>
  measure.measure(text, { fontFamily: family, fontSize: size, fontWeight: weight, letterSpacing: ls }).width;

let failed = 0;
for (const id of SPECS) {
  const spec = JSON.parse(readFileSync(join(DIR, `../reelspec/specs/${id}.json`), 'utf8'));
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
  const { plan } = compileReel(spec, { measure: measureFn });
  validateTimeline(plan.timeline, plan.composition.root);
  mkdirSync(join(OUT, id), { recursive: true });
  const opts = {
    measureText: measure,
    resolveAsset: () => { throw new Error('no assets in v3 proofs'); },
    assetInfo: () => undefined,
    resolveVideoFrame: () => { throw new Error('no video in v3 proofs'); },
    transitionApplier: skiaTransitionApplier(renderer),
  };
  for (const f of FRAMES) {
    const paint = () => {
      const s = renderer.createSurface(540, 960);
      renderer.clear(s, '#000000');
      renderFrame(renderer, s, plan, f, opts);
      return s;
    };
    const s1 = paint();
    const png1 = Buffer.from(await renderer.encodePng(s1));
    renderer.destroySurface(s1);
    const s2 = paint();
    const png2 = Buffer.from(await renderer.encodePng(s2));
    renderer.destroySurface(s2);
    if (!png1.equals(png2)) {
      console.log(`${id} frame-${f}: NONDETERMINISTIC`);
      failed += 1;
      continue;
    }
    writeFileSync(join(OUT, id, `frame-${f}.png`), png1);
    console.log(`${id} frame-${f}: ok (${png1.length} bytes, deterministic)`);
  }
}
if (failed > 0) {
  console.log(`PROVE-V3 FAIL (${failed})`);
  process.exit(1);
}
console.log('PROVE-V3 PASS: 3 novel spatial reels render deterministically');
