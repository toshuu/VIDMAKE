/**
 * M4 typography tests on Skia: font registration, complex-script shaping,
 * emoji, weights, families, wrapping, alignment, transforms, effects.
 * Fixture fonts live in tests/fonts/ (Noto Sans R/B, Devanagari R/B, Emoji).
 */
import { layoutText } from '@x80/core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  createSkiaMeasurer,
  ensureSystemFonts,
  probeLetterSpacingSupport,
  registerFontFile,
} from '../src/index.js';
import { SkiaRenderer } from '../src/index.js';

const DIR = dirname(fileURLToPath(import.meta.url));
const FONTS = join(DIR, 'fonts');
const GOLDEN = join(DIR, 'golden-text');

const SANS = 'M4 Noto Sans';
const DEVA = 'M4 Noto Deva';
const EMOJI = 'M4 Noto Emoji';

const litPixels = (data: Uint8ClampedArray): number => {
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i]! + data[i + 1]! + data[i + 2]! > 60) {
      n += 1;
    }
  }
  return n;
};

beforeAll(() => {
  ensureSystemFonts();
  registerFontFile(join(FONTS, 'NotoSans-Regular.ttf'), SANS);
  registerFontFile(join(FONTS, 'NotoSans-Bold.ttf'), SANS);
  registerFontFile(join(FONTS, 'NotoSansDevanagari-Regular.ttf'), DEVA);
  registerFontFile(join(FONTS, 'NotoSansDevanagari-Bold.ttf'), DEVA);
  registerFontFile(join(FONTS, 'NotoColorEmoji.ttf'), EMOJI);
  mkdirSync(GOLDEN, { recursive: true });
});

const renderer = new SkiaRenderer();
const measure = createSkiaMeasurer();

const drawLines = (
  lines: Array<{ text: string; x: number; y: number }>,
  opts: { fontFamily: string; fontSize: number; fontWeight?: number | string; fill?: string },
  w = 900,
  h = 320,
) => {
  const surface = renderer.createSurface(w, h);
  try {
    renderer.clear(surface, '#0e1626');
    for (const line of lines) {
      renderer.drawText(surface, line.text, line.x, line.y, {
        fontFamily: opts.fontFamily,
        fontSize: opts.fontSize,
        fontWeight: opts.fontWeight,
        fill: opts.fill ?? '#ffffff',
      });
    }
    return renderer.readPixels(surface);
  } finally {
    renderer.destroySurface(surface);
  }
};

describe('M4 shaping', () => {
  it('Devanagari conjunct is shaped (narrower than parts)', () => {
    const style = { fontFamily: DEVA, fontSize: 48 };
    const conj = measure.measure('क्ष', style).width;
    const parts = ['क', '्', 'ष'].reduce((s, p) => s + measure.measure(p, style).width, 0);
    expect(conj).toBeLessThan(parts * 0.6);
  });

  it('emoji advances are real glyphs, not tofu', () => {
    const w = measure.measure('🎬🔥💯', { fontFamily: EMOJI, fontSize: 48 }).width;
    expect(w).toBeGreaterThan(100);
    const fb = drawLines([{ text: '🎬🔥💯', x: 20, y: 40 }], { fontFamily: EMOJI, fontSize: 64 });
    expect(litPixels(fb.data)).toBeGreaterThan(2000);
  });

  it('weight selection works (bold ≠ regular)', () => {
    const text = 'Hamburgerfonstiv 0123';
    const reg = measure.measure(text, { fontFamily: SANS, fontSize: 48, fontWeight: 400 }).width;
    const bold = measure.measure(text, { fontFamily: SANS, fontSize: 48, fontWeight: 700 }).width;
    expect(bold).toBeGreaterThan(reg);
    const a = drawLines([{ text, x: 20, y: 40 }], { fontFamily: SANS, fontSize: 64, fontWeight: 400 });
    const b = drawLines([{ text, x: 20, y: 40 }], { fontFamily: SANS, fontSize: 64, fontWeight: 700 });
    expect(Buffer.from(a.data).equals(Buffer.from(b.data))).toBe(false);
  });

  it('families shape differently (Noto Sans vs Liberation Sans)', () => {
    const text = 'Pack my box with five dozen liquor jugs';
    const a = measure.measure(text, { fontFamily: SANS, fontSize: 40 }).width;
    const b = measure.measure(text, { fontFamily: 'Liberation Sans', fontSize: 40 }).width;
    expect(Math.abs(a - b)).toBeGreaterThan(1);
  });
});

describe('M4 scripts', () => {
  const cases: Array<[string, string, string, number]> = [
    ['english', 'The quick brown fox jumps over the lazy dog. 123?!', SANS, 1500],
    ['hindi', 'नमस्ते दुनिया! यह एक परीक्षण है।', DEVA, 800],
    ['marathi', 'मराठी मजकूर चाचणी: शाळा, पाणी, घर।', DEVA, 800],
    ['mixed', `Hello नमस्ते ${'world'} दुनिया`, SANS, 1500],
    ['punct', '— “Hello,” she said… (yes!) @#%&* —', SANS, 500],
  ];
  for (const [name, text, family, min] of cases) {
    it(`${name} draws deterministically`, async () => {
      const surface = renderer.createSurface(900, 200);
      try {
        renderer.clear(surface, '#0e1626');
        renderer.drawText(surface, text, 20, 60, { fontFamily: family, fontSize: 44, fill: '#fff' });
        const a = Buffer.from(await renderer.encodePng(surface));
        renderer.clear(surface, '#0e1626');
        renderer.drawText(surface, text, 20, 60, { fontFamily: family, fontSize: 44, fill: '#fff' });
        const b = Buffer.from(await renderer.encodePng(surface));
        expect(a.equals(b)).toBe(true);
        const fb = renderer.readPixels(surface);
        expect(litPixels(fb.data)).toBeGreaterThan(min);
        writeFileSync(join(GOLDEN, `script-${name}.png`), a);
      } finally {
        renderer.destroySurface(surface);
      }
    });
  }
});

describe('M4 Remotion cross-check (committed Chrome still)', () => {
  const inkBox = (
    data: Uint8ClampedArray,
    w: number,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    thresh: number,
  ) => {
    let minX = 1e9;
    let maxX = -1;
    let minY = 1e9;
    let maxY = -1;
    for (let y = y0; y < y1; y += 1) {
      for (let x = x0; x < x1; x += 1) {
        const i = (y * w + x) * 4;
        if (data[i]! + data[i + 1]! + data[i + 2]! > thresh) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    return { minX, maxX, minY, maxY, w: maxX - minX + 1, h: maxY - minY + 1 };
  };

  it('latin ink box matches Chrome; devanagari width within 3px', async () => {
    const { createCanvas, loadImage } = await import('@napi-rs/canvas');
    const img = await loadImage(join(GOLDEN, 'remotion-m4compare.png'));
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const remo = ctx.getImageData(0, 0, img.width, img.height).data;
    const remoLatin = inkBox(remo, img.width, 100, 650, 1000, 820, 120);
    // Locked browser values (Noto Sans 84px "X80 ENGINE" at x=140).
    expect(remoLatin.minX).toBe(140);
    expect(remoLatin.w).toBe(473);
    expect(remoLatin.h).toBe(62);

    const surface = renderer.createSurface(1080, 1920);
    try {
      renderer.clear(surface, '#0e1626');
      renderer.drawText(surface, 'X80 ENGINE', 140, 700, {
        fontFamily: 'Noto Sans',
        fontSize: 84,
        fill: '#fff',
      });
      renderer.drawText(surface, 'नमस्ते दुनिया', 140, 850, {
        fontFamily: 'Noto Sans Devanagari',
        fontSize: 64,
        fill: '#f5a524',
      });
      const fb = renderer.readPixels(surface);
      const x80Latin = inkBox(fb.data, 1080, 100, 650, 1000, 820, 120);
      // Same advances (x-start, width, height identical; y differs by
      // line-box convention: backend uses textBaseline 'top').
      expect(x80Latin.minX).toBe(remoLatin.minX);
      expect(x80Latin.w).toBe(remoLatin.w);
      expect(x80Latin.h).toBe(remoLatin.h);
      const png = Buffer.from(await renderer.encodePng(surface));
      writeFileSync(join(GOLDEN, 'x80-m4compare.png'), png);

      const x80DevaW = measure.measure('नमस्ते दुनिया', {
        fontFamily: 'Noto Sans Devanagari',
        fontSize: 64,
      }).width;
      const remoDeva = inkBox(remo, img.width, 100, 800, 1000, 1000, 200);
      expect(Math.abs(x80DevaW - remoDeva.w)).toBeLessThanOrEqual(3);
    } finally {
      renderer.destroySurface(surface);
    }
  });
});

describe('M4 layout rendering', () => {
  it('wrap + align center through the compositor path', async () => {
    const laid = layoutText(
      'This is a fairly long paragraph that must wrap onto several lines nicely',
      { fontFamily: SANS, fontSize: 36, maxWidth: 480, textAlign: 'center' },
      measure,
    );
    expect(laid.lines.length).toBeGreaterThan(2);
    for (const line of laid.lines) {
      expect(line.width).toBeLessThanOrEqual(480.5);
    }
    const surface = renderer.createSurface(900, 400);
    try {
      renderer.clear(surface, '#0e1626');
      for (const line of laid.lines) {
        renderer.drawText(surface, line.text, 100 + line.x, 30 + line.y, {
          fontFamily: SANS,
          fontSize: 36,
          fill: '#fff',
          textAlign: 'left',
        });
      }
      const png = Buffer.from(await renderer.encodePng(surface));
      writeFileSync(join(GOLDEN, 'wrap-center.png'), png);
      expect(litPixels(renderer.readPixels(surface).data)).toBeGreaterThan(3000);
    } finally {
      renderer.destroySurface(surface);
    }
  });

  it('long words hard-break without overflow', () => {
    const laid = layoutText('Supercalifragilisticexpialidocious', {
      fontFamily: SANS,
      fontSize: 40,
      maxWidth: 300,
    }, measure);
    expect(laid.lines.length).toBeGreaterThan(1);
    for (const line of laid.lines) {
      expect(line.width).toBeLessThanOrEqual(300.5);
    }
  });

  it('letterSpacing support is probed, spacing widens when honored', () => {
    const supported = probeLetterSpacingSupport();
    const base = measure.measure('hello', { fontFamily: SANS, fontSize: 40 }).width;
    const spaced = measure.measure('hello', { fontFamily: SANS, fontSize: 40, letterSpacing: 10 }).width;
    if (supported) {
      expect(spaced - base).toBeGreaterThan(40);
    } else {
      expect(spaced).toBe(base);
    }
    console.log(`letterSpacing honored by backend: ${supported}`);
  });

  it('stroke + shadow draw', async () => {
    const surface = renderer.createSurface(900, 200);
    try {
      renderer.clear(surface, '#0e1626');
      renderer.drawText(surface, 'Stroke & Shadow', 40, 60, {
        fontFamily: SANS,
        fontSize: 64,
        fill: '#f5a524',
        stroke: '#ffffff',
        strokeWidth: 1.5,
        shadow: { color: '#000000', blur: 12, offsetX: 4, offsetY: 4 },
      });
      const png = Buffer.from(await renderer.encodePng(surface));
      writeFileSync(join(GOLDEN, 'stroke-shadow.png'), png);
      expect(litPixels(renderer.readPixels(surface).data)).toBeGreaterThan(2000);
    } finally {
      renderer.destroySurface(surface);
    }
  });
});
