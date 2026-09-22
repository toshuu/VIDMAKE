/**
 * M8 pipeline tests: caption nodes render TikTok-style pages through
 * the backend-agnostic compositor (highlight, reveal, boxes, fades).
 * Fixture fonts are the M4 set in tests/fonts/.
 */
import { renderFrame } from '@x80/core';
import type { VideoPlan } from '@x80/core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { createSkiaMeasurer, registerFontFile, SkiaRenderer } from '../src/index.js';

const DIR = dirname(fileURLToPath(import.meta.url));
const FONTS = join(DIR, 'fonts');
const GOLDEN = join(DIR, 'golden-captions');
const SANS = 'M8 Noto Sans';

beforeAll(() => {
  registerFontFile(join(FONTS, 'NotoSans-Regular.ttf'), SANS);
  registerFontFile(join(FONTS, 'NotoSans-Bold.ttf'), SANS);
  mkdirSync(GOLDEN, { recursive: true });
});

const renderer = new SkiaRenderer();
const measure = createSkiaMeasurer();

const WORDS = [
  { text: 'Hello', startMs: 0, endMs: 400, timestampMs: 200, confidence: 1 },
  { text: ' world', startMs: 400, endMs: 800, timestampMs: 600, confidence: 1 },
  { text: ' this', startMs: 800, endMs: 1100, timestampMs: 950, confidence: 1 },
  { text: ' is', startMs: 1100, endMs: 1400, timestampMs: 1250, confidence: 1 },
  { text: ' a', startMs: 1400, endMs: 1700, timestampMs: 1550, confidence: 1 },
  { text: ' test', startMs: 1700, endMs: 2200, timestampMs: 1950, confidence: 1 },
];

const plan = (over: Record<string, unknown> = {}): VideoPlan => ({
  composition: {
    id: 'm8',
    width: 900,
    height: 320,
    fps: 30,
    durationInFrames: 90,
    root: {
      id: 'root',
      type: 'container',
      children: [
        {
          id: 'cap',
          type: 'caption',
          x: 20,
          y: 40,
          captions: WORDS,
          combineMs: 5000,
          fontFamily: SANS,
          fontSize: 44,
          fill: '#9aa4b2',
          highlightFill: '#ffe14d',
          background: '#101828',
          activeBackground: '#3a2f00',
          backgroundPadding: 8,
          backgroundRadius: 12,
          maxWidth: 860,
          ...over,
        } as never,
      ],
    },
  },
  timeline: {
    kind: 'sequence',
    from: 0,
    durationInFrames: 90,
    children: [{ kind: 'leaf', ref: 'cap' }],
  },
});

const render = (p: VideoPlan, frame: number) => {
  const surface = renderer.createSurface(900, 320);
  try {
    renderFrame(renderer, surface, p, frame, { measureText: measure });
    return renderer.readPixels(surface);
  } finally {
    renderer.destroySurface(surface);
  }
};

const renderOn = (p: VideoPlan, frame: number, bg: string) => {
  const surface = renderer.createSurface(900, 320);
  try {
    renderer.clear(surface, bg);
    renderFrame(renderer, surface, p, frame, { measureText: measure });
    return renderer.readPixels(surface);
  } finally {
    renderer.destroySurface(surface);
  }
};

const litPixels = (data: Uint8ClampedArray): number => {
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i]! + data[i + 1]! + data[i + 2]! > 220) {
      n += 1;
    }
  }
  return n;
};

describe('M8 pipeline', () => {
  it('renders highlighted captions deterministically', () => {
    const a = renderOn(plan(), 45, '#0a0f1a');
    const b = renderOn(plan(), 45, '#0a0f1a');
    expect(Buffer.from(a.data).equals(Buffer.from(b.data))).toBe(true);
    expect(litPixels(a.data)).toBeGreaterThan(1000);
  });

  it('word-reveal hides future words (fewer bright pixels)', () => {
    const full = renderOn(plan({ reveal: 'none' }), 20, '#0a0f1a');
    const revealed = renderOn(plan({ reveal: 'word-reveal' }), 20, '#0a0f1a');
    expect(litPixels(revealed.data)).toBeLessThan(litPixels(full.data));
    expect(litPixels(revealed.data)).toBeGreaterThan(200);
  });

  it('highlight none differs from phrase highlight', () => {
    const phrase = renderOn(plan({ highlight: 'phrase' }), 45, '#0a0f1a');
    const none = renderOn(plan({ highlight: 'none' }), 45, '#0a0f1a');
    expect(Buffer.from(phrase.data).equals(Buffer.from(none.data))).toBe(false);
  });

  it('typewriter shows less early, full page late', () => {
    const early = renderOn(plan({ reveal: 'typewriter' }), 5, '#0a0f1a');
    const late = renderOn(plan({ reveal: 'typewriter' }), 60, '#0a0f1a');
    expect(litPixels(early.data)).toBeLessThan(litPixels(late.data));
  });

  it('empty captions draw nothing (background only)', () => {
    const blank = renderer.createSurface(900, 320);
    try {
      renderer.clear(blank, '#0a0f1a');
      const expected = renderer.readPixels(blank);
      const actual = renderOn(plan({ captions: [] }), 45, '#0a0f1a');
      expect(Buffer.from(actual.data).equals(Buffer.from(expected.data))).toBe(true);
    } finally {
      renderer.destroySurface(blank);
    }
  });

  it('invalid combineMs throws loudly', () => {
    expect(() => render(plan({ combineMs: 0 }), 10)).toThrow('combineMs');
    expect(() => render(plan({ highlight: 'glow' }), 10)).toThrow('Unknown caption highlight');
  });

  it('writes golden caption frames', async () => {
    const cases: Array<[string, Record<string, unknown>, number]> = [
      ['caption-phrase', { highlight: 'phrase', reveal: 'none' }, 45],
      ['caption-word-reveal', { highlight: 'phrase', reveal: 'word-reveal' }, 30],
      ['caption-typewriter', { highlight: 'word', reveal: 'typewriter' }, 25],
    ];
    for (const [name, over, frame] of cases) {
      const surface = renderer.createSurface(900, 320);
      try {
        renderer.clear(surface, '#0a0f1a');
        renderFrame(renderer, surface, plan(over), frame, { measureText: measure });
        writeFileSync(join(GOLDEN, `${name}.png`), await renderer.encodePng(surface));
      } finally {
        renderer.destroySurface(surface);
      }
    }
  });
});
