/**
 * Planner tests: determinism, structural validity, critique loop.
 * No renderer imports — mono-model measure only (fast, deterministic).
 */
import { describe, expect, it } from 'vitest';
import { validateTimeline } from '@x80/core';
import { monoMeasure, planBrief } from '../src/index.js';

const BRIEF = 'Feather Audio AI: the fastest voice AI, most natural Hindi and English, 25 more languages launching globally soon.';

describe('zero-shot planner', () => {
  it('is deterministic: same brief → same plan', () => {
    const a = planBrief({ text: BRIEF });
    const b = planBrief({ text: BRIEF });
    expect(JSON.stringify(a.plan)).toBe(JSON.stringify(b.plan));
    expect(a.decisions.length).toBeGreaterThan(10);
  });

  it('emits valid timelines (engine validator passes)', () => {
    for (const text of [
      BRIEF,
      'Vegan bakery downtown: sourdough baked at 4am, 40 seats, order ahead for weekends.',
      'Solar rooftops: cut bills 70%, 25-year warranty, book a free site survey.',
    ]) {
      const out = planBrief({ text });
      const plan = out.plan as {
        timeline: never; composition: { root: never; durationInFrames: number };
      };
      expect(() => validateTimeline(plan.timeline as never, plan.composition.root as never)).not.toThrow();
      expect(plan.composition.durationInFrames).toBe(450);
    }
  });

  it('extracts Hindi intent and stats from the brief', () => {
    const out = planBrief({ text: BRIEF });
    expect(out.intent.wantsHindi).toBe(true);
    expect(out.intent.goal).toBe('launch');
    expect(out.intent.cta).toBe('GET EARLY ACCESS');
    expect(out.concept.rejected.length).toBeGreaterThan(0);
  });

  it('critique loop shrinks overflowing heroes', () => {
    const out = planBrief({
      text: 'Supercalifragilisticexpialidocious extraordinary pneumatics demonstration spectacularly launching soon.',
    });
    const rounds = out.critiqueRounds;
    expect(rounds.length).toBeGreaterThan(0);
    const last = rounds[rounds.length - 1]!;
    expect(last.filter((i) => i.severity === 'error')).toHaveLength(0);
  });

  it('every decision carries a WHY', () => {
    const out = planBrief({ text: BRIEF });
    for (const d of out.decisions) {
      expect(d.why.length).toBeGreaterThan(10);
    }
    expect(out.acts).toHaveLength(5);
    for (const a of out.acts) {
      expect(a.motion.entranceWhy.length).toBeGreaterThan(5);
      if (a.transitionOut !== null) {
        expect(a.transitionOut.why.length).toBeGreaterThan(5);
      }
    }
  });

  it('beats sum to the total and acts cover five roles', () => {
    const out = planBrief({ text: BRIEF, durationSec: 30 });
    const sum = out.acts.reduce((s, a) => s + a.beat.frames, 0);
    expect(sum).toBe(900);
    expect(out.acts.map((a) => a.beat.role)).toEqual(['hook', 'proof', 'proof2', 'scale', 'cta']);
  });
});
