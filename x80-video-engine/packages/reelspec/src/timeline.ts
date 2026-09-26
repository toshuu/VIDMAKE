/**
 * assembleTimeline: durations + transitions → timeline children.
 * The montage pattern: act 0 plays [0, D0-pre); each transition of length T
 * carves [B-pre, B+4) at its nominal boundary B (pre = T-4, default T=12 →
 * pre=8); later acts resume with trimBefore:T continuity (transition shows
 * 0..T-1, the seq resumes at T). Per-transition `duration` (2–60) gives the
 * planner arbitrary timing/sequencing; omitting it reproduces the exact
 * legacy 12-frame geometry. Pure data — the compiler never hand-rolls.
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
  opts: { chrome?: boolean } = {},
): { children: TimelineChild[]; total: number } => {
  if (actIds.length !== durations.length) {
    throw new Error('assembleTimeline: actIds and durations must match');
  }
  if (transitions.length !== Math.max(0, actIds.length - 1)) {
    throw new Error('assembleTimeline: transitions must number acts-1');
  }
  const durs = transitions.map((t) => {
    const d = t.duration ?? 12;
    if (!Number.isInteger(d) || d < 2 || d > 60) {
      throw new Error(`assembleTimeline: transition duration must be integer 2-60 (got ${String(t.duration)})`);
    }
    return d;
  });
  const total = durations.reduce((s, d) => s + d, 0);
  const bounds: number[] = [0];
  for (const d of durations) bounds.push(bounds[bounds.length - 1]! + d);
  const children: TimelineChild[] = [];
  // First act ends pre[0] frames before its boundary (legacy: 8).
  // Preserved even for single-act reels (legacy quirk: seq is D0-8).
  const preOf = (k: number): number => (durs[k] ?? durs[durs.length - 1] ?? 12) - 4;
  const pre0 = preOf(0);
  children.push(seq(0, durations[0]! - pre0, [leaf(actIds[0]!)]));
  for (let k = 1; k < actIds.length; k += 1) {
    const tPrev = durs[k - 1]!;
    const isLast = k === actIds.length - 1;
    const from = bounds[k]! + 4;
    // Middle acts cover [bound+4, nextBound-pre_out): skip the incoming
    // blend (trimBefore = incoming T) and stop where the outgoing starts.
    // Last act runs to the reel end. Uniform T reproduces legacy exactly.
    const dur = isLast ? total - from : durations[k]! - 4 - preOf(k);
    children.push({
      kind: 'sequence', from, durationInFrames: dur,
      trimBefore: tPrev, children: [leaf(actIds[k]!)],
    });
  }
  transitions.forEach((t, k) => {
    const T = durs[k]!;
    const pre = T - 4;
    // A-freeze = last valid local frame of A's seq at the blend start.
    const aFreeze = k === 0
      ? durations[0]! - pre - 1
      : durs[k - 1]! + (durations[k]! - 4 - preOf(k)) - 1;
    children.push({
      kind: 'transition',
      from: bounds[k + 1]! - pre,
      durationInFrames: T,
      type: t.type,
      ...(t.params !== undefined ? { params: t.params } : {}),
      a: actIds[k]!,
      b: actIds[k + 1]!,
      aFreeze,
      easing: t.easing ?? 'ease-in-out',
    });
  });
  if (opts.chrome !== false) children.push(seq(0, total, [leaf('chrome')]));
  return { children, total };
};
