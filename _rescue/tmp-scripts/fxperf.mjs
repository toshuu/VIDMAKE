import { createCanvas, loadImage } from '@napi-rs/canvas';
import { performance } from 'node:perf_hooks';
import { readFileSync } from 'node:fs';
import { applyEffectByName } from './packages/effects/dist/index.js';

const wrap = (canvas) => {
  const raw = canvas.getContext('2d');
  const ctx = {
    getImageData: (a,b,c,d) => raw.getImageData(a,b,c,d),
    putImageData: (i,x,y) => raw.putImageData(i,x,y),
    createImageData: (w,h) => raw.createImageData(w,h),
    drawImage: (img,...a) => raw.drawImage(img,...a),
    save: () => raw.save(), restore: () => raw.restore(),
    beginPath: () => raw.beginPath(), rect: (a,b,c,d) => raw.rect(a,b,c,d), clip: () => raw.clip(),
    arc: (...a) => raw.arc(...a), moveTo: (a,b) => raw.moveTo(a,b), lineTo: (a,b) => raw.lineTo(a,b),
    fill: () => raw.fill(), stroke: () => raw.stroke(),
    translate: (a,b) => raw.translate(a,b), scale: (a,b) => raw.scale(a,b), rotate: (a) => raw.rotate(a),
    fillRect: (a,b,c,d) => raw.fillRect(a,b,c,d),
    createLinearGradient: (...a) => raw.createLinearGradient(...a),
    createRadialGradient: (...a) => raw.createRadialGradient(...a),
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, globalAlpha: 1, globalCompositeOperation: 'source-over',
  };
  Object.defineProperties(ctx, {
    fillStyle: { get: () => String(raw.fillStyle), set: (v) => { raw.fillStyle = v; } },
    strokeStyle: { get: () => String(raw.strokeStyle), set: (v) => { raw.strokeStyle = v; } },
  });
  return {
    canvas, ctx, width: canvas.width, height: canvas.height,
    createTemp: (w,h) => { const c = createCanvas(w,h); const x = wrap(c); return { canvas: c, ctx: x.ctx }; },
  };
};

const base = await loadImage('./packages/renderer-skia/tests/golden/frame-210.png');
const W = base.width, H = base.height;
for (const [name, params] of [
  ['brightness', { amount: 0.2 }],
  ['vignette', { strength: 0.5 }],
  ['blur', { radius: 12 }],
  ['noise', { amount: 0.2, seed: 7 }],
  ['fisheye', { strength: 0.5 }],
  ['corner-pin', { tl: [0.05,0.02], tr: [0.95,0.05], br: [0.98,0.97], bl: [0.02,1] }],
  ['duotone', { dark: '#001122', light: '#ffdd88' }],
]) {
  const c = createCanvas(W, H);
  c.getContext('2d').drawImage(base, 0, 0);
  const ecx = wrap(c);
  const t0 = performance.now();
  applyEffectByName(ecx, name, params);
  const dt = performance.now() - t0;
  console.log(`${name.padEnd(16)} ${dt.toFixed(1).padStart(8)} ms (${W}x${H})`);
}
