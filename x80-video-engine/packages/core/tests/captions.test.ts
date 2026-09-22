/**
 * M8 core tests: TikTok pagination + max-chars segments vs the live
 * `@remotion/captions` reference (exact deep equality), SRT round-trip,
 * active page/token helpers, highlight + reveal state, and loud validation.
 */
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import {
  activePageIndexAt,
  activeTokenIndexAt,
  captionTimeMsAtFrame,
  createTikTokStyleCaptions,
  ensureMaxCharactersPerLine,
  pageDisplayText,
  pageEndMs,
  pageExitOpacity,
  parseSrt,
  serializeSrt,
  tokenEnterOpacity,
  tokenProgressAt,
  tokenStatesAt,
  typewriterCharsForToken,
  visibleTokenIndices,
} from '../src/captions/index.js';
import type { Caption, TikTokPage } from '../src/captions/index.js';

const require = createRequire(import.meta.url);
const RefTikTok = require(
  '/kaggle/working/my-video/node_modules/@remotion/captions/dist/create-tiktok-style-captions.js',
) as Record<string, any>;
const RefMaxChars = require(
  '/kaggle/working/my-video/node_modules/@remotion/captions/dist/ensure-max-characters-per-line.js',
) as Record<string, any>;
const RefSrt = require(
  '/kaggle/working/my-video/node_modules/@remotion/captions/dist/parse-srt.js',
) as Record<string, any>;
const RefSer = require(
  '/kaggle/working/my-video/node_modules/@remotion/captions/dist/serialize-srt.js',
) as Record<string, any>;

const cap = (text: string, startMs: number, endMs: number, extra?: Partial<Caption>): Caption => ({
  text,
  startMs,
  endMs,
  timestampMs: (startMs + endMs) / 2,
  confidence: 1,
  ...extra,
});

const WORDS: Caption[] = [
  cap('Hello', 0, 400),
  cap(' world', 400, 800),
  cap(' this', 800, 1100),
  cap(' is', 1100, 1400),
  cap(' a', 1400, 1700),
  cap(' test', 1700, 2200),
  cap(' of', 2200, 2500),
  cap(' captions', 2500, 3000),
];

describe('TikTok pagination parity', () => {
  it('matches reference for combineMs=1000', () => {
    const input = { captions: WORDS, combineTokensWithinMilliseconds: 1000 };
    expect(createTikTokStyleCaptions(input)).toEqual(RefTikTok.createTikTokStyleCaptions(input));
  });

  it('matches reference for combineMs=500 (more pages)', () => {
    const input = { captions: WORDS, combineTokensWithinMilliseconds: 500 };
    expect(createTikTokStyleCaptions(input)).toEqual(RefTikTok.createTikTokStyleCaptions(input));
  });

  it('matches reference with silence breaks', () => {
    const withGap: Caption[] = [
      ...WORDS.slice(0, 4),
      cap(' after', 3000, 3400),
      cap(' silence', 3400, 3800),
    ];
    const input = {
      captions: withGap,
      combineTokensWithinMilliseconds: 2000,
      breakOnSilenceAfterMilliseconds: 1000,
    };
    expect(createTikTokStyleCaptions(input)).toEqual(RefTikTok.createTikTokStyleCaptions(input));
  });

  it('matches reference with pageBreakAfter', () => {
    const withBreak: Caption[] = WORDS.map((w, i) =>
      i === 3 ? { ...w, pageBreakAfter: true as const } : w,
    );
    const input = { captions: withBreak, combineTokensWithinMilliseconds: 5000 };
    expect(createTikTokStyleCaptions(input)).toEqual(RefTikTok.createTikTokStyleCaptions(input));
  });

  it('all pages have finite durations (no Infinity leaks)', () => {
    const { pages } = createTikTokStyleCaptions({
      captions: WORDS,
      combineTokensWithinMilliseconds: 1000,
    });
    expect(pages.length).toBeGreaterThan(0);
    for (const page of pages) {
      expect(Number.isFinite(page.durationMs)).toBe(true);
      expect(page.durationMs).toBeGreaterThan(0);
    }
  });
});

describe('max-chars parity', () => {
  it('matches reference for maxCharsPerLine=16', () => {
    const input = { captions: WORDS, maxCharsPerLine: 16 };
    expect(ensureMaxCharactersPerLine(input)).toEqual(
      RefMaxChars.ensureMaxCharactersPerLine(input),
    );
  });

  it('matches reference for maxCharsPerLine=8 with page breaks', () => {
    const withBreak: Caption[] = WORDS.map((w, i) =>
      i === 2 ? { ...w, pageBreakAfter: true as const } : w,
    );
    const input = { captions: withBreak, maxCharsPerLine: 8 };
    expect(ensureMaxCharactersPerLine(input)).toEqual(
      RefMaxChars.ensureMaxCharactersPerLine(input),
    );
  });
});

describe('SRT parity', () => {
  const SRT = `1
00:00:00,000 --> 00:00:01,500
Hello world

2
00:00:01,500 --> 00:00:03,000
Second line
`;
  it('parseSrt matches reference', () => {
    expect(parseSrt({ input: SRT })).toEqual(RefSrt.parseSrt({ input: SRT }));
  });

  it('serializeSrt matches reference', () => {
    const { captions } = parseSrt({ input: SRT });
    const lines = [captions];
    expect(serializeSrt({ lines })).toBe(RefSer.serializeSrt({ lines }));
  });

  it('parse → serialize round-trips cue count', () => {
    const { captions } = parseSrt({ input: SRT });
    expect(captions).toHaveLength(2);
    const out = serializeSrt({ lines: [captions] });
    expect(out).toContain('Hello world');
    expect(out).toContain('Second line');
  });
});

describe('active page/token helpers', () => {
  const pages = (
    createTikTokStyleCaptions({
      captions: WORDS,
      combineTokensWithinMilliseconds: 1000,
    }) as { pages: TikTokPage[] }
  ).pages;

  it('activePageIndexAt walks pages in order', () => {
    expect(activePageIndexAt(pages, -1)).toBe(-1);
    expect(activePageIndexAt(pages, 0)).toBe(0);
    const secondStart = pages[1]?.startMs ?? Infinity;
    expect(activePageIndexAt(pages, secondStart)).toBe(1);
    expect(activePageIndexAt(pages, pageEndMs(pages[0] as TikTokPage))).toBe(1);
    expect(activePageIndexAt(pages, 1e9)).toBe(-1);
  });

  it('activeTokenIndexAt tracks the last started token', () => {
    const page = pages[0] as TikTokPage;
    expect(activeTokenIndexAt(page, -1)).toBe(-1);
    expect(activeTokenIndexAt(page, page.startMs)).toBe(0);
    const last = page.tokens[page.tokens.length - 1];
    expect(activeTokenIndexAt(page, (last as { toMs: number }).toMs + 1)).toBe(
      page.tokens.length - 1,
    );
  });

  it('tokenProgressAt clamps 0..1', () => {
    const token = { text: 'hi', fromMs: 100, toMs: 300 };
    expect(tokenProgressAt(token, 0)).toBe(0);
    expect(tokenProgressAt(token, 200)).toBeCloseTo(0.5, 9);
    expect(tokenProgressAt(token, 500)).toBe(1);
  });

  it('captionTimeMsAtFrame converts frame → ms', () => {
    expect(captionTimeMsAtFrame(30, 30)).toBe(1000);
    expect(captionTimeMsAtFrame(0, 30)).toBe(0);
    expect(() => captionTimeMsAtFrame(0, 0)).toThrow('positive fps');
  });
});

describe('highlight + reveal state', () => {
  const pages = (
    createTikTokStyleCaptions({
      captions: WORDS,
      combineTokensWithinMilliseconds: 5000,
    }) as { pages: TikTokPage[] }
  ).pages;
  const page = pages[0] as TikTokPage;

  it('tokenStatesAt marks spoken/active/upcoming', () => {
    const before = tokenStatesAt(page, -1);
    expect(before.every((s) => s === 'upcoming')).toBe(true);
    const mid = tokenStatesAt(page, page.tokens[2]?.fromMs as number);
    expect(mid[0]).toBe('spoken');
    expect(mid[2]).toBe('active');
    expect(mid[mid.length - 1]).toBe('upcoming');
  });

  it('visibleTokenIndices hides the future for reveals', () => {
    const t = page.tokens[1]?.fromMs as number;
    expect(visibleTokenIndices(page, t, 'none')).toHaveLength(page.tokens.length);
    expect(visibleTokenIndices(page, t, 'word-reveal')).toHaveLength(2);
    expect(visibleTokenIndices(page, -1, 'word-reveal')).toHaveLength(0);
    expect(visibleTokenIndices(page, t, 'line-reveal')).toHaveLength(2);
    expect(() => visibleTokenIndices(page, t, 'bogus' as never)).toThrow('Unknown caption reveal');
  });

  it('typewriter shows partial then full token', () => {
    const token = { text: 'hello', fromMs: 0, toMs: 1000 };
    expect(typewriterCharsForToken(token, 'hello', -1)).toBe(0);
    const mid = typewriterCharsForToken(token, 'hello', 500);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThanOrEqual(5);
    expect(typewriterCharsForToken(token, 'hello', 1000)).toBe(5);
  });

  it('enter/exit fades default to 1 and ramp otherwise', () => {
    const token = { text: 'hi', fromMs: 100, toMs: 500 };
    expect(tokenEnterOpacity(token, 200, undefined)).toBe(1);
    expect(tokenEnterOpacity(token, 50, 100)).toBe(0);
    expect(tokenEnterOpacity(token, 150, 100)).toBeCloseTo(0.5, 9);
    expect(pageExitOpacity(1000, 500, undefined)).toBe(1);
    expect(pageExitOpacity(1000, 950, 100)).toBeCloseTo(0.5, 9);
    expect(pageExitOpacity(1000, 1000, 100)).toBe(0);
  });

  it('pageDisplayText inserts line breaks at segment bounds', () => {
    const text = pageDisplayText(page, 10);
    expect(text).toContain('\n');
    expect(pageDisplayText(page, undefined)).toBe(page.text);
    expect(() => pageDisplayText(page, 0)).toThrow('positive finite');
  });
});

describe('validation is loud', () => {
  it('rejects bad pagination inputs', () => {
    expect(() =>
      createTikTokStyleCaptions({ captions: WORDS, combineTokensWithinMilliseconds: 0 }),
    ).toThrow('positive finite');
    expect(() =>
      createTikTokStyleCaptions({
        captions: [{ text: 'x', startMs: 5, endMs: 2 }],
        combineTokensWithinMilliseconds: 100,
      }),
    ).toThrow('endMs < startMs');
    expect(() => ensureMaxCharactersPerLine({ captions: WORDS, maxCharsPerLine: -1 })).toThrow(
      'positive finite',
    );
  });

  it('rejects bad SRT inputs', () => {
    expect(() => parseSrt({ input: 42 as never })).toThrow('{ input: string }');
    expect(() => parseSrt({ input: '1\n00:99 --> bad\ntext\n' })).toThrow('Invalid timestamp');
  });
});
