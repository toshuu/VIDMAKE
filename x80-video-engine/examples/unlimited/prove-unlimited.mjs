/** Prove the unlimited engine: 3 novel reels, zero preset layouts as primary
 *  structure, distinct composition strategies, all new expressive power used.
 *  Run: node examples/unlimited/prove-unlimited.mjs
 *  Output: output/unlimited/{orbit-atlas,depth-court,field-manifesto}/ + stills + mp4s.
 */
import { renderFrame } from '../../packages/core/dist/index.js';
import { renderToMp4 } from '../../packages/encoding/dist/index.js';
import { compileReel } from '../../packages/reelspec/dist/compile.js';
import {
  createSkiaMeasurer, registerFontFile, SkiaRenderer, skiaTransitionApplier,
} from '../../packages/renderer-skia/dist/index.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const OUT = '/kaggle/working/x80-video-engine/output/unlimited';
const IFONTS = '/kaggle/working/x80-video-engine/examples/india-reel/fonts';
registerFontFile(join(IFONTS, 'Inter-400.ttf'), 'Inter');
registerFontFile(join(IFONTS, 'Inter-700.ttf'), 'Inter');
registerFontFile(join(IFONTS, 'Inter-800.ttf'), 'Inter');
registerFontFile(join(IFONTS, 'Poppins-600.ttf'), 'Poppins');
registerFontFile(join(IFONTS, 'Poppins-700.ttf'), 'Poppins');

const renderer = new SkiaRenderer();
const measure = createSkiaMeasurer();
const options = () => ({ measureText: measure, transitionApplier: skiaTransitionApplier(renderer) });

const mulberry = (seed) => {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const anim = (f0, f1, v0, v1) => ({
  binding: 'interpolate', inputRange: [f0, f1], outputRange: [v0, v1],
  options: { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
});
const fade = (a, b) => anim(a, b, 0, 1);

/* ---- Reel 1: ORBIT-ATLAS — polar strategy (no rows, no cols, no stacks) ---- */
const orbitChips = () => {
  const cx = 270; const cy = 430; const R = 185;
  const words = ['MARS', 'VENUS', 'ORBIT', 'APOLLO', 'NOVA', 'KEPLER'];
  return words.map((w, i) => {
    const a = (i / words.length) * Math.PI * 2 - Math.PI / 2;
    return {
      id: `chip${i}`, use: 'orb-chip', slots: { 'orb-chip-t': { text: w } },
      x: Math.round(cx + Math.cos(a) * R) - 70, y: Math.round(cy + Math.sin(a) * R) - 24,
    };
  });
};
const orbitSpec = {
  id: 'orbit-atlas', canvas: { w: 540, h: 960, fps: 30 }, system: 'orbital',
  concept: {
    palette: { bg: '#070b18', ink: '#f4f1e8', accent: '#7dd3fc', accent2: '#f0abfc', pillBg: '#f4f1e8', pillFg: '#070b18' },
    faces: { display: 'Inter', hero: 'Inter', kicker: 'Poppins' },
    signature: 'a planetarium dial: six moons orbiting one signal',
    signatureWhy: 'polar layout proves arrangement invention beyond rows/stacks',
  },
  chrome: false, grain: false,
  components: {
    'orb-chip': {
      id: 'orb-chip', type: 'rrect', width: 140, height: 48, radius: 24,
      fill: 'rgba(125,211,252,0.12)', stroke: 'accent', strokeWidth: 2,
      children: [
        { id: 'orb-chip-t', type: 'text', text: 'MOON', fontFamily: 'Poppins', fontSize: 20, fontWeight: 700, letterSpacing: 3, fill: 'ink', x: 18, y: 12 },
      ],
    },
  },
  durations: [90, 90],
  transitions: [{ type: 'fade', duration: 24 }],
  acts: [
    {
      role: 'dial', duration: 90, layout: 'orbit', badge: false,
      nodes: [
        { id: 'space', type: 'rect', width: 540, height: 960, fill: { kind: 'linear', angle: 180, stops: [{ offset: 0, color: '#070b18' }, { offset: 1, color: '#16204a' }] } },
        { id: 'stars', type: 'particles', count: 130, seed: 5, colors: ['#ffffff', 'accent', 'accent2'], size: [1, 3] },
        { id: 'ring1', type: 'circle', radius: 185, x: 85, y: 245, fill: 'rgba(0,0,0,0)', stroke: 'rgba(125,211,252,0.35)', strokeWidth: 2 },
        { id: 'ring2', type: 'circle', radius: 115, x: 155, y: 315, fill: 'rgba(0,0,0,0)', stroke: 'rgba(240,171,252,0.3)', strokeWidth: 2 },
        { id: 'core', type: 'circle', radius: 92, x: 178, y: 338, fill: 'accent', shadow: { color: 'rgba(125,211,252,0.8)', blur: 60, offsetY: 0 } },
        { id: 'core-t', type: 'text', text: 'ATLAS', fontFamily: 'Inter', fontSize: 40, fontWeight: 800, fill: '#070b18', x: 190, y: 404 },
        ...orbitChips(),
      ],
    },
    {
      role: 'signal', duration: 90, layout: 'tilt-card', badge: false,
      nodes: [
        { id: 'space', type: 'rect', width: 540, height: 960, fill: 'bg' },
        { id: 'stars', type: 'particles', count: 60, seed: 9, colors: ['accent2'], size: [1, 2.5] },
        {
          id: 'card', type: 'rrect', width: 420, height: 300, radius: 24, x: 60, y: 280,
          fill: '#101a38', stroke: 'accent2', strokeWidth: 2,
          skewX: { binding: 'interpolate', inputRange: [0, 89], outputRange: [-10, 10], options: { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } },
          rotation: { binding: 'interpolate', inputRange: [0, 89], outputRange: [-2, 2], options: { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } },
          shadow: { color: 'rgba(240,171,252,0.45)', blur: 50, offsetY: 10 },
          children: [
            { id: 'card-k', type: 'text', text: 'DEEP FIELD', fontFamily: 'Poppins', fontSize: 22, fontWeight: 700, letterSpacing: 6, fill: 'accent2', x: 36, y: 40 },
            { id: 'card-h', type: 'text', text: 'Six moons, one signal', fontFamily: 'Inter', fontSize: 54, fontWeight: 800, fill: 'ink', x: 34, y: 90, maxWidth: 360 },
            { id: 'card-s', type: 'text', text: 'the dial holds steady while the sky moves', fontFamily: 'Inter', fontSize: 24, fontWeight: 500, fill: 'rgba(244,241,232,0.8)', x: 36, y: 220, maxWidth: 350 },
          ],
        },
      ],
    },
  ],
};

/* ---- Reel 2: DEPTH-COURT — weak-perspective projection strategy ---- */
const depthSpec = {
  id: 'depth-court', canvas: { w: 540, h: 960, fps: 30 }, system: 'isometric',
  concept: {
    palette: { bg: '#0d1410', ink: '#f2fbf4', accent: '#4ade80', accent2: '#e8b34b', pillBg: '#f2fbf4', pillFg: '#0d1410' },
    faces: { display: 'Inter', hero: 'Inter', kicker: 'Poppins' },
    signature: 'a trophy court in tilted 3D: plinths rise, the board leans in',
    signatureWhy: 'scene3d + skew prove depth invention without a GL dependency',
  },
  chrome: false, grain: false,
  durations: [100, 80],
  transitions: [{ type: 'slide', duration: 12, params: { direction: 'up' } }],
  acts: [
    {
      role: 'court', duration: 100, layout: 'plinth-court', badge: false,
      nodes: [
        { id: 'floor', type: 'rect', width: 540, height: 960, fill: { kind: 'linear', angle: 180, stops: [{ offset: 0, color: '#0d1410' }, { offset: 1, color: '#1c2b22' }] } },
        {
          id: 'stage', type: 'scene3d', width: 540, height: 960,
          camera: { distance: 750, tiltX: 18, tiltY: -16 },
          objects: [
            { kind: 'box', x: -130, y: 60, z: 0, w: 150, h: 150, d: 150, color: '#1f3a2c' },
            { kind: 'box', x: 0, y: 20, z: 40, w: 170, h: 170, d: 230, color: '#4ade80' },
            { kind: 'box', x: 140, y: 80, z: 0, w: 130, h: 130, d: 110, color: '#e8b34b' },
            { kind: 'points', x: 0, y: -160, z: 0, w: 480, h: 200, d: 300, count: 90, seed: 21, color: '#f2fbf4' },
          ],
        },
        {
          id: 'board', type: 'rrect', width: 380, height: 170, radius: 18, x: 80, y: 690,
          fill: 'rgba(242,251,244,0.96)',
          skewY: { binding: 'interpolate', inputRange: [0, 99], outputRange: [-8, 0], options: { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } },
          opacity: fade(4, 20),
          children: [
            { id: 'board-k', type: 'text', text: 'FINAL · COURT 03', fontFamily: 'Poppins', fontSize: 20, fontWeight: 700, letterSpacing: 4, fill: '#0d1410', x: 28, y: 26 },
            { id: 'board-h', type: 'text', text: 'Green takes the tower', fontFamily: 'Inter', fontSize: 44, fontWeight: 800, fill: '#0d1410', x: 26, y: 62, maxWidth: 330 },
          ],
        },
      ],
    },
    {
      role: 'podium', duration: 80, layout: 'lean-row', badge: false,
      nodes: [
        { id: 'floor', type: 'rect', width: 540, height: 960, fill: 'bg' },
        {
          id: 'row', type: 'container', x: 40, y: 330, layout: { direction: 'row', gap: 18 },
          children: [
            { id: 'p1', type: 'rrect', width: 140, height: 220, radius: 14, fill: '#1f3a2c', skewY: -8, children: [{ id: 'p1-t', type: 'text', text: '2ND', fontFamily: 'Poppins', fontSize: 26, fontWeight: 700, fill: 'ink', x: 36, y: 90 }] },
            { id: 'p2', type: 'rrect', width: 140, height: 300, radius: 14, fill: 'accent', skewY: 0, children: [{ id: 'p2-t', type: 'text', text: '1ST', fontFamily: 'Poppins', fontSize: 26, fontWeight: 700, fill: '#0d1410', x: 40, y: 130 }] },
            { id: 'p3', type: 'rrect', width: 140, height: 180, radius: 14, fill: 'accent2', skewY: 8, children: [{ id: 'p3-t', type: 'text', text: '3RD', fontFamily: 'Poppins', fontSize: 26, fontWeight: 700, fill: '#0d1410', x: 36, y: 70 }] },
          ],
        },
        { id: 'cta', type: 'text', text: 'The court remembers height, not noise', fontFamily: 'Inter', fontSize: 30, fontWeight: 500, fill: 'rgba(242,251,244,0.85)', x: 60, y: 700, maxWidth: 420 },
      ],
    },
  ],
};

/* ---- Reel 3: FIELD-MANIFESTO — scatter + micro-act pacing strategy ---- */
const scatterWords = () => {
  const rnd = mulberry(42);
  const words = ['SEED', 'STATIC', 'BLOOM', 'GRAIN', 'SIGNAL', 'HARVEST', 'QUIET', 'THUNDER', 'ORCHARD'];
  return words.map((w, i) => {
    const x = 30 + Math.floor(rnd() * 380);
    const y = 150 + Math.floor(rnd() * 560);
    const rot = Math.round((rnd() - 0.5) * 36);
    const size = 34 + Math.floor(rnd() * 40);
    const at = 4 + i * 6;
    return {
      id: `w${i}`, type: 'text', text: w, fontFamily: i % 3 === 0 ? 'Poppins' : 'Inter',
      fontSize: size, fontWeight: 800, fill: i % 3 === 2 ? 'accent' : 'ink',
      x, y, rotation: rot, opacity: fade(at, at + 14),
      shadow: { color: 'rgba(0,0,0,0.7)', blur: 14, offsetY: 3 },
    };
  });
};
const fieldSpec = {
  id: 'field-manifesto', canvas: { w: 540, h: 960, fps: 30 }, system: 'field',
  concept: {
    palette: { bg: '#141007', ink: '#faf5e9', accent: '#e8b34b', accent2: '#4ade80', pillBg: '#faf5e9', pillFg: '#141007' },
    faces: { display: 'Inter', hero: 'Inter', kicker: 'Poppins' },
    signature: 'nine words scattered like seed, one flash, one straight furrow',
    signatureWhy: 'seeded scatter + 8-frame micro-act prove pacing invention',
  },
  chrome: false, grain: false,
  durations: [90, 8, 90],
  transitions: [{ type: 'fade', duration: 48 }, { type: 'fade', duration: 2 }],
  acts: [
    { role: 'sow', duration: 90, layout: 'scatter', badge: false, nodes: [{ id: 'soil', type: 'rect', width: 540, height: 960, fill: 'bg' }, ...scatterWords()] },
    {
      role: 'flash', duration: 8, layout: 'flash', badge: false,
      nodes: [
        { id: 'bolt', type: 'rect', width: 540, height: 960, fill: 'accent' },
        { id: 'bolt-t', type: 'text', text: 'NOW', fontFamily: 'Inter', fontSize: 150, fontWeight: 800, fill: '#141007', x: 130, y: 400 },
      ],
    },
    {
      role: 'furrow', duration: 90, layout: 'furrow', badge: false,
      nodes: [
        { id: 'soil', type: 'rect', width: 540, height: 960, fill: 'bg' },
        { id: 'hero', type: 'text', text: 'Plant loudly, grow quietly', fontFamily: 'Inter', fontSize: 62, fontWeight: 800, fill: 'ink', x: 40, y: 300, maxWidth: 460, opacity: fade(6, 22) },
        {
          id: 'cta-row', type: 'container', x: 40, y: 620, layout: { direction: 'row', gap: 16 },
          children: [
            { id: 'pill', type: 'rrect', width: 220, height: 64, radius: 32, fill: 'accent', children: [{ id: 'pill-t', type: 'text', text: 'SOW IT', fontFamily: 'Poppins', fontSize: 26, fontWeight: 700, letterSpacing: 3, fill: '#141007', x: 52, y: 16 }] },
            { id: 'lock', type: 'text', text: 'field notes · vol 9', fontFamily: 'Poppins', fontSize: 22, fontWeight: 600, letterSpacing: 2, fill: 'rgba(250,245,233,0.75)', x: 0, y: 20 },
          ],
        },
      ],
    },
  ],
};

const reels = [orbitSpec, depthSpec, fieldSpec];
for (const spec of reels) {
  const { plan, total } = compileReel(spec);
  const dir = join(OUT, spec.id);
  mkdirSync(dir, { recursive: true });
  const marks = [Math.round(total * 0.1), Math.round(total * 0.5), Math.round(total * 0.9)];
  for (const f of marks) {
    const s = renderer.createSurface(spec.canvas.w, spec.canvas.h);
    renderer.clear(s, '#000000');
    renderFrame(renderer, s, plan, f, options());
    writeFileSync(join(dir, `frame-${f}.png`), await renderer.encodePng(s));
    renderer.destroySurface(s);
  }
  const surf = renderer.createSurface(spec.canvas.w, spec.canvas.h);
  const mp4 = await renderToMp4({
    width: spec.canvas.w, height: spec.canvas.h, fps: spec.canvas.fps, frameCount: total,
    renderFrame: (f) => {
      renderer.clear(surf, '#000000');
      renderFrame(renderer, surf, plan, f, options());
      return Buffer.from(renderer.readPixels(surf).data);
    },
  });
  renderer.destroySurface(surf);
  const mp4Path = join(dir, `${spec.id}-${(total / spec.canvas.fps).toFixed(1)}s.mp4`);
  writeFileSync(mp4Path, mp4);
  writeFileSync(join(dir, 'spec.json'), JSON.stringify(spec, null, 1));
  console.log(`${spec.id}: ${total}f stills=${marks.join(',')} mp4=${(mp4.length / 1e6).toFixed(2)}MB`);
}
console.log('PROOF_OK');
