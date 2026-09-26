# TEST REPORT 2 — 15 Briefs, Zero Visual Direction (2026-09-26)

**Setup:** 15 brand-new briefs (`examples/reelspec/specs/batch2/briefs.json`)
— category + natural language only, no palette/layout/motion/media steering.
Planner chose the entire visual language per brief, explicitly free to use
typography, shapes, 2D motion, 3D, images, footage, icons, diagrams.

**Media decision (logged, deliberate):** all 15 are authored-vector. Available
stock was restaurant B-roll and drought/water stills — wrong subjects for all
15 briefs, and forcing it would have been worse than designed vector.
Mixed-media strength stands proven elsewhere (café/vrindavan reels).

**Pipeline:** 15/15 validated first try after authoring (one systematic
planner-side fix below), MP4s `ftyp`-valid, stills byte-deterministic,
~3–5s per video. One checkSpec flag (r03, legitimate low text, kept).

---

## The batch (all `free` systems, zero preset layouts)

| # | Name | Category | Concept | Motion language |
|---|---|---|---|---|
| 1 | r01-europa | space | probe trajectory → cracked 3D moon → ocean bloom | path-travel, crack reveal, bloom |
| 2 | r02-blue-hour | music | spinning vinyl → setlist → live EQ trio | rotation bed, stagger list, keyframed EQ (mirrored y) |
| 3 | r03-brutalism | architecture | scrolling monument → human dot → UGLY?/HONEST. | monument scroll, verdict bar |
| 4 | r04-hangul | language | scattered jamo → syllable assembly → red seal | stagger assembly, spring stamp |
| 5 | r05-sleep | health | moon arc → hypnogram draw → cycle orbs | path travel, chart draw, fading cycles |
| 6 | r06-wolves | nature | eroded banks → 14 wolves → meandering return | flee keys, upward regrowth, river crossfade |
| 7 | r07-shutdown | business | struck plans → draining runway → green sprout | strike, drain, sprout (near-pure-type) |
| 8 | r08-final-move | mind-sport | board edge → dying clock → glowing MATE | countdown steps, arrow strike, board shake |
| 9 | r09-dreams | kids | rising Z cascade → shape-shifting bubble → dawn | rise cascade, crossfade morph-illusion |
| 10 | r10-capsule | fashion | 5 dots → line-sketch garments → 30-dot math | spring dots, spotlight crossfade, combo grid |
| 11 | r11-cabin | property | snowy night exterior → hearth → qualifying coords | snowfall, glow pulse, ping ripple |
| 12 | r12-plastic | cause | 1M→8M counter → bottle flood → REFILL ripple | stepped counter, stagger flood, ripple rings |
| 13 | r13-permadeath | gaming | YOU DIED flash → death tally → corridor rush | flash, tally steps, perspective rush |
| 14 | r14-theseus | philosophy | ship → gold plank replacement → split + 51/49 vote | stagger replace, sliding split, vote bars |
| 15 | r15-skyborn | data | wheeling sky → constellation date → blinking invite | anchored rotation, stagger draw, caret blink |

Stills: `<id>/frame-{30,90,150}.png` · video: `<id>/<id>-6s.mp4` ·
records: `<id>/{spec,decisions,meta}.json`. 26 stills eyeballed, all 15 covered.

---

## Scores

| Dimension | Verdict |
|---|---|
| Structural variety | **very high** — 15 distinct skeletons, no repeats within round or vs batch 1 |
| Visual variety | **high** — 15 palettes, 7 families; serif/sans/mono roles rotate (Rozha leads jazz + philosophy, Bebas leads sport + gaming, Plex Mono leads terminal + data) |
| Motion variety | **very high** — 15 distinguishable motion languages (right column above) |
| Narrative coherence | **good** — arcs read; weakest: r03 (spec list, not beats — same note as t01 last round) |
| Composition quality | **good, one failure** — r11-a1 cabin vanishes into the night (dark-on-dark, below) |
| Typography hierarchy | **good** — pairings disciplined; numerals overused (below) |
| Use of space | **good** — denser than batch 1; r13-a1 emptiness is intentional arcade minimalism |

## Convergence check (vs batch-1 residue)

| Batch-1 tic | Round 2 status |
|---|---|
| Hero-number formula (~5/12) | **reduced but alive** — numerals appear in 7/15 (r05 steps, r08 clock, r10 5/30, r12 tally, r13 045–047, r15 date, r11 coords) but treatments diversify (stepped crossfade, countdown, dot-grid, tally stack). Pure giant-hero-number drops to ~2. |
| Centering reflex | **persists** — ~8/15 center heroes. Left-edge/split constructions exist (r03, r05, r07-a3, r11, r14) but centering is still the default impulse. |
| Fade monotony | **improved slightly** — 20/30 fades, but iris ×2, slide ×3, none ×3 appear. Still the weakest-varied axis. |
| Stock chrome bar | **overcorrected** — all 15 set `chrome:false`, yet zero invented custom chrome. Information deleted instead of designed. |
| Dead space | **improved** — only r11-a1 fails (below), compositions run denser overall. |

## Genuine failures (planner's log, no excuses)

1. **r11-a1 value collapse (worst still of 30).** Cabin mass (#05080a roof,
   #0a120e hut) on night gradient → invisible; only the window floats.
   checkSpec's contrast rule covers *text-vs-bg hex* — shape-on-shape
   value blindness is uninstrumented. New rule needed: relative-luminance
   check on large adjacent fills, not just type.
2. **r06 river color semantics.** The healed river renders amber/gold —
   reads as lava/wheat, not water. Composition works, semiotics don't.
   Planner picked `accent` without asking what the shape *means*.
3. **3D underused (1/15: r01 moon).** Most briefs were solvable in 2D and
   the planner stayed comfortable. The v3 layer needs briefs that demand
   it — or a planner nudge toward spatial solutions.
4. **r03-a2 + r05-a3 numeral collisions with safe zones** — checked,
   reviewed, kept; but bottom-anchored statements keep landing at y≈890.
   A bottom-anchored composition pattern (not just warnings) would help.

## Engine observations (no features added; notes only)

- **Transition-fragility bite (planner-side, systematic):** 7 dim bindings
  with `inputRange[0] > 0` and zero-start outputs extrapolated negative at
  frame 0 / blend edges and threw loudly mid-encode (r03 bar first, then
  6 more clamped proactively). Batch 1 survived by luck (non-negative
  slopes at low frames). Recommendation: checkSpec rule — *unclamped
  geometry binding whose range starts above frame 0 with a zero/near-zero
  output* → warn. This is planning-intelligence work, filed not built.
- Zero capability gaps in 15 briefs. Nothing asked for couldn't be
  expressed. Second round running with the same result strengthens the
  ADD-pass conclusion: the engine is ahead of the planning.

## Verdict

**Stronger pass than batch 1.** Residue shrank on numbers and dead space,
motion languages hit 15/15 distinct, and the two real failures (r11 value
collapse, river semiotics) are both *judgment* errors — visible to any
reviewer, fixable without engine work. The open item remains taste
intelligence: centering/fade defaults, custom chrome invention, and a
contrast instrument that sees shapes, not just type.
