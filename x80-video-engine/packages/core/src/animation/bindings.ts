/**
 * M3 — Declarative animation bindings (JSON-compatible).
 * Lets scene-graph numeric props vary with the node's LOCAL frame while
 * staying plain data (no functions), so plans remain serializable for the
 * future AI planner. Evaluated by the compositor via resolveAnimNumber().
 */

import type { RgbaColor } from '../renderer/types.js';
import { interpolateColors } from './colors.js';
import type { InterpolateColorsOptions } from './colors.js';
import { interpolate } from './interpolate.js';
import { spring } from './spring.js';
import type {
  InterpolateOptions,
  SpringConfig,
} from './types.js';

export interface InterpolateBinding {
  binding: 'interpolate';
  inputRange: number[];
  outputRange: number[];
  options?: InterpolateOptions;
}

export interface SpringBinding {
  binding: 'spring';
  config?: SpringConfig;
  from?: number;
  to?: number;
  durationInFrames?: number;
  durationRestThreshold?: number;
  delay?: number;
  reverse?: boolean;
}

export type AnimNumber = number | InterpolateBinding | SpringBinding;

export const isAnimBinding = (value: AnimNumber): value is InterpolateBinding | SpringBinding =>
  typeof value !== 'number';

/**
 * Declarative color animation (JSON-compatible): same keyframe model as
 * numbers, resolved through the strict `interpolateColors` grammar.
 * Lets fills breathe/pulse (e.g. glow color over frames) while plans
 * stay plain data. Gradient stops are NOT animatable — cross-fade whole
 * fills via node opacity instead.
 */
export interface ColorBinding {
  binding: 'color';
  inputRange: number[];
  colorStops: string[];
  options?: InterpolateColorsOptions;
}

export type AnimColor = string | RgbaColor | ColorBinding;

export const isColorBinding = (value: unknown): value is ColorBinding =>
  typeof value === 'object' &&
  value !== null &&
  'binding' in value &&
  (value as { binding: unknown }).binding === 'color';

/** Pure in (value, frame, fps) → CSS color string. */
export const resolveAnimColor = (value: AnimColor, frame: number): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (isColorBinding(value)) {
    return interpolateColors(frame, value.inputRange, value.colorStops, value.options);
  }
  const { r, g, b, a } = value;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

/** Pure in (value, frame, fps). Frame is the node's LOCAL frame. */
export const resolveAnimNumber = (value: AnimNumber, frame: number, fps: number): number => {
  if (typeof value === 'number') {
    return value;
  }
  if (value.binding === 'interpolate') {
    return interpolate(frame, value.inputRange, value.outputRange, value.options);
  }
  return spring({
    frame,
    fps,
    config: value.config,
    from: value.from,
    to: value.to,
    durationInFrames: value.durationInFrames,
    durationRestThreshold: value.durationRestThreshold,
    delay: value.delay,
    reverse: value.reverse,
  });
};
