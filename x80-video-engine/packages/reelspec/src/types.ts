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

/** Layout system. 'cinematic' and 'stack' are implemented; others throw. */
export type ReelSystem = 'cinematic' | 'stack';

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

/** Built-in subject kinds. Unknown kinds throw (never guessed). */
export type SubjectKind = 'footage' | 'flipbook' | 'icons' | 'emblem' | 'ticker' | 'props' | 'bg';

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
  | BgSubject;

export interface TitleLine {
  text: string;
  /** 'ink' | 'accent' | any explicit color. */
  fill: string;
  /** Colored glow shadow; defaults to accent for accent fills. */
  glow?: string;
}

export interface ActTitle {
  lines: TitleLine[];
  size?: number;
  sub: string;
  subY?: number;
}

/**
 * Layout per act. Cinematic: giant | lower3rd | poster | ticket | takeover.
 * Stack: stack | lowtitle. Unknown layouts throw.
 */
export type LayoutKind =
  | 'giant'
  | 'lower3rd'
  | 'poster'
  | 'ticket'
  | 'takeover'
  | 'stack'
  | 'lowtitle';

export interface KickerSpec {
  text: string;
  /** 'pill' (stack system) or 'overline' (cinematic, no pill). */
  style: 'pill' | 'overline';
  y?: number;
  at?: number;
  x?: number;
}

export interface ActSpec {
  role: 'hook' | 'proof' | 'proof2' | 'scale' | 'cta';
  /** Frames; the sum is the reel duration. */
  duration: number;
  layout: LayoutKind;
  /** Null = none (poster/takeover carry their own tags). */
  kicker?: KickerSpec | null;
  title: ActTitle;
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
}

export interface ReelSpec {
  id: string;
  canvas: ReelCanvas;
  system: ReelSystem;
  concept: ReelConcept;
  /** Per-act frames; length === acts.length. */
  durations: number[];
  /** Length === acts.length - 1. Empty = hard cuts + whooshes. */
  transitions: TransitionSpec[];
  acts: ActSpec[];
  audio?: { stingers?: 'cuts' | number[] };
}
