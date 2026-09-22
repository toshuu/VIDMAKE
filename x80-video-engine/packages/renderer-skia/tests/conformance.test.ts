/**
 * Chrome conformance: the GroundworkCompare fixture (my-video, headless
 * Chrome still) vs the X80 twin rendered here. Locks the groundwork claim:
 * radial glow + native blur + linear gradients + gradient text +
 * box-shadow + spaced kickers reproduce Chrome within blur-kernel and
 * font-glyph tolerance. Chrome PNG is a committed golden (no browser at
 * test time); regenerate via my-video `npx remotion still
 * GroundworkCompare --frame=0` if the fixture ever changes.
 */
import { renderFrame } from '@x80/core';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createSkiaMeasurer, registerFontFile, SkiaRenderer } from '../src/index.js';

const DIR = dirname(fileURLToPath(import.meta.url));
registerFontFile(join(DIR, 'fonts', 'LiberationSans-Regular.ttf'), 'Conform Sans');
registerFontFile(join(DIR, 'fonts', 'LiberationSans-Bold.ttf'), 'Conform Sans');

const F = 'Conform Sans';
const renderer = new SkiaRenderer();
const measure = createSkiaMeasurer();

const twin = () => {
  const s = renderer.createSurface(540, 960);
  renderer.clear(s, '#000000');
  renderFrame(renderer, s, {
    composition: {
      id: 'gw', width: 540, height: 960, fps: 30, durationInFrames: 30,
      root: {
        id: 'root', type: 'container',
        children: [
          { id: 'bg', type: 'rect', width: 540, height: 960, fill: '#000000' },
          {
            id: 'glow', type: 'circle', radius: 180, x: 90, y: 120,
            blendMode: 'screen',
            fill: { kind: 'radial', outer: 0.709, stops: [{ offset: 0, color: 'rgba(47,127,224,0.55)' }, { offset: 1, color: 'rgba(0,0,0,0)' }] },
            filter: { blur: 35 },
          },
          {
            id: 'bar', type: 'rrect', width: 380, height: 8, radius: 4, x: 80, y: 560,
            fill: { kind: 'linear', angle: 90, stops: [{ offset: 0, color: '#2997ff' }, { offset: 1, color: '#a259ff' }] },
          },
          {
            id: 'pro', type: 'text', text: 'Pro.', fontFamily: F, fontSize: 96, fontWeight: 700,
            lineHeight: 1, textAlign: 'center', maxWidth: 540, x: 0, y: 590,
            fill: { kind: 'linear', angle: 90, stops: [{ offset: 0, color: '#2997ff' }, { offset: 1, color: '#a259ff' }] },
          },
          {
            id: 'card', type: 'rrect', width: 300, height: 120, radius: 24, x: 120, y: 730,
            fill: '#13253f',
            shadow: { color: 'rgba(41, 151, 255, 0.35)', blur: 60, offsetY: 20 },
          },
          {
            id: 'kick', type: 'text', text: 'INTRODUCING', fontFamily: F, fontSize: 20,
            letterSpacing: 9, fill: '#86868b', textAlign: 'center', maxWidth: 540, x: 0, y: 60,
          },
        ],
      },
    },
    timeline: {
      kind: 'sequence', from: 0, durationInFrames: 30,
      children: ['bg', 'glow', 'bar', 'pro', 'card', 'kick'].map((ref) => ({ kind: 'leaf', ref })),
    },
  } as never, 0, { measureText: measure });
  try {
    return Buffer.from(renderer.readPixels(s).data);
  } finally {
    renderer.destroySurface(s);
  }
};

const chromePixels = async (): Promise<Uint8ClampedArray> => {
  const png = readFileSync(join(DIR, 'golden-conform', 'conform-chrome.png'));
  const img = await loadImage(png);
  const c = createCanvas(540, 960);
  c.getContext('2d').drawImage(img, 0, 0);
  return c.getContext('2d').getImageData(0, 0, 540, 960).data;
};

const regionMean = (a: Uint8ClampedArray, b: Buffer, x0: number, y0: number, x1: number, y1: number): number => {
  let s = 0;
  let n = 0;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const i = (y * 540 + x) * 4;
      s += Math.abs(a[i]! - b[i]!) + Math.abs(a[i + 1]! - b[i + 1]!) + Math.abs(a[i + 2]! - b[i + 2]!);
      n += 1;
    }
  }
  return s / (n * 3);
};

describe('chrome conformance (GroundworkCompare)', () => {
  it('matches headless Chrome within kernel/font tolerance', async () => {
    const mine = twin();
    const chrome = await chromePixels();
    let s = 0;
    for (let i = 0; i < chrome.length; i += 4) {
      s += Math.abs(chrome[i]! - mine[i]!) + Math.abs(chrome[i + 1]! - mine[i + 1]!) + Math.abs(chrome[i + 2]! - mine[i + 2]!);
    }
    const mean = s / ((chrome.length / 4) * 3);
    expect(mean).toBeLessThan(6);
    // Hard geometry (gradients, card, shadow) is near-exact; text/glow
    // carry the known font-glyph + blur-kernel tolerance.
    expect(regionMean(chrome, mine, 80, 555, 460, 570)).toBeLessThan(1.5);
    expect(regionMean(chrome, mine, 120, 730, 420, 850)).toBeLessThan(1.5);
    expect(regionMean(chrome, mine, 90, 120, 450, 480)).toBeLessThan(12);
  });
});
