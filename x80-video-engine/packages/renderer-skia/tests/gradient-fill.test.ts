/** Gradient fills + shape shadows: determinism, angle sensitivity, loud errors. */
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SkiaRenderer, registerFontFile, createSkiaMeasurer } from '../src/index.js';

const DIR = dirname(fileURLToPath(import.meta.url));
registerFontFile(join(DIR, 'fonts', 'NotoSans-Regular.ttf'), 'Grad Noto Sans');
registerFontFile(join(DIR, 'fonts', 'NotoSans-Bold.ttf'), 'Grad Noto Sans');

const renderer = new SkiaRenderer();
const GRAD = (angle: number) => ({
  kind: 'linear' as const,
  angle,
  stops: [
    { offset: 0, color: '#2997ff' },
    { offset: 1, color: '#a259ff' },
  ],
});

const shot = (paint: () => void): Buffer => {
  const s = renderer.createSurface(120, 80);
  try {
    renderer.clear(s, '#000000');
    paint();
    return Buffer.from(renderer.readPixels(s).data);
  } finally {
    renderer.destroySurface(s);
  }
};

describe('gradient fills + shape shadows', () => {
  it('gradient rrect is deterministic', () => {
    const s1 = renderer.createSurface(120, 80);
    const s2 = renderer.createSurface(120, 80);
    try {
      for (const s of [s1, s2]) {
        renderer.clear(s, '#000000');
        renderer.drawRoundedRect(s, 10, 10, 100, 60, { radius: 12, fill: GRAD(90) });
      }
      const d1 = Buffer.from(renderer.readPixels(s1).data);
      const d2 = Buffer.from(renderer.readPixels(s2).data);
      expect(d1.equals(d2)).toBe(true);
      // gradient actually paints (not black)
      expect(d1.some((v) => v > 0)).toBe(true);
    } finally {
      renderer.destroySurface(s1);
      renderer.destroySurface(s2);
    }
  });

  it('angle changes pixels (90 vs 180 differ)', () => {
    const mk = (angle: number): Buffer => {
      const s = renderer.createSurface(120, 80);
      try {
        renderer.clear(s, '#000000');
        renderer.drawRect(s, 10, 10, 100, 60, { fill: GRAD(angle) });
        return Buffer.from(renderer.readPixels(s).data);
      } finally {
        renderer.destroySurface(s);
      }
    };
    expect(mk(90).equals(mk(180))).toBe(false);
  });

  it('bad specs throw loudly', () => {
    const s = renderer.createSurface(120, 80);
    try {
      expect(() =>
        renderer.drawRect(s, 0, 0, 10, 10, {
          fill: { kind: 'linear', stops: [{ offset: 0, color: '#fff' }] },
        }),
      ).toThrow(/at least 2 stops/);
      expect(() =>
        renderer.drawRect(s, 0, 0, 10, 10, {
          fill: { kind: 'linear', stops: [{ offset: 0, color: '#fff' }, { offset: 1.5, color: '#000' }] },
        }),
      ).toThrow(/\[0, 1\]/);
      expect(() =>
        renderer.drawRect(s, 0, 0, 10, 10, {
          fill: { kind: 'linear', stops: [{ offset: 0.7, color: '#fff' }, { offset: 0.2, color: '#000' }] },
        }),
      ).toThrow(/ascend/);
      expect(() =>
        renderer.drawRect(s, 0, 0, 10, 10, {
          fill: { kind: 'linear', angle: NaN, stops: GRAD(90).stops },
        }),
      ).toThrow(/finite angle/);
      expect(() =>
        renderer.drawPath(s, 'M0 0H10V10H0Z', {
          fill: { kind: 'linear', stops: GRAD(90).stops },
        }),
      ).toThrow(/staged/);
    } finally {
      renderer.destroySurface(s);
    }
  });

  it('shape shadow + gradient text render deterministically', () => {
    const mk = (): Buffer => {
      const s = renderer.createSurface(200, 100);
      try {
        renderer.clear(s, '#000000');
        renderer.drawRoundedRect(s, 20, 20, 160, 60, {
          radius: 30,
          fill: '#1b2436',
          shadow: { color: 'rgba(41, 151, 255, 0.35)', blur: 24, offsetX: 0, offsetY: 16 },
        });
        renderer.drawText(s, 'Pro.', 20, 10, {
          fontFamily: 'Grad Noto Sans',
          fontSize: 48,
          fontWeight: 700,
          fill: GRAD(90),
        });
        return Buffer.from(renderer.readPixels(s).data);
      } finally {
        renderer.destroySurface(s);
      }
    };
    const a = mk();
    const b = mk();
    expect(a.equals(b)).toBe(true);
    expect(a.some((v) => v > 0)).toBe(true);
  });

  it('measurer loads (smoke for plan use)', () => {
    expect(createSkiaMeasurer()).toBeDefined();
  });

  it('radial gradient centers light, corners dark', () => {
    const s = renderer.createSurface(120, 120);
    try {
      renderer.clear(s, '#000000');
      renderer.drawRect(s, 10, 10, 100, 100, {
        fill: {
          kind: 'radial',
          stops: [
            { offset: 0, color: '#ffffff' },
            { offset: 1, color: '#000000' },
          ],
        },
      });
      const { data } = renderer.readPixels(s);
      const at = (x: number, y: number): number => data[(y * 120 + x) * 4] as number;
      expect(at(60, 60)).toBeGreaterThan(200);
      expect(at(11, 11)).toBeLessThan(60);
    } finally {
      renderer.destroySurface(s);
    }
  });

  it('bad radial/conic specs throw loudly', () => {
    const s = renderer.createSurface(60, 60);
    try {
      expect(() =>
        renderer.drawRect(s, 0, 0, 10, 10, {
          fill: { kind: 'radial', inner: 0.8, outer: 0.5, stops: GRAD(90).stops },
        }),
      ).toThrow(/inner < outer/);
      expect(() =>
        renderer.drawRect(s, 0, 0, 10, 10, {
          fill: { kind: 'conic', angle: NaN, stops: GRAD(90).stops },
        }),
      ).toThrow(/finite/);
    } finally {
      renderer.destroySurface(s);
    }
  });

  it('conic gradient renders deterministically', () => {
    const mk = (): Buffer => {
      const s = renderer.createSurface(100, 100);
      try {
        renderer.clear(s, '#000000');
        renderer.drawCircle(s, 50, 50, 48, {
          fill: {
            kind: 'conic',
            stops: [
              { offset: 0, color: '#2997ff' },
              { offset: 0.5, color: '#a259ff' },
              { offset: 1, color: '#2997ff' },
            ],
          },
        });
        return Buffer.from(renderer.readPixels(s).data);
      } finally {
        renderer.destroySurface(s);
      }
    };
    const a = mk();
    expect(a.equals(mk())).toBe(true);
    expect(a.some((v) => v > 0)).toBe(true);
  });
});
