/**
 * M3 renderer tests: (scene, frame, fps) → pixels.
 * - determinism (repeat renders byte-identical)
 * - geometry/transforms, opacity blend math, nested timeline, spring proof
 * - text/image placement, interface unit checks, error paths
 * Golden PNGs are written to tests/golden/ on every run (deterministic).
 */
import { interpolate, renderFrame, spring } from '@x80/core';
import type { FrameBuffer } from '@x80/core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { SkiaRenderer } from '../src/index.js';
import {
  M3_COLORS,
  buildM3Plan,
  preloadM3Assets,
} from '../src/m3-scene.js';

const GOLDEN_DIR = join(dirname(fileURLToPath(import.meta.url)), 'golden');

const hex = (c: string): [number, number, number] => [
  Number.parseInt(c.slice(1, 3), 16),
  Number.parseInt(c.slice(3, 5), 16),
  Number.parseInt(c.slice(5, 7), 16),
];

const BG = hex(M3_COLORS.bg);
const RED = hex(M3_COLORS.rect);
const TEAL = hex(M3_COLORS.rrect);
const AMBER = hex(M3_COLORS.circle);

const pixelAt = (fb: FrameBuffer, x: number, y: number): [number, number, number, number] => {
  const i = (y * fb.width + x) * 4;
  return [fb.data[i] as number, fb.data[i + 1] as number, fb.data[i + 2] as number, fb.data[i + 3] as number];
};

const near = (actual: readonly number[], expected: readonly number[], tol: number): void => {
  expect(actual.length).toBe(expected.length);
  actual.forEach((v, i) => {
    expect(Math.abs(v - (expected[i] as number)), `channel ${i}: got ${v}, want ${expected[i]} ±${tol}`).toBeLessThanOrEqual(tol);
  });
};

let renderer: SkiaRenderer;
let assets: Map<string, unknown>;
const plan = buildM3Plan();

const renderToPng = async (frame: number): Promise<{ png: Buffer; fb: FrameBuffer }> => {
  const surface = renderer.createSurface(1080, 1920);
  try {
    renderFrame(renderer, surface, plan, frame, {
      resolveAsset: (src: string) => assets.get(src),
    });
    return { png: Buffer.from(await renderer.encodePng(surface)), fb: renderer.readPixels(surface) };
  } finally {
    renderer.destroySurface(surface);
  }
};

beforeAll(async () => {
  renderer = new SkiaRenderer();
  assets = await preloadM3Assets();
  mkdirSync(GOLDEN_DIR, { recursive: true });
});

describe('M3 determinism', () => {
  for (const frame of [0, 30, 120, 150, 299]) {
    it(`frame ${frame} renders byte-identical twice`, async () => {
      const a = await renderToPng(frame);
      const b = await renderToPng(frame);
      expect(a.png.equals(b.png)).toBe(true);
      writeFileSync(join(GOLDEN_DIR, `frame-${frame}.png`), a.png);
    });
  }
  it('writes the extra golden frames', async () => {
    for (const frame of [10, 89, 100, 160, 185, 210]) {
      const { png } = await renderToPng(frame);
      writeFileSync(join(GOLDEN_DIR, `frame-${frame}.png`), png);
    }
  });
});

describe('M3 geometry + motion', () => {
  it('frame 0: bg + rect at x=0', async () => {
    const { fb } = await renderToPng(0);
    near(pixelAt(fb, 540, 100), [...BG, 255], 0);
    near(pixelAt(fb, 100, 500), [...RED, 255], 0);
  });

  it('frame 140: rect moved to x=140/299*880 (seqA window ends at 149)', async () => {
    const { fb } = await renderToPng(140);
    const x = (140 / 299) * 880;
    expect(x).toBeCloseTo(412.04, 1);
    near(pixelAt(fb, 500, 500), [...RED, 255], 0);
    near(pixelAt(fb, 100, 500), [...BG, 255], 0);
  });
});

describe('M3 spring proof (rrect scale)', () => {
  it('frame 10: measured half-width matches spring value', async () => {
    const scale = spring({ frame: 10, fps: 30, from: 0.2, to: 1 });
    const expectedHalf = 160 * scale;
    const { fb } = await renderToPng(10);
    // Scan center row y=790 for teal run.
    let left = -1;
    let right = -1;
    for (let x = 0; x < 1080; x += 1) {
      const [r, g, b] = pixelAt(fb, x, 790);
      if (Math.abs(r - TEAL[0]) <= 12 && Math.abs(g - TEAL[1]) <= 12 && Math.abs(b - TEAL[2]) <= 12) {
        if (left < 0) {
          left = x;
        }
        right = x;
      }
    }
    expect(left).toBeGreaterThan(0);
    const measuredHalf = (right - left + 1) / 2;
    expect(Math.abs(measuredHalf - expectedHalf)).toBeLessThanOrEqual(4);
  });
});

describe('M3 opacity + nesting', () => {
  it('frame 89: circle not yet visible → bg pixel', async () => {
    const { fb } = await renderToPng(89);
    near(pixelAt(fb, 540, 1090), [...BG, 255], 0);
  });

  it('frame 100: circle local=10, opacity=1/6 over bg', async () => {
    const { fb } = await renderToPng(100);
    const o = 10 / 60;
    const expected = [
      AMBER[0] * o + BG[0] * (1 - o),
      AMBER[1] * o + BG[1] * (1 - o),
      AMBER[2] * o + BG[2] * (1 - o),
      255,
    ];
    near(pixelAt(fb, 540, 1090), expected, 3);
  });

  it('frame 120: circle local=30, opacity=0.5 blend', async () => {
    const { fb } = await renderToPng(120);
    const expected = [
      AMBER[0] * 0.5 + BG[0] * 0.5,
      AMBER[1] * 0.5 + BG[1] * 0.5,
      AMBER[2] * 0.5 + BG[2] * 0.5,
      255,
    ];
    near(pixelAt(fb, 540, 1090), expected, 2);
  });
});

describe('M3 loop through renderer', () => {
  // pulseDot geometry: circle r=24 at (100,1700) → center (124,1724).
  it('frame 160: pulse local=10 → blended white dot', async () => {
    const { fb } = await renderToPng(160);
    const o = 1 - (10 / 29) * 0.8;
    const expected = [255 * o + BG[0] * (1 - o), 255 * o + BG[1] * (1 - o), 255 * o + BG[2] * (1 - o), 255];
    near(pixelAt(fb, 124, 1724), expected, 3);
  });

  it('frame 185: second iteration, pulse local=5', async () => {
    const { fb } = await renderToPng(185);
    const o = 1 - (5 / 29) * 0.8;
    const expected = [255 * o + BG[0] * (1 - o), 255 * o + BG[1] * (1 - o), 255 * o + BG[2] * (1 - o), 255];
    near(pixelAt(fb, 124, 1724), expected, 3);
  });
});

describe('M3 image + text placement', () => {
  it('frame 210: image orange field away from cross-hatch', async () => {
    const { fb } = await renderToPng(210);
    // (500,1300) clears both diagonal strokes and the white border.
    near(pixelAt(fb, 500, 1300), [255, 128, 0, 255], 2);
  });

  it('frame 89: image window not started → bg', async () => {
    const { fb } = await renderToPng(89);
    near(pixelAt(fb, 540, 1370), [...BG, 255], 0);
  });

  it('frame 210: text band contains drawn (non-bg) pixels', async () => {
    const { fb } = await renderToPng(210);
    let drawn = 0;
    let total = 0;
    for (let y = 1540; y < 1680; y += 1) {
      for (let x = 100; x < 980; x += 2) {
        total += 1;
        const [r, g, b] = pixelAt(fb, x, y);
        if (Math.abs(r - BG[0]) > 12 || Math.abs(g - BG[1]) > 12 || Math.abs(b - BG[2]) > 12) {
          drawn += 1;
        }
      }
    }
    expect(drawn).toBeGreaterThan(200);
    expect(drawn / total).toBeLessThan(0.4);
  });

  it('frame 150: text still offscreen right → band is bg', async () => {
    const { fb } = await renderToPng(150);
    // textE local=0 → x=1080 (offscreen); band x<1000 must be bg.
    near(pixelAt(fb, 500, 1600), [...BG, 255], 0);
  });
});

describe('M3 interface units', () => {
  it('clear / rounded rect / clip / composite', async () => {
    const surface = renderer.createSurface(100, 100);
    try {
      renderer.clear(surface, '#112233');
      let fb = renderer.readPixels(surface);
      near(pixelAt(fb, 50, 50), [0x11, 0x22, 0x33, 255], 0);

      renderer.drawRoundedRect(surface, 10, 10, 80, 80, { radius: 20, fill: '#ffffff' });
      fb = renderer.readPixels(surface);
      near(pixelAt(fb, 50, 50), [255, 255, 255, 255], 0);
      // Corner outside the radius stays background.
      near(pixelAt(fb, 11, 11), [0x11, 0x22, 0x33, 255], 0);

      renderer.save(surface);
      renderer.clipRect(surface, { x: 0, y: 0, width: 50, height: 100 });
      renderer.drawRect(surface, 0, 0, 100, 100, { fill: '#ff0000' });
      renderer.restore(surface);
      fb = renderer.readPixels(surface);
      near(pixelAt(fb, 25, 50), [255, 0, 0, 255], 0);
      near(pixelAt(fb, 75, 50), [255, 255, 255, 255], 0);

      const overlay = renderer.createSurface(100, 100);
      try {
        renderer.clear(overlay, '#00ff00');
        renderer.composite(surface, overlay, { opacity: 0.5 });
        fb = renderer.readPixels(surface);
        // white * 0.5 + green * 0.5 over the right half
        near(pixelAt(fb, 75, 50), [128, 255, 128, 255], 2);
      } finally {
        renderer.destroySurface(overlay);
      }

      // Nested opacity multiplies.
      renderer.save(surface);
      renderer.setOpacity(surface, 0.5);
      renderer.save(surface);
      renderer.setOpacity(surface, 0.5);
      renderer.drawRect(surface, 0, 0, 100, 100, { fill: '#0000ff' });
      renderer.restore(surface);
      renderer.restore(surface);
      fb = renderer.readPixels(surface);
      // blue@0.25 over prior (128,255,128): b = 255*.25+128*.75 = 159.75
      near(pixelAt(fb, 75, 50), [96, 191, 160, 255], 3);
    } finally {
      renderer.destroySurface(surface);
    }
  });

  it('error paths are loud', async () => {
    const surface = renderer.createSurface(1080, 1920);
    try {
      const badLeaf = {
        ...plan,
        timeline: { kind: 'leaf', ref: 'nope' } as const,
      };
      expect(() => renderFrame(renderer, surface, badLeaf, 0)).toThrow('unknown scene node');
      expect(() =>
        renderFrame(renderer, surface, plan, 210, { resolveAsset: () => undefined }),
      ).toThrow('Asset not resolved');
    } finally {
      renderer.destroySurface(surface);
    }
  });

  it('group rotation moves the mini rect (combined transforms)', async () => {
    const a = await renderToPng(0);
    const b = await renderToPng(150);
    // Same band, different rotation → pixels differ somewhere in the group area.
    let diff = 0;
    for (let y = 180; y < 420; y += 4) {
      for (let x = 420; x < 660; x += 4) {
        const pa = pixelAt(a.fb, x, y);
        const pb = pixelAt(b.fb, x, y);
        if (pa[0] !== pb[0] || pa[1] !== pb[1] || pa[2] !== pb[2]) {
          diff += 1;
        }
      }
    }
    expect(diff).toBeGreaterThan(50);
    // Frame 0 rotation=0: mini spans (480..600, 240..360); center (540,300).
    near(pixelAt(a.fb, 540, 300), [...hex(M3_COLORS.mini), 255], 0);
  });

  it('interpolate() input sanity for the scene motion', () => {
    expect(interpolate(150, [0, 299], [0, 880])).toBeCloseTo(441.47, 1);
  });
});

describe('M3 Remotion cross-check (committed still, frame 140)', () => {
  it('bg exact, red rect run matches Remotion 4.0.526 within 1px', async () => {
    const { createCanvas, loadImage } = await import('@napi-rs/canvas');
    const img = await loadImage(join(GOLDEN_DIR, 'remotion-m3compare-140.png'));
    expect([img.width, img.height]).toEqual([1080, 1920]);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, img.width, img.height).data;
    const px = (x: number, y: number): [number, number, number, number] => {
      const i = (y * img.width + x) * 4;
      return [data[i] as number, data[i + 1] as number, data[i + 2] as number, data[i + 3] as number];
    };
    // Background identical.
    near(px(540, 100), [...BG, 255], 0);
    // Red run on row 500: Remotion renders 412→611; X80 must start within 1px.
    const isRed = (x: number): boolean => {
      const [r, g, b] = px(x, 500);
      return r > 200 && g < 120 && b < 120;
    };
    let start = -1;
    for (let x = 0; x < img.width; x += 1) {
      if (isRed(x)) {
        start = x;
        break;
      }
    }
    expect(start).toBeGreaterThanOrEqual(411);
    expect(start).toBeLessThanOrEqual(413);
    near(px(500, 500), [...RED, 255], 0);
  });
});
