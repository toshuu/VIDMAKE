// M3 performance baseline: 1080x1920 scene, 300 frames, single surface.
// Usage: node benchmarks/m3-perf.mjs (after building core + renderer-skia).
import { performance } from 'node:perf_hooks';
import { renderFrame } from '@x80/core';
import { SkiaRenderer } from '@x80/renderer-skia';
import { buildM3Plan, preloadM3Assets } from '../packages/renderer-skia/dist/m3-scene.js';

const FRAMES = 300;

const tImport0 = performance.now();
const renderer = new SkiaRenderer();
const tInit = performance.now() - tImport0;

const tAssets0 = performance.now();
const assets = await preloadM3Assets();
const tAssets = performance.now() - tAssets0;

const tSurf0 = performance.now();
const surface = renderer.createSurface(1080, 1920);
const tSurface = performance.now() - tSurf0;

const plan = buildM3Plan();
const resolveAsset = (src) => assets.get(src);

let resolveTotal = 0;
let drawTotal = 0;
let worst = 0;
let worstFrame = 0;
let peakRss = 0;
const tLoop0 = performance.now();
for (let frame = 0; frame < FRAMES; frame += 1) {
  const stats = renderFrame(renderer, surface, plan, frame, { resolveAsset });
  resolveTotal += stats.resolveMs;
  drawTotal += stats.drawMs;
  const total = stats.resolveMs + stats.drawMs;
  if (total > worst) {
    worst = total;
    worstFrame = frame;
  }
  if (frame % 30 === 0) {
    const { rss } = process.memoryUsage();
    if (rss > peakRss) {
      peakRss = rss;
    }
  }
}
const tLoop = performance.now() - tLoop0;
peakRss = Math.max(peakRss, process.memoryUsage().rss);

const avg = tLoop / FRAMES;
console.log('M3 perf baseline (1080x1920, 300 frames, one reused surface)');
console.log(`renderer init (import+construct): ${tInit.toFixed(1)} ms`);
console.log(`asset preload (in-memory PNG):    ${tAssets.toFixed(1)} ms`);
console.log(`surface creation:                 ${tSurface.toFixed(1)} ms`);
console.log(`total 300 frames:                 ${tLoop.toFixed(1)} ms`);
console.log(`avg per frame:                    ${avg.toFixed(2)} ms (${(1000 / avg).toFixed(1)} fps)`);
console.log(`worst frame:                      #${worstFrame} ${worst.toFixed(2)} ms`);
console.log(`timeline resolve total:           ${resolveTotal.toFixed(1)} ms (${(resolveTotal / tLoop * 100).toFixed(1)}%)`);
console.log(`skia draw total:                  ${drawTotal.toFixed(1)} ms (${(drawTotal / tLoop * 100).toFixed(1)}%)`);
console.log(`peak RSS:                         ${(peakRss / 1048576).toFixed(1)} MB`);
