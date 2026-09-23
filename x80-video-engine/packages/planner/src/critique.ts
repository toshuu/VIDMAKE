/**
 * Self-critique: rule checks over the composed plan + machine-readable
 * fix ops. index.ts applies ops by patching IR and recomposing (≤3 rounds).
 */
import type { Beat, Critique, Shot } from './ir.js';
import type { Measure } from './compose.js';
import { wrapDisplay } from './narrative.js';

export interface PlanView {
  beats: Beat[];
  shots: Shot[];
  plan: {
    composition: { width: number; height: number; durationInFrames: number };
  };
  heroSizes: Map<string, number>;
  face: string;
  /** Brief keywords — fallback words for the no-truncation repair. */
  keywords?: string[];
}

export type FixOp =
  | { op: 'shrinkHero'; beat: string }
  | { op: 'swapShot'; beat: string }
  | { op: 'reword'; beat: string }
  | { op: 'foldSupport'; beat: string }
  | { op: 'rebalance' };

export interface CritiqueOut {
  issues: Critique[];
  fixes: FixOp[];
}

const laidWidth = (text: string, size: number, ls: number, measure: Measure, face: string): number =>
  measure(text, size, 800, ls, face);

export const critique = (
  view: PlanView,
  measure: Measure,
  W = 540,
  H = 960,
): CritiqueOut => {
  const issues: Critique[] = [];
  const fixes: FixOp[] = [];
  const total = view.beats.reduce((s, b) => s + b.frames, 0);

  // R5 timing first (structural).
  if (view.beats.some((b) => b.frames < 60)) {
    issues.push({ rule: 'R5-timing', severity: 'error', detail: 'an act is shorter than 60f' });
    fixes.push({ op: 'rebalance' });
  }

  view.beats.forEach((beat, i) => {
    const shot = view.shots[i]!;
    // R1 dead space: every act needs a non-text anchor.
    const anchors: Record<string, boolean> = {
      emblem: true, wave: true, band: true, statDuel: true, ctaCard: true,
      display: true, quote: false,
    };
    if (anchors[shot.kind] !== true) {
      issues.push({
        rule: 'R1-dead-space', severity: 'warn', beat: beat.id,
        detail: `${shot.kind} carries no procedural anchor — ambient glow alone is dead space`,
      });
    }
    // R2 overflow: mirror compose's force-fit wrap. Heroes are max 2 lines:
    // extra lines must SHRINK the hero (error), never silently drop words —
    // the old warn-only fold shipped fragments ("Feather Audio / AI: the",
    // "Hindi and" without "English") while decisions claimed the lines were
    // "folded into support" (they weren't). At the 34px floor, extras really
    // ARE folded into support (foldSupport op) and the loop ends.
    const size = view.heroSizes.get(beat.id) ?? 52;
    const maxChars = Math.max(8, Math.floor(476 / (size * 0.66)));
    const laid = (line: string): number => laidWidth(line, size, 0, measure, view.face);
    const wrapped = wrapDisplay(beat.claim, maxChars);
    if (wrapped.length > 2) {
      if (size > 34) {
        issues.push({
          rule: 'R2-fold', severity: 'error', beat: beat.id,
          detail: `${wrapped.length} display lines ("${beat.claim}") — shrink to fit 2, never drop words`,
        });
        fixes.push({ op: 'shrinkHero', beat: beat.id });
      } else {
        issues.push({
          rule: 'R2-fold', severity: 'warn', beat: beat.id,
          detail: `${wrapped.length} display lines at 34px floor — extras fold into support`,
        });
        fixes.push({ op: 'foldSupport', beat: beat.id });
      }
    }
    for (const line of wrapped.slice(0, 2)) {
      if (line === '') {
        continue;
      }
      const w = laid(line);
      if (w > 476) {
        issues.push({
          rule: 'R2-overflow', severity: 'error', beat: beat.id,
          detail: `hero line "${line}" lays ${Math.ceil(w)}px > 476px safe width`,
        });
        fixes.push({ op: 'shrinkHero', beat: beat.id });
        break;
      }
    }
    // R3 safe zones: claim/support zone sanity via beat geometry is
    // enforced at compose time (LY stack); here check absurd claims.
    if (beat.claim.length > 90) {
      issues.push({
        rule: 'R3-density', severity: 'warn', beat: beat.id,
        detail: `claim is ${beat.claim.length} chars — display type wants ≤60`,
      });
    }
    void H;
    void W;
  });

  // R8 no-truncation: no beat may render a mid-word slice ("ne…", "ou…",
  // "most nat"). Sources of slices were removed engine-wide (intent keeps
  // full words, compose never slices support into hero lines, CTA support
  // is keywords not topic slices) — this rule is the tripwire that keeps
  // them removed. Error (not warn): truncated type never ships quietly.
  for (const beat of view.beats) {
    for (const field of ['claim', 'support'] as const) {
      if (beat[field].includes('…') || beat[field].includes('...')) {
        issues.push({
          rule: 'R8-no-truncation', severity: 'error', beat: beat.id,
          detail: `${field} "${beat[field]}" carries a truncation mark — reword from brief words, never slice`,
        });
        fixes.push({ op: 'reword', beat: beat.id });
        break;
      }
    }
  }

  // R4 variety: same shot kind at most twice running, never thrice.
  let run = 1;
  for (let i = 1; i < view.shots.length; i += 1) {
    if (view.shots[i]!.kind === view.shots[i - 1]!.kind) {
      run += 1;
      if (run >= 3) {
        issues.push({
          rule: 'R4-variety', severity: 'warn', beat: view.beats[i]!.id,
          detail: `${view.shots[i]!.kind} three acts running — rhythm flatlines`,
        });
        fixes.push({ op: 'swapShot', beat: view.beats[i]!.id });
        run = 1;
      }
    } else {
      run = 1;
    }
  }

  // R6 motion completeness is structural (compose always adds entrances +
  // transitions) — verified by construction, recorded here.
  // R7 template tripwire: statDuel in >2 acts.
  const duels = view.shots.filter((s) => s.kind === 'statDuel').length;
  if (duels > 2) {
    issues.push({
      rule: 'R7-template', severity: 'warn',
      detail: `statDuel ×${duels} — big-number cards are the template answer unless motivated`,
    });
  }
  return { issues, fixes };
};
