/** Render any zero-shot plan end to end: Skia measure → stills + MP4. */
import { planBrief } from '../packages/planner/dist/index.js';
import { validateTimeline } from '../packages/core/dist/index.js';
import { renderFrame } from '../packages/core/dist/index.js';
import { renderToMp4 } from '../packages/encoding/dist/index.js';
import { decodeAudioToPCM, mixTracks } from '../packages/media/dist/index.js';
import {
  SkiaRenderer, createGrainTile, createSkiaMeasurer, registerFontFile,
  skiaTransitionApplier,
} from '../packages/renderer-skia/dist/index.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const reelId = process.argv[2] ?? 'r1';
const briefText = process.argv.slice(3).join(' ') || 'Feather Audio AI.';
const OUT = join('/kaggle/working/x80-video-engine/output', `planner-${reelId}`);
mkdirSync(OUT, { recursive: true });

const IFONTS = '/kaggle/working/x80-video-engine/examples/india-reel/fonts';
const HINDI = '/kaggle/working/x80-video-engine/examples/feather-reel/fonts/NotoDev-700.ttf';
registerFontFile(join(IFONTS, 'Inter-400.ttf'), 'Inter');
registerFontFile(join(IFONTS, 'Inter-500.ttf'), 'Inter');
registerFontFile(join(IFONTS, 'Inter-600.ttf'), 'Inter');
registerFontFile(join(IFONTS, 'Inter-700.ttf'), 'Inter');
registerFontFile(join(IFONTS, 'Inter-800.ttf'), 'Inter');
registerFontFile(join(IFONTS, 'Poppins-600.ttf'), 'Poppins');
registerFontFile(join(IFONTS, 'Poppins-700.ttf'), 'Poppins');
registerFontFile(HINDI, 'Hindi');

const renderer = new SkiaRenderer();
const measure = createSkiaMeasurer();
const measureFn = (text, size, weight, ls = 0, family = 'Inter') =>
  measure.measure(text, { fontFamily: family, fontSize: size, fontWeight: weight, letterSpacing: ls }).width;
const out = planBrief({ text: briefText }, measureFn);
const plan = out.plan;
validateTimeline(plan.timeline, plan.composition.root);

const grain = createGrainTile(660, 1080, { seed: 11, amount: 0.5 });
const options = () => ({
  measureText: measure,
  resolveAsset: (src) => (src === 'grain-tile' ? grain : undefined),
  transitionApplier: skiaTransitionApplier(renderer),
});

const total = plan.composition.durationInFrames;
const marks = [Math.round(total * 0.1), Math.round(total * 0.5), Math.round(total * 0.9)];
for (const f of marks) {
  const s = renderer.createSurface(540, 960);
  renderer.clear(s, '#000000');
  renderFrame(renderer, s, plan, f, options());
  writeFileSync(join(OUT, `frame-${f}.png`), await renderer.encodePng(s));
  renderer.destroySurface(s);
}
writeFileSync(join(OUT, 'brief.txt'), briefText);
writeFileSync(join(OUT, 'decisions.md'),
  `# ${reelId}\n\n## Intent\n${JSON.stringify(out.intent, null, 1)}\n\n## Concept\n${JSON.stringify({ ...out.concept, palette: out.concept.palette }, null, 1)}\n\n## Acts\n${out.acts.map((a) => `- ${a.beat.role} [${a.beat.frames}f, e${a.beat.energy}] ${a.shot.kind}: "${a.beat.claim}" // ${a.shot.why}`).join('\n')}\n\n## Transitions\n${out.acts.map((a) => a.transitionOut ? `- ${a.transitionOut.type}: ${a.transitionOut.why}` : '').filter(Boolean).join('\n')}\n\n## Critique rounds\n${out.critiqueRounds.map((r, i) => `round ${i}: ${r.length} issue(s)${r.map((c) => `\n  - [${c.severity}] ${c.rule}: ${c.detail}`).join('')}`).join('\n')}\n\n## Decisions\n${out.decisions.map((d) => `- ${d.path}: ${d.choice} — ${d.why}`).join('\n')}\n`);

// Audio: whoosh stingers at act boundaries.
const ASSETS = '/kaggle/working/my-video/public/assets';
const whoosh = await decodeAudioToPCM(join(ASSETS, 'whoosh.wav'));
let acc = 0;
const cuts = [];
for (const a of out.acts.slice(0, -1)) {
  acc += a.beat.frames;
  cuts.push(acc - 6);
}
const mix = mixTracks(
  [
    { pcm: whoosh.samples, sampleRate: whoosh.sampleRate, channels: whoosh.channels, fromFrame: 0, volume: 0.1, fadeInFrames: 20, fadeOutFrames: 40, durationFrames: total },
    ...cuts.map((fromFrame) => ({ pcm: whoosh.samples, sampleRate: whoosh.sampleRate, channels: whoosh.channels, fromFrame, volume: 0.5 })),
  ],
  { fps: 30, durationFrames: total },
);
const surf = renderer.createSurface(540, 960);
const mp4 = await renderToMp4({
  width: 540, height: 960, fps: 30, frameCount: total,
  renderFrame: (f) => {
    renderer.clear(surf, '#000000');
    renderFrame(renderer, surf, plan, f, options());
    return Buffer.from(renderer.readPixels(surf).data);
  },
  audio: { pcm: mix, sampleRate: 44100, channels: 2 },
});
renderer.destroySurface(surf);
const mp4Path = join(OUT, `reel-${reelId}-15s.mp4`);
writeFileSync(mp4Path, mp4);
console.log(`${reelId}: ${(mp4.length / 1e6).toFixed(2)}MB concept=${out.concept.id} shots=${out.acts.map((a) => a.shot.kind).join(',')}`);
