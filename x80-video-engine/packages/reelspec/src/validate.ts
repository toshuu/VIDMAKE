/**
 * validateSpec: the acceptance gate. Returns error strings (empty = valid).
 * The compiler REFUSES invalid specs loudly — a bad JSON never renders a
 * broken reel silently. Every rule here is also documented in HOW-TO-USE.md
 * so the planning AI can self-check before submitting.
 */
import type { ReelSpec } from './types.js';

const LAYOUTS = new Set([
  'giant', 'lower3rd', 'poster', 'ticket', 'takeover', 'stack', 'lowtitle',
  'free', 'custom',
]);

const PRESET_LAYOUTS = new Set([
  'giant', 'lower3rd', 'poster', 'ticket', 'takeover', 'stack', 'lowtitle',
]);

const NODE_TYPES = new Set([
  'container', 'group', 'rect', 'rrect', 'circle', 'path', 'svg', 'text',
  'caption', 'image', 'video', 'shape', 'mask', 'effectLayer', 'particles', 'scene3d',
]);

const isFreeLayout = (l: string): boolean => l === 'free' || l === 'custom';

const COLOR_RE = /^(#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{8}|rgba?\([^)]*\)|hsla?\([^)]*\))$/;

const PALETTE_WORDS = new Set(['bg', 'ink', 'accent', 'accent2', 'pillBg', 'pillFg']);

const isColor = (s: string): boolean =>
  PALETTE_WORDS.has(s) || COLOR_RE.test(s);

export const validateSpec = (spec: ReelSpec): string[] => {
  const errs: string[] = [];
  if (spec === null || typeof spec !== 'object') return ['spec must be an object'];
  if (typeof spec.id !== 'string' || spec.id.length === 0) errs.push('id: non-empty string required');
  const cv = spec.canvas as ReelSpec['canvas'] | undefined;
  const fpsOk = cv !== undefined && [24, 25, 30, 60].includes(cv.fps);
  const sizeOk = cv !== undefined
    && Number.isInteger(cv.w) && cv.w >= 270 && cv.w <= 1080
    && Number.isInteger(cv.h) && cv.h >= 480 && cv.h <= 1920;
  if (!cv || !sizeOk || !fpsOk) {
    errs.push('canvas: w 270-1080, h 480-1920, fps 24|25|30|60 (deterministic at any size)');
  }
  // System: 'cinematic' | 'stack' are presets with kicker-style rules.
  // 'free' or any custom name skips system rules (open-ended, mixing allowed).
  const system = String(spec.system ?? '');
  const isPresetSystem = system === 'cinematic' || system === 'stack';
  if (system.length === 0) {
    errs.push(`system: non-empty string required (presets: cinematic, stack; open: free or custom)`);
  }
  const acts = spec.acts ?? [];
  if (!Array.isArray(acts) || acts.length === 0) errs.push('acts: non-empty array required');
  if (!Array.isArray(spec.durations) || spec.durations.length !== acts.length) {
    errs.push('durations: length must equal acts.length');
  } else {
    const freeSystem = !isPresetSystem;
    for (const d of spec.durations) {
      const min = freeSystem ? 1 : 30;
      if (!Number.isInteger(d) || d < min) errs.push(`durations: each act needs ≥${min} frames (got ${String(d)})`);
    }
  }
  if (!Array.isArray(spec.transitions) || spec.transitions.length !== Math.max(0, acts.length - 1)) {
    errs.push('transitions: length must equal acts.length - 1 (empty transitions = hard cuts)');
  } else {
    spec.transitions.forEach((t, k) => {
      if (typeof t?.type !== 'string' || t.type.length === 0) {
        errs.push(`transitions[${k}].type: non-empty string required`);
      }
      if (t?.duration !== undefined && (!Number.isInteger(t.duration) || t.duration < 2 || t.duration > 60)) {
        errs.push(`transitions[${k}].duration: integer 2-60 required (got ${String(t.duration)})`);
      }
    });
  }
  const pal = spec.concept?.palette;
  for (const k of ['bg', 'ink', 'accent', 'accent2', 'pillBg', 'pillFg'] as const) {
    if (!pal || !isColor(pal[k] ?? '')) errs.push(`concept.palette.${k}: hex or rgba() required`);
  }
  const faces = spec.concept?.faces;
  for (const k of ['display', 'hero', 'kicker'] as const) {
    if (!faces || typeof faces[k] !== 'string' || faces[k].length === 0) {
      errs.push(`concept.faces.${k}: family name required (verbatim Google Fonts name; auto-fetched if missing)`);
    }
  }
  const faceOk = (v: unknown): boolean => v === undefined || (typeof v === 'string' && v.length > 0);
  const weightOk = (v: unknown): boolean =>
    v === undefined || (typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 1000);

  const validateFreeNode = (n: unknown, path: string): void => {
    if (n === null || typeof n !== 'object') {
      errs.push(`${path}: node must be an object`);
      return;
    }
    const nn = n as { id?: unknown; type?: unknown; children?: unknown; use?: unknown };
    if (typeof nn.id !== 'string' || nn.id.length === 0) {
      errs.push(`${path}: node id non-empty string required`);
    }
    // `{use: name}` instantiates a spec component — type comes from the component.
    if (typeof nn.use === 'string' && nn.use.length > 0) {
      if (nn.type !== undefined && nn.type !== 'container' && !NODE_TYPES.has(nn.type as string)) {
        errs.push(`${path}: node type '${String(nn.type)}' unknown (engine primitives: ${[...NODE_TYPES].join('|')})`);
      }
    } else if (typeof nn.type !== 'string' || !NODE_TYPES.has(nn.type)) {
      errs.push(`${path}: node type '${String(nn.type)}' unknown (engine primitives: ${[...NODE_TYPES].join('|')})`);
    }
    if (nn.children !== undefined) {
      if (!Array.isArray(nn.children)) {
        errs.push(`${path}.children: array required`);
      } else {
        nn.children.forEach((c, ci) => validateFreeNode(c, `${path}.children[${ci}]`));
      }
    }
  };

  const asNodeList = (v: unknown): unknown[] | null => {
    if (v === undefined) return null;
    return Array.isArray(v) ? v : [v];
  };

  // Vars: {{name}} substitution table (pure, no new keywords).
  if (spec.vars !== undefined) {
    if (spec.vars === null || typeof spec.vars !== 'object' || Array.isArray(spec.vars)) {
      errs.push('vars: record of name → string|number required');
    } else {
      for (const [k, v] of Object.entries(spec.vars)) {
        if (!/^[A-Za-z0-9_]+$/.test(k)) errs.push(`vars.${k}: name must match [A-Za-z0-9_]+`);
        if (typeof v !== 'string' && typeof v !== 'number') errs.push(`vars.${k}: string|number required`);
      }
    }
  }
  // Subcomps: nested sub-compositions (merged into components at compile).
  if ((spec as unknown as Record<string, unknown>).subcomps !== undefined) {
    const subs = (spec as unknown as { subcomps: unknown }).subcomps;
    if (subs === null || typeof subs !== 'object' || Array.isArray(subs)) {
      errs.push('subcomps: record of name → node(s) required');
    } else {
      for (const [name, frag] of Object.entries(subs as Record<string, unknown>)) {
        if (name.length === 0) errs.push('subcomps: empty name forbidden');
        const rl = asNodeList(frag);
        if (rl === null || rl.length === 0) {
          errs.push(`subcomps.${name}: non-empty node or array required`);
        } else {
          rl.forEach((n, ni) => validateFreeNode(n, `subcomps.${name}[${ni}]`));
        }
        if (spec.components !== undefined && name in (spec.components as Record<string, unknown>)) {
          errs.push(`subcomps.${name}: collides with components.${name}`);
        }
      }
    }
  }
  // Components: reusable fragments (composition aid, identical to inlining).
  if (spec.components !== undefined) {
    if (spec.components === null || typeof spec.components !== 'object' || Array.isArray(spec.components)) {
      errs.push('components: record of name → node(s) required');
    } else {
      for (const [name, frag] of Object.entries(spec.components)) {
        if (name.length === 0) errs.push('components: empty name forbidden');
        const rl = asNodeList(frag);
        if (rl === null || rl.length === 0) {
          errs.push(`components.${name}: non-empty node or array required`);
        } else {
          rl.forEach((n, ni) => validateFreeNode(n, `components.${name}[${ni}]`));
        }
      }
    }
  }

  acts.forEach((a, i) => {
    const tag = `acts[${i}]`;
    const layoutName = String(a.layout ?? '');
    const layoutKnown = LAYOUTS.has(a.layout);
    // Open-ended: under a free/custom system ANY layout name composes as free
    // (presets are shortcuts, never boundaries). Under preset systems unknown
    // names still throw loudly so typos can't render silently wrong.
    if (!layoutKnown && !(String(spec.system) !== 'cinematic' && String(spec.system) !== 'stack')) {
      errs.push(`${tag}.layout: '${String(a.layout)}' unknown`);
    }
    if (layoutName.length === 0) errs.push(`${tag}.layout: non-empty string required`);
    const freeSystem = String(spec.system) !== 'cinematic' && String(spec.system) !== 'stack';
    const free = isFreeLayout(layoutName) || (!layoutKnown && freeSystem);
    // Role: presets are hook/proof/proof2/scale/cta; free-form allowed.
    if (typeof a.role !== 'string' || a.role.length === 0) {
      errs.push(`${tag}.role: non-empty string required (presets: hook|proof|proof2|scale|cta)`);
    }
    // Kicker style: presets enforce system match; free system/layout allows any.
    const ks = a.kicker?.style;
    if (a.kicker !== undefined && a.kicker !== null) {
      if (typeof a.kicker.text !== 'string' || a.kicker.text.length === 0) {
        errs.push(`${tag}.kicker.text: non-empty string required`);
      }
      if (isPresetSystem && !free) {
        if (system === 'cinematic' && ks !== 'overline') {
          errs.push(`${tag}.kicker.style: cinematic preset expects 'overline' (use system free for pills/custom)`);
        }
        if (system === 'stack' && ks !== 'pill') {
          errs.push(`${tag}.kicker.style: stack preset expects 'pill' (use system free for overlines/custom)`);
        }
      } else if (typeof ks !== 'string' || ks.length === 0) {
        errs.push(`${tag}.kicker.style: non-empty string required`);
      }
    }
    // Title: presets require 1–2 lines (ticket: 0); free allows 0–8 or omit.
    const nLines = a.title?.lines?.length ?? -1;
    if (a.layout === 'ticket') {
      if (nLines !== 0) errs.push(`${tag}.title.lines: ticket layout carries copy in design.ticket — lines must be []`);
    } else if (free) {
      if (a.title !== undefined && (nLines < 0 || nLines > 8)) {
        errs.push(`${tag}.title.lines: free layout allows 0-8 lines (got ${nLines})`);
      }
    } else if (nLines < 1 || nLines > 2) {
      errs.push(`${tag}.title.lines: 1-2 complete lines required (use layout free for N-line typography)`);
    }
    // Free acts need SOMETHING visual: title lines, subjects, or nodes.
    if (free) {
      const hasTitle = (a.title?.lines?.length ?? 0) > 0;
      const hasSubjects = (a.subjects?.length ?? 0) > 0;
      const hasNodes = a.nodes !== undefined && asNodeList(a.nodes)!.length > 0;
      if (!hasTitle && !hasSubjects && !hasNodes) {
        errs.push(`${tag}: free layout needs title.lines, subjects, or nodes (empty stage)`);
      }
    } else if (a.title === undefined) {
      errs.push(`${tag}.title: required for preset layouts (omit only with layout free)`);
    }
    for (const ln of a.title?.lines ?? []) {
      if (typeof ln.text !== 'string' || ln.text.length === 0) errs.push(`${tag}.title: empty hero line`);
      if (ln.text.includes('…') || /\.\.\./.test(ln.text)) errs.push(`${tag}.title: truncation marks forbidden ("${ln.text}")`);
      if (!isColor(ln.fill)) errs.push(`${tag}.title: fill must be ink|accent|color ("${ln.text}")`);
      if (!faceOk(ln.face)) errs.push(`${tag}.title: face must be a Google Fonts family name ("${ln.text}")`);
      if (!weightOk(ln.weight)) errs.push(`${tag}.title: weight must be an integer 1..1000 ("${ln.text}")`);
    }
    if (!faceOk(a.title?.face)) errs.push(`${tag}.title.face: must be a Google Fonts family name`);
    if (!faceOk(a.kicker?.face)) errs.push(`${tag}.kicker.face: must be a Google Fonts family name`);
    if (a.title !== undefined && typeof a.title?.sub !== 'string') {
      errs.push(`${tag}.title.sub: string required (may be '')`);
    }
    // Additive free nodes allowed on ANY layout (presets stay extensible).
    const nodeList = asNodeList(a.nodes);
    if (nodeList !== null) {
      if (nodeList.length === 0) errs.push(`${tag}.nodes: non-empty node or array required`);
      nodeList.forEach((n, ni) => validateFreeNode(n, `${tag}.nodes[${ni}]`));
    }
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
        if (!Array.isArray(s.icons) || s.icons.length === 0 || s.icons.length > 8) {
          errs.push(`${tag}: icons need 1-8 asset ids (trio preset = 3)`);
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
      } else if (s.kind === 'raw') {
        const rl = asNodeList((s as { nodes?: unknown }).nodes);
        if (rl === null || rl.length === 0) {
          errs.push(`${tag}: raw subject needs nodes (node or non-empty array)`);
        } else {
          rl.forEach((n, ni) => validateFreeNode(n, `${tag}.raw.nodes[${ni}]`));
        }
      } else {
        errs.push(`${tag}: unknown subject kind '${String((s as { kind: unknown }).kind)}'`);
      }
    }
  });
  // Overlays: full-reel fragments (global-frame bindings).
  if (spec.overlays !== undefined) {
    const ol = asNodeList(spec.overlays);
    if (ol === null || ol.length === 0) {
      errs.push('overlays: non-empty node or array required');
    } else {
      ol.forEach((n, ni) => validateFreeNode(n, `overlays[${ni}]`));
    }
  }
  return errs;
};
