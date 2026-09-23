/**
 * Shot assignment: beat role + concept metaphor → parametric shot.
 * Variety rule: never the same kind twice running (swap with runner-up).
 * Stats come from the brief's own numbers; generic chips are flagged.
 */
import type { Beat, Concept, Intent, Shot, ShotKind } from './ir.js';

const METAPHOR_SHOT: Record<string, ShotKind> = {
  orbit: 'emblem',
  waveform: 'wave',
  ascent: 'display',
  marquee: 'band',
  'display-type': 'display',
  duel: 'statDuel',
  rays: 'emblem',
  concentric: 'emblem',
  grid: 'display',
  cluster: 'emblem',
  script: 'display',
  route: 'band',
};

const RUNNER_UP: Record<ShotKind, ShotKind> = {
  emblem: 'display',
  display: 'statDuel',
  statDuel: 'band',
  band: 'wave',
  wave: 'quote',
  quote: 'display',
  ctaCard: 'display',
};

export const extractStats = (text: string): Array<{ value: string; label: string }> => {
  const out: Array<{ value: string; label: string }> = [];
  const re = /(\d+(?:\.\d+)?\s?[%x+]?)\s+([A-Za-z][\w ]{0,18})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null && out.length < 4) {
    out.push({ value: m[1]!.trim(), label: m[2]!.trim().toUpperCase().slice(0, 20) });
  }
  return out;
};

export const assignShots = (
  beats: Beat[],
  concept: Concept,
  intent: Intent,
): { shots: Shot[]; whys: string[] } => {
  const whys: string[] = [];
  const hookKind: ShotKind = METAPHOR_SHOT[concept.id] ?? 'display';
  whys.push(`hook takes the concept shot (${hookKind}) — signature in the first 3 seconds`);
  const kindFor = (role: Beat['role'], index: number, prev: ShotKind | null): ShotKind => {
    let kind: ShotKind;
    if (role === 'hook') {
      kind = hookKind;
    } else if (role === 'cta') {
      kind = 'ctaCard';
    } else if (role === 'proof') {
      kind = hookKind === 'display' ? 'statDuel' : 'display';
    } else if (role === 'proof2') {
      kind = hookKind === 'statDuel' || hookKind === 'display' ? 'band' : 'statDuel';
    } else {
      kind = 'band';
    }
    if (prev !== null && kind === prev && role !== 'cta') {
      const swap = RUNNER_UP[kind]!;
      whys.push(`variety rule: ${kind} twice running — swapping middle to ${swap}`);
      kind = swap;
    }
    return kind;
  };
  const briefStats = extractStats(intent.topic);
  let prev: ShotKind | null = null;
  const shots = beats.map((beat, i) => {
    let kind = kindFor(beat.role, i, prev);
    let kindNote = '';
    if (kind === 'statDuel' && briefStats.length < 2) {
      // Integrity rule: stat cards need the brief's own numbers. The old
      // fallback rendered generic chips ("24/7 ALWAYS ON / 100%
      // BRIEF-SILENT") — flagged in decisions but still on screen. Swap to
      // a non-stat shot instead; a missing proof becomes a display beat,
      // never a fake one.
      const alt: ShotKind = prev === 'display' ? 'wave' : 'display';
      kindNote = `statDuel refused (brief supplies ${briefStats.length} number(s)) — ${alt} instead, no generic chips`;
      kind = alt;
    }
    prev = kind;
    const params: Record<string, string | number | string[]> = {};
    let why = kindNote;
    if (kind === 'statDuel') {
      const s = [briefStats[(i * 2) % Math.max(1, briefStats.length)], briefStats[(i * 2 + 1) % Math.max(1, briefStats.length)]];
      params['stats'] = s.map((x) => `${x!.value}|${x!.label}`);
      why = `stats are the brief's own numbers (${params['stats']}) — proof, not decoration`;
    } else if (kind === 'band') {
      params['items'] = intent.keywords.slice(0, 8).join(' • ').toUpperCase() || intent.domain.toUpperCase();
      why = `marquee recycles brief keywords as texture (${params['items']})`;
    } else if (kind === 'emblem') {
      params['mark'] = ((intent.brand ?? intent.topic).trim().charAt(0).toUpperCase() || 'X').replace('…', 'X');
      why = why || `monogram "${params['mark']}" stands in for the unbriefed logo — zero-shot emblem`;
    } else if (kind === 'display' && beat.role === 'hook' && intent.wantsHindi) {
      params['native'] = 'नमस्ते';
      why = 'brief signals Hindi — native-script display carries the hook';
    }
    return { kind, params, why: why || `${kind} serves ${beat.role} (${beat.energyWhy})` };
  });
  return { shots, whys };
};
