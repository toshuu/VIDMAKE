/**
 * Intent understanding: raw brief text → structured Intent.
 * Rule-based, deterministic, explainable. Keyword maps are the model;
 * scores are shown in `why` strings, never hidden.
 */
import type { Goal, Intent } from './ir.js';

const STOP = new Set(
  'a,an,the,of,for,and,or,to,in,on,with,our,we,you,your,is,are,be,by,from,that,this,it,as,at,make,makes,more,most,all,every,never,new,get,gets'.split(','),
);

export const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097f\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t));

const hasDevanagari = (text: string): boolean => /[\u0900-\u097f]/.test(text);

interface DomainDef {
  id: string;
  keywords: string[];
  audience: string;
}

const DOMAINS: DomainDef[] = [
  { id: 'food', keywords: ['bakery', 'vegan', 'restaurant', 'cafe', 'food', 'bake', 'bread', 'pizza', 'recipe', 'kitchen'], audience: 'local food lovers' },
  { id: 'saas', keywords: ['saas', 'software', 'invoice', 'invoicing', 'billing', 'workflow', 'dashboard', 'api', 'startup', 'b2b', 'platform'], audience: 'busy operators' },
  { id: 'fitness', keywords: ['marathon', 'fitness', 'gym', 'training', 'run', 'workout', 'coach', 'sport'], audience: 'aspiring athletes' },
  { id: 'energy', keywords: ['solar', 'energy', 'panels', 'installer', 'green', 'rooftop', 'electricity'], audience: 'homeowners' },
  { id: 'pets', keywords: ['pet', 'dog', 'cat', 'adoption', 'shelter', 'puppy', 'kitten', 'vet'], audience: 'animal lovers' },
  { id: 'wellness', keywords: ['yoga', 'meditation', 'mindful', 'wellness', 'studio', 'calm', 'sleep'], audience: 'stressed urbanites' },
  { id: 'security', keywords: ['security', 'cyber', 'vpn', 'password', 'hack', 'privacy', 'threat', 'firewall'], audience: 'security-conscious teams' },
  { id: 'subscription', keywords: ['coffee', 'subscription', 'delivery', 'monthly', 'box', 'beans', 'brew'], audience: 'home brewers' },
  { id: 'education', keywords: ['tutor', 'tutoring', 'language', 'learn', 'course', 'student', 'exam', 'math'], audience: 'learners and parents' },
  { id: 'mobility', keywords: ['scooter', 'ev', 'electric', 'bike', 'ride', 'commute', 'vehicle'], audience: 'city commuters' },
  { id: 'creative', keywords: ['freelance', 'designer', 'portfolio', 'brand', 'logo', 'agency'], audience: 'potential clients' },
  { id: 'health', keywords: ['mental', 'therapy', 'health', 'doctor', 'clinic', 'anxiety', 'mind'], audience: 'people seeking care' },
  { id: 'voice', keywords: ['voice', 'calling', 'audio', 'speech', 'hindi', 'microphone', 'podcast', 'call'], audience: 'builders going global' },
  { id: 'finance', keywords: ['loan', 'invest', 'money', 'bank', 'upi', 'payment', 'credit', 'save'], audience: 'first-time earners' },
];

const GOAL_HINTS: Array<{ goal: Goal; keywords: string[]; why: string }> = [
  { goal: 'launch', keywords: ['launch', 'launching', 'soon', 'coming', 'announcing', 'introducing', 'new'], why: 'launch vocabulary present' },
  { goal: 'leads', keywords: ['leads', 'book', 'booking', 'trial', 'signup', 'sign', 'try', 'demo', 'clients', 'adopt'], why: 'action/conversion vocabulary present' },
  { goal: 'education', keywords: ['how', 'learn', 'guide', 'tips', 'training', 'explain'], why: 'teaching vocabulary present' },
  { goal: 'awareness', keywords: [], why: 'no conversion/launch/teaching markers — default' },
];

const CTA_BY_GOAL: Record<Goal, string> = {
  launch: 'GET EARLY ACCESS',
  leads: 'BOOK A DEMO',
  education: 'FOLLOW FOR MORE',
  awareness: 'FOLLOW FOR MORE',
};

const hashStr = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

export const understand = (text: string, durationSec = 15): { intent: Intent; seed: number } => {
  const tokens = tokenize(text);
  let best: DomainDef | null = null;
  let bestScore = 0;
  for (const d of DOMAINS) {
    const score = d.keywords.filter((k) => tokens.includes(k)).length;
    if (score > bestScore) {
      best = d;
      bestScore = score;
    }
  }
  const domain = best ?? { id: 'general', keywords: [] as string[], audience: 'curious scrollers' };
  const domainWhy =
    bestScore > 0
      ? `matched ${bestScore} domain keyword(s) for "${domain.id}"`
      : 'no domain keywords matched — general-interest treatment';
  let goal: Goal = 'awareness';
  let goalWhy = GOAL_HINTS[3]!.why;
  for (const hint of GOAL_HINTS) {
    if (hint.keywords.some((k) => tokens.includes(k))) {
      goal = hint.goal;
      goalWhy = hint.why;
      break;
    }
  }
  const wantsHindi =
    hasDevanagari(text) || tokens.includes('hindi') || tokens.includes('india');
  // Integrity rule: intent keeps the brief's full words. Display-layer
  // truncation (mid-word slices + "…") used to propagate into claims and
  // on-screen type ("English when you ne…"). Wrapping/shrinking at compose
  // time is the only place length is resolved — never here.
  const topic = text.replace(/\s+/g, ' ').trim().slice(0, 280);
  const named = /(?:called|named)\s+([A-Z][\w&]*)/.exec(text)?.[1] ?? null;
  // Brand fallback: leading capitalized token (Feather/DadiTalk/VoxCell…).
  // Previously null here pushed compose to use the CTA initial ("G") as the
  // emblem monogram on every reel. Brief words first, never template words.
  const leadBrand = /^\s*([A-Z][\w&]{2,})/.exec(text)?.[1] ?? null;
  const brand = named ?? leadBrand;
  const tone = wantsHindi
    ? ['warm', 'direct']
    : goal === 'launch'
      ? ['bold', 'electric']
      : ['confident', 'clean'];
  void durationSec;
  return {
    intent: {
      topic,
      domain: domain.id,
      domainWhy,
      audience: domain.audience,
      goal,
      goalWhy,
      cta: CTA_BY_GOAL[goal],
      tone,
      wantsHindi,
      keywords: [...new Set(tokens)].slice(0, 12),
      brand,
    },
    seed: hashStr(text),
  };
};
