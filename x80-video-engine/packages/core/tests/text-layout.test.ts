/**
 * M4 pure layout tests with a monospace-model measurer (10px/char).
 * Backend shaping is tested in renderer-skia; here we lock wrapping,
 * alignment, justification, transforms, and word/char tiling.
 */
import { describe, expect, it } from 'vitest';
import {
  applyTextTransform,
  layoutChars,
  layoutText,
  layoutWords,
} from '../src/text/index.js';
import type { TextMeasurer, TextStyle } from '../src/text/index.js';

const mono: TextMeasurer = {
  measure: (text: string) => ({ width: text.length * 10 }),
};

const style = (over: Partial<TextStyle> = {}): TextStyle => ({
  fontFamily: 'mono',
  fontSize: 20,
  ...over,
});

describe('layoutText', () => {
  it('single line, no wrap', () => {
    const laid = layoutText('hello', style(), mono);
    expect(laid.lines).toHaveLength(1);
    expect(laid.lines[0]).toMatchObject({ text: 'hello', x: 0, y: 0, width: 50 });
    expect(laid.width).toBe(50);
    expect(laid.height).toBe(24); // 20 * 1.2
  });

  it('explicit newlines split paragraphs', () => {
    const laid = layoutText('ab\ncde', style(), mono);
    expect(laid.lines.map((l) => l.text)).toEqual(['ab', 'cde']);
    expect(laid.lines[1]?.y).toBe(24);
  });

  it('greedy wrap respects maxWidth', () => {
    const laid = layoutText('aa bb cc dd', style({ maxWidth: 55 }), mono);
    // 'aa bb' = 50 fits; 'aa bb cc' = 80 does not.
    expect(laid.lines.map((l) => l.text)).toEqual(['aa bb', 'cc dd']);
    for (const line of laid.lines) {
      expect(line.width).toBeLessThanOrEqual(55);
    }
  });

  it('overlong words hard-break', () => {
    const laid = layoutText('abcdefghij', style({ maxWidth: 35 }), mono);
    expect(laid.lines.map((l) => l.text)).toEqual(['abc', 'def', 'ghi', 'j']);
  });

  it('center/right offsets', () => {
    const c = layoutText('ab\ncdef', style({ maxWidth: 100, textAlign: 'center' }), mono);
    expect(c.lines[0]?.x).toBe(40); // (100-20)/2
    expect(c.lines[1]?.x).toBe(30); // (100-40)/2
    const r = layoutText('ab\ncdef', style({ maxWidth: 100, textAlign: 'right' }), mono);
    expect(r.lines[0]?.x).toBe(80);
    expect(r.lines[1]?.x).toBe(60);
  });

  it('justify distributes to non-last lines only', () => {
    const laid = layoutText('aa bb cc dd ee', style({ maxWidth: 55, textAlign: 'justify' }), mono);
    expect(laid.lines).toHaveLength(3);
    expect(laid.lines[0]?.gapExtra).toBeCloseTo(5, 9); // (55-50)/1
    expect(laid.lines[2]?.gapExtra).toBe(0); // last line
  });

  it('transforms', () => {
    expect(applyTextTransform('abc', 'uppercase')).toBe('ABC');
    expect(applyTextTransform('ABC', 'lowercase')).toBe('abc');
    const laid = layoutText('abc', style({ textTransform: 'uppercase' }), mono);
    expect(laid.lines[0]?.text).toBe('ABC');
  });

  it('letterSpacing widens advances', () => {
    const base = layoutText('abc', style(), mono);
    const spaced = layoutText('abc', style({ letterSpacing: 5 }), mono);
    expect(spaced.lines[0]?.width).toBe(base.lines[0]?.width as number + 15);
  });
});

describe('layoutWords/layoutChars', () => {
  it('words tile the line', () => {
    const laid = layoutText('aa bb', style(), mono);
    const words = layoutWords(laid, style(), mono);
    expect(words.map((w) => w.word)).toEqual(['aa', 'bb']);
    expect(words[0]).toMatchObject({ x: 0, width: 20 });
    expect(words[1]?.x).toBeGreaterThan(words[0]?.x as number);
  });

  it('chars tile each word', () => {
    const laid = layoutText('ab', style(), mono);
    const chars = layoutChars(laid, style(), mono);
    expect(chars.map((c) => c.ch)).toEqual(['a', 'b']);
    const total = chars.reduce((s, c) => s + c.width, 0);
    expect(total).toBe(laid.lines[0]?.width);
  });
});
