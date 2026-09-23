/** Zero-shot benchmark: 12 unrelated briefs → plans → scored comparison. */
import { planBrief } from '../dist/index.js';
import { validateTimeline } from '../../core/dist/index.js';
import { renderFrame } from '../../core/dist/index.js';
import {
  SkiaRenderer, createGrainTile, createSkiaMeasurer, registerFontFile,
  skiaTransitionApplier, preloadImages,
} from '../../renderer-skia/dist/index.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));

const BRIEFS = [
  'Feather Audio AI: the fastest voice AI, most natural Hindi and English, 25 more languages launching globally soon.',
  'Crumb & Craft vegan bakery downtown: sourdough baked at 4am, 40 seats, order ahead for weekends.',
  'Ledgerly B2B invoicing SaaS: get paid 10 days faster, 5000 teams onboard, start free trial today.',
  'Stride marathon training app: from couch to 42k in 20 weeks, 120k finishers, download now.',
  'SunNest solar rooftops: cut power bills 70 percent, 25-year warranty, book a free site survey.',
  'Second Chance pet adoption drive: 300 shelter dogs need homes this month, adopt this weekend.',
  'Stillpoint yoga studio: sunrise batches, first week free, 12 certified teachers.',
  'Ghostline VPN: zero-log privacy, 90 countries, 2-minute setup, protect every device.',
  'Northbrew coffee subscription: single-origin beans roasted weekly, 30k subscribers, brew better mornings.',
  'BhashaBridge language tutoring: Hindi and English fluency in 90 days, 1-on-1 mentors, book a free demo.',
  'VoltGo electric scooters: 120 km range, charge in 3 hours, test ride this Sunday.',
  'Maya Rao freelance brand designer: 80 identities shipped, logos that outlive trends, new slots open.',
];

const score = (out, all) => {
  const s = { understanding: 0, originality: 0, narrative: 0, visual: 0, hierarchy: 0, pacing: 0, motion: 0, template: 0 };
  const notes = {};
  // understanding: domain found + keywords
  s.understanding = (out.intent.domain !== 'general' ? 1 : 0) + (out.intent.keywords.length >= 4 ? 1 : 0);
  notes.understanding = `${out.intent.domain}/${out.intent.goal}, ${out.intent.keywords.length} keywords`;
  // originality: signature uniqueness across bench
  const twins = all.filter((o) => o.concept.id === out.concept.id && o.concept.palette.bg === out.concept.palette.bg).length;
  s.originality = twins <= 1 ? 2 : twins === 2 ? 1 : 0;
  notes.originality = `${out.concept.id} + ${out.concept.palette.bg} (×${twins})`;
  // narrative: hook≠cta, cta matches goal
  s.narrative = (out.acts[0].beat.claim !== out.acts[4].beat.claim ? 1 : 0)
    + (out.acts[4].beat.claim.length > 3 ? 1 : 0);
  notes.narrative = `hook "${out.acts[0].beat.claim.slice(0, 34)}" → cta "${out.acts[4].beat.claim}"`;
  // visual: final-round warns (R1 anchors)
  const warns = out.critiqueRounds.flat().filter((c) => c.severity === 'warn').length;
  s.visual = warns === 0 ? 2 : warns <= 2 ? 1 : 0;
  notes.visual = `${warns} warns`;
  // hierarchy: no surviving R2 errors
  const r2 = out.critiqueRounds.flat().filter((c) => c.rule.startsWith('R2') && c.severity === 'error').length;
  s.hierarchy = r2 === 0 ? 2 : 0;
  notes.hierarchy = `${r2} overflow errors`;
  // pacing: all acts ≥60f, hook ≤25%
  const fr = out.acts.map((a) => a.beat.frames);
  const total = fr.reduce((a, b) => a + b, 0);
  s.pacing = (Math.min(...fr) >= 60 ? 1 : 0) + (fr[0] / total <= 0.25 ? 1 : 0);
  notes.pacing = fr.join('/');
  // motion: transition variety + motivated whys
  const types = new Set(out.acts.map((a) => a.transitionOut?.type).filter(Boolean));
  s.motion = (types.size >= 2 ? 1 : 0) + (out.acts.every((a) => a.motion.entranceWhy.length > 5) ? 1 : 0);
  notes.motion = [...types].join(',');
  // template: no 3-run, duels ≤2
  const kinds = out.acts.map((a) => a.shot.kind);
  let run = 1;
  for (let i = 1; i < kinds.length; i += 1) {
    run = kinds[i] === kinds[i - 1] ? run + 1 : 1;
    if (run >= 3) {
      break;
    }
  }
  const duels = kinds.filter((k) => k === 'statDuel').length;
  s.template = (run < 3 ? 1 : 0) + (duels <= 2 ? 1 : 0);
  notes.template = `${kinds.join('>')}`;
  s.total = Object.values(s).reduce((a, b) => a + b, 0) - 0;
  s.total = s.understanding + s.originality + s.narrative + s.visual + s.hierarchy + s.pacing + s.motion + s.template;
  return { s, notes };
};

const results = BRIEFS.map((text) => ({ text, out: planBrief({ text }) }));
// validity gate: every output must pass the engine validator.
for (const { out } of results) {
  const plan = out.plan;
  validateTimeline(plan.timeline, plan.composition.root);
}
const scored = results.map(({ text, out }) => ({ text, out, ...score(out, results.map((r) => r.out)) }));

// Proof render: first brief → 3 stills through the real Skia pipeline.
const proofOut = join(DIR, 'proof');
mkdirSync(proofOut, { recursive: true });
const IFONTS = '/kaggle/working/x80-video-engine/examples/india-reel/fonts';
registerFontFile(join(IFONTS, 'Inter-400.ttf'), 'Inter');
registerFontFile(join(IFONTS, 'Inter-500.ttf'), 'Inter');
registerFontFile(join(IFONTS, 'Inter-600.ttf'), 'Inter');
registerFontFile(join(IFONTS, 'Inter-700.ttf'), 'Inter');
registerFontFile(join(IFONTS, 'Inter-800.ttf'), 'Inter');
registerFontFile(join(IFONTS, 'Poppins-600.ttf'), 'Poppins');
registerFontFile(join(IFONTS, 'Poppins-700.ttf'), 'Poppins');
const renderer = new SkiaRenderer();
const measure = createSkiaMeasurer();
const grain = createGrainTile(660, 1080, { seed: 7, amount: 0.5 });
const plan0 = results[0].out.plan;
for (const f of [45, 225, 405]) {
  const s = renderer.createSurface(540, 960);
  renderer.clear(s, '#000000');
  renderFrame(renderer, s, plan0, f, {
    measureText: measure,
    resolveAsset: (src) => (src === 'grain-tile' ? grain : undefined),
    transitionApplier: skiaTransitionApplier(renderer),
  });
  writeFileSync(join(proofOut, `frame-${f}.png`), await renderer.encodePng(s));
  renderer.destroySurface(s);
}

const CRIT = ['understanding', 'originality', 'narrative', 'visual', 'hierarchy', 'pacing', 'motion', 'template'];
let md = `# Zero-shot benchmark — 12 unrelated briefs\n\n**Date:** 2026-09-23 · **Planner:** \`@x80/planner\` (no reference images, no asset lists, no storyboards) · **Score:** /16 automated rubric\n\n| # | Brief | Concept | U | O | N | V | H | P | M | T | Total |\n|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
scored.forEach((r, i) => {
  const short = r.text.length > 52 ? `${r.text.slice(0, 49)}…` : r.text;
  md += `| ${i + 1} | ${short} | ${r.out.concept.id} | ${r.s.understanding} | ${r.s.originality} | ${r.s.narrative} | ${r.s.visual} | ${r.s.hierarchy} | ${r.s.pacing} | ${r.s.motion} | ${r.s.template} | **${r.s.total}** |\n`;
});
const avg = {};
for (const c of CRIT) {
  avg[c] = (scored.reduce((a, r) => a + r.s[c], 0) / scored.length).toFixed(2);
}
md += `\n**Averages:** ${CRIT.map((c) => `${c} ${avg[c]}`).join(' · ')} · **mean total ${(scored.reduce((a, r) => a + r.s.total, 0) / scored.length).toFixed(2)}/16**\n`;
md += `\n**Validity:** all 12 outputs pass engine \`validateTimeline\` (no overlaps, no bad freeze pins).\n`;
md += `\n**Proof render:** first brief through real Skia pipeline → \`bench/proof/frame-{45,225,405}.png\`.\n\n## Per-brief detail\n`;
scored.forEach((r, i) => {
  md += `\n### ${i + 1}. ${r.text}\n\n- intent: ${r.out.intent.domain}/${r.out.intent.goal} → "${r.out.intent.cta}" · audience ${r.out.intent.audience}\n- concept: **${r.out.concept.id}** (${r.out.concept.metaphorWhy})\n- signature: ${r.out.concept.signature} (${r.out.concept.signatureWhy})\n- palette: ${r.out.concept.palette.bg} / ${r.out.concept.palette.accent} (${r.out.concept.paletteWhy})\n- beats: ${r.out.acts.map((a) => `[${a.beat.role}:${a.beat.frames}f→${a.shot.kind}]`).join(' ')}\n- transitions: ${r.out.acts.map((a) => a.transitionOut?.type ?? '—').join(',')}\n- critique rounds: ${r.out.critiqueRounds.length} (${r.out.critiqueRounds.map((c) => c.length).join('/')}) · decisions: ${r.out.decisions.length}\n- notes: ${CRIT.map((c) => `${c}=${r.notes[c]}`).join('; ')}\n`;
});
writeFileSync(join(DIR, 'BENCHMARK.md'), md);
console.log(`bench done: mean ${(scored.reduce((a, r) => a + r.s.total, 0) / scored.length).toFixed(2)}/16`);
for (const r of scored) {
  console.log(r.s.total, r.out.concept.id, r.text.slice(0, 40));
}
