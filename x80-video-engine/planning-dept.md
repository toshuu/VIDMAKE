# X80 Planning Department

**Status:** active · **Scope:** how every X80 reel gets *planned* (taste, tokens,
layout, type) — the engine renders, this department decides what it renders.
**Reference:** Remotion `my-video` reels (CafeReel, WaterReel/V2, IphonePromo,
GoogleJourney, IndiaReel) + headless-Chrome conformance twin.

Rule zero: **measure, don't guess.** Every number below was probed on-canvas
(weight ladder, pill ladder, wrap threshold) before it became a rule.

---

## 1. What Remotion planning actually is (survey)

Remotion has no planning magic — it is the browser. The "department" is CSS:

| Pattern | Remotion recipe (1080×1920) | X80 equivalent (540×960) |
|---|---|---|
| Stage | `AbsoluteFill`, absolute x/y | container + x/y (top = em-box top) |
| Rows/columns | flex + gap + center | explicit x/y + `column()`/`centerX()` |
| Kicker | cream pill, saffron **dot** + spaced caps, radius 100 | `dotKicker` builder (§4) |
| Hero | weight 900, leading 1.04, `textShadow 0 10px 50px rgba(0,0,0,.75)` | weight 800, shadow `{offsetY 5, blur 25}` |
| Glow accent | colored `textShadow 0 0 80px rgba(...)` | text `shadow` with accent color |
| Sub | weight 600, leading 1.35, `rgba(255,247,234,.92)` | weight 500, `lineHeight 1.4` |
| Glass card | `rgba(255,255,255,.12)` + `2px` border `rgba(255,255,255,.22)` + `backdrop-filter: blur(8px)` + radius 28 + padding | fill + `stroke` 1px + `backdropBlur: 5` + radius 20 (all ÷2) |
| Legibility | gradient scrim over footage | `scrimBottom()` (alpha gradient rect) |
| Chrome | tricolor bar, progress bar | `chrome` leaf, scaleX progress |
| Texture | SVG feTurbulence grain | baked `createGrainTile` + `overlay` drift |
| Sound | whoosh SFX on cuts | `decodeAudioToPCM` + `mixTracks` stingers |
| Timing | stagger 6f, fades 10–14f, rise 26–60px | same frames, y ÷2 |

Font pairing (GoogleJourney rule): **geometric display + neutral UI** —
Poppins for kickers/numbers with character, Inter for heroes/body.
Heroes stay Inter 800: at 58px it out-sizes Poppins (which needs ~0.78×
to fit the same width) and matches the reference reel 1:1.

---

## 2. Type scale (540×960 comp; ×2 for 1080)

| Role | Family | Weight | Size | LS | Leading | Fill |
|---|---|---|---|---|---|---|
| Kicker | Poppins | 700 | 14 | 2 | — | `#0b1020` on cream |
| Hero | Inter | 800 | 46–60 | 0 | 1.05 | white / accent |
| Sub | Inter | 500 | 19 | 0 | 1.4 | `rgba(255,247,234,.94)` |
| Stat value | Poppins | 700 | 30 | 0 | — | accent / white |
| Stat label | Inter | 600 | 12 | 1 | — | `rgba(255,255,255,.88)` |
| Badge | Inter | 700 | 13 | 0 | — | white .9 on black .45 |
| End pill | Inter | 800 | 22 | 3 | — | `#0b1020` on tricolor |

True static weights only (400/500/600/700/800 vendored, weight ladder
verified distinct). Never rely on faux-600 — it used to fall back silently.

---

## 3. Iron rules

1. **Optical centering, not box centering.** Canvas `top` maps to font
   tables differently per family — probe a y-ladder per family, never reuse
   constants across families:

   | Family | size 14 in 34px pill | capK (`y = h/2 − size×capK`) |
   |---|---|---|
   | Inter 700 | y=12 (pads 11/12) | 0.32 |
   | Poppins 700 | y=9 (pads 12/12) | 0.57 |

   All-caps/digits only inside pills, cards, badges — no descenders, ever.
   Stat group (Poppins-700 value + Inter-600 label in 96px): value y=20,
   label y=64 → group pads 25/23 (comma tails excluded).
2. **Trailing-space fix.** Canvas adds `letterSpacing` after the last glyph.
   Centered + spaced labels shift right `+ls/2` (`trailingFix`).
3. **Letterspacing contract (engine).** Backend measures report BASE
   advances (spacing excluded); `advanceOf` adds `ls` per grapheme; canvas
   applies it once at draw. Any backend that measures WITH spacing
   double-counts (early wraps, left-shifted centers) — reject it.
4. **Pills auto-size from measured width + padding.** No hardcoded widths
   on text containers. Ever. (Wrap-threshold incident: 223px string wrapped
   in a 256px box under the old double-count.)
5. **Safe zones + LIFT.** Chrome eats edges: 7px tricolor top, 8px progress
   bottom, badge top-right. Bottom stack: cards end ≥72px above the
   progress bar (cards y=776, h=96 → 872, clearance 80). Optical bottom
   padding beats measured — content must never sit on the bar.
6. **Glass = 3 layers.** Translucent fill + 1px light stroke +
   `backdropBlur` (≈CSS px ÷ 2). Fill alone reads as flat gray.
7. **Every hero gets a shadow.** White line: black soft shadow; accent
   line: black shadow + colored glow (saffron/green/blue @ .35–.45, blur 40).
8. **Dots on kickers.** Saffron dot (8px, gap 6) + label, left-padded pill.
   The dot is the brand mark — never ship a kicker without it.
9. **Full layout by frame ~40/90.** Kicker 4/14, hero 6–30, sub 16/28,
   cards 24/30. Mid-act stills must read complete.
10. **Bullets breathe.** ` • ` with spaces, never Jammed; `–` for ranges.
11. **Two-pass plan, signature element.** (frontend-design) Pass 1: brief →
    tokens (4–6 named colors, display + body + utility faces, layout
    concept, ONE signature element). Pass 2: uniqueness review — if any
    part reads like the default you'd produce for any brief, revise it and
    say why. Only then build. Spend boldness in one place; cut decoration
    that doesn't serve the brief.
12. **Type pairing carries personality.** Never one family for everything:
    characterful display + neutral body + utility for data (e.g. Poppins
    kickers/numbers + Inter heroes/body). Record the pairing rationale in
    the plan header.
13. **Validate like canvas-video.** Every reel: no dead space (no empty
    regions), phase handoffs overlap or blend (12f transitions, never hard
    cuts on music), text in safe zones, duration exact. Screenshot-critique
    every act still before encoding.
14. **Named timing presets** (cube-motion numbers @30fps): rise 19f/2f
    stagger, leave 10f, morph 7f/4f lead, whoosh stingers on cut midpoints.
    Same numbers everywhere — rhythm is a feature.
15. **Explicit motion beats group rotation.** Container rotation pivots are
    untrusted (orbit incident) — keyframe x/y positions instead
    (`motionPath()` bakes Catmull-Rom to data). Rotation is for symmetric
    shapes only.
16. **Variety alternation (anti-template rule).** No two consecutive acts may
    share the full stack (kicker-top + hero + sub + single-chip-right).
    Alternate: chips left/right/center-trio, `titleLow` for full-frame
    subjects (tables, crowds), trios for spec-heavy acts. A reel whose five
    stills are indistinguishable is a template, not a plan — reject it.
17. **Short footage ping-pongs, never wraps or freezes.**
    `loop: 'pingpong'` (core `mediaFrameIndexAt` triangle wave) for any clip
    shorter than its act. Wrap loops show a jump cut; clamps show a dead
    freeze. Motion must never stop and never jump.
18. **Scrims are three-stop knees.** Top: `0.82 → 0.38 → 0` over the title
    zone; bottom: `0 → 0.38 → 0.85`. Two-stop linears read as flat bands,
    never as fades. Same stops in `kit.scrimBottom` and reel-local scrims.
19. **Kickers are Poppins-700, measured, trailing-compensated.** Pills
    auto-size from Skia-measured ink minus one trailing `ls`
    (`kickMeasure`); optical y=9 in the 34px pill. Estimates and Inter
    kickers are banned — the ending-side padding bug came from both.
20. **Full layout by f40, CTA included.** CTA pills fade `[28,40]`, never
    later. A pill still invisible at the mid-act still is a failed ask.

---

## 4. Builders (`examples/kit/kit.mjs` + plan-local)

- `dotKicker(id, label, { y, measure })` — cream pill, saffron dot,
  auto width, optically centered. Replaces plain `kicker` for reels.
- `glassCard(id, { x, y, w, h, value, label, accent, at })` — fill +
  stroke + `backdropBlur: 5`, value/label optically centered as a group
  (value y=26, label y=64 in 96px; group pads 25/23 verified on black).
- `heroDuo(id, l1, l2, accent, size)` — two-line hero, rise-in, dual shadow.
- `centerY(h, size)` — optical label y. `trailingFix(ls)` — `ls/2` shift.
- `chrome()` — tricolor + scaleX progress leaf (drawn last, always on top).

---

## 5. Engine fixes owned by this department

- **Letterspacing measure** (`renderer-skia/src/fonts.ts`): measurer reports
  base advances, spacing excluded; `layout.ts` documents the contract;
  `m4-text` asserts it. Suite 276 → 281 (incl. 5 new backdrop tests).
- **`backdropBlur` radius** (scene `BaseNode` + `Renderer.blurRegion?` +
  compositor hook + Skia native-`ctx.filter` impl with bleed + rounded
  clip). Static per node; rect/rrect/circle; translation-only ancestors;
  radius 0 = no-op; negative/non-finite and wrong node types throw loudly.
- **Stroke on shapes** — verified already working (no fix needed).

## 6. Per-reel checklist

- [ ] Kickers single-line, dot present, sym ±1px (numeric check)
- [ ] Cards: glass 3-layer, group pads balanced ≤3px on black probe
- [ ] Heroes 800 with dual shadow; subs 500 with soft shadow
- [ ] Stack lifted: cards end ≥72px above progress bar
- [ ] Mid-act frames complete (f40), end-card pill scaled in (f440)
- [ ] MP4: 450f H.264 + AAC, moov first, full-decode clean
- [ ] Icons: set ≥5, retinted, probed, license noted
- [ ] Signature element present and named in plan header
- [ ] No dead space in any act still
- [ ] Plan block written BEFORE any JSON (§7: premise/angle/hook/metaphor/beats)
- [ ] Reading floors hold: every line settled ≥ floor (§7), sequential text held as a set
- [ ] At most one type-only act; the centerpiece SHOWS the idea happening (§7 ladder)
- [ ] Sequential moments declared in the plan and built with stagger/sharedFly/keyframes
- [ ] Banned defaults absent or justified in writing: hero-number reflex, centered hero, back-to-back fades, stock chrome
- [ ] Design read written; dials set (variance/motion/density) and honored in the render
- [ ] Every significant motion carries an intent (§8.3); come-from-nowhere/sluggish-landing absent
- [ ] Optical pass done (§8.5); palette/face rotation respected
- [ ] Final creative review answered (6 questions, §8.6) with fixes applied

## 7. Zero-shot taste contract (adapted from latent-spaces/brag)

brag is a Hyperframes launch-video skill (browser renderer, comedy launch
tone) — none of its runtime transfers. What transfers is its *planning
discipline*: premise before composition, readable pacing, specificity, and
gates. Adapted below to X80's JSON-first deterministic engine. Source:
`https://github.com/latent-spaces/brag` (SKILL.md, step-1/step-2, tones).

### 7.1 Premise before composition (the plan block)

No JSON before a written plan block exists (record in meta/decisions).
The block answers, in this order:

1. **Idea** — one sentence: what is this reel *about*?
2. **Angle** — the creative premise: what makes this video specific to
   this topic and no other? If the angle fits any brief, it is not an angle.
3. **Hook (first 1–2s)** — the single invented opening moment. Planned
   before anything else. A word, image, or motion that earns the next
   seconds — never just "scene 1 of the template."
4. **Metaphor** — what visual metaphor or physical behavior best
   communicates the idea? Ask it explicitly before choosing any layout:
   history → artifact/process · science → system/simulation/transformation
   · finance → accumulation/branching · story → environment/journey.
5. **Beats** — 2–4 story beats (hook → reveal → 1–2 sharp moments → landing).
   Each beat names what the viewer *sees happening*, not a title card topic.
6. **Tone/energy** — one dial setting (§7.5) + one freeform phrase.
7. **Sequential moments** — what appears one-by-one (objects, words, cards,
   events)? Declared here, built with stagger/sharedFly/keyframes.
8. **Reading budget** — per act: word count vs duration at §7.3 floors.
   Over budget → cut copy or split the act, never speed up.

### 7.2 Show-ladder (show the idea happening)

Prefer visualizing the actual concept/process/event over title cards that
describe it. Ladder, strongest first:

1. **Live process / simulated event** — the mechanism working on screen
   (pins lifting, river meandering, antibodies chasing, planks replacing).
2. **Diagram of the thing** — a working schematic (hypnogram, cross-section,
   flow), drawn as the art itself.
3. **Artifact / object** — the thing itself, staged (bowl, record, tower).
4. **Type-only** — words as the visual. Allowed, but at most ONE type-only
   act per reel; it must carry the sharpest line in the reel.

A reel of three title cards is a slide deck, not a video — reject it at
plan review even if every frame is pretty.

### 7.3 Reading floors (pacing from motion, never from skimming)

Pace comes from fast entrances, cuts, and motion — never from pulling text
before it can be read. Every line holds fully visible and settled:

- 1–3 word label: **≥ 0.8s settled** (≈24f @30fps).
- Longer line: **≥ 0.3s per word**, minimum ≈1.2s (≈9f/word, min 36f).
- The hook line gets the most time, not the least.
- Sequential text: items may snap fast, but the full set then HOLDS to
  floor (snap accents ≠ readable lines). Every-other-beat minimum.
- Fast-in + hold reads punchy AND legible. Fast-in + gone reads as a glitch.

`checkSpec` enforces the coarse form (words-per-act vs duration); the
planner enforces the fine form (per-line settle windows in bindings).

### 7.4 Restraint + every-frame-designed

- **Restraint:** 2–3 strong visual decisions per reel, intentional. More
  effects ≠ better. Name the decisions in the plan block; cut the rest.
- **Every frame designed:** no filler backgrounds (a flat color with
  nothing on it is a failed frame unless the plan justifies silence),
  no arbitrary decoration, no repeated visual grammar across acts unless
  it IS the concept (repetition with variation > repetition).
- **Specificity test:** cover the palette/faces and ask "which brief is
  this for?" If unanswerable, the reel is generic — replan the metaphor.

### 7.5 Energy dial (defaults, never templates)

Pick one per reel for pacing + transitions + type energy. Freeform direction
may override any row; the dial only sets defaults so choices stay coherent.

| Dial | Pacing | Type energy | Transitions |
|---|---|---|---|
| `quiet` | 3 acts, long holds, silence is a decision | light/medium, generous tracking, mixed case | slow crossfade, holds |
| `clean` | 3–4 acts, comfortable | medium, breathing room | crossfade, clean wipe/slide |
| `confident` | 3 acts, one claim each | heavy or medium, sentence case | hard cut, minimal |
| `loud` | 4–6 acts, some < 2s | ALL CAPS heavy, oversized, tilted words allowed | hard cut, flash, push |
| `grand` | 3–4 acts, dramatic reveals | full-bleed large, caps or heavy | dramatic wipe, scale-in crossfade |
| `smooth` | 4–5 acts, feature-card rhythm | title case medium, clean | slide, smooth wipe |

Rule: no two consecutive acts share a transition unless the dial says
`loud`. A fade followed by a fade is a planning failure, not a style.

### 7.6 Banned defaults (justify in writing or don't ship)

These are the documented convergence reflexes (batch-1/batch-2 reports).
Any of them in a plan needs one written sentence of justification:

- hero-number + tracked-kicker as the emphasis move
- centered hero as the default alignment
- back-to-back fades
- stock progress chrome on a free system (invent orientation or justify)
- flat unmotivated backgrounds filling > 40% of a frame

---

## 8. Planning intelligence (adapted: TasteSkill + Emil Kowalski + Vercel)

Three web-UI taste systems, mined for what transfers to deterministic
video planning. None of their runtimes transfer (no React/Tailwind/
browser/GSAP/WAAPI). What transfers is judgment: read-before-generating,
named motion, optical finishing, review-before-shipping. Sources:
`Leonxlnx/taste-skill` (dials, design read, anti-defaults, pre-flight),
`emilkowalski/skills` (vocabulary, intent, review posture),
`vercel-labs/web-interface-guidelines` (optical alignment, motion purpose,
transform origin). Six concepts only — everything below is one of them.

### 8.1 DESIGN READ (one line, before anything else)

LLM output converges because generation starts before reading. Before dials,
before JSON, write one line:

> Reading this as: \<topic> for \<audience>, with a \<visual> language,
> leaning toward \<X80 strategy>.

Examples:
- "Reading this as: a luxury watch film for collectors, with a cold-precision
  language, leaning toward macro-detail + slow push-ins."
- "Reading this as: a night-market hype reel for scrollers, with a dense
  neon-chaos language, leaning toward staggered card bursts."
If the read is genuinely ambiguous between two directions, ask one question.
Otherwise declare and proceed. The read, not habit, sets every choice below.

### 8.2 CREATIVE DIALS (planning controls, NOT templates)

Per reel, three numbers 1–10, recorded in the plan block. They gate density,
energy, and asymmetry decisions — they never select layouts.

- `designVariance`: 1 = symmetric/grid calm · 10 = deliberate asymmetry.
  Baseline 7. Trust-first/calm briefs 3–4 · premium 6–7 · wild 9–10.
- `motionIntensity`: 1 = still frames + cuts · 10 = continuous choreography.
  Baseline 6. Quiet 2–3 · clean 5–6 · loud 8–10.
- `visualDensity`: 1 = gallery air · 10 = packed field. Baseline 4.
  Never exceed 7 without naming what was cut to pay for it.

Coherence rule (the dials' real job): the reel must *move like its number*.
A motion-8 reel with static frames is broken; a motion-3 reel with springs
everywhere is broken. Density above 7 with no focal hierarchy is clutter,
not richness — cut or rank elements before shipping.

### 8.3 MOTION INTENT (one reason per motion, or delete it)

Every significant binding answers: what does this motion communicate?
Allowed answers: **storytelling · causality · emphasis · spatial
relationship · transformation · rhythm · delight**. "It looked cool" is not
an answer — delete the motion (Emil's remedial step 1, and the single
highest-value review habit). Record intents beside beats in the plan block.

Frequency gate: motifs seen every act (rain, grain, kickers) stay subtle;
one-shot moments may be big. Never animate what the viewer watches most
with the slowest curve — entrances resolve fast (spring, expo-out
interpolate), exits may linger; linear only for tickers/marquees.

### 8.4 MOTION VOCABULARY (reason in these terms; X80 mechanisms mapped)

Name the move before building it. Each maps to an existing mechanism —
vocabulary expands *reasoning*, never the engine:

- **reveal** — uncover via clip/wipe/opacity (clip rects, iris/push-cut).
- **stagger** — cascade with per-index delay (`stagger()`, index × step).
- **morph** — same-structure shape interpolation (`bakeMorph` frames).
- **shared-element** — one element travels across a cut (`sharedFly` overlay).
- **parallax** — layers at different speeds for depth (multi-rate binds).
- **anticipation** — small opposite wind-up before the move (keyframes dip).
- **follow-through** — trailing settle after the main stop (spring tail, lagged second binding).
- **squash & stretch** — scaleX≠scaleY deformation for weight/speed.
- **origin-aware** — growth/spin from its visual anchor (`anchorX/Y` set and
  documented per node; never a centered pop for a corner-anchored thing).
- **asymmetric easing** — accelerate ≠ decelerate (per-segment easing arrays;
  expo-out entrances, gentle exits).
- **orbit / pulse / float** — continuous ambient loops (`motionPath` loops,
  heartbeat keyframes, drift binds). Ambient loops must be ignorable —
  if a loop competes with the message, cut it.
- **typewriter** — character-by-character caption reveal (caption `reveal`).

Review vocabulary: **come-from-nowhere** (scale(0) pops — banned; enter at
0.9–0.97 + opacity), **sluggish landing** (ease-in entrances — banned),
**symmetric in/out** on deliberate moments (flag it).

### 8.5 OPTICAL COMPOSITION (geometry first, eyes last)

Math places; rendered stills judge. After first stills, do an optical pass:

- **Deliberate alignment** — every element aligns to something (edge, axis,
  optical center). No accidental placement; check stills at full size.
- **Optical nudges** — per-family centering offsets (capK table), trailing
  letter-spacing compensation, and ±few-px nudges where perception beats
  geometry (all-caps needs less top room; round shapes need overshoot to
  *look* aligned). Record nudges as numbers, never vibes.
- **Balance in lockups** — icon + text pairings matched in visual weight
  (thin icon next to heavy type needs a stroke/weight step up).
- **Consistency locks** — one corner-radius scale, one accent, one palette
  temperature per reel; mixed systems need a written rule or they get unified.
- **Palette rotation** — never ship the just-used family twice running
  (warm-paper + brass + espresso may appear only with a written brand reason;
  same for any family). Name the family you are *not* using and why.
- **Serif/face discipline** — display serif only with a brief-level reason
  (heritage, editorial, luxury-with-cause); emphasis stays inside the same
  family (weight/italic), never a mixed-family word swap. Rotate display
  faces across consecutive reels.
- **Kicker restraint** — max 2 kickers per 3-act reel unless justified; a
  kicker on every act is eyebrow-templating. Drop it or vary the treatment.

### 8.6 FINAL CREATIVE REVIEW (on rendered stills, fix-or-justify loop)

After stills, before calling anything done, answer in writing:

1. Does the design read as intentional? (Would a viewer believe choices
   were made, or does it look generated?)
2. Is the composition optically balanced? (§8.5 pass done?)
3. Does every motion communicate something? (§8.3 intents hold? Anything
   moving only because the planner knows how → deleted?)
4. Is the reel too predictable? (Same beat shape 3×? Same transition
   twice? Same alignment everywhere?)
5. Is there a stronger visual idea hiding inside the same brief?
6. Copy re-read: every string grammatical, referents clear, no truncation
   marks, no fake-precise numbers the brief doesn't own?

Then update the checklist: plan block (§7.1 + read + dials + intents) —
add `- [ ] Design read written; dials set (variance/motion/density)` and
`- [ ] Final creative review answered (6 questions) with fixes applied`.
