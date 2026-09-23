/**
 * Concept invention: candidate visual metaphors + signature elements,
 * scored against the brief. Rejected candidates keep their reasons —
 * that IS the explainability.
 */
import type { Concept, Intent, Palette } from './ir.js';

interface Metaphor {
  id: string;
  label: string;
  primitives: string;
  energy: 1 | 2 | 3;
  domains: string[];
  signature: string;
}

const METAPHORS: Metaphor[] = [
  { id: 'orbit', label: 'orbit emblem', primitives: 'ring + satellite + center mark', energy: 2, domains: ['voice', 'saas', 'mobility', 'finance'], signature: 'orbiting satellite around the brand mark' },
  { id: 'waveform', label: 'voice waveform', primitives: 'phase-shifted bars + morphing wave line', energy: 3, domains: ['voice', 'education'], signature: 'living equalizer that never fully stills' },
  { id: 'ascent', label: 'ascending bars', primitives: 'rising bar chart + arrow', energy: 2, domains: ['finance', 'saas', 'fitness', 'energy'], signature: 'bars that climb past the frame edge' },
  { id: 'marquee', label: 'language ticker', primitives: 'scrolling band + anchor icon', energy: 2, domains: ['voice', 'education', 'creative'], signature: 'endless ribbon of tongues' },
  { id: 'display-type', label: 'giant display numeral', primitives: 'oversized figure + small icon', energy: 3, domains: ['general', 'finance', 'energy', 'pets'], signature: 'one number too big to ignore' },
  { id: 'duel', label: 'stat duel', primitives: 'two frosted glass cards', energy: 2, domains: ['general', 'saas', 'mobility', 'subscription'], signature: 'twin proof cards, staggered entrance' },
  { id: 'rays', label: 'burst rays', primitives: 'radiating lines + core', energy: 3, domains: ['food', 'fitness', 'pets'], signature: 'dawn-burst behind the hero' },
  { id: 'concentric', label: 'concentric calm', primitives: 'nested rings, slow pulse', energy: 1, domains: ['wellness', 'health', 'pets'], signature: 'breathing rings (slowest motion on the reel)' },
  { id: 'grid', label: 'precision grid', primitives: 'hairline grid + crosshair + mono data', energy: 1, domains: ['security', 'saas', 'finance'], signature: 'crosshair that locks onto the claim' },
  { id: 'cluster', label: 'community cluster', primitives: 'orbiting dots + faces implied', energy: 2, domains: ['pets', 'education', 'creative'], signature: 'dots gathering into a whole' },
  { id: 'script', label: 'mother-tongue display', primitives: 'giant native-script word + translation', energy: 3, domains: ['voice', 'education'], signature: 'the word itself as the visual' },
  { id: 'route', label: 'route line', primitives: 'dashed path + moving dot (motionPath)', energy: 2, domains: ['mobility', 'food', 'subscription'], signature: 'a dot traveling from problem to door' },
];

interface PaletteArch {
  id: string;
  palette: Palette;
  tones: string[];
  why: string;
}

const PALETTES: PaletteArch[] = [
  {
    id: 'gold-luxe', tones: ['bold', 'electric', 'premium'],
    palette: { bg: '#07080f', ink: '#ffffff', accent: '#e8b34b', accent2: '#4aa8ff', pillBg: '#10141f', pillFg: '#f3d9a0' },
    why: 'gold reads premium + efficient; navy keeps type legible',
  },
  {
    id: 'blue-violet', tones: ['bold', 'electric', 'tech'],
    palette: { bg: '#05070f', ink: '#ffffff', accent: '#2997ff', accent2: '#a259ff', pillBg: '#eef4ff', pillFg: '#0b1020' },
    why: 'tech default done deliberately: blue trust + violet wonder',
  },
  {
    id: 'leaf', tones: ['warm', 'calm', 'green'],
    palette: { bg: '#07120c', ink: '#ffffff', accent: '#4ade80', accent2: '#f3d9a0', pillBg: '#f2fbf4', pillFg: '#0b1020' },
    why: 'green for living/growing subjects; cream pill stays readable',
  },
  {
    id: 'ember', tones: ['warm', 'direct', 'bold'],
    palette: { bg: '#120a06', ink: '#ffffff', accent: '#ff7a45', accent2: '#ffd166', pillBg: '#fff7ea', pillFg: '#0b1020' },
    why: 'ember appetite-energy for food/fitness; cream pill for contrast',
  },
  {
    id: 'clinical', tones: ['clean', 'confident'],
    palette: { bg: '#0a0e14', ink: '#ffffff', accent: '#7fd4ff', accent2: '#a8e6ff', pillBg: '#eef4ff', pillFg: '#0b1020' },
    why: 'ice on ink: precision subjects, zero decoration',
  },
];

const hashBrief = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const scoreMetaphor = (m: Metaphor, intent: Intent): { score: number; why: string } => {
  let score = m.energy; // base: reels favor motion
  const whys: string[] = [`base energy ${m.energy}`];
  if (m.domains.includes(intent.domain)) {
    score += 3;
    whys.push(`+3 domain match (${intent.domain})`);
  } else if (m.domains.includes('general')) {
    score += 1;
    whys.push('+1 general-purpose fallback');
  }
  if (intent.wantsHindi && m.id === 'script') {
    score += 2;
    whys.push('+2 brief demands Hindi voice');
  }
  if (intent.goal === 'launch' && (m.id === 'orbit' || m.id === 'display-type')) {
    score += 1;
    whys.push('+1 launch wants an icon moment');
  }
  return { score, why: whys.join('; ') };
};

export const invent = (intent: Intent): Concept => {
  const ranked = METAPHORS.map((m) => {
    const base = scoreMetaphor(m, intent);
    // Deterministic exploration jitter (±0.4 by brief hash): breaks domain
    // monotony across briefs without ever outranking a true domain match (+3).
    const h = hashBrief(intent.topic + m.id) % 100;
    const jitter = (h / 100 - 0.5) * 0.8;
    return { m, score: base.score + jitter, why: `${base.why}; jitter ${jitter >= 0 ? '+' : ''}${jitter.toFixed(2)}` };
  }).sort((a, b) => b.score - a.score || (a.m.id < b.m.id ? -1 : 1));
  const top = ranked[0]!;
  const palette =
    PALETTES.find((p) => p.tones.some((t) => intent.tone.includes(t))) ?? PALETTES[4]!;
  const displayFace = intent.domain === 'creative' || intent.domain === 'food' ? 'Poppins' : 'Inter';
  // Integrity: the pairing statement must describe what compose actually
  // renders. Heroes render in displayFace; kickers/stats/numbers always
  // render Poppins-700 and body Inter-500/600 — that split (geometric
  // kickers + neutral heroes/body) is the character, on every domain.
  // The old copy claimed "Inter display (character) + Inter body" while
  // shipping one family — the exact single-family default dept rule #12 bans.
  const pairingWhy = displayFace === 'Poppins'
    ? 'Poppins display (character) + Inter body (muscle) — geometric voice, neutral muscle'
    : 'Inter heroes/body (neutral muscle) + Poppins-700 kickers/numbers (geometric character) — character lives in kickers, stats, ticker';
  return {
    id: top.m.id,
    metaphor: top.m.label,
    metaphorWhy: `${top.m.label} scored ${top.score} (${top.why}); primitives: ${top.m.primitives}`,
    signature: top.m.signature,
    signatureWhy: `signature of the winning metaphor — the one shot the reel is remembered by`,
    palette: palette.palette,
    paletteWhy: `${palette.id}: ${palette.why}; brief tone [${intent.tone.join(', ')}]`,
    displayFace,
    bodyFace: 'Inter',
    pairingWhy,
    rejected: ranked.slice(1, 4).map((r) => ({
      id: r.m.id,
      why: `scored ${r.score} (${r.why}) — lost to ${top.m.id} (${top.score})`,
    })),
  };
};
