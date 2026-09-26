# TEST PASS — 12-Video Creative Capability Report (2026-09-26)

**Question:** can X80 produce genuinely different designs from different
briefs, or does the planner converge on one visual formula?

**Method:** 12 natural-language briefs → planner-invented concepts → X80 JSON
(all `free`/custom systems, zero preset layouts) → validate + checkSpec +
compile → MP4 (540×960/30fps/180f, video-only) + 3 stills each → eyeball
review (20 stills across all 12). No engine features added during this pass.

**Pipeline result:** 12/12 validated first try, 0 engine errors, ~3–5s per
video, all MP4s `ftyp`-valid, all stills byte-deterministic. One checkSpec
finding (t02, 8 warnings — reviewed below).

---

## The batch

| # | Name | Category | Brief (short) | System / layouts | Free? | Notable capabilities |
|---|---|---|---|---|---|---|
| 1 | t01-silicon | technology | MIRA-1 AI chip launch, blueprint not ad | `schematic` / blueprint, callouts, seal | free | scene3d wire+torus+fov, stagger callouts, mono faces |
| 2 | t02-press | history | Gutenberg's press, Mainz 1440 | `press` / mainz, typecase, folio | free | spring stamps + stagger, anchors, ink particles |
| 3 | t03-descent | science | Ocean zones 200m→4000m dive | `trench` / epi-, meso-, bathypelagic | free | vertical-scroll containers, gradient seas, lure keyframes |
| 4 | t04-morning | product | Kama pour-over film, three words | `still` / empty ×3 | free | restraint: fades + steam only, shape product |
| 5 | t05-snowball | finance | Compound interest for a teenager | `compound` / flatline, bend, escape | free | hand path curve, spring coins, kinetic-radius bloom |
| 6 | t06-diwali | culture | Diwali greeting: flame, rangoli, sky | `deepavali` / first-flame, kolam, aakash | free | flicker keyframes, counter-rotating shapes, glow shadows |
| 7 | t07-kyoto | travel | Kyoto autumn: approach, pass, arrive | `path` / far-gate, passage, arrival | free | 3-speed parallax, push-through gate, dawn color binding |
| 8 | t08-vaccine | education | Immune-system chase | `body` / petri, invasion, aftermath | free | motionPath pursuit, Y paths, spring shield |
| 9 | t09-entropy | abstract | Order visibly losing to chaos | `decay` / grid-perfect, grid-cracking, grid-ash | free | subcomp tiles, stagger decay, heat color binding |
| 10 | t10-keeper | storytelling | Lighthouse keeper, storm to dawn | `beacon` / establishing, lamp-room, dawn | free | sweeping beam (rotation keyframes), blend screen, chapter cards |
| 11 | t11-marathon | sport | KM41 → surge → finish, 2:09:41 | `redline` / the-wall, surge, finish | free | tilted containers, strobe numerals, speed lines, heartbeat |
| 12 | t12-ramen | food | Ramen in 3 steps, end hungry | `broth` / empty-bowl, the-pour, toppings | free | concentric assembly, spring toppings, noodle wave path |

Stills: `<id>/frame-{30,90,150}.png` · video: `<id>/<id>-6s.mp4` ·
planner record: `<id>/spec.json + decisions.json + meta.json` (briefs in
`examples/reelspec/specs/batch/briefs.json`).

---

## Dimension scores (honest, evidence-backed)

| Dimension | Verdict | Evidence |
|---|---|---|
| Structural variety | **high** | 12 distinct strategies (table above); no two share a skeleton |
| Visual variety | **high** | 12 palettes (navy/parchment/abyss/cream/forest-green/night-purple/mist/pastel/charcoal/storm/volts-black/broth-brown); 7 font families in play |
| Originality | **good** | orrery-free fresh ideas: tide-ledger… (prior pass); here: letterpress stamps, dive descent, decay grid, beam chapters all invented per-brief |
| Narrative coherence | **good** | 3-act arcs read (approach→pass→arrive; peace→attack→memory); weakest: t01 (specs act is a list, not a beat) |
| Composition quality | **good–** | 9/12 strong; dead space in t01-a1, t05-a1 (see weaknesses) |
| Typography hierarchy | **good–** | strong pairings throughout, but see convergence note |
| Motion quality | **good** | 8 distinct motion languages (push, stamp, drift, whisper, growth, flicker, parallax, chase, scatter, sweep, punch, assembly) |
| Use of space | **mixed** | t04/t06/t12 master negative space; t01-a1/t05-a1 leave voids |
| Designs differ? | **yes, structurally** | verified still-by-still; see repeated-patterns for the residue |

## Repeated patterns (the convergence residue — planning problem, not engine)

1. **Hero-number + tracked-kicker formula (~5/12).** t01 MIRA-1/NANO//02,
   t03 200M/SUNLIGHT ZONE, t05 $104,857/YEAR 20…, t11 KM 41/THE WALL,
   t12 01/02/03 + label. Genre-natural for data/sport, but it was the
   reflex whenever a fact needed emphasis. The engine supports many
   hierarchies; the planner reached for one.
2. **Centering reflex.** Heroes centered in t02-folio, t04, t06-a3, t08-a3,
   t10, t11-time. Left-edge constructions (t01, t03, t05, t12) prove the
   alternative exists — it just wasn't the default impulse.
3. **Fade monotony at boundaries.** 8/12 transitions are plain fades; only
   t01 (wipe), t07 (slide), t09 (dissolve), t11 (push-cut ×2) vary the cut.
   In-act motion is varied; act boundaries are not.
4. **Default chrome bar (4/12).** t01/t03/t05/t07 keep the stock progress
   bar, stamping an identical bottom edge on otherwise different designs.
5. **Dead space, unflagged.** t01-a1 (void between kicker and hero),
   t05-a1 (flat line + black). checkSpec has overflow/contrast/safe-zone
   rules but no under-fill rule — the tool can't see emptiness.

## Biggest remaining weakness

**Planning taste, not engine power.** The engine rendered everything asked
— 3D wireframes, springs, paths, masks, particles, color-bound skies —
without a single capability gap encountered in 12 briefs. Every weakness
found lives above the engine:

1. Formula fallback under uncertainty (hero-number, centering, fades).
2. `checkSpec` is geometry-hygiene only: it caught nothing about dead
   space, weak arcs (t01 specs-as-list), or boundary monotony — and it
   false-positives on nested text (t02's 8 warnings are letters at local
   y=16 inside stamp blocks, perfectly placed; the checker doesn't resolve
   local→global coordinates).
3. This batch is all-vector; mixed-media (footage + type + 3D) variety —
   an engine strength elsewhere — is untested here.

**Recommended next (planning/intelligence, zero engine work):** a taste
rule-set (cap hero-numeral acts per reel, require one non-centered hero,
ban back-to-back fades, custom chrome on free systems), a `checkSpec`
under-fill heuristic + local-coordinate resolution, and a mixed-media
batch to complete the variety picture.

## Verdict

**X80 passes the test.** Twelve briefs produced twelve structurally
different videos; the residue is planner habit, diagnosable and fixable
without touching the engine. The engine is now ahead of the planning —
which is exactly where an unlimited-engine project wants to be.
