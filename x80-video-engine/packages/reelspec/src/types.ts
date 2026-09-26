/**
 * ReelSpec: the single JSON snippet an external planning AI delivers.
 * Everything the renderer needs is IN here — no agentic loop, no missing
 * pieces. The compiler (compile.ts) turns this into a VideoPlan
 * deterministically: same JSON (+ same measure) → same plan bytes.
 */

export interface ReelCanvas {
  w: number;
  h: number;
  fps: number;
}

/** Layout system. 'cinematic' and 'stack' are presets; 'free' (or any custom
 *  system name) skips system rules — kicker-style matching, layout confinement
 *  and mixing bans do not apply. Presets remain valid shortcuts. */
export type ReelSystem = 'cinematic' | 'stack' | 'free' | (string & {});

export interface ReelPalette {
  bg: string;
  ink: string;
  accent: string;
  accent2: string;
  pillBg: string;
  pillFg: string;
}

export interface ReelFaces {
  /** Giant/display voice (must be vendored + registered). */
  display: string;
  /** Heroes/body. */
  hero: string;
  /** Kickers/numbers. */
  kicker: string;
}

export interface ReelConcept {
  palette: ReelPalette;
  faces: ReelFaces;
  /** The one shot this reel is remembered by (recorded, drives act picking). */
  signature: string;
  signatureWhy: string;
}

/** Built-in subject kinds. 'raw' embeds arbitrary engine nodes (open-ended
 *  escape hatch, usable inside ANY layout). Unknown kinds still throw. */
export type SubjectKind = 'footage' | 'flipbook' | 'icons' | 'emblem' | 'ticker' | 'props' | 'bg' | 'raw';

export interface BgSubject {
  kind: 'bg';
  /** 'night' (gradient + warm glow) or 'flat' (one color). */
  style?: 'night' | 'flat';
  color?: string;
  top?: string;
  mid?: string;
  glow?: string;
}

export interface FootageSubject {
  kind: 'footage';
  /** Asset id of a decoded clip (renderer wires it). */
  clip: string;
  /** Ken Burns zoom; default [1, 1.07]. */
  zoom?: [number, number];
  /** Declarative tint veil {color, opacity}. */
  tint?: { color: string; opacity: number };
}

export interface FlipbookSubject {
  kind: 'flipbook';
  /** Cast id (frames resolved as `${srcPrefix}-${cast}-${frame}`). */
  cast: string;
  /** Display box: tuple or {w,h} object (both accepted). */
  box: [number, number] | { w: number; h: number };
  /** Asset id prefix, e.g. 'spr3', 'in2', 'k2'. */
  srcPrefix: string;
  /** Frames in play order; repeats allowed for ping-pong. */
  order?: number[];
  /** Frames per sprite-frame. */
  rate?: number;
  /**
   * Dwell control: true = play once, hold last frame to act end;
   * N (number) = extend the final pose by N frames each cycle;
   * omitted = loop evenly.
   */
  hold?: boolean | number;
  /** Start offset inside the act. */
  at?: number;
  /** Container motion. Rests are integers (crisp pixels). */
  x: number | { from: number; to: number; at: [number, number] };
  y: number;
  scale?: number;
}

export interface IconsSubject {
  kind: 'icons';
  /** Single disc | trio row | raw strip (no discs). */
  mode: 'chip' | 'trio' | 'strip';
  /** Asset ids WITHOUT prefix (prefix given separately). */
  icons: string[];
  srcPrefix?: string;
  /** Center anchor. Omitted (or a bare number = timing) → per-mode default, logged. */
  at?: [number, number] | number;
  /** Disc radius (chip/trio). */
  r?: number;
  entranceAt?: number;
}

export interface EmblemSubject {
  kind: 'emblem';
  /** Brand initial. */
  mark: string;
  /** Center + ring radius. */
  at: [number, number];
  r?: number;
}

export interface TickerSubject {
  kind: 'ticker';
  items: string;
  y?: number;
  at?: number;
}

export interface PropsSubject {
  kind: 'props';
  /** Exact asset ids (single-frame art). */
  items: Array<{ src: string; box: [number, number] | { w: number; h: number }; x: number; y: number; at?: number; float?: [number, number] | true }>;
}

export type SubjectSpec =
  | FootageSubject
  | FlipbookSubject
  | IconsSubject
  | EmblemSubject
  | TickerSubject
  | PropsSubject
  | BgSubject
  | RawSubject;

/**
 * OPEN-ENDED PRIMITIVES — the composition language.
 *
 * A FreeNode is a direct authoring handle on one engine SceneNode:
 * any node type, arbitrary nesting via `children`, arbitrary x/y/sizing,
 * arbitrary fills (flat | gradient | palette alias | color binding),
 * arbitrary AnimNumber bindings on x/y/scale/rotation/opacity/fontSize/
 * letterSpacing, plus filter/backdropBlur/blendMode/effects/clip.
 *
 * The planner invents layouts by composing these — presets are optional.
 * Same JSON (+ same measure) → same plan bytes; unknown node types throw
 * loudly instead of guessing.
 */
/**
 * Motion systems (JSON forms, all frame-pure):
 * - number: static value.
 * - interpolate/keyframes/spring/color: core bindings (keyframes = named
 *   multi-stop interpolate; see motion.keyframes).
 * - path: baked Catmull-Rom (`axis`, `points`, `duration`, `samples?`) —
 *   compiles to interpolate at plan time (motion.motionPath).
 * - stagger: time-shifted cascade (`base`, `index`, `step`) — compiles away
 *   (motion.stagger).
 */
export type AnimBinding =
  | number
  | {
      binding: 'interpolate';
      inputRange: number[];
      outputRange: number[];
      options?: {
        extrapolateLeft?: 'clamp' | 'extend' | 'wrap' | 'identity';
        extrapolateRight?: 'clamp' | 'extend' | 'wrap' | 'identity';
        easing?: unknown;
      };
    }
  | {
      binding: 'keyframes';
      frames: number[];
      values: number[];
      options?: {
        extrapolateLeft?: 'clamp' | 'extend' | 'wrap' | 'identity';
        extrapolateRight?: 'clamp' | 'extend' | 'wrap' | 'identity';
        easing?: unknown;
      };
    }
  | {
      binding: 'path';
      axis: 'x' | 'y';
      points: Array<[number, number]>;
      duration: number;
      samples?: number;
    }
  | {
      binding: 'stagger';
      base: AnimBinding;
      index: number;
      step: number;
    }
  | {
      binding: 'spring';
      from?: number;
      to?: number;
      [k: string]: unknown;
    }
  | { binding: 'color'; inputRange: number[]; colorStops: string[] };

export interface GradientStopSpec {
  offset: number;
  color: string;
}

export type FreeFill =
  | string
  | { kind: 'linear'; angle?: number; stops: GradientStopSpec[] }
  | { kind: 'radial'; cx?: number; cy?: number; inner?: number; outer?: number; stops: GradientStopSpec[] }
  | { kind: 'conic'; angle?: number; cx?: number; cy?: number; stops: GradientStopSpec[] }
  | { binding: 'color'; inputRange: number[]; colorStops: string[] };

export interface FreeNode {
  id: string;
  type:
    | 'container'
    | 'group'
    | 'rect'
    | 'rrect'
    | 'circle'
    | 'path'
    | 'svg'
    | 'text'
    | 'caption'
    | 'image'
    | 'video'
    | 'shape'
    | 'mask'
    | 'effectLayer'
    | 'particles'
    | 'scene3d';
  x?: AnimBinding;
  y?: AnimBinding;
  scaleX?: AnimBinding;
  scaleY?: AnimBinding;
  rotation?: AnimBinding;
  /** 2.5D tilt in degrees (shear). Frame-pure; unlocks cards/covers/depth without GL. */
  skewX?: AnimBinding;
  skewY?: AnimBinding;
  /** Measure-free flex stacking for container/group: planner invents rows/cols without manual math. */
  layout?: {
    direction: 'row' | 'column';
    gap?: number;
    align?: 'start' | 'center' | 'end';
    padding?: number;
  };
  /** Instantiate a spec-level component (see ReelSpec.components) with optional overrides. */
  use?: string;
  /** Kinetic geometry (rect/rrect/circle/image/video): plain number or binding. */
  width?: AnimBinding;
  height?: AnimBinding;
  radius?: AnimBinding | [number, number, number, number];
  anchorX?: number;
  anchorY?: number;
  opacity?: AnimBinding;
  visible?: boolean;
  blendMode?: string;
  clip?: { x: number; y: number; width: number; height: number; radius?: number | [number, number, number, number] };
  crop?: { x: number; y: number; width: number; height: number; radius?: number | [number, number, number, number] };
  /** Every field animatable (number or binding): focus pulls, grade shifts, blur reveals. */
  filter?: { blur?: AnimBinding; brightness?: AnimBinding; contrast?: AnimBinding; saturate?: AnimBinding; grayscale?: AnimBinding };
  /** Blur radius in px; accepts a binding for blur reveals. */
  backdropBlur?: AnimBinding;
  effects?: Array<{ type: string; params?: Record<string, unknown>; disabled?: boolean }>;
  children?: FreeNode[];
  [k: string]: unknown;
}

/** Embed arbitrary scene fragments inside any act's subjects. */
export interface RawSubject {
  kind: 'raw';
  /** One fragment or a list — compiled verbatim (ids namespaced per act). */
  nodes: FreeNode | FreeNode[];
}

export interface TitleLine {
  text: string;
  /** 'ink' | 'accent' | 'accent2' | any explicit color. */
  fill: string;
  /** Colored glow shadow; defaults to accent for accent fills. */
  glow?: string;
  /** Per-line Google Fonts family (verbatim API name); defaults to title/face slot. */
  face?: string;
  /** Per-line weight; defaults to the layout's weight (usually 800). */
  weight?: number;
}

export interface ActTitle {
  lines: TitleLine[];
  size?: number;
  sub: string;
  subY?: number;
  /** Title-level family override for all lines (line.face wins). */
  face?: string;
}

/**
 * Layout per act. The 7 named values are PRESETS (reusable shortcuts).
 * 'free' (alias 'custom') means: no preset builder runs — the act is
 * composed from `nodes` + `subjects` (+ optional kicker/title atoms).
 * Any act (preset or free) may also carry `nodes` as additive extras.
 * Unknown layout strings still throw.
 */
export type LayoutKind =
  | 'giant'
  | 'lower3rd'
  | 'poster'
  | 'ticket'
  | 'takeover'
  | 'stack'
  | 'lowtitle'
  | 'free'
  | 'custom';

export interface KickerSpec {
  text: string;
  /** 'pill' | 'overline' are presets. 'custom' (or any name under a free
   *  system) renders the same overline atom with free y/at/x/face —
   *  positioning is the planner's, not the system's. */
  style: 'pill' | 'overline' | 'custom' | (string & {});
  y?: number;
  at?: number;
  x?: number;
  /** Kicker-level family override (verbatim Google Fonts name). */
  face?: string;
  size?: number;
  letterSpacing?: number;
}

export interface ActSpec {
  /** Planning label. hook/proof/proof2/scale/cta are presets — any
   *  non-empty string is valid (e.g. 'montage', 'bridge', 'reveal'). */
  role: string;
  /** Frames; the sum is the reel duration. */
  duration: number;
  layout: LayoutKind;
  /** Null = none (poster/takeover carry their own tags). */
  kicker?: KickerSpec | null;
  /** Required for presets (1–2 lines; ticket: 0). Optional for free —
   *  free acts may carry 0–8 lines or omit title entirely when `nodes`
   *  carry the typography. */
  title?: ActTitle;
  /** Centered quote/title treatment (poster/takeover/quote). */
  center?: boolean;
  /** Title block size/maxW override; sub Y/At override. */
  titleSize?: number;
  titleMaxW?: number;
  titleY?: number;
  subY?: number;
  subAt?: number;
  subjects?: SubjectSpec[];
  /** CTA pill label (takeover/ctaCard layouts). */
  cta?: string | null;
  /** CTA pill Y + fade window + label size + geometry. */
  ctaAt?: { y: number; at: [number, number]; size?: number; h?: number; spring?: boolean };
  /** Brand lockup under the pill. */
  lockup?: string | null;
  /** n/5 badge. Default true. */
  badge?: boolean;
  /**
   * OPEN COMPOSITION — arbitrary scene fragments for this act.
   * Allowed on ANY layout (additive extras on presets; the whole
   * composition on 'free'/'custom'). planners invent nesting, positions,
   * type arrangements, animation bindings, effects and blends here.
   */
  nodes?: FreeNode | FreeNode[];
  design?: {
    /** lower3rd: ghost numeral. */
    numeral?: string;
    /** poster: hairline frame. */
    frame?: boolean;
    /** ticket: stub card. */
    ticket?: { title: string; sub: string; x: number; y: number; w: number; h: number; rotation: number; rule?: [string, string] };
    /** takeover: rising veil. */
    veil?: boolean;
    /** emblem mark (scale layouts). */
    mark?: string;
  };
}

export interface TransitionSpec {
  type: string;
  params?: Record<string, string | number | boolean>;
  /** Blend length in frames (default 12, allowed 6–30). Variable lengths
   *  give the planner arbitrary timing/sequencing without breaking the
   *  deterministic montage pattern. */
  duration?: number;
  easing?: string;
}

export interface ReelSpec {
  id: string;
  canvas: ReelCanvas;
  system: ReelSystem;
  concept: ReelConcept;
  /**
   * Variables for reuse without templates: `{{name}}` in any string field
   * (titles, fills, src, text) resolves before compile. Pure substitution —
   * same JSON -> same plan. Unknown `{{names}}` throw loudly.
   */
  vars?: Record<string, string | number>;
  /**
   * Nested sub-compositions: named VideoPlan fragments (acts as data) the AI
   * composes once and references from multiple acts via components/use.
   * Identical to inlining; no new renderer keywords.
   */
  subcomps?: Record<string, FreeNode | FreeNode[]>;
  /** Per-act frames; length === acts.length. */
  durations: number[];
  /** Length === acts.length - 1. Empty = hard cuts + whooshes. */
  transitions: TransitionSpec[];
  acts: ActSpec[];
  audio?: { stingers?: 'cuts' | number[] };
  /** Progress-bar chrome (default true). Set false when the AI invents its own chrome. */
  chrome?: boolean;
  /** Film-grain overlay (default true). Set false for clean vector looks. */
  grain?: boolean;
  /**
   * Reusable fragments the AI defines once and instantiates with `{use: name}`.
   * Composition aid, never a capability boundary — identical to inlining.
   */
  components?: Record<string, FreeNode | FreeNode[]>;
  /**
   * Full-reel overlay fragments (persistent chrome, shared-element flies
   * across cuts, watermarks). Compiled into one container spanning the
   * whole reel: bindings address GLOBAL frames (not act-local), so an
   * element can travel from act A's position to act B's across a cut.
   * Painted above acts, below the progress chrome.
   */
  overlays?: FreeNode | FreeNode[];
}
