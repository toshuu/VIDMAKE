export { compileReel } from './compile.js';
export type { CompileOutput } from './compile.js';
export { assembleTimeline, leaf, seq } from './timeline.js';
export type { TimelineChild } from './timeline.js';
export { validateSpec } from './validate.js';
export { checkSpec } from './check.js';
export type { CheckIssue } from './check.js';
export { queryCapabilities, capabilityIds } from './capabilities.js';
export type { Capability } from './capabilities.js';
export { keyframes, stagger, motionPath, sharedFly } from './motion.js';
export type {
  ActSpec, ActTitle, KickerSpec, ReelCanvas, ReelConcept, ReelFaces,
  ReelPalette, ReelSpec, ReelSystem, LayoutKind, SubjectSpec, FootageSubject,
  FlipbookSubject, IconsSubject, EmblemSubject, TickerSubject, PropsSubject,
  RawSubject, FreeNode, FreeFill, AnimBinding, GradientStopSpec,
  TitleLine, TransitionSpec, BgSubject,
} from './types.js';
