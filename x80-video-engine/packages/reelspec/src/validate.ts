/**
 * validateSpec: the acceptance gate. Returns error strings (empty = valid).
 * The compiler REFUSES invalid specs loudly — a bad JSON never renders a
 * broken reel silently. Every rule here is also documented in HOW-TO-USE.md
 * so the planning AI can self-check before submitting.
 */
import type { ReelSpec } from './types.js';

const LAYOUTS = new Set([
  'giant', 'lower3rd', 'poster', 'ticket', 'takeover', 'stack', 'lowtitle',
]);

const COLOR_RE = /^(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{8}|rgba?\([^)]*\))$/;

const isColor = (s: string): boolean =>
  s === 'ink' || s === 'accent' || COLOR_RE.test(s);

export const validateSpec = (spec: ReelSpec): string[] => {
  const errs: string[] = [];
  if (spec === null || typeof spec !== 'object') return ['spec must be an object'];
  if (typeof spec.id !== 'string' || spec.id.length === 0) errs.push('id: non-empty string required');
  const cv = spec.canvas as ReelSpec['canvas'] | undefined;
  if (!cv || cv.w !== 540 || cv.h !== 960 || cv.fps !== 30) {
    errs.push('canvas: must be exactly {w:540,h:960,fps:30} (the locked reel canvas)');
  }
  if (spec.system !== 'cinematic' && spec.system !== 'stack') {
    errs.push(`system: '${String(spec.system)}' unknown (implemented: cinematic, stack)`);
  }
  const acts = spec.acts ?? [];
  if (!Array.isArray(acts) || acts.length === 0) errs.push('acts: non-empty array required');
  if (!Array.isArray(spec.durations) || spec.durations.length !== acts.length) {
    errs.push('durations: length must equal acts.length');
  } else {
    for (const d of spec.durations) {
      if (!Number.isInteger(d) || d < 30) errs.push(`durations: each act needs ≥30 frames (got ${String(d)})`);
    }
  }
  if (!Array.isArray(spec.transitions) || spec.transitions.length !== Math.max(0, acts.length - 1)) {
    errs.push('transitions: length must equal acts.length - 1 (empty transitions = hard cuts)');
  }
  const pal = spec.concept?.palette;
  for (const k of ['bg', 'ink', 'accent', 'accent2', 'pillBg', 'pillFg'] as const) {
    if (!pal || !isColor(pal[k] ?? '')) errs.push(`concept.palette.${k}: hex or rgba() required`);
  }
  const faces = spec.concept?.faces;
  for (const k of ['display', 'hero', 'kicker'] as const) {
    if (!faces || typeof faces[k] !== 'string' || faces[k].length === 0) {
      errs.push(`concept.faces.${k}: family name required (must be vendored + registered)`);
    }
  }
  acts.forEach((a, i) => {
    const tag = `acts[${i}]`;
    if (!LAYOUTS.has(a.layout)) errs.push(`${tag}.layout: '${String(a.layout)}' unknown`);
    const nLines = a.title?.lines?.length ?? -1;
    if (a.layout === 'ticket') {
      if (nLines !== 0) errs.push(`${tag}.title.lines: ticket layout carries copy in design.ticket — lines must be []`);
    } else if (nLines < 1 || nLines > 2) {
      errs.push(`${tag}.title.lines: 1-2 complete lines required`);
    }
    for (const ln of a.title?.lines ?? []) {
      if (typeof ln.text !== 'string' || ln.text.length === 0) errs.push(`${tag}.title: empty hero line`);
      if (ln.text.includes('…') || /\.\.\./.test(ln.text)) errs.push(`${tag}.title: truncation marks forbidden ("${ln.text}")`);
      if (!isColor(ln.fill)) errs.push(`${tag}.title: fill must be ink|accent|color ("${ln.text}")`);
    }
    if (typeof a.title?.sub !== 'string') errs.push(`${tag}.title.sub: string required (may be '')`);
    for (const s of a.subjects ?? []) {
      if (s.kind === 'footage') {
        if (typeof s.clip !== 'string' || s.clip.length === 0) errs.push(`${tag}: footage subject needs clip id`);
      } else if (s.kind === 'flipbook') {
        if (typeof s.cast !== 'string' || s.cast.length === 0) errs.push(`${tag}: flipbook needs cast`);
        const bb = s.box as [number, number] | { w: number; h: number } | undefined;
        const bw = Array.isArray(bb) ? bb[0] : bb?.w;
        const bh = Array.isArray(bb) ? bb[1] : bb?.h;
        if (!(bw !== undefined && bw > 0 && bh !== undefined && bh > 0)) {
          errs.push(`${tag}: flipbook needs box [w,h] or {w,h}`);
        }
        if (s.hold !== undefined && typeof s.hold !== 'boolean' && typeof s.hold !== 'number') {
          errs.push(`${tag}: flipbook hold must be boolean or number`);
        }
      } else if (s.kind === 'icons') {
        if (!Array.isArray(s.icons) || s.icons.length === 0 || s.icons.length > 3) {
          errs.push(`${tag}: icons need 1-3 asset ids (trio max)`);
        }
        if (s.at !== undefined && typeof s.at !== 'number' && (!Array.isArray(s.at) || s.at.length !== 2)) {
          errs.push(`${tag}: icons at must be [x,y] (a bare number is read as entrance timing; anchor defaults per mode)`);
        }
      } else if (s.kind === 'emblem') {
        if (typeof s.mark !== 'string' || s.mark.length === 0) errs.push(`${tag}: emblem needs mark`);
      } else if (s.kind === 'ticker') {
        if (typeof s.items !== 'string' || s.items.length === 0) errs.push(`${tag}: ticker needs items`);
      } else if (s.kind === 'props') {
        if (!Array.isArray(s.items)) errs.push(`${tag}: props need items array`);
      } else if (s.kind === 'bg') {
        if (s.style !== undefined && s.style !== 'night' && s.style !== 'flat') {
          errs.push(`${tag}: bg style must be night|flat`);
        }
      } else {
        errs.push(`${tag}: unknown subject kind '${String((s as { kind: unknown }).kind)}'`);
      }
    }
  });
  return errs;
};
