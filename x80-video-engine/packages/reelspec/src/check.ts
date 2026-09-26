/**
 * checkSpec — authoring safety net for brave plans (HyperFrames `check` idea,
 * X80-pure: no browser, no network). validateSpec rejects broken JSON;
 * checkSpec warns about *taste/legibility risks* in valid specs so the AI
 * can self-correct novelty before rendering:
 * overflow, safe zones, contrast, dead space, micro-act readability.
 * Pure data in, strings out. Deterministic.
 */
import type { ReelSpec } from './types.js';

export interface CheckIssue {
  level: 'warn';
  path: string;
  message: string;
}

const lum = (hex: string): number | null => {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  const f = (c: number): number => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255);
};

const ratio = (a: string, b: string): number | null => {
  const la = lum(a);
  const lb = lum(b);
  if (la === null || lb === null) return null;
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
};

type N = Record<string, unknown>;

const eachNode = (nodes: unknown, fn: (n: N, path: string) => void, base = 'nodes'): void => {
  const list = nodes === undefined ? [] : Array.isArray(nodes) ? nodes : [nodes];
  list.forEach((n, i) => {
    if (n === null || typeof n !== 'object') return;
    fn(n as N, `${base}[${i}]`);
    const ch = (n as N).children;
    if (Array.isArray(ch)) eachNode(ch, fn, `${base}[${i}].children`);
  });
};

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Warn about risky-but-valid plans. Empty = no concerns. */
export const checkSpec = (spec: ReelSpec): CheckIssue[] => {
  const out: CheckIssue[] = [];
  const W = spec.canvas?.w ?? 540;
  const H = spec.canvas?.h ?? 960;
  const pal = spec.concept?.palette as unknown as Record<string, string> | undefined;
  const resolve = (c: string): string => (pal !== undefined && c in pal ? pal[c]! : c);
  const bg = resolve(spec.concept?.palette?.bg ?? '#0b1020');

  spec.acts?.forEach((a, ai) => {
    const tag = `acts[${ai}]`;
    // Dead space: type-only acts with no subjects and no nodes.
    if ((a.subjects?.length ?? 0) === 0 && a.nodes === undefined) {
      out.push({ level: 'warn', path: tag, message: 'type-only act (no subjects/nodes): confirm the background carries the frame' });
    }
    // Bg-only acts read as slideshows.
    const nodeCount = a.nodes === undefined ? 0 : (Array.isArray(a.nodes) ? a.nodes.length : 1);
    if ((a.subjects?.length ?? 0) === 1 && a.subjects![0]!.kind === 'bg' && nodeCount === 0) {
      out.push({ level: 'warn', path: tag, message: 'bg-only act: add a subject, raw fragment, or effects or justify the silence' });
    }
    // Micro-acts with titles are unreadable.
    if (a.duration < 12 && ((a.title?.lines?.length ?? 0) > 0 || a.title?.sub !== undefined && a.title?.sub !== '')) {
      out.push({ level: 'warn', path: tag, message: `micro-act (${a.duration}f) with copy: titles need >= 12f to read` });
    }
    // Reading budget (planning-dept §7.3 floors): words across title atoms
    // + literal text nodes vs act duration. Flashed micro-acts (<30f) exempt;
    // component-instantiated copy can't be resolved statically (not counted).
    if (a.duration >= 30) {
      const words: string[] = [];
      for (const ln of a.title?.lines ?? []) words.push(ln.text);
      if (a.title?.sub !== undefined && a.title.sub !== '') words.push(a.title.sub);
      if (a.kicker !== undefined && a.kicker !== null) words.push(a.kicker.text);
      const grab = (nodes: unknown): void => {
        const list = nodes === undefined ? [] : Array.isArray(nodes) ? nodes : [nodes];
        for (const n of list) {
          if (n === null || typeof n !== 'object') continue;
          const nn = n as Record<string, unknown>;
          if (nn.type === 'text' && typeof nn.text === 'string') words.push(nn.text);
          if (Array.isArray(nn.children)) grab(nn.children);
        }
      };
      grab(a.nodes as unknown);
      for (const s of a.subjects ?? []) {
        if (s.kind === 'raw') grab((s as { nodes: unknown }).nodes);
      }
      // Lone punctuation tokens (—, -, ·, •, /) are separators, not reads.
      const n = words.join(' ').split(/\s+/).filter((t) => /[A-Za-z0-9]/.test(t)).length;
      const fps = spec.canvas?.fps ?? 30;
      const need = Math.ceil(n <= 3 ? 0.8 * fps : n * 0.3 * fps);
      if (need > a.duration - 12) {
        out.push({ level: 'warn', path: tag, message: `reading budget: ~${n} words need ~${need}f settled, act has ${a.duration}f (cut copy or split the act)` });
      }
    }
    // Title contrast (hex only; gradients/bindings skipped).
    for (const ln of a.title?.lines ?? []) {
      const fill = resolve(ln.fill);
      const r = ratio(fill, bg);
      if (r !== null && r < 3) {
        out.push({ level: 'warn', path: tag, message: `low contrast title '${ln.text.slice(0, 24)}' on bg (ratio ${r.toFixed(1)} < 3)` });
      }
    }
    // Node-level geometry checks (plain numbers only; bindings are dynamic).
    const checkList = (n: N, path: string): void => {
      const x = num(n.x);
      const y = num(n.y);
      if (x !== null && (x < -200 || x > W + 200)) {
        out.push({ level: 'warn', path: `${tag}.${path}`, message: `x=${x} far outside canvas w=${W} (overflow?)` });
      }
      if (y !== null && (y < -200 || y > H + 200)) {
        out.push({ level: 'warn', path: `${tag}.${path}`, message: `y=${y} far outside canvas h=${H} (overflow?)` });
      }
      if (n.type === 'text' && y !== null && (y < 20 || y > H - 80)) {
        out.push({ level: 'warn', path: `${tag}.${path}`, message: `text y=${y} inside chrome/safe-zone edge (keep 20px top, 80px bottom)` });
      }
      const w = num(n.width);
      const h = num(n.height);
      if (w !== null && w > W * 2.5) {
        out.push({ level: 'warn', path: `${tag}.${path}`, message: `width=${w} exceeds 2.5x canvas (confirm intentional)` });
      }
      if (h !== null && h > H * 2.5) {
        out.push({ level: 'warn', path: `${tag}.${path}`, message: `height=${h} exceeds 2.5x canvas (confirm intentional)` });
      }
    };
    if (a.nodes !== undefined) eachNode(a.nodes as unknown, checkList);
    for (const s of a.subjects ?? []) {
      if (s.kind === 'raw') eachNode((s as { nodes: unknown }).nodes, checkList, 'raw');
    }
  });
  for (const [oi, o] of (spec.overlays === undefined ? [] : Array.isArray(spec.overlays) ? spec.overlays : [spec.overlays]).entries()) {
    void oi;
    eachNode(o as unknown, (n, path) => {
      const y = num((n as N).y);
      if (n.type === 'text' && y !== null && (y as number) > H - 80) {
        out.push({ level: 'warn', path: `overlays.${path}`, message: `overlay text near progress bar (y=${y})` });
      }
    }, 'overlays');
  }
  return out;
};
