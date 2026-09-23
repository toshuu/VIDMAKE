/**
 * Narrative structure: brief clauses → beats with claims, pacing, energy.
 * Content words come FROM the brief (extraction); structure is decided
 * here. Both are recorded with WHY.
 */
import type { Beat, BeatRole, Intent } from './ir.js';

export const splitClauses = (text: string): string[] => {
  const out: string[] = [];
  for (const sent of text.split(/[.!?\n]+/)) {
    for (const part of sent.split(/[,;—–]+/)) {
      const t = part.trim().replace(/\s+/g, ' ');
      if (t.length >= 8 && t.length <= 70) {
        out.push(t);
      }
    }
  }
  return out;
};

const clauseScore = (clause: string, keywords: string[], index: number): number => {
  const low = clause.toLowerCase();
  const hits = keywords.filter((k) => low.includes(k)).length;
  // Display type wants short lines: penalize clauses past 45 chars.
  const lenPenalty = Math.max(0, clause.length - 45) * 0.15;
  return hits * 2 + Math.max(0, 3 - index) * 0.5 - lenPenalty + (/[!]/.test(clause) ? 0 : 0);
};

/** Pick display-worthy clauses: keyword-dense first, brief order breaks ties. */
export const pickClaims = (text: string, keywords: string[], n: number): string[] => {
  const clauses = splitClauses(text);
  const ranked = clauses
    .map((c, i) => ({ c, s: clauseScore(c, keywords, i), i }))
    .sort((a, b) => b.s - a.s || a.i - b.i);
  const picks: string[] = [];
  for (const r of ranked) {
    if (picks.length >= n) {
      break;
    }
    if (!picks.some((p) => p.toLowerCase() === r.c.toLowerCase())) {
      picks.push(r.c);
    }
  }
  return picks;
};

const capLine = (s: string, max = 26): string =>
  s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;

/**
 * Five beats, equal fifths (the proven reel rhythm: hook 20%, proofs 60%,
 * CTA 20%). Equal fifths are a deliberate default — pacing variety comes
 * from energy deltas, not uneven durations.
 */
export const structure = (
  intent: Intent,
  totalFrames: number,
): { beats: Beat[]; whys: string[] } => {
  const fifth = Math.round(totalFrames / 5);
  const claims = pickClaims(intent.topic, intent.keywords, 4);
  // Integrity rule: every beat's words come FROM the brief. The old fallback
  // ("<domain> without the busywork") invented copy that shipped on screen
  // in acts 3–4 of every reel. Fallbacks below only recycle brief words:
  // hook ← brief clause (or leading words), proofs ← remaining clauses (or
  // keyword/audience phrases), CTA ← intent.cta. Nothing templated renders.
  const briefHead = intent.topic.split(' ').slice(0, 6).join(' ');
  const kw = (a: number, b: number): string => intent.keywords.slice(a, b).join(' ');
  const hook = claims[0] ?? briefHead;
  const p1 = claims[1] ?? (kw(0, 3) || `Made for ${intent.audience}`);
  const p2 = claims[2] ?? (kw(3, 6) || kw(0, 3) || `Made for ${intent.audience}`);
  // Variety rule: scale never parrots proof2. A fourth brief clause leads;
  // when the brief is short, scale reprises the hook (callback before the
  // ask — a deliberate device, recorded in claimWhy, never a silent repeat).
  const p3 = claims[3] ?? hook;
  const p3Why = claims[3] !== undefined
    ? `extracted clause #4 by keyword density (brief's own words lead)`
    : `hook reprise before the ask — brief yields 3 clauses for 4 content beats`;
  const roles: BeatRole[] = ['hook', 'proof', 'proof2', 'scale', 'cta'];
  const energies = [3, 2, 2, 3, 2] as const;
  const energyWhy = [
    'hook arrives at full energy — first 3 seconds decide retention',
    'proof lands steady — credibility over excitement',
    'second proof holds the middle — no mid-reel sag',
    'scale peaks again — breadth before the ask',
    'CTA resolves one notch down — confidence, not shouting',
  ];
  const beats: Beat[] = roles.map((role, i) => ({
    id: `beat${i + 1}`,
    role,
    claim:
      role === 'hook'
        ? hook
        : role === 'proof'
          ? p1
          : role === 'proof2'
            ? p2
            : role === 'scale'
              ? p3
              : intent.cta,
    claimWhy:
      role === 'cta'
        ? `CTA templated from goal "${intent.goal}"`
        : role === 'scale'
          ? p3Why
          : `extracted clause #${i + 1} by keyword density (brief's own words lead)`,
    support:
      role === 'hook'
        ? p1
        : role === 'proof'
          ? intent.audience
          : role === 'proof2'
            ? intent.keywords.slice(0, 3).join(' · ')
            : role === 'scale'
              ? `${intent.keywords.slice(0, 2).join(' · ')} · ${intent.goal}`
              // CTA support: brief keywords, never a mid-word slice of the
              // topic (old slice(0,48) rendered "most nat" cut off).
              : (intent.keywords.slice(0, 3).join(' · ') || intent.audience),
    frames: i === 4 ? totalFrames - fifth * 4 : fifth,
    energy: energies[i]!,
    energyWhy: energyWhy[i]!,
  }));
  return {
    beats,
    whys: [
      `equal fifths of ${fifth}f (last absorbs rounding) — rhythm from energy, not uneven cuts`,
      `hook line capped for display: "${capLine(hook)}"`,
    ],
  };
};

/** Force-fit wrap: greedy words, hyphenates words longer than the line. */
export const wrapDisplay = (text: string, maxChars: number): string[] => {
  const words: string[] = [];
  for (const w of text.split(' ')) {
    let rest = w;
    while (rest.length > maxChars) {
      words.push(`${rest.slice(0, maxChars - 1)}-`);
      rest = rest.slice(maxChars - 1);
    }
    if (rest.length > 0) {
      words.push(rest);
    }
  }
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const trial = cur === '' ? w : `${cur} ${w}`;
    if (trial.length > maxChars && cur !== '') {
      lines.push(cur);
      cur = w;
    } else {
      cur = trial;
    }
  }
  if (cur !== '') {
    lines.push(cur);
  }
  return lines.length > 0 ? lines : [''];
};

export const splitDisplay = (claim: string): [string, string] => {
  const words = claim.split(' ');
  if (words.length < 2) {
    return [claim, ''];
  }
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
};
