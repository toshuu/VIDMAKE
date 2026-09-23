/**
 * Zero-shot pipeline: brief → intent → concept → narrative → shots →
 * compose → critique → revise → final VideoPlan. Every step logs WHY.
 */
import { compose, type Measure } from './compose.js';
import { invent } from './concepts.js';
import { critique, type FixOp } from './critique.js';
import { understand } from './intent.js';
import type { Brief, Decision, PlannedAct, PlanOutput } from './ir.js';
import { structure, wrapDisplay } from './narrative.js';
import { assignShots } from './shots.js';

export const monoMeasure: Measure = (text, size, _weight, ls = 0, _family = 'Inter') =>
  [...text].length * (size * 0.66 + ls);

const HERO_SIZE = 52;

export const planBrief = (
  brief: Brief,
  measure: Measure = monoMeasure,
  maxRounds = 3,
): PlanOutput => {
  const decisions: Decision[] = [];
  const say = (path: string, choice: string, why: string): void => {
    decisions.push({ path, choice, why });
  };

  const durationSec = brief.durationSec ?? 15;
  const totalFrames = Math.round(durationSec * 30);
  const { intent } = understand(brief.text, durationSec);
  say('intent', `${intent.domain}/${intent.goal}`, `${intent.domainWhy}; ${intent.goalWhy}`);

  const concept = invent(intent);
  say('concept', `${concept.id} + ${concept.palette.bg}`, concept.metaphorWhy);
  say('signature', concept.signature, concept.signatureWhy);
  for (const r of concept.rejected) {
    say(`rejected/${r.id}`, 'dropped', r.why);
  }

  const { beats: beats0, whys } = structure(intent, totalFrames);
  for (const w of whys) {
    say('narrative', 'five equal beats', w);
  }
  let beats = beats0;
  const heroSizes = new Map(beats.map((b) => [b.id, HERO_SIZE] as [string, number]));

  let { shots, whys: shotWhys } = assignShots(beats, concept, intent);
  for (const w of shotWhys) {
    say('shots', 'assigned', w);
  }

  const critiqueRounds: PlanOutput['critiqueRounds'] = [];
  for (let round = 0; round <= maxRounds; round += 1) {
    const composed = compose(beats, shots, concept, intent, { measure, heroSizes });
    const { issues, fixes } = critique(
      {
        beats, shots,
        plan: { composition: { width: 540, height: 960, durationInFrames: totalFrames } },
        heroSizes, face: concept.displayFace, keywords: intent.keywords,
      },
      measure,
    );
    critiqueRounds.push(issues);
    const errors = issues.filter((i) => i.severity === 'error');
    // Integrity: a fix is never computed and then discarded. The old exit
    // returned the pre-fix plan on the final round, silently dropping the
    // last mutation (r3 lost "millisecond latency" this way). Clean exit
    // needs zero errors AND zero pending fixes; otherwise apply + recompose.
    if (errors.length === 0 && fixes.length === 0) {
      const finalActs = composed.acts.map((a) => ({
        beat: a.beat, shot: a.shot, motion: a.motion, transitionOut: a.transitionOut,
      }));
      for (const d of composed.decisions) {
        decisions.push(d);
      }
      return {
        intent, concept,
        acts: finalActs,
        decisions,
        critiqueRounds,
        plan: composed.plan,
      };
    }
    if (round < maxRounds) {
      say('critique', `round ${round + 1}`, `${errors.length} error(s), ${fixes.length} fix(es) → revising`);
    } else {
      say('critique', 'budget exhausted', `${errors.length} error(s) at final round — fixes applied, no rounds left to re-critique`);
    }
    applyFixes(beats, shots, heroSizes, fixes, say, intent.keywords);
    if (round === maxRounds) {
      const final = compose(beats, shots, concept, intent, { measure, heroSizes });
      const finalActs = final.acts.map((a) => ({
        beat: a.beat, shot: a.shot, motion: a.motion, transitionOut: a.transitionOut,
      }));
      for (const d of final.decisions) {
        decisions.push(d);
      }
      return {
        intent, concept,
        acts: finalActs,
        decisions,
        critiqueRounds,
        plan: final.plan,
      };
    }
  }
  throw new Error('unreachable');
};

const applyFixes = (
  beats: import('./ir.js').Beat[],
  shots: import('./ir.js').Shot[],
  heroSizes: Map<string, number>,
  fixes: FixOp[],
  say: (path: string, choice: string, why: string) => void,
  keywords: string[] = [],
): void => {
  const seen = new Set<string>();
  for (const fix of fixes) {
    if (fix.op === 'shrinkHero') {
      const key = `shrink:${fix.beat}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const cur = heroSizes.get(fix.beat) ?? HERO_SIZE;
      const next = Math.max(34, cur - 6);
      heroSizes.set(fix.beat, next);
      say(`revise/${fix.beat}`, `hero ${cur}→${next}px`, 'R2 overflow fix: shrink, never wrap');
    } else if (fix.op === 'swapShot') {
      const idx = shots.findIndex((_, i) => beats[i]!.id === fix.beat);
      if (idx >= 0 && !seen.has(`swap:${fix.beat}`)) {
        seen.add(`swap:${fix.beat}`);
        const order = ['display', 'statDuel', 'band', 'wave', 'emblem', 'quote'] as const;
        const cur = shots[idx]!.kind;
        const next = order[(order.indexOf(cur as (typeof order)[number]) + 1) % order.length]!;
        shots[idx] = { ...shots[idx]!, kind: next };
        say(`revise/${fix.beat}`, `shot ${cur}→${next}`, 'R4 variety fix: break the run');
      }
    } else if (fix.op === 'reword') {
      // R8 repair: rebuild the beat's words from complete brief words only.
      // Truncated fragments ("ne…", "ou…") are dropped, never patched —
      // patching a fragment keeps the wrong words on screen.
      if (seen.has(`reword:${fix.beat}`)) {
        continue;
      }
      seen.add(`reword:${fix.beat}`);
      const beat = beats.find((b) => b.id === fix.beat);
      if (beat !== undefined) {
        const clean = (s: string): string => s.replace(/…/g, '').replace(/\.\.\./g, '').trim();
        const fallback = keywords.slice(0, 4).join(' ') || 'More to come';
        if (beat.claim.includes('…') || beat.claim.includes('...')) {
          beat.claim = fallback;
        }
        beat.support = clean(beat.support) || fallback;
        say(`revise/${fix.beat}`, `reword from brief keywords`, 'R8 fix: truncation marks out, complete brief words in');
      }
    } else if (fix.op === 'foldSupport') {
      // R2 floor repair: the hero keeps lines 1–2, overflow lines REALLY move
      // into support (the old note claimed this while dropping them). Support
      // wraps via maxWidth at render, so length is safe there.
      if (seen.has(`fold:${fix.beat}`)) {
        continue;
      }
      seen.add(`fold:${fix.beat}`);
      const beat = beats.find((b) => b.id === fix.beat);
      if (beat !== undefined) {
        const size = heroSizes.get(fix.beat) ?? 52;
        const maxChars = Math.max(8, Math.floor(476 / (size * 0.66)));
        const wrapped = wrapDisplay(beat.claim, maxChars);
        const extra = wrapped.slice(2).join(' ');
        if (extra !== '') {
          beat.claim = wrapped.slice(0, 2).join(' ');
          beat.support = `${extra} · ${beat.support}`;
          say(`revise/${fix.beat}`, `fold "${extra}" into support`, 'R2 floor fix: no word dropped, hero stays 2 lines');
        }
      }
    } else if (fix.op === 'rebalance') {
      const total = beats.reduce((s, b) => s + b.frames, 0);
      const each = Math.max(60, Math.floor(total / beats.length));
      beats.forEach((b, i) => {
        b.frames = i === beats.length - 1 ? total - each * (beats.length - 1) : each;
      });
      say('revise/timing', `equal ${each}f`, 'R5 fix: floor every act at 60f');
    }
  }
};

export type { Brief, PlanOutput };
export { understand, invent, structure, assignShots };
