/**
 * M6 Batch A (color) + color-correction family. Exact point math,
 * hand-verifiable on small fixtures (see tests).
 */
import type { EffectContext, EffectDef, EffectParams } from './types.js';
import {
  clamp01,
  clamp255,
  getPixels,
  hexToRgb,
  lerp,
  luma,
  num,
  putPixels,
  str,
} from './util.js';

type RGBA = [number, number, number, number];

const point = (ecx: EffectContext, fn: (r: number, g: number, b: number, a: number) => RGBA): void => {
  const px = getPixels(ecx);
  const { data } = px;
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = fn(
      data[i] as number,
      data[i + 1] as number,
      data[i + 2] as number,
      data[i + 3] as number,
    );
    data[i] = clamp255(r);
    data[i + 1] = clamp255(g);
    data[i + 2] = clamp255(b);
    data[i + 3] = clamp255(a);
  }
  putPixels(ecx, px);
};

const grayOf = (r: number, g: number, b: number): number => luma(r, g, b);

export const brightness: EffectDef = {
  describe: 'Linear brightness shift. amount -1..1 added as amount*255.',
  defaults: { amount: 0 },
  apply: (ecx, p) => {
    const amount = num(p, 'amount', 0) * 255;
    point(ecx, (r, g, b, a) => [r + amount, g + amount, b + amount, a]);
  },
};

export const contrast: EffectDef = {
  describe: 'Contrast around mid-gray. amount -1..1, factor = 1+amount.',
  defaults: { amount: 0 },
  apply: (ecx, p) => {
    const f = 1 + num(p, 'amount', 0);
    point(ecx, (r, g, b, a) => [(r - 128) * f + 128, (g - 128) * f + 128, (b - 128) * f + 128, a]);
  },
};

export const exposure: EffectDef = {
  describe: 'Exposure in stops. Multiplies by 2^stops.',
  defaults: { stops: 0 },
  apply: (ecx, p) => {
    const f = 2 ** num(p, 'stops', 0);
    point(ecx, (r, g, b, a) => [r * f, g * f, b * f, a]);
  },
};

export const saturation: EffectDef = {
  describe: 'Saturation multiplier. 0 = grayscale, 1 = identity.',
  defaults: { amount: 1 },
  apply: (ecx, p) => {
    const amount = num(p, 'amount', 1);
    point(ecx, (r, g, b, a) => {
      const l = grayOf(r, g, b);
      return [l + (r - l) * amount, l + (g - l) * amount, l + (b - l) * amount, a];
    });
  },
};

export const vibrance: EffectDef = {
  describe: 'Smart saturation: boosts muted colors first. amount -1..1.',
  defaults: { amount: 0 },
  apply: (ecx, p) => {
    const amount = num(p, 'amount', 0);
    point(ecx, (r, g, b, a) => {
      const mx = Math.max(r, g, b);
      const mn = Math.min(r, g, b);
      const l = grayOf(r, g, b);
      const f = 1 + amount * (1 - (mx - mn) / 255);
      return [l + (r - l) * f, l + (g - l) * f, l + (b - l) * f, a];
    });
  },
};

export const hue: EffectDef = {
  describe: 'Hue rotation in degrees (standard hue-rotate matrix).',
  defaults: { degrees: 0 },
  apply: (ecx, p) => {
    const rad = (num(p, 'degrees', 0) * Math.PI) / 180;
    const cosA = Math.cos(rad);
    const sinA = Math.sin(rad);
    const m = [
      0.213 + cosA * 0.787 - sinA * 0.213,
      0.715 - cosA * 0.715 - sinA * 0.715,
      0.072 - cosA * 0.072 + sinA * 0.928,
      0.213 - cosA * 0.213 + sinA * 0.143,
      0.715 + cosA * 0.285 + sinA * 0.14,
      0.072 - cosA * 0.072 - sinA * 0.283,
      0.213 - cosA * 0.213 - sinA * 0.787,
      0.715 - cosA * 0.715 + sinA * 0.715,
      0.072 + cosA * 0.928 + sinA * 0.072,
    ];
    point(ecx, (r, g, b, a) => [
      (m[0] as number) * r + (m[1] as number) * g + (m[2] as number) * b,
      (m[3] as number) * r + (m[4] as number) * g + (m[5] as number) * b,
      (m[6] as number) * r + (m[7] as number) * g + (m[8] as number) * b,
      a,
    ]);
  },
};

export const tint: EffectDef = {
  describe: 'Linear blend toward a color. amount 0..1.',
  defaults: { color: '#ffffff', amount: 0.5 },
  apply: (ecx, p) => {
    const [cr, cg, cb] = hexToRgb(str(p, 'color', '#ffffff'));
    const t = clamp01(num(p, 'amount', 0.5));
    point(ecx, (r, g, b, a) => [lerp(r, cr, t), lerp(g, cg, t), lerp(b, cb, t), a]);
  },
};

export const grayscale: EffectDef = {
  describe: 'Luma grayscale (Rec.709).',
  defaults: {},
  apply: (ecx) => {
    point(ecx, (r, g, b, a) => {
      const l = grayOf(r, g, b);
      return [l, l, l, a];
    });
  },
};

export const duotone: EffectDef = {
  describe: 'Map luma between dark and light colors.',
  defaults: { dark: '#000000', light: '#ffffff' },
  apply: (ecx, p) => {
    const [dr, dg, db] = hexToRgb(str(p, 'dark', '#000000'));
    const [lr, lg, lb] = hexToRgb(str(p, 'light', '#ffffff'));
    point(ecx, (r, g, b, a) => {
      const t = grayOf(r, g, b) / 255;
      return [lerp(dr, lr, t), lerp(dg, lg, t), lerp(db, lb, t), a];
    });
  },
};

export const gradientMap: EffectDef = {
  describe: 'Map luma through N gradient stops [{offset 0..1, color}].',
  defaults: { stops: [{ offset: 0, color: '#000000' }, { offset: 1, color: '#ffffff' }] },
  apply: (ecx, p) => {
    const raw = p.stops as Array<{ offset: number; color: string }> | undefined;
    if (!Array.isArray(raw) || raw.length === 0) {
      throw new Error('gradientMap needs stops: [{offset, color}]');
    }
    const stops = [...raw]
      .map((s) => ({ offset: clamp01(Number(s.offset)), rgb: hexToRgb(String(s.color)) }))
      .sort((a, b2) => a.offset - b2.offset);
    point(ecx, (r, g, b, a) => {
      const t = grayOf(r, g, b) / 255;
      let lo = stops[0] as { offset: number; rgb: [number, number, number] };
      let hi = stops[stops.length - 1] as { offset: number; rgb: [number, number, number] };
      for (let i = 0; i < stops.length - 1; i += 1) {
        if (t >= (stops[i] as { offset: number }).offset && t <= (stops[i + 1] as { offset: number }).offset) {
          lo = stops[i] as { offset: number; rgb: [number, number, number] };
          hi = stops[i + 1] as { offset: number; rgb: [number, number, number] };
          break;
        }
      }
      const span = hi.offset - lo.offset || 1;
      const k = (t - lo.offset) / span;
      return [
        lerp(lo.rgb[0], hi.rgb[0], k),
        lerp(lo.rgb[1], hi.rgb[1], k),
        lerp(lo.rgb[2], hi.rgb[2], k),
        a,
      ];
    });
  },
};

export const invert: EffectDef = {
  describe: 'Channel inversion blended by amount 0..1.',
  defaults: { amount: 1 },
  apply: (ecx, p) => {
    const t = clamp01(num(p, 'amount', 1));
    point(ecx, (r, g, b, a) => [lerp(r, 255 - r, t), lerp(g, 255 - g, t), lerp(b, 255 - b, t), a]);
  },
};

export const levels: EffectDef = {
  describe: 'Level remap per channel: in/out black/white 0..1 + gamma.',
  defaults: { inBlack: 0, inWhite: 1, gamma: 1, outBlack: 0, outWhite: 1 },
  apply: (ecx, p) => {
    const inB = clamp01(num(p, 'inBlack', 0));
    const inW = clamp01(num(p, 'inWhite', 1));
    const gamma = num(p, 'gamma', 1);
    const outB = clamp01(num(p, 'outBlack', 0)) * 255;
    const outW = clamp01(num(p, 'outWhite', 1)) * 255;
    if (!(inW > inB) || !(gamma > 0)) {
      throw new Error('levels needs inWhite > inBlack and gamma > 0');
    }
    const map = (v: number): number => {
      const t = clamp01((v / 255 - inB) / (inW - inB));
      return outB + (outW - outB) * t ** gamma;
    };
    point(ecx, (r, g, b, a) => [map(r), map(g), map(b), a]);
  },
};

export const whiteBalance: EffectDef = {
  describe: 'Warm/cool shift. temperature -1..1 (±40 on R/B).',
  defaults: { temperature: 0 },
  apply: (ecx, p) => {
    const t = Math.max(-1, Math.min(1, num(p, 'temperature', 0))) * 40;
    point(ecx, (r, g, b, a) => [r + t, g, b - t, a]);
  },
};

export const shadowsHighlights: EffectDef = {
  describe: 'Lift shadows / tame highlights. Both -1..1 (×80px).',
  defaults: { shadows: 0, highlights: 0 },
  apply: (ecx, p) => {
    const s = num(p, 'shadows', 0) * 80;
    const h = num(p, 'highlights', 0) * 80;
    point(ecx, (r, g, b, a) => {
      const l = grayOf(r, g, b) / 255;
      const lift = s * (1 - l) * (1 - l);
      const tame = h * l * l;
      return [r + lift - tame, g + lift - tame, b + lift - tame, a];
    });
  },
};

export const thermalVision: EffectDef = {
  describe: 'Black→red→yellow→white heat map over luma.',
  defaults: {},
  apply: (ecx) => {
    point(ecx, (r, g, b, a) => {
      const t = grayOf(r, g, b) / 255;
      let out: RGBA;
      if (t < 1 / 3) {
        const k = t * 3;
        out = [255 * k, 0, 0, a];
      } else if (t < 2 / 3) {
        const k = (t - 1 / 3) * 3;
        out = [255, 255 * k, 0, a];
      } else {
        const k = (t - 2 / 3) * 3;
        out = [255, 255, 255 * k, a];
      }
      return out;
    });
  },
};

export const colorKey: EffectDef = {
  describe: 'Chroma key to transparent. tolerance/edge 0..1 (euclidean).',
  defaults: { color: '#00ff00', tolerance: 0.2, edge: 0.1 },
  apply: (ecx, p) => {
    const [cr, cg, cb] = hexToRgb(str(p, 'color', '#00ff00'));
    const tol = clamp01(num(p, 'tolerance', 0.2));
    const edge = Math.max(1e-6, clamp01(num(p, 'edge', 0.1)));
    point(ecx, (r, g, b, a) => {
      const dist = Math.sqrt((r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2) / 441.67;
      return [r, g, b, a * clamp01((dist - tol) / edge)];
    });
  },
};

const channelTable = (p: EffectParams, key: string): number[] | undefined => {
  const v = p[key];
  if (v === undefined) {
    return undefined;
  }
  if (!Array.isArray(v) || v.length !== 256 || v.some((n) => typeof n !== 'number')) {
    throw new Error(`lut "${key}" must be number[256]`);
  }
  return v as number[];
};

export const lut: EffectDef = {
  describe: 'Per-channel 256-entry lookup tables (inline; file IO staged).',
  defaults: {},
  apply: (ecx, p) => {
    const rT = channelTable(p, 'red');
    const gT = channelTable(p, 'green');
    const bT = channelTable(p, 'blue');
    if (!rT && !gT && !bT) {
      return;
    }
    point(ecx, (r, g, b, a) => [
      rT ? clamp255(rT[Math.round(clamp255(r))] as number) : r,
      gT ? clamp255(gT[Math.round(clamp255(g))] as number) : g,
      bT ? clamp255(bT[Math.round(clamp255(b))] as number) : b,
      a,
    ]);
  },
};
