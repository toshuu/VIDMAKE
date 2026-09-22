/**
 * M4 — Font registration + canvas text measurement for Skia.
 * Fonts must be registered BEFORE measuring/drawing (no implicit fallback
 * timing — keeps renders deterministic). System fonts loadable on demand.
 */

import { GlobalFonts, createCanvas } from '@napi-rs/canvas';
import type { SKRSContext2D } from '@napi-rs/canvas';
import type { TextMeasurer, TextStyle } from '@x80/core';

export interface RegisteredFont {
  family: string;
  path?: string;
  weight?: number | string;
  style?: string;
}

const registered = new Map<string, RegisteredFont>();
let systemFontsLoaded = false;

/** Runtime GlobalFonts surface (declarations lag the native module). */
interface GlobalFontsRuntime {
  registerFromPath(path: string, alias?: string): void;
  register(data: Buffer, alias?: string): void;
  loadSystemFonts(): void;
  getFamilies(): Array<{ family: string; alias?: string } | string>;
}

const GF = GlobalFonts as unknown as GlobalFontsRuntime;

export const registerFontFile = (
  path: string,
  family: string,
  opts?: { weight?: number | string; style?: string },
): void => {
  GF.registerFromPath(path, family);
  registered.set(`${family}::${path}`, { family, path, ...opts });
};

export const registerFontBuffer = (
  data: Buffer,
  family: string,
  opts?: { weight?: number | string; style?: string },
): void => {
  GF.register(data, family);
  registered.set(`${family}::buffer`, { family, ...opts });
};

export const ensureSystemFonts = (): void => {
  if (!systemFontsLoaded) {
    GF.loadSystemFonts();
    systemFontsLoaded = true;
  }
};

export const listFontFamilies = (): string[] =>
  GF.getFamilies().map((f) => (typeof f === 'string' ? f : (f.alias ?? f.family)));

export const registeredFonts = (): RegisteredFont[] => [...registered.values()];

/** CSS font shorthand the canvas backend resolves (Pango/fontconfig). */
export const fontStringFor = (style: TextStyle): string => {
  const weight = style.fontWeight === undefined ? '400' : String(style.fontWeight);
  const fontStyle = style.fontStyle ?? 'normal';
  return `${fontStyle} ${weight} ${style.fontSize}px "${style.fontFamily}"`;
};

const scratch = createCanvas(8, 8);
const scratchCtx = scratch.getContext('2d');

const applyMeasurerState = (ctx: SKRSContext2D, style: TextStyle): void => {
  ctx.font = fontStringFor(style);
  try {
    (ctx as SKRSContext2D & { letterSpacing?: string }).letterSpacing =
      `${style.letterSpacing ?? 0}px`;
  } catch {
    // Unsupported — measurement stays consistent with drawing (both ignore it).
  }
};

const measureCache = new Map<string, number>();
const MEASURE_CACHE_LIMIT = 20000;

/** Backend measurer: consistent with drawText by construction. */
export const createSkiaMeasurer = (): TextMeasurer => ({
  measure: (text: string, style: TextStyle): { width: number } => {
    const key = `${fontStringFor(style)}|${style.letterSpacing ?? 0}|${text}`;
    const cached = measureCache.get(key);
    if (cached !== undefined) {
      return { width: cached };
    }
    applyMeasurerState(scratchCtx, style);
    const width = scratchCtx.measureText(text).width;
    if (measureCache.size >= MEASURE_CACHE_LIMIT) {
      measureCache.clear();
    }
    measureCache.set(key, width);
    return { width };
  },
});

/** Whether the backend honors letterSpacing (probe, not assumption). */
export const probeLetterSpacingSupport = (): boolean => {
  const ctx = scratch.getContext('2d');
  ctx.font = '400 32px sans-serif';
  const base = ctx.measureText('hello').width;
  try {
    (ctx as SKRSContext2D & { letterSpacing?: string }).letterSpacing = '10px';
  } catch {
    return false;
  }
  const spaced = ctx.measureText('hello').width;
  try {
    (ctx as SKRSContext2D & { letterSpacing?: string }).letterSpacing = '0px';
  } catch {
    // ignore
  }
  return spaced - base > 40;
};
