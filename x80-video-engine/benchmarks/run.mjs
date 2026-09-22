// X80 benchmark runner (M0/M10): measures core throughput, prints table.
// Usage: npm run bench (from x80-video-engine root, after building core).
import { performance } from 'node:perf_hooks';

const core = await import('../packages/core/dist/index.js');

const bench = (name, fn, iters) => {
  // warmup
  for (let i = 0; i < Math.min(iters, 1000); i++) fn(i);
  const t0 = performance.now();
  for (let i = 0; i < iters; i++) fn(i);
  const t1 = performance.now();
  const ms = t1 - t0;
  console.log(
    `${name.padEnd(34)} ${iters.toLocaleString('en-US').padStart(10)} iters  ${ms.toFixed(1).padStart(10)} ms  ${(iters / (ms / 1000)).toFixed(0).padStart(12)} ops/s`,
  );
  return ms;
};

console.log('X80 core benchmarks (node ' + process.version + ')\n');

bench('interpolate scalar', (i) => core.interpolate(i % 300, [0, 300], [0, 1]), 200_000);
bench('interpolate multi-stop+easing', (i) => core.interpolate(i % 100, [0, 50, 100], [0, 10, 0], { easing: core.Easing.bezier(0.16, 1, 0.3, 1) }), 200_000);
bench('interpolate string px', (i) => core.interpolate(i % 30, [0, 30], ['0px', '1080px']), 100_000);
bench('spring default f30', (i) => core.spring({ frame: i % 90, fps: 30 }), 20_000);
bench('measureSpring default', () => core.measureSpring({ fps: 30 }), 1_000);
bench('Easing.bezier', (i) => core.Easing.bezier(0.16, 1, 0.3, 1)((i % 100) / 100), 200_000);
bench('interpolateColors', (i) => core.interpolateColors((i % 100) / 100, [0, 1], ['#ff0000', '#0000ff']), 50_000);
bench('random seeded', (i) => core.random(`seed-${i % 100}`), 200_000);

const plan = {
  kind: 'sequence',
  from: 0,
  durationInFrames: 300,
  children: [
    { kind: 'sequence', from: 0, durationInFrames: 150, children: [{ kind: 'leaf', ref: 'a' }] },
    { kind: 'sequence', from: 150, durationInFrames: 150, children: [{ kind: 'leaf', ref: 'b' }] },
    { kind: 'loop', durationInFrames: 30, children: [{ kind: 'leaf', ref: 'c' }] },
  ],
};
bench('resolveTimeline+collectLeaves', (i) => core.collectLeaves(core.resolveTimeline(plan, i % 300, 300)), 50_000);

console.log('\nDone. Record figures in X80_VIDEO_ENGINE_CORE_PLAN.md benchmarks.');
