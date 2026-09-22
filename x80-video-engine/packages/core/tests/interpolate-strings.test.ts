/**
 * M1 golden parity: strings / tuples / discrete vs Remotion reference.
 */
import { describe, expect, it } from 'vitest';
import { Easing, interpolate } from '../src/animation/index.js';
import { Remotion } from './reference.js';

const loose = (a: number, b: number): void => {
  expect(Math.abs(a - b)).toBeLessThanOrEqual(1e-5);
};

const compareString = (a: string, b: string): void => {
  const nums = (s: string): number[] =>
    [...s.matchAll(/-?\d*\.?\d+(?:[eE][-+]?\d+)?/g)]
      .map((m) => Number(m[0]))
      .filter((n) => Number.isFinite(n));
  const strip = (s: string): string =>
    s.replace(/-?\d*\.?\d+(?:[eE][-+]?\d+)?/g, '#');
  expect(strip(a)).toBe(strip(b));
  const an = nums(a);
  const bn = nums(b);
  expect(an.length).toBe(bn.length);
  an.forEach((v, i) => loose(v, bn[i] as number));
};

describe('interpolate string/tuple/discrete parity', () => {
  const stringCases: Array<[number, number[], string[]]> = [
    [0, [0, 1], ['0px', '100px']],
    [0.5, [0, 1], ['0px', '100px']],
    [1, [0, 1], ['0px', '100px']],
    [0.5, [0, 1], ['0%', '100%']],
    [0.5, [0, 1], ['0deg', '360deg']],
    [15, [0, 30], ['1', '1.15']],
    [0.5, [0, 1], ['10px 20px', '30px 40px']],
    [0.5, [0, 1], ['10px 20%', '30px 40%']],
    [0.5, [0, 1], ['10', '20']],
    [0.5, [0, 1], ['1 2', '3 4']],
    [0.5, [0, 1], ['45deg 90deg', '90deg 180deg']],
    [0.5, [0, 1], ['left', 'right']],
    [0.5, [0, 1], ['left top', 'right bottom']],
    [0.5, [0, 1], ['center', 'center']],
    [0.5, [0, 1], ['top left', 'bottom right']],
    [0.5, [0, 1], ['left 10px', 'right 20px']],
    [0.5, [0, 1], ['10px center', '20px center']],
    [0.5, [0, 1], ['left top 10px', 'right bottom 20px']],
    [0.5, [0, 1], ['x 45deg', 'x 90deg']],
    [0.5, [0, 1], ['1 0 0 45deg', '2 1 1 46deg']],
    [0.5, [0, 1], ['x 45deg', '45deg']],
    [0.5, [0, 1], ['left', '10%']],
    [0.5, [0, 1], ['10em', '20em']],
    [0.5, [0, 1], ['10turn', '20turn']],
    [0.5, [0, 1], ['-10px', '10px']],
    [0.5, [0, 1], ['.5px', '1.5px']],
    [0.5, [0, 3], ['10px  20px', '30px 40px']],
  ];

  for (const [input, ir, or] of stringCases) {
    it(`string "${or[0]}" → "${or[1]}" @${input}`, () => {
      const expected = Remotion.interpolate(input, ir, or);
      const actual = interpolate(input, ir, or);
      compareString(actual, expected);
    });
  }

  it('tuples interpolate per component', () => {
    const actual = interpolate(0.5, [0, 1], [
      [0, 100],
      [50, 200],
    ]);
    const expected = Remotion.interpolate(0.5, [0, 1], [
      [0, 100],
      [50, 200],
    ]);
    expect(actual).toHaveLength(2);
    loose(actual[0] as number, expected[0]);
    loose(actual[1] as number, expected[1]);
  });

  it('discrete strings step with Easing.step1', () => {
    const outs = ['red', 'green', 'blue'];
    const ir = [0, 10, 20];
    for (const input of [-5, 0, 5, 10, 15, 20, 25]) {
      expect(
        interpolate(input, ir, outs, { easing: Easing.step1 }),
      ).toBe(Remotion.interpolate(input, ir, outs, { easing: Remotion.Easing.step1 }));
    }
  });

  it('function-wrapped strings are discrete (reference behavior)', () => {
    for (const [a, b] of [['scale(1)', 'scale(2)'], ['1e2px', '2e2px']] as Array<[string, string]>) {
      expect(
        interpolate(0.5, [0, 1], [a, b], { easing: Easing.step1 }),
      ).toBe(Remotion.interpolate(0.5, [0, 1], [a, b], { easing: Remotion.Easing.step1 }));
      expect(() => interpolate(0.5, [0, 1], [a, b])).toThrow(
        'Non-numeric strings can only be interpolated using Easing.step1',
      );
    }
  });

  it('kind / unit / shape errors match reference messages', () => {
    const pairs: Array<[string, string, string]> = [
      ['0', '100px', 'Cannot interpolate scale values with translate values'],
      ['45deg', '90px', 'Cannot interpolate rotate values with translate values'],
      ['0', '45deg', 'Cannot interpolate scale values with rotate values'],
      ['x 45deg', '10px', 'Cannot interpolate rotate values with translate values'],
      ['10px', '20%', 'Cannot interpolate translate values with different units on axis 1: px and %'],
      ['10px 20deg', '30px 40deg', 'because it mixes translate and rotate values'],
      ['10 20px', '20 30px', 'because it mixes scale and translate values'],
      ['10px left', '20px right', 'horizontal transform-origin keywords must come before'],
      ['left right', 'right left', 'is not a valid transform-origin keyword pair'],
      ['1 2 3 4 5', '5 4 3 2 1', 'must contain 1 to 3 components'],
      ['10ms', '20ms', '"ms" is not a supported translate or rotate unit'],
    ];
    for (const [a, b, snippet] of pairs) {
      let refMsg = '';
      let mineMsg = '';
      try {
        Remotion.interpolate(0.5, [0, 1], [a, b]);
      } catch (e) {
        refMsg = String((e as Error).message);
      }
      try {
        interpolate(0.5, [0, 1], [a, b]);
      } catch (e) {
        mineMsg = String((e as Error).message);
      }
      expect(mineMsg).toContain(snippet);
      expect(refMsg).toContain(snippet);
      expect(mineMsg).toBe(refMsg);
    }
  });

  it('discrete strings reject non-step1 easing', () => {
    expect(() =>
      interpolate(5, [0, 10], ['a', 'b'], { easing: Easing.linear }),
    ).toThrow();
  });
});
