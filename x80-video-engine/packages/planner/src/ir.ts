/**
 * Zero-shot planner IR: every creative decision is data + a WHY.
 * The VideoPlan is the compiled output; THIS is the reasoning product.
 */

export interface Brief {
  text: string;
  /** Total seconds (default 15). */
  durationSec?: number;
  /** Vertical reel only for now. */
  format?: 'reel';
}

export type Goal = 'awareness' | 'leads' | 'launch' | 'education';

export interface Intent {
  topic: string;
  domain: string;
  domainWhy: string;
  audience: string;
  goal: Goal;
  goalWhy: string;
  cta: string;
  tone: string[];
  wantsHindi: boolean;
  keywords: string[];
  brand: string | null;
}

export interface Palette {
  bg: string;
  ink: string;
  accent: string;
  accent2: string;
  pillBg: string;
  pillFg: string;
}

export interface Concept {
  id: string;
  metaphor: string;
  metaphorWhy: string;
  signature: string;
  signatureWhy: string;
  palette: Palette;
  paletteWhy: string;
  displayFace: string;
  bodyFace: string;
  pairingWhy: string;
  rejected: Array<{ id: string; why: string }>;
}

export type BeatRole = 'hook' | 'proof' | 'proof2' | 'scale' | 'cta';

export interface Beat {
  id: string;
  role: BeatRole;
  claim: string;
  claimWhy: string;
  support: string;
  frames: number;
  energy: 1 | 2 | 3;
  energyWhy: string;
}

export type ShotKind =
  | 'emblem'
  | 'display'
  | 'statDuel'
  | 'band'
  | 'wave'
  | 'quote'
  | 'ctaCard';

export interface Shot {
  kind: ShotKind;
  params: Record<string, string | number | string[]>;
  why: string;
}

export interface Motion {
  entrance: string;
  entranceWhy: string;
  emphasis: string | null;
  emphasisWhy: string | null;
}

export interface TransitionChoice {
  type: string;
  params?: Record<string, string | number>;
  why: string;
}

export interface Decision {
  path: string;
  choice: string;
  why: string;
}

export interface Critique {
  rule: string;
  severity: 'error' | 'warn';
  detail: string;
  beat?: string;
}

export interface PlannedAct {
  beat: Beat;
  shot: Shot;
  motion: Motion;
  transitionOut: TransitionChoice | null;
}

export interface PlanOutput {
  intent: Intent;
  concept: Concept;
  acts: PlannedAct[];
  decisions: Decision[];
  critiqueRounds: Critique[][];
  /** Importable VideoPlan (core type, kept loose to avoid coupling). */
  plan: unknown;
}
