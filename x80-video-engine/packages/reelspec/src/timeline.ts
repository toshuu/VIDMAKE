/**
 * assembleTimeline: durations + transitions → timeline children.
 * The montage pattern: act 0 plays [0, D0-8); each transition carves
 * [B-8, B+4) at its nominal boundary B; later acts resume with
 * trimBefore:12 continuity (transition shows 0..11, the seq resumes at 12).
 * Pure data, fully tested — the compiler never hand-rolls timelines.
 */
import type { TransitionSpec } from './types.js';

export interface TimelineChild {
  kind: string;
  [k: string]: unknown;
}

export const leaf = (ref: string): TimelineChild => ({ kind: 'leaf', ref });

export const seq = (
  from: number,
  durationInFrames: number,
  children: TimelineChild[],
  trimBefore?: number,
): TimelineChild => ({
  kind: 'sequence',
  from,
  durationInFrames,
  ...(trimBefore === undefined ? {} : { trimBefore }),
  children,
});

export const assembleTimeline = (
  actIds: string[],
  durations: number[],
  transitions: TransitionSpec[],
): { children: TimelineChild[]; total: number } => {
  if (actIds.length !== durations.length) {
    throw new Error('assembleTimeline: actIds and durations must match');
  }
  if (transitions.length !== Math.max(0, actIds.length - 1)) {
    throw new Error('assembleTimeline: transitions must number acts-1');
  }
  const total = durations.reduce((s, d) => s + d, 0);
  const bounds: number[] = [0];
  for (const d of durations) bounds.push(bounds[bounds.length - 1]! + d);
  const children: TimelineChild[] = [];
  children.push(seq(0, durations[0]! - 8, [leaf(actIds[0]!)]));
  for (let k = 1; k < actIds.length; k += 1) {
    const from = bounds[k]! + 4;
    const dur = k === actIds.length - 1 ? total - from : durations[k]! - 12;
    children.push({
      kind: 'sequence', from, durationInFrames: dur,
      trimBefore: 12, children: [leaf(actIds[k]!)],
    });
  }
  transitions.forEach((t, k) => {
    children.push({
      kind: 'transition',
      from: bounds[k + 1]! - 8,
      durationInFrames: 12,
      type: t.type,
      ...(t.params !== undefined ? { params: t.params } : {}),
      a: actIds[k]!,
      b: actIds[k + 1]!,
      aFreeze: k === 0 ? durations[0]! - 9 : durations[k]! - 1,
      easing: 'ease-in-out',
    });
  });
  children.push(seq(0, total, [leaf('chrome')]));
  return { children, total };
};
