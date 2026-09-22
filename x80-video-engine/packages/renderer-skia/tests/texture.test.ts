/** Grain tile: deterministic bytes, loud options, overlay-ready mid-gray. */
import { describe, expect, it } from 'vitest';
import { createGrainTile } from '../src/index.js';

describe('createGrainTile', () => {
  it('same inputs → same bytes', () => {
    const a = createGrainTile(96, 64, { seed: 7, amount: 0.5 });
    const b = createGrainTile(96, 64, { seed: 7, amount: 0.5 });
    const da = a.getContext('2d').getImageData(0, 0, 96, 64).data;
    const db = b.getContext('2d').getImageData(0, 0, 96, 64).data;
    expect(Buffer.from(da).equals(Buffer.from(db))).toBe(true);
  });

  it('different seeds differ; mean hovers near mid-gray', () => {
    const a = createGrainTile(96, 64, { seed: 1 });
    const b = createGrainTile(96, 64, { seed: 2 });
    const da = a.getContext('2d').getImageData(0, 0, 96, 64).data;
    const db = b.getContext('2d').getImageData(0, 0, 96, 64).data;
    expect(Buffer.from(da).equals(Buffer.from(db))).toBe(false);
    let sum = 0;
    for (let i = 0; i < da.length; i += 4) {
      sum += da[i] as number;
    }
    expect(Math.abs(sum / (da.length / 4) - 128)).toBeLessThan(6);
  });

  it('bad options throw loudly', () => {
    expect(() => createGrainTile(0, 10)).toThrow(/positive integer/);
    expect(() => createGrainTile(10, 10, { amount: 2 })).toThrow(/\[0, 1\]/);
    expect(() => createGrainTile(10, 10, { cell: 0 })).toThrow(/positive integer/);
  });
});
