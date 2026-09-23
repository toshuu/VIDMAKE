/**
 * Sprite-sheet ingestion for the pre-agreed X80 sheet format.
 *
 * TEMPLATE: examples/sprite-reel/sprite-sheet-TEMPLATE.png
 *   5 cols x 5 rows | cell 256px | grid 6px | BG flat #FF00FF | feet y=232.
 *   Row = one character, cols 1-5 = animation cycle. Guides must be hidden
 *   on export; the background must be ONE flat tone (no gradients/stripes —
 *   striped sheets need flood-fill surgery, which is exactly what this
 *   format exists to avoid).
 *
 * All functions here are pure (RGB(A) arrays in, data out) so they are fast
 * and unit-testable. PNG decode/encode lives with the caller.
 */

export interface SheetSpec {
  rows: number;
  cols: number;
  cell: number;
  grid: number;
  /** Key color [r,g,b]. */
  bg: [number, number, number];
  /** Below: transparent. Default 24 (flat-bg sheets only). */
  tol?: number;
  /** Safety inset from grid lines. Default 1. */
  inset?: number;
}

export const DEFAULT_SHEET: SheetSpec = {
  rows: 5,
  cols: 5,
  cell: 256,
  grid: 6,
  bg: [255, 0, 255],
  tol: 24,
  inset: 1,
};

export interface RgbaCell {
  data: Uint8ClampedArray; // cell*cell RGBA
  size: number;
}

const dist3 = (
  data: Uint8ClampedArray | number[],
  i: number,
  bg: [number, number, number],
): number => {
  const dr = data[i]! - bg[0];
  const dg = data[i + 1]! - bg[1];
  const db = data[i + 2]! - bg[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
};

/**
 * Slice the sheet block (top-left) into flat cells by pure math.
 * Anything past the rows*cols block (e.g. the template footer) is ignored.
 * Throws loudly on undersized input — never silently shifts the grid.
 */
export const sliceSheet = (
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  spec: SheetSpec = DEFAULT_SHEET,
): RgbaCell[] => {
  const step = spec.cell + spec.grid;
  const needW = spec.grid + spec.cols * step;
  const needH = spec.grid + spec.rows * step;
  if (width < needW || height < needH) {
    throw new Error(
      `sprite sheet too small: need ${needW}x${needH}, got ${width}x${height}`,
    );
  }
  const inset = spec.inset ?? 1;
  const cells: RgbaCell[] = [];
  for (let r = 0; r < spec.rows; r += 1) {
    for (let c = 0; c < spec.cols; c += 1) {
      const ox = spec.grid + c * step + inset;
      const oy = spec.grid + r * step + inset;
      const size = spec.cell - inset * 2;
      const data = new Uint8ClampedArray(size * size * 4);
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          const si = ((oy + y) * width + (ox + x)) * 4;
          const di = (y * size + x) * 4;
          data[di] = rgba[si]!;
          data[di + 1] = rgba[si + 1]!;
          data[di + 2] = rgba[si + 2]!;
          data[di + 3] = rgba[si + 3] ?? 255;
        }
      }
      cells.push({ data, size });
    }
  }
  return cells;
};

/**
 * Chroma key against the flat key color. Soft ramp tol→2*tol forgives
 * anti-aliased edges; flat interiors key to zero. Returns alpha 0..1.
 */
export const keyCell = (cell: RgbaCell, spec: SheetSpec = DEFAULT_SHEET): Float32Array => {
  const tol = spec.tol ?? 24;
  const n = cell.size * cell.size;
  const alpha = new Float32Array(n);
  for (let p = 0; p < n; p += 1) {
    const d = dist3(cell.data, p * 4, spec.bg);
    alpha[p] = Math.min(1, Math.max(0, (d - tol) / tol));
  }
  return alpha;
};

export interface BBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Tight bounding box of alpha > threshold. Null when the cell is empty. */
export const trimAlpha = (
  alpha: Float32Array,
  size: number,
  threshold = 0.04,
): BBox | null => {
  let x0 = size;
  let y0 = size;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (alpha[y * size + x]! > threshold) {
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
};

export interface NormalizedFrame {
  data: Uint8ClampedArray; // boxW*boxH RGBA
  alpha: Float32Array;
  boxW: number;
  boxH: number;
}

/**
 * Normalize one row (one character's cycle) into a common box:
 * bottom-aligned (feet plant on one ground line), x-centered — so the
 * flipbook never jitters. Throws on an all-empty row.
 */
export const normalizeRow = (
  cells: RgbaCell[],
  alphas: Float32Array[],
  threshold = 0.04,
): NormalizedFrame[] => {
  const boxes = cells.map((_, i) => trimAlpha(alphas[i]!, cells[i]!.size, threshold));
  if (boxes.some((b) => b === null)) {
    throw new Error('sprite row has an empty frame — every cycle cell must hold art');
  }
  const boxW = Math.max(...boxes.map((b) => b!.x1 - b!.x0 + 1));
  const boxH = Math.max(...boxes.map((b) => b!.y1 - b!.y0 + 1));
  return cells.map((cell, i) => {
    const b = boxes[i]!;
    const w = b.x1 - b.x0 + 1;
    const h = b.y1 - b.y0 + 1;
    const ox = Math.floor((boxW - w) / 2);
    const oy = boxH - h; // feet share one ground line
    const data = new Uint8ClampedArray(boxW * boxH * 4);
    const alpha = new Float32Array(boxW * boxH);
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const si = ((b.y0 + y) * cell.size + (b.x0 + x)) * 4;
        const di = ((oy + y) * boxW + (ox + x)) * 4;
        data[di] = cell.data[si]!;
        data[di + 1] = cell.data[si + 1]!;
        data[di + 2] = cell.data[si + 2]!;
        data[di + 3] = cell.data[si + 3]!;
        alpha[(oy + y) * boxW + (ox + x)] = alphas[i]![(b.y0 + y) * cell.size + (b.x0 + x)]!;
      }
    }
    return { data, alpha, boxW, boxH };
  });
};

/** Full fast path: sheet pixels → per-row normalized cycles. */
export const parseSheet = (
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  spec: SheetSpec = DEFAULT_SHEET,
): NormalizedFrame[][] => {
  const cells = sliceSheet(rgba, width, height, spec);
  const rows: NormalizedFrame[][] = [];
  for (let r = 0; r < spec.rows; r += 1) {
    const rowCells = cells.slice(r * spec.cols, (r + 1) * spec.cols);
    rows.push(normalizeRow(rowCells, rowCells.map((c) => keyCell(c, spec))));
  }
  return rows;
};
