/**
 * Authoring-time validation (loud errors, not silent garbage).
 *
 * The compositor draws every visible leaf: a transition blends A+B while
 * any overlapping sequence leaf would ALSO draw — double-draw ghosting.
 * And a freeze pin outside A's shown range freezes an unseen frame. Both
 * are plan bugs, so they throw here instead of rendering wrong pixels.
 *
 * Scope: direct children of sequences (the montage/kit plan shape).
 * Chrome-style overlays (different refs, e.g. grain/progress leaves that
 * span transition windows) are legal and pass.
 */
import type { SceneNode } from '../scene/types.js';
import type { LeafNode, SequenceNode, TimelineNode, TransitionNode } from './types.js';

const winOf = (from: number, dur: number | undefined): { from: number; end: number } => ({
  from,
  end: from + (dur ?? Infinity),
});

const overlaps = (a: { from: number; end: number }, b: { from: number; end: number }): boolean =>
  a.from < b.end && b.from < a.end;

const collectLeafRefs = (node: TimelineNode, out: Set<string>): void => {
  if (node.kind === 'leaf') {
    out.add((node as LeafNode).ref);
    return;
  }
  if (node.kind === 'sequence') {
    for (const c of (node as SequenceNode).children ?? []) {
      collectLeafRefs(c, out);
    }
  }
};

const collectSubtreeIds = (node: SceneNode, out: Set<string>): void => {
  out.add(node.id);
  for (const c of node.children ?? []) {
    collectSubtreeIds(c, out);
  }
};

export const validateTimeline = (
  timeline: TimelineNode | undefined,
  root: SceneNode,
): void => {
  if (timeline === undefined) {
    return;
  }
  const scene = new Map<string, SceneNode>();
  const indexScene = (n: SceneNode): void => {
    if (!scene.has(n.id)) {
      scene.set(n.id, n);
    }
    for (const c of n.children ?? []) {
      indexScene(c);
    }
  };
  indexScene(root);
  const subtreeOf = (id: string): Set<string> => {
    const out = new Set<string>();
    const n = scene.get(id);
    if (n !== undefined) {
      collectSubtreeIds(n, out);
    }
    return out;
  };

  const checkSeq = (seq: SequenceNode): void => {
    const kids = seq.children ?? [];
    const seqWins: Array<{ w: { from: number; end: number }; node: SequenceNode }> = [];
    const trWins: Array<{ w: { from: number; end: number }; node: TransitionNode }> = [];
    for (const c of kids) {
      if (c.kind === 'sequence') {
        const s = c as SequenceNode;
        seqWins.push({ w: winOf(s.from ?? 0, s.durationInFrames), node: s });
        checkSeq(s);
      } else if (c.kind === 'transition') {
        const t = c as TransitionNode;
        trWins.push({ w: winOf(t.from, t.durationInFrames), node: t });
      }
    }
    for (const t of trWins) {
      const tr = t.node;
      const painted = new Set([...subtreeOf(tr.a), ...subtreeOf(tr.b)]);
      for (const s of seqWins) {
        if (!overlaps(s.w, t.w)) {
          continue;
        }
        const refs = new Set<string>();
        collectLeafRefs(s.node, refs);
        for (const r of refs) {
          if (painted.has(r)) {
            throw new Error(
              `Timeline overlap: transition "${tr.type}" blends scene "${r}" while a sequence leaf also draws it (frames ${s.w.from}..${s.w.end} vs transition ${t.w.from}..${t.w.end}) — trim the sequence or move the transition`,
            );
          }
        }
      }
      if ((tr.aMode ?? 'freeze') === 'freeze') {
        if (tr.aFreeze === undefined) {
          throw new Error(`Transition "${tr.type}" uses freeze mode but has no aFreeze`);
        }
        let shown: { from: number; end: number } | null = null;
        for (const s of seqWins) {
          const refs = new Set<string>();
          collectLeafRefs(s.node, refs);
          if (refs.has(tr.a)) {
            const trim = s.node.trimBefore ?? 0;
            shown = { from: trim, end: trim + (s.node.durationInFrames ?? Infinity) };
            break;
          }
        }
        if (shown !== null && (tr.aFreeze < shown.from || tr.aFreeze >= shown.end)) {
          throw new Error(
            `Transition "${tr.type}" freezes "${tr.a}" at local ${tr.aFreeze}, outside its shown range [${shown.from}, ${shown.end})`,
          );
        }
      }
    }
  };

  if (timeline.kind === 'sequence') {
    checkSeq(timeline as SequenceNode);
  }
};
