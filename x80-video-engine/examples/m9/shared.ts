/**
 * M9 — Shared composition helpers (JSON-first plan builders).
 * All 7 representative videos are 540x960 portrait shorts built only
 * from existing engine primitives: no new features in this milestone.
 */
import type { Caption, TimelineNode, VideoPlan } from '@x80/core';

export const W = 540;
export const H = 960;
export const FPS = 30;
/** Test-registered family (see m9-compositions.test.ts beforeAll). */
export const FONT = 'M9 Noto Sans';

export const leaf = (ref: string): TimelineNode => ({ kind: 'leaf', ref }) as TimelineNode;

export const seq = (
  from: number,
  durationInFrames: number,
  children: TimelineNode[],
): TimelineNode =>
  ({ kind: 'sequence', from, durationInFrames, children }) as TimelineNode;

export const words = (
  list: Array<[string, number, number]>,
  leadSpace = true,
): Caption[] =>
  list.map(([text, startMs, endMs], i) => ({
    text: i === 0 || !leadSpace ? text : ` ${text}`,
    startMs,
    endMs,
    timestampMs: (startMs + endMs) / 2,
    confidence: 1,
  }));

export const plan = (
  id: string,
  durationInFrames: number,
  root: VideoPlan['composition']['root'],
  timeline: TimelineNode,
): VideoPlan => ({
  composition: { id, width: W, height: H, fps: FPS, durationInFrames, root },
  timeline,
});

export const BG = '#0e1626';
export const INK = '#ffffff';
export const DIM = '#9aa4b2';
export const ACCENT = '#ffe14d';
