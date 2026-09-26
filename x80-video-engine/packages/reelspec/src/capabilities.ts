/**
 * capabilities — semantic index over the EXISTING engine surface
 * (no new effects/presets). The AI describes intent in plain words;
 * this returns the real effect/transition/node/pattern names to use.
 * Pure data, deterministic, no renderer needed.
 */
export interface Capability {
  id: string;
  kind: 'effect' | 'transition' | 'node' | 'pattern';
  /** Real registry/node/pattern name (never invented). */
  name: string;
  when: string;
  keys: string[];
  example?: Record<string, unknown>;
}

const CAPS: Capability[] = [
  { id: 'glow', kind: 'effect', name: 'glow', when: 'halos around heroes, emblems, end-cards', keys: ['glow', 'halo', 'shine', 'neon', 'light'], example: { type: 'glow', params: { radius: 24 } } },
  { id: 'vignette', kind: 'effect', name: 'vignette', when: 'focus the center over footage', keys: ['vignette', 'edges', 'focus', 'cinema', 'footage'] },
  { id: 'grain', kind: 'effect', name: 'grain', when: 'film texture over flat vector looks', keys: ['grain', 'film', 'texture', 'noise', 'analog'] },
  { id: 'chromatic', kind: 'effect', name: 'chromatic-aberration', when: 'music-video fringing on hard cuts', keys: ['chromatic', 'rgb', 'fringe', 'glitch', 'music'] },
  { id: 'zoom-blur-fx', kind: 'effect', name: 'zoom-blur', when: 'speed into a title or stat hit', keys: ['zoom', 'blur', 'speed', 'hit', 'stat'] },
  { id: 'pixelate', kind: 'effect', name: 'pixelate', when: 'censor, retro, or load-in reveal', keys: ['pixel', 'retro', 'censor', 'mosaic', 'reveal'] },
  { id: 'scanlines', kind: 'effect', name: 'scanlines', when: 'CRT / broadcast texture', keys: ['scanline', 'crt', 'retro', 'broadcast', 'line'] },
  { id: 'halftone', kind: 'effect', name: 'halftone', when: 'print-poster dots', keys: ['halftone', 'dots', 'print', 'poster', 'pop'] },
  { id: 'duotone', kind: 'effect', name: 'duotone', when: 'two-ink photographic grade', keys: ['duotone', 'grade', 'photo', 'ink', 'color'] },
  { id: 'light-leak', kind: 'effect', name: 'light-leak', when: 'warm analog bloom on lifestyle footage', keys: ['leak', 'bloom', 'warm', 'analog', 'lifestyle'] },
  { id: 'mirror', kind: 'effect', name: 'mirror', when: 'symmetric kaleidoscope compositions', keys: ['mirror', 'symmetry', 'kaleidoscope', 'reflect'] },
  { id: 'wave', kind: 'effect', name: 'wave', when: 'water, flag, or heat-haze motion on stills', keys: ['wave', 'water', 'flag', 'haze', 'motion'] },
  { id: 'dissolve-fx', kind: 'effect', name: 'pixel-dissolve', when: 'gritty outgoing transition baked as effect', keys: ['dissolve', 'grit', 'transition', 'pixel'] },
  { id: 'region-blur', kind: 'effect', name: 'region-blur', when: 'blur behind glass cards (with backdropBlur nodes)', keys: ['blur', 'glass', 'card', 'background', 'region'] },
  { id: 'fade-tr', kind: 'transition', name: 'fade', when: 'quiet act changes, endings', keys: ['fade', 'quiet', 'end', 'soft', 'dissolve'] },
  { id: 'slide-tr', kind: 'transition', name: 'slide', when: 'editorial push between chapters', keys: ['slide', 'push', 'chapter', 'editorial', 'move'] },
  { id: 'push-cut', kind: 'transition', name: 'push-cut', when: 'hard graphic snap (montages)', keys: ['push', 'cut', 'snap', 'montage', 'hard'] },
  { id: 'iris-tr', kind: 'transition', name: 'iris', when: 'spotlight open/close on a subject', keys: ['iris', 'spotlight', 'open', 'close', 'circle'] },
  { id: 'clock-wipe', kind: 'transition', name: 'clock-wipe', when: 'playful time-passing wipe', keys: ['clock', 'wipe', 'time', 'playful'] },
  { id: 'crosswarp', kind: 'transition', name: 'crosswarp', when: 'psychedelic travel between worlds', keys: ['warp', 'psychedelic', 'travel', 'trippy'] },
  { id: 'scene3d', kind: 'node', name: 'scene3d', when: 'plinths, courts, orbits, depth stages (CPU, no GL)', keys: ['3d', 'depth', 'plinth', 'court', 'orbit', 'box', 'perspective', 'stage'], example: { type: 'scene3d', camera: { distance: 750 } } },
  { id: 'particles', kind: 'node', name: 'particles', when: 'starfields, dust, confetti, rain (seeded)', keys: ['particle', 'stars', 'dust', 'confetti', 'rain', 'snow', 'sky'], example: { type: 'particles', count: 130, seed: 5 } },
  { id: 'shape', kind: 'node', name: 'shape', when: 'stars, polygons, arrows, ellipses without assets', keys: ['shape', 'star', 'polygon', 'arrow', 'badge', 'diagram'] },
  { id: 'mask', kind: 'node', name: 'mask', when: 'cutout windows, paper-theatre stages, reveals', keys: ['mask', 'cutout', 'window', 'reveal', 'theatre', 'clip'] },
  { id: 'skew', kind: 'pattern', name: 'skewX/skewY 2.5D tilt', when: 'card leans, cover tilts, depth without GL', keys: ['tilt', 'lean', 'card', 'cover', '2.5d', 'depth', 'skew'] },
  { id: 'motion-path', kind: 'pattern', name: 'motion.motionPath', when: 'orbiting satellites, arcs, curved flies', keys: ['orbit', 'path', 'curve', 'arc', 'satellite', 'fly'] },
  { id: 'shared-fly', kind: 'pattern', name: 'motion.sharedFly', when: 'one element travels across a cut (overlays)', keys: ['shared', 'fly', 'across', 'cut', 'flip', 'continue'] },
  { id: 'stagger', kind: 'pattern', name: 'motion.stagger', when: 'cascades, choirs, grids blooming in sequence', keys: ['stagger', 'cascade', 'choir', 'grid', 'sequence', 'bloom'] },
  { id: 'keyframes', kind: 'pattern', name: 'binding keyframes', when: 'multi-beat moves no single tween expresses', keys: ['keyframe', 'beats', 'multi', 'bounce', 'route'] },
  { id: 'pingpong', kind: 'pattern', name: 'footage pingpong loop', when: 'short clips inside longer acts (never freeze, never jump)', keys: ['loop', 'pingpong', 'footage', 'clip', 'short'] },
];

/** Score intents against the index; always returns <= limit, best first. */
export const queryCapabilities = (q: string, limit = 6): Capability[] => {
  const toks = q.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 1);
  if (toks.length === 0) return [];
  return CAPS.map((c) => {
    let score = 0;
    for (const t of toks) {
      if (c.name.toLowerCase().includes(t)) score += 3;
      if (c.when.toLowerCase().includes(t)) score += 2;
      if (c.keys.some((k) => k.includes(t) || t.includes(k))) score += 2;
      if (c.id.includes(t)) score += 1;
    }
    return { c, score };
  })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(12, limit)))
    .map((r) => r.c);
};

export const capabilityIds = (): string[] => CAPS.map((c) => c.id);
