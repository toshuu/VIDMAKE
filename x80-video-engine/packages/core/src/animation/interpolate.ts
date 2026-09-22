/**
 * M1 — interpolate(): deterministic multi-stop value mapping.
 *
 * Supports scalar numbers, unit-bearing strings ("10px", "45deg", "50%"),
 * multi-component transform strings, numeric tuples, and discrete strings.
 * Extrapolation: extend (default) | clamp | wrap | identity.
 */

import { Easing } from './easing.js';
import type {
  EasingFunction,
  ExtrapolateType,
  InterpolateOptions,
  InterpolateOutputMode,
} from './types.js';

const linearEasing: EasingFunction = ((t: number): number => t) as EasingFunction;

const normalizeNumber = (value: number): number =>
  Math.round(value * 1e6) / 1e6;

const toSignedArea = (s: number): number => (s === 0 ? 0 : Math.sign(s) * s * s);

const fromSignedArea = (a: number): number =>
  a === 0 ? 0 : Math.sign(a) * Math.sqrt(Math.abs(a));

function extrapolateLeft(
  value: number,
  min: number,
  max: number,
  mode: ExtrapolateType,
): number {
  if (value >= min) {
    return value;
  }
  if (mode === 'identity') {
    return value;
  }
  if (mode === 'clamp') {
    return min;
  }
  if (mode === 'wrap') {
    const range = max - min;
    return ((((value - min) % range) + range) % range) + min;
  }
  return value;
}

function extrapolateRight(
  value: number,
  min: number,
  max: number,
  mode: ExtrapolateType,
): number {
  if (value <= max) {
    return value;
  }
  if (mode === 'identity') {
    return value;
  }
  if (mode === 'clamp') {
    return max;
  }
  if (mode === 'wrap') {
    const range = max - min;
    return ((((value - min) % range) + range) % range) + min;
  }
  return value;
}

function interpolateScalarSegment(
  input: number,
  inputMin: number,
  inputMax: number,
  outputMin: number,
  outputMax: number,
  easing: EasingFunction,
  output: InterpolateOutputMode,
): number {
  if (outputMin === outputMax) {
    return outputMin;
  }
  let t = (input - inputMin) / (inputMax - inputMin);
  t = easing(t);
  if (output === 'perceptual-scale') {
    const a = toSignedArea(outputMin);
    const b = toSignedArea(outputMax);
    return fromSignedArea(t * (b - a) + a);
  }
  return t * (outputMax - outputMin) + outputMin;
}

function findSegment(input: number, inputRange: readonly number[]): number {
  let i = 1;
  for (; i < inputRange.length - 1; i += 1) {
    if ((inputRange[i] as number) >= input) {
      break;
    }
  }
  return i - 1;
}

interface ResolvedOptions {
  easing: EasingFunction | readonly EasingFunction[];
  extrapolateLeft: ExtrapolateType;
  extrapolateRight: ExtrapolateType;
  output: InterpolateOutputMode;
  posterize: number | undefined;
}

const resolveOptions = (options?: InterpolateOptions): ResolvedOptions => ({
  easing: options?.easing ?? linearEasing,
  extrapolateLeft: options?.extrapolateLeft ?? 'extend',
  extrapolateRight: options?.extrapolateRight ?? 'extend',
  output: options?.output ?? 'linear',
  posterize: options?.posterize,
});

const isEasingArray = (
  easing: EasingFunction | readonly EasingFunction[],
): easing is readonly EasingFunction[] => Array.isArray(easing);

const easingForSegment = (
  easing: EasingFunction | readonly EasingFunction[],
  segment: number,
  segmentCount: number,
): EasingFunction => {
  if (isEasingArray(easing)) {
    if (easing.length !== segmentCount) {
      throw new Error(
        `Easing array length (${easing.length}) must be inputRange.length - 1 (${segmentCount})`,
      );
    }
    return easing[segment] as EasingFunction;
  }
  return easing;
};

function validateRanges(
  inputRange: readonly number[],
  outputLength: number,
): void {
  if (inputRange.length !== outputLength) {
    throw new Error('inputRange and outputRange must have the same length');
  }
  if (inputRange.length < 2) {
    throw new Error('inputRange must have at least 2 elements');
  }
  for (let i = 0; i < inputRange.length; i += 1) {
    const v = inputRange[i] as number;
    if (!Number.isFinite(v)) {
      throw new Error('inputRange must contain only finite numbers');
    }
    if (i > 0 && v <= (inputRange[i - 1] as number)) {
      throw new Error('inputRange must be strictly monotonically increasing');
    }
  }
}

function validatePosterize(posterize: number | undefined): void {
  if (posterize === undefined) {
    return;
  }
  if (!Number.isFinite(posterize) || posterize <= 0) {
    throw new Error('posterize must be a finite number > 0');
  }
}

function interpolateNumberRaw(
  input: number,
  inputRange: readonly number[],
  outputRange: readonly number[],
  opts: ResolvedOptions,
): number {
  const posterized =
    opts.posterize === undefined
      ? input
      : Math.floor(input / opts.posterize) * opts.posterize;

  if (opts.extrapolateLeft === 'identity' && posterized < (inputRange[0] as number)) {
    return posterized;
  }
  const last = inputRange.length - 1;
  if (
    opts.extrapolateRight === 'identity' &&
    posterized > (inputRange[last] as number)
  ) {
    return posterized;
  }

  const segment = findSegment(posterized, inputRange);
  const easing = easingForSegment(opts.easing, segment, last);

  let effectiveRight = opts.extrapolateRight;
  if (
    easing.remotionShouldExtendRight === true &&
    effectiveRight === 'clamp'
  ) {
    effectiveRight = 'extend';
  }

  const inMin = inputRange[segment] as number;
  const inMax = inputRange[segment + 1] as number;
  const outMin = outputRange[segment] as number;
  const outMax = outputRange[segment + 1] as number;

  let x = extrapolateLeft(posterized, inMin, inMax, opts.extrapolateLeft);
  x = extrapolateRight(x, inMin, inMax, effectiveRight);

  let result = interpolateScalarSegment(x, inMin, inMax, outMin, outMax, easing, opts.output);

  // Tail continuation: prior segments whose easing extends right keep
  // contributing overshoot past their endpoint.
  if (isEasingArray(opts.easing)) {
    for (let s = 0; s < segment; s += 1) {
      const prev = opts.easing[s] as EasingFunction;
      if (prev.remotionShouldExtendRight !== true) {
        continue;
      }
      if (posterized <= (inputRange[s + 1] as number)) {
        continue;
      }
      const continued = interpolateScalarSegment(
        extrapolateRight(
          extrapolateLeft(
            posterized,
            inputRange[s] as number,
            inputRange[s + 1] as number,
            opts.extrapolateLeft,
          ),
          inputRange[s] as number,
          inputRange[s + 1] as number,
          'extend',
        ),
        inputRange[s] as number,
        inputRange[s + 1] as number,
        outputRange[s] as number,
        outputRange[s + 1] as number,
        prev,
        opts.output,
      );
      result += continued - (outputRange[s + 1] as number);
    }
  } else if (
    opts.easing.remotionShouldExtendRight === true &&
    segment > 0
  ) {
    for (let s = 0; s < segment; s += 1) {
      if (posterized <= (inputRange[s + 1] as number)) {
        continue;
      }
      const continued = interpolateScalarSegment(
        extrapolateRight(
          extrapolateLeft(
            posterized,
            inputRange[s] as number,
            inputRange[s + 1] as number,
            opts.extrapolateLeft,
          ),
          inputRange[s] as number,
          inputRange[s + 1] as number,
          'extend',
        ),
        inputRange[s] as number,
        inputRange[s + 1] as number,
        outputRange[s] as number,
        outputRange[s + 1] as number,
        opts.easing,
        opts.output,
      );
      result += continued - (outputRange[s + 1] as number);
    }
  }

  return result;
}

/* ---------------- string interpolation ----------------
 *
 * Grammar mirrors the reference implementation (probed + documented):
 *   scale      = 1-3 bare numbers, e.g. "1", "1 2"
 *   translate  = 1-3 lengths, e.g. "10px", "10px 20%", "10px 20px 30px"
 *   rotate     = 1-3 angles, e.g. "45deg", "45deg 90deg"
 *   axis       = "x|y|z <angle>" or "<n> <n> <n> <angle>" (4 comps, rotate family)
 *   origin     = transform-origin keywords + lengths, expanded to lengths
 * Anything else (function calls, commas, unknown shapes) → discrete path.
 */

const LENGTH_UNITS = new Set([
  'px', '%', 'em', 'rem', 'vw', 'vh', 'vmin', 'vmax',
  'cm', 'mm', 'in', 'pt', 'pc', 'ex', 'ch', 'q',
]);

const ANGLE_UNITS = new Set(['deg', 'rad', 'grad', 'turn']);

const H_KEYWORDS = new Set(['left', 'right']);
const V_KEYWORDS = new Set(['top', 'bottom']);
const ORIGIN_KEYWORDS = new Set(['left', 'right', 'top', 'bottom', 'center']);

const ORIGIN_PERCENT: Record<string, number> = {
  left: 0,
  right: 100,
  top: 0,
  bottom: 100,
  center: 50,
};

const AXIS_VECTORS: Record<string, [number, number, number]> = {
  x: [1, 0, 0],
  y: [0, 1, 0],
  z: [0, 0, 1],
};

type StringKind = 'scale' | 'translate' | 'rotate';

interface NumericString {
  kind: StringKind;
  values: number[];
  units: string[];
}

const NUM_RE = /^(-?(?:\d+\.?\d*|\.\d+))([a-zA-Z%]*)$/;

interface ClassifiedComp {
  kind: 'bare' | 'length' | 'angle' | 'keyword';
  value: number;
  unit: string;
  word: string;
}

const invalidPairError = (raw: string): Error =>
  new Error(
    `Cannot interpolate "${raw}" because "${raw}" is not a valid transform-origin keyword pair`,
  );

const horizontalOrderError = (raw: string): Error =>
  new Error(
    `Cannot interpolate "${raw}" because horizontal transform-origin keywords must come before a length-percentage value`,
  );

const expandOrigin = (raw: string, parsed: ClassifiedComp[]): NumericString => {
  const pct = (word: string): number => ORIGIN_PERCENT[word] as number;
  const isH = (p: ClassifiedComp): boolean =>
    p.kind === 'keyword' && (H_KEYWORDS.has(p.word) || p.word === 'center');
  const isStrictH = (p: ClassifiedComp): boolean =>
    p.kind === 'keyword' && H_KEYWORDS.has(p.word);
  const isV = (p: ClassifiedComp): boolean =>
    p.kind === 'keyword' && (V_KEYWORDS.has(p.word) || p.word === 'center');
  const isStrictV = (p: ClassifiedComp): boolean =>
    p.kind === 'keyword' && V_KEYWORDS.has(p.word);
  const isLen = (p: ClassifiedComp): boolean => p.kind === 'length';

  const asLength = (p: ClassifiedComp): { value: number; unit: string } =>
    p.kind === 'keyword'
      ? { value: pct(p.word), unit: '%' }
      : { value: p.value, unit: p.unit };

  let values: number[];
  let units: string[];

  if (parsed.length === 1) {
    const only = parsed[0] as ClassifiedComp;
    if (only.kind !== 'keyword') {
      throw invalidPairError(raw);
    }
    if (only.word === 'left') {
      values = [0, 50];
    } else if (only.word === 'right') {
      values = [100, 50];
    } else if (only.word === 'top') {
      values = [50, 0];
    } else if (only.word === 'bottom') {
      values = [50, 100];
    } else {
      values = [50, 50];
    }
    units = ['%', '%'];
  } else if (parsed.length === 2) {
    const [a, b] = parsed as [ClassifiedComp, ClassifiedComp];
    if (a.kind === 'keyword' && (H_KEYWORDS.has(a.word) || a.word === 'center')) {
      if ((b.kind === 'keyword' && (isV(b) || (b.word === 'center'))) || isLen(b)) {
        if (b.kind === 'keyword' && isStrictH(b)) {
          throw invalidPairError(raw);
        }
        const x = asLength(a);
        const y = asLength(b);
        values = [x.value, y.value];
        units = [x.unit, y.unit];
      } else {
        throw invalidPairError(raw);
      }
    } else if (a.kind === 'keyword' && V_KEYWORDS.has(a.word)) {
      if ((b.kind === 'keyword' && isH(b)) || isLen(b)) {
        const x = asLength(b);
        const y = asLength(a);
        values = [x.value, y.value];
        units = [x.unit, y.unit];
      } else {
        throw invalidPairError(raw);
      }
    } else if (isLen(a)) {
      if (b.kind === 'keyword' && isV(b)) {
        const x = asLength(a);
        const y = asLength(b);
        values = [x.value, y.value];
        units = [x.unit, y.unit];
      } else if (b.kind === 'keyword' && isStrictH(b)) {
        throw horizontalOrderError(raw);
      } else {
        throw invalidPairError(raw);
      }
    } else {
      throw invalidPairError(raw);
    }
  } else if (parsed.length === 3) {
    const [a, b, c] = parsed as [ClassifiedComp, ClassifiedComp, ClassifiedComp];
    if (!isLen(c)) {
      throw invalidPairError(raw);
    }
    const z = asLength(c);
    if (
      (a.kind === 'keyword' && (H_KEYWORDS.has(a.word) || a.word === 'center')) &&
      (b.kind === 'keyword' && (V_KEYWORDS.has(b.word) || b.word === 'center'))
    ) {
      const x = asLength(a);
      const y = asLength(b);
      values = [x.value, y.value, z.value];
      units = [x.unit, y.unit, z.unit];
    } else if (
      (a.kind === 'keyword' && (V_KEYWORDS.has(a.word) || a.word === 'center')) &&
      (b.kind === 'keyword' && (H_KEYWORDS.has(b.word) || b.word === 'center'))
    ) {
      const x = asLength(b);
      const y = asLength(a);
      values = [x.value, y.value, z.value];
      units = [x.unit, y.unit, z.unit];
    } else {
      throw invalidPairError(raw);
    }
  } else {
    throw new Error(
      `String outputRange values must contain 1 to 3 components, but got "${raw}"`,
    );
  }

  return { kind: 'translate', values, units };
};

/**
 * Parse a CSS-ish value into numeric components.
 * Returns null when the string is not a numeric-interpolable shape
 * (caller falls back to the discrete path).
 * Throws reference-compatible errors for unit/kind violations.
 */
const parseNumericString = (raw: string): NumericString | null => {
  const s = raw.trim();
  if (s === '') {
    return null;
  }
  if (/[(),]/.test(s)) {
    return null;
  }
  const comps = s.split(/\s+/);

  if (comps.length === 2 && /^[xyz]$/i.test(comps[0] as string)) {
    const m = NUM_RE.exec(comps[1] as string);
    if (!m || !ANGLE_UNITS.has(m[2] ?? '')) {
      return null;
    }
    const v = AXIS_VECTORS[(comps[0] as string).toLowerCase()] as [number, number, number];
    return {
      kind: 'rotate',
      values: [v[0], v[1], v[2], Number(m[1])],
      units: ['', '', '', m[2] ?? ''],
    };
  }

  const parsed: ClassifiedComp[] = [];
  for (const c of comps) {
    const lower = c.toLowerCase();
    if (ORIGIN_KEYWORDS.has(lower)) {
      parsed.push({ kind: 'keyword', value: 0, unit: '', word: lower });
      continue;
    }
    const m = NUM_RE.exec(c);
    if (!m) {
      return null;
    }
    const value = Number(m[1]);
    const unit = m[2] ?? '';
    if (unit === '') {
      parsed.push({ kind: 'bare', value, unit: '', word: c });
    } else if (LENGTH_UNITS.has(unit)) {
      parsed.push({ kind: 'length', value, unit, word: c });
    } else if (ANGLE_UNITS.has(unit)) {
      parsed.push({ kind: 'angle', value, unit, word: c });
    } else if (/^[a-zA-Z%]+$/.test(unit)) {
      throw new Error(
        `Cannot interpolate "${raw}" because "${unit}" is not a supported translate or rotate unit`,
      );
    } else {
      return null;
    }
  }

  // 4-component axis form: 3 bare numbers + trailing angle.
  if (parsed.length === 4) {
    const [p0, p1, p2, p3] = parsed as [
      ClassifiedComp,
      ClassifiedComp,
      ClassifiedComp,
      ClassifiedComp,
    ];
    if (
      p0.kind === 'bare' &&
      p1.kind === 'bare' &&
      p2.kind === 'bare' &&
      p3.kind === 'angle'
    ) {
      return {
        kind: 'rotate',
        values: [p0.value, p1.value, p2.value, p3.value],
        units: ['', '', '', p3.unit],
      };
    }
  }

  const hasBare = parsed.some((p) => p.kind === 'bare');
  const hasLength = parsed.some((p) => p.kind === 'length');
  const hasAngle = parsed.some((p) => p.kind === 'angle');
  const hasKeyword = parsed.some((p) => p.kind === 'keyword');

  if (hasAngle && hasLength) {
    throw new Error(
      `Cannot interpolate "${raw}" because it mixes translate and rotate values`,
    );
  }
  if (hasAngle && hasBare) {
    throw new Error(
      `Cannot interpolate "${raw}" because it mixes rotate and scale values`,
    );
  }
  if (hasLength && hasBare) {
    throw new Error(
      `Cannot interpolate "${raw}" because it mixes scale and translate values`,
    );
  }
  if (hasKeyword && hasAngle) {
    throw new Error(
      `Cannot interpolate "${raw}" because it mixes translate and rotate values`,
    );
  }
  if (hasKeyword && hasBare) {
    throw new Error(
      `Cannot interpolate "${raw}" because it mixes scale and translate values`,
    );
  }

  if (hasKeyword) {
    return expandOrigin(raw, parsed);
  }
  if (parsed.length > 3) {
    throw new Error(
      `String outputRange values must contain 1 to 3 components, but got "${raw}"`,
    );
  }
  if (hasBare) {
    return {
      kind: 'scale',
      values: parsed.map((p) => p.value),
      units: parsed.map(() => ''),
    };
  }
  if (hasLength) {
    return {
      kind: 'translate',
      values: parsed.map((p) => p.value),
      units: parsed.map((p) => p.unit),
    };
  }
  return {
    kind: 'rotate',
    values: parsed.map((p) => p.value),
    units: parsed.map((p) => p.unit),
  };
};

const serializeNumeric = (units: string[], values: number[]): string =>
  values
    .map((v, i) => {
      const n = normalizeNumber(v);
      return `${Number.isInteger(n) ? String(n) : String(n)}${units[i] as string}`;
    })
    .join(' ');

interface CompiledStringForm {
  kind: string;
  width: number;
  /** Padded per-stop values/units (read-only after compile; never mutated). */
  padded: Array<{ kind: string; values: number[]; units: string[] }>;
}

/**
 * M10 — Compiled string-form cache. Parsing + aligning + padding the
 * output strings is pure in their contents, so identical outputRanges
 * share one compiled form. Bounded (cleared when full); only successful
 * compiles are cached, so loud errors fire exactly as before.
 */
const STRING_FORM_CACHE = new Map<string, CompiledStringForm>();
const STRING_FORM_CACHE_LIMIT = 1000;

const compileStringForm = (outputRange: readonly string[]): CompiledStringForm | null => {
  const key = outputRange.join(' ');
  const cached = STRING_FORM_CACHE.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const parsed = outputRange.map(parseNumericString);
  if (parsed.some((p) => p === null)) {
    return null;
  }
  const list = parsed as NumericString[];
  const first = list[0] as NumericString;
  for (let i = 1; i < list.length; i += 1) {
    const current = list[i] as NumericString;
    if (current.kind !== first.kind) {
      throw new Error(
        `Cannot interpolate ${first.kind} values with ${current.kind} values`,
      );
    }
  }

  const width = Math.max(...list.map((p) => p.values.length));

  // Lone angle vs axis form: a single angle is z-axis rotation.
  const aligned = list.map((p) => {
    if (width === 4 && p.kind === 'rotate' && p.values.length === 1) {
      return {
        kind: p.kind,
        values: [0, 0, 1, p.values[0] as number],
        units: ['', '', '', p.units[0] as string],
      };
    }
    return p;
  });

  // Zero-pad shorter sides (pad unit = first defined unit on that axis).
  const padded = aligned.map((p) => {
    const values = [...p.values];
    const units = [...p.units];
    for (let j = values.length; j < width; j += 1) {
      const donor = aligned.find((q) => q.units.length > j);
      values.push(0);
      units.push(donor ? (donor.units[j] as string) : '');
    }
    return { kind: p.kind, values, units };
  });

  for (let j = 0; j < width; j += 1) {
    const expected = padded[0]?.units[j] as string;
    for (let i = 1; i < padded.length; i += 1) {
      const actual = padded[i]?.units[j] as string;
      if (actual !== expected) {
        throw new Error(
          `Cannot interpolate ${first.kind} values with different units on axis ${j + 1}: ${expected} and ${actual}`,
        );
      }
    }
  }

  const compiled: CompiledStringForm = { kind: first.kind, width, padded };
  if (STRING_FORM_CACHE.size >= STRING_FORM_CACHE_LIMIT) {
    STRING_FORM_CACHE.clear();
  }
  STRING_FORM_CACHE.set(key, compiled);
  return compiled;
};

function interpolateString(
  input: number,
  inputRange: readonly number[],
  outputRange: readonly string[],
  opts: ResolvedOptions,
): string {
  const compiled = compileStringForm(outputRange);
  if (compiled === null) {
    return interpolateDiscrete(input, inputRange, outputRange, opts);
  }
  const { padded } = compiled;
  const out = padded[0]?.units as string[];
  const values = out.map((_, j) =>
    interpolateNumberRaw(
      input,
      inputRange,
      padded.map((p) => p.values[j] as number),
      opts,
    ),
  );
  return serializeNumeric(out, values);
}

function interpolateDiscrete(
  input: number,
  inputRange: readonly number[],
  outputRange: readonly string[],
  opts: ResolvedOptions,
): string {
  const last = inputRange.length - 1;
  const segCount = last;
  for (let s = 0; s < segCount; s += 1) {
    const e = easingForSegment(opts.easing, s, segCount);
    if (e !== (Easing.step1 as unknown as EasingFunction)) {
      throw new Error(
        'Non-numeric strings can only be interpolated using Easing.step1',
      );
    }
  }
  if (opts.extrapolateLeft === 'identity' || opts.extrapolateRight === 'identity') {
    throw new Error('interpolate: identity extrapolation is not supported for discrete strings');
  }
  const posterized =
    opts.posterize === undefined
      ? input
      : Math.floor(input / opts.posterize) * opts.posterize;
  if (posterized <= (inputRange[0] as number)) {
    if (opts.extrapolateLeft === 'wrap') {
      return interpolateDiscreteWrap(posterized, inputRange, outputRange);
    }
    return outputRange[0] as string;
  }
  if (posterized >= (inputRange[last] as number)) {
    if (opts.extrapolateRight === 'wrap') {
      return interpolateDiscreteWrap(posterized, inputRange, outputRange);
    }
    return outputRange[last] as string;
  }
  const segment = findSegment(posterized, inputRange);
  return (posterized >= (inputRange[segment + 1] as number)
    ? outputRange[segment + 1]
    : outputRange[segment]) as string;
}

function interpolateDiscreteWrap(
  input: number,
  inputRange: readonly number[],
  outputRange: readonly string[],
): string {
  const min = inputRange[0] as number;
  const max = inputRange[inputRange.length - 1] as number;
  const range = max - min;
  const wrapped = ((((input - min) % range) + range) % range) + min;
  if (wrapped <= min) {
    return outputRange[0] as string;
  }
  if (wrapped >= max) {
    return outputRange[outputRange.length - 1] as string;
  }
  const segment = findSegment(wrapped, inputRange);
  return (wrapped >= (inputRange[segment + 1] as number)
    ? outputRange[segment + 1]
    : outputRange[segment]) as string;
}

/* ---------------- public API ---------------- */

export function interpolate(
  input: number,
  inputRange: readonly number[],
  outputRange: readonly number[],
  options?: InterpolateOptions,
): number;
export function interpolate(
  input: number,
  inputRange: readonly number[],
  outputRange: readonly string[],
  options?: InterpolateOptions,
): string;
export function interpolate(
  input: number,
  inputRange: readonly number[],
  outputRange: readonly number[][],
  options?: InterpolateOptions,
): number[];
export function interpolate(
  input: number,
  inputRange: readonly number[],
  outputRange: readonly number[] | readonly string[] | readonly number[][],
  options?: InterpolateOptions,
): number | string | number[] {
  if (!Number.isFinite(input)) {
    throw new Error('interpolate input must be a finite number');
  }
  validateRanges(inputRange, outputRange.length);
  validatePosterize(options?.posterize);
  const opts = resolveOptions(options);

  const head = outputRange[0];
  if (Array.isArray(head)) {
    const tuples = outputRange as readonly number[][];
    const width = head.length;
    for (const t of tuples) {
      if (t.length !== width) {
        throw new Error('interpolate: tuple outputs must all have the same length');
      }
      for (const v of t) {
        if (!Number.isFinite(v)) {
          throw new Error('interpolate: tuple outputs must be finite numbers');
        }
      }
    }
    return head.map((_, k) =>
      interpolateNumberRaw(
        input,
        inputRange,
        tuples.map((t) => t[k] as number),
        opts,
      ),
    );
  }
  if (typeof head === 'string') {
    return interpolateString(input, inputRange, outputRange as readonly string[], opts);
  }
  for (const v of outputRange as readonly number[]) {
    if (!Number.isFinite(v)) {
      throw new Error('interpolate: outputRange must contain only finite numbers');
    }
  }
  return interpolateNumberRaw(input, inputRange, outputRange as readonly number[], opts);
}
