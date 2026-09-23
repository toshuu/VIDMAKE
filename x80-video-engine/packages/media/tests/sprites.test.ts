/**
 * Sprite-sheet ingestion tests: synthetic flat-magenta sheets (the agreed
 * format), never the striped legacy sheet. Locks geometry, keying,
 * trim boxes, row normalization, and loud errors.
 */
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SHEET,
  keyCell,
  normalizeRow,
  parseSheet,
  sliceSheet,
  trimAlpha,
} from '../src/sprites.js';

const MAG: [number, number, number] = [255, 0, 255];

/** Flat sheet with one solid rect per cell (varying sizes/positions). */
const synthSheet = (): { rgba: Uint8ClampedArray; w: number; h: number } => {
  const { cell, grid, rows, cols } = DEFAULT_SHEET;
  const step = cell + grid;
  const w = grid + cols * step;
  const h = grid + rows * step;
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i += 1) {
    rgba[i * 4] = MAG[0];
    rgba[i * 4 + 1] = MAG[1];
    rgba[i * 4 + 2] = MAG[2];
    rgba[i * 4 + 3] = 255;
  }
  const paint = (c: number, r: number, x: number, y: number, pw: number, ph: number, col: [number, number, number]): void => {
    const ox = grid + c * step + 1; // +inset: engine skips the outer ring
    const oy = grid + r * step + 1;
    for (let yy = y; yy < y + ph; yy += 1) {
      for (let xx = x; xx < x + pw; xx += 1) {
        const si = ((oy + yy) * w + (ox + xx)) * 4;
        rgba[si] = col[0];
        rgba[si + 1] = col[1];
        rgba[si + 2] = col[2];
      }
    }
  };
  // Row 0: red bars, different heights (feet share y=200).
  for (let c = 0; c < 5; c += 1) {
    const ph = 120 + c * 10;
    paint(c, 0, 60, 200 - ph, 80, ph, [255, 0, 0]);
  }
  // Rows 1-4: single blue block each (keeps parseSheet's no-empty-row rule).
  for (let r = 1; r < 5; r += 1) {
    for (let c = 0; c < 5; c += 1) {
      paint(c, r, 100, 100, 56, 100, [0, 60, 255]);
    }
  }
  return { rgba, w, h };
};

describe('sprite sheet ingestion', () => {
  it('slices 25 cells at the agreed geometry', () => {
    const { rgba, w, h } = synthSheet();
    const cells = sliceSheet(rgba, w, h);
    expect(cells).toHaveLength(25);
    expect(cells[0]!.size).toBe(254); // 256 - 2*inset
  });

  it('throws loudly on undersized input', () => {
    const { rgba } = synthSheet();
    expect(() => sliceSheet(rgba, 100, 100)).toThrow(/too small/);
  });

  it('keys flat magenta to zero and keeps saturated art', () => {
    const { rgba, w, h } = synthSheet();
    const [cell] = sliceSheet(rgba, w, h);
    const alpha = keyCell(cell!);
    // Red bar occupies 80x120 of 254x254; everything else is flat magenta.
    let kept = 0;
    for (const a of alpha) {
      if (a > 0.04) kept += 1;
    }
    expect(kept).toBe(80 * 120);
  });

  it('trims exact boxes', () => {
    const { rgba, w, h } = synthSheet();
    const cells = sliceSheet(rgba, w, h);
    const box = trimAlpha(keyCell(cells[0]!), cells[0]!.size);
    // Painted at (60, 200-120)=(60,80), size 80x120 (inset-aligned).
    expect(box).toEqual({ x0: 60, y0: 80, x1: 139, y1: 199 });
  });

  it('returns null for empty cells', () => {
    const size = 254;
    const alpha = new Float32Array(size * size);
    expect(trimAlpha(alpha, size)).toBeNull();
  });

  it('normalizes a row to one feet-aligned box', () => {
    const { rgba, w, h } = synthSheet();
    const cells = sliceSheet(rgba, w, h);
    const row = cells.slice(0, 5);
    const frames = normalizeRow(row, row.map((c) => keyCell(c)));
    // Tallest bar: 160 -> box 80x160 for all five.
    for (const f of frames) {
      expect(f.boxW).toBe(80);
      expect(f.boxH).toBe(160);
    }
    // Feet (bottom row of each box) are opaque in every frame.
    for (const f of frames) {
      let foot = 0;
      for (let x = 0; x < f.boxW; x += 1) {
        if (f.alpha[(f.boxH - 1) * f.boxW + x]! > 0.5) foot += 1;
      }
      expect(foot).toBe(80);
    }
  });

  it('rejects rows with an empty frame', () => {
    const { rgba, w, h } = synthSheet();
    const cells = sliceSheet(rgba, w, h);
    const row = cells.slice(0, 5);
    const alphas = row.map((c) => keyCell(c));
    alphas[2] = new Float32Array(cells[2]!.size * cells[2]!.size);
    expect(() => normalizeRow(row, alphas)).toThrow(/empty frame/);
  });

  it('parseSheet runs the full fast path: 5 rows x 5 frames', () => {
    const { rgba, w, h } = synthSheet();
    const rows = parseSheet(rgba, w, h);
    expect(rows).toHaveLength(5);
    for (const row of rows) {
      expect(row).toHaveLength(5);
    }
    expect(rows[0]![0]!.boxH).toBe(160);
    expect(rows[1]![0]!.boxW).toBe(56);
  });
});
