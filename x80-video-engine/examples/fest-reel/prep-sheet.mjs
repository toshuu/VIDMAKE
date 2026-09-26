/**
 * prep-sheet: ChatGPT 5x5 festival sheet (1212x1297, ~0.922 scale of the
 * 256px template) -> keyed, corner-cleared, normalized alpha PNGs.
 * Rows: dandiya / dholman / sari / mundu (dance cycles) + props
 * (diya, dandiya, dhol, flowers, lantern — tight individual boxes).
 */
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { keyCell, normalizeRow, sliceSheet, trimAlpha } from '../../packages/media/dist/sprites.js';

const DIR = dirname(fileURLToPath(import.meta.url));
const SRC = join(DIR, 'fest-sheet-source.png');
const SPEC = { rows: 5, cols: 5, cell: 236, grid: 5, bg: [249, 3, 249], tol: 40, inset: 2 };
const CORNER = 30; // white L-brackets live ~15-30px inside each cell corner; art stays inside

const img = await loadImage(SRC);
console.log(`sheet: ${img.width}x${img.height}`);
const cv = createCanvas(img.width, img.height);
cv.getContext('2d').drawImage(img, 0, 0);
const { data, width, height } = cv.getContext('2d').getImageData(0, 0, img.width, img.height);
const rgba = Uint8ClampedArray.from(data);

const cells = sliceSheet(rgba, width, height, SPEC);
console.log(`sliced: ${cells.length} cells of ${cells[0].size}px`);
// Corner-clear: paint corner squares back to key color (pre-key).
for (const c of cells) {
  const s = c.size;
  const sq = (x0, y0) => {
    for (let y = y0; y < y0 + CORNER; y += 1) {
      for (let x = x0; x < x0 + CORNER; x += 1) {
        const i = (y * s + x) * 4;
        c.data[i] = SPEC.bg[0]; c.data[i + 1] = SPEC.bg[1]; c.data[i + 2] = SPEC.bg[2];
      }
    }
  };
  sq(0, 0); sq(s - CORNER, 0); sq(0, s - CORNER); sq(s - CORNER, s - CORNER);
}

const writePng = (path, w, h, rgb, alpha) => {
  const c = createCanvas(w, h);
  const id = c.getContext('2d').createImageData(w, h);
  for (let p = 0; p < w * h; p += 1) {
    id.data[p * 4] = rgb[p * 4];
    id.data[p * 4 + 1] = rgb[p * 4 + 1];
    id.data[p * 4 + 2] = rgb[p * 4 + 2];
    id.data[p * 4 + 3] = Math.round(alpha[p] * 255);
  }
  c.getContext('2d').putImageData(id, 0, 0);
  writeFileSync(path, c.toBuffer('image/png'));
};

const cellDir = join(DIR, 'sprites/cells');
const propDir = join(DIR, 'sprites/props');
mkdirSync(cellDir, { recursive: true });
mkdirSync(propDir, { recursive: true });

const ROWS = ['dandiya', 'dholman', 'sari', 'mundu'];
for (let r = 0; r < 4; r += 1) {
  const rowCells = cells.slice(r * 5, r * 5 + 5);
  const frames = normalizeRow(rowCells, rowCells.map((c) => keyCell(c, SPEC)));
  console.log(`row ${r} (${ROWS[r]}): box ${frames[0].boxW}x${frames[0].boxH}`);
  frames.forEach((f, i) => writePng(join(cellDir, `${ROWS[r]}-${i}.png`), f.boxW, f.boxH, f.data, f.alpha));
}
// Props row: tight individual boxes (no common box).
const PROPS = ['diya', 'dandiya', 'dhol', 'flowers', 'lantern'];
const propCells = cells.slice(20, 25);
propCells.forEach((cell, i) => {
  const alpha = keyCell(cell, SPEC);
  const box = trimAlpha(alpha, cell.size);
  if (box === null) throw new Error(`prop cell ${i} empty after keying`);
  const w = box.x1 - box.x0 + 1;
  const h = box.y1 - box.y0 + 1;
  const rgb = new Uint8ClampedArray(w * h * 4);
  const al = new Float32Array(w * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const si = ((box.y0 + y) * cell.size + (box.x0 + x)) * 4;
      const di = (y * w + x) * 4;
      rgb[di] = cell.data[si]; rgb[di + 1] = cell.data[si + 1]; rgb[di + 2] = cell.data[si + 2];
      al[y * w + x] = alpha[(box.y0 + y) * cell.size + (box.x0 + x)];
    }
  }
  console.log(`prop ${PROPS[i]}: box ${w}x${h}`);
  writePng(join(propDir, `${PROPS[i]}.png`), w, h, rgb, al);
});
// Contact sheet for visual verification (cells on magenta).
const contact = createCanvas(5 * 240, 5 * 240);
const cctx = contact.getContext('2d');
cctx.fillStyle = '#ff00ff';
cctx.fillRect(0, 0, 5 * 240, 5 * 240);
for (let i = 0; i < 25; i += 1) {
  const file = i < 20
    ? join(cellDir, `${ROWS[Math.floor(i / 5)]}-${i % 5}.png`)
    : join(propDir, `${PROPS[i - 20]}.png`);
  const im2 = await loadImage(file);
  const dw = Math.min(236, im2.width);
  const dh = Math.min(236, im2.height);
  cctx.drawImage(im2, (i % 5) * 240 + 2, Math.floor(i / 5) * 240 + 2, dw, dh);
}
writeFileSync(join(DIR, 'sprites/contact.png'), contact.toBuffer('image/png'));
console.log('contact sheet written');
