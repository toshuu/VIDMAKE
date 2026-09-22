/**
 * M3 — Declarative animation bindings (JSON-compatible).
 * Lets scene-graph numeric props vary with the node's LOCAL frame while
 * staying plain data (no functions), so plans remain serializable for the
 * future AI planner. Evaluated by the compositor via resolveAnimNumber().
 */

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
