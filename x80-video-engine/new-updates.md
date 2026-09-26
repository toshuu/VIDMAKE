# New Updates — Unlimited-Engine Pass (2026-09-26)

**Direction:** X80 is an effectively unlimited creative video engine. Any smart
AI sends JSON + material and the engine renders. Presets are convenience
shortcuts, never capability boundaries. This pass increases the AI's ability
to **invent new designs** — it adds no new presets, no new effects, no GPU /
hosting work.

**Seven changes shipped + four novel proof reels. Suite: 352/352 green.**

---

## 1. Free-first guide inversion

**What:** `GENERATION-GUIDE-V2.md` now opens with "X80 is an unlimited creative
engine" and documents `system: "<your-invention>"` / `layout: "free"` as the
default authoring mode. The 7 preset layouts and 2 preset systems moved to
appendix positioning ("reach for a preset only when it is genuinely the best
shape for the beat"). The §1.9 `x/y/…` row now documents the full motion
binding surface (keyframes / path / stagger / spring / color).

**Why:** The engine already allowed invention (`Rule #0`), but the docs led
with presets, so planners defaulted to templates. Novelty is now the
documented default.

**Files:** `GENERATION-GUIDE-V2.md` (header, Rule #0, §§1.4–1.5, §1.9 row).
No validation semantics changed.

**Use:** start every reel like this —

```json
{
  "id": "my-reel-15s",
  "canvas": { "w": 540, "h": 960, "fps": 30 },
  "system": "my-invention",
  "concept": {
    "palette": { "bg": "#0b1026", "ink": "#ffffff", "accent": "#4ade80", "accent2": "#e8b34b", "pillBg": "#f2fbf4", "pillFg": "#0b1020" },
    "faces": { "display": "Inter", "hero": "Inter", "kicker": "Poppins" },
    "signature": "one memorable sentence",
    "signatureWhy": "why this, not the default"
  },
  "durations": [90],
  "transitions": [],
  "acts": [{ "role": "invent", "duration": 90, "layout": "my-layout-name", "badge": false,
    "nodes": [{ "id": "bg", "type": "rect", "width": 540, "height": 960, "x": 0, "y": 0, "fill": "bg" }] }]
}
```

Under a free/custom system **any** layout name composes as free. Unknown node
types / effect names still throw loudly — invent arrangements, never keywords.

---

## 2. Motion systems: keyframes / path / stagger

**What:** three first-class motion forms on top of the existing
interpolate/spring core. No new renderer keywords, no wall-clock, same JSON →
same bytes.

| Form | Meaning | Where it resolves |
|---|---|---|
| `{binding:'keyframes', frames, values, options?}` | Explicit multi-beat track (frames strictly increasing, finite) | Core (`resolveAnimNumber`, same math as multi-stop interpolate) |
| `{binding:'path', axis:'x'\|'y', points, duration, samples?}` | Baked Catmull-Rom curve through 2D points (need ≥ 2 points, integer duration ≥ 2, samples 4–128) | Compile-time → plain interpolate (`compileFreeNode`) |
| `{binding:'stagger', base, index, step}` | Time-shift any binding by `index × step` frames (cascades, choirs) | Compile-time (recurses into base) |

**Why:** single tweens can't express motion *systems* (orbits, arcs, cascades,
multi-beat moves). These compile to the already-proven interpolate core, so
determinism and parity guarantees are inherited, not re-proven.

**Files:**
- `packages/core/src/animation/bindings.ts` (`KeyframesBinding`, resolver +
  loud throws for empty/mismatched stops; `path`/`stagger` reaching core
  throw with a pointer to the compiler instead of silently becoming springs)
- `packages/reelspec/src/motion.ts` (TS helpers: `keyframes()`, `stagger()`,
  `motionPath()` → `{x, y}`, `sharedFly()`)
- `packages/reelspec/src/layouts.ts` (`expandMotionDeep` pre-pass in
  `compileFreeNode`; unknown `binding` names throw)
- `packages/reelspec/src/types.ts` (JSON type docs)

**Use from JSON** (works on `x/y/scaleX/scaleY/rotation/opacity/width/height/
radius/fontSize/letterSpacing/filter.*/backdropBlur` and effect params):

```json
{ "id": "a", "type": "rect", "width": 60, "height": 20, "fill": "accent",
  "x": { "binding": "keyframes", "frames": [0, 30, 59], "values": [32, 300, 120] } }

{ "id": "sat", "type": "circle", "radius": 16, "fill": "accent2",
  "x": { "binding": "path", "axis": "x", "points": [[70, 0], [270, 0], [470, 0]], "duration": 59 },
  "y": { "binding": "path", "axis": "y", "points": [[700, 700], [420, 560], [700, 700]], "duration": 59 } }

{ "id": "c2", "type": "circle", "radius": 26, "fill": "ink",
  "opacity": { "binding": "stagger",
    "base": { "binding": "interpolate", "inputRange": [6, 18], "outputRange": [0, 1] },
    "index": 2, "step": 4 } }
```

**Use from TS/kit builders** (import from `@x80/reelspec`):

```ts
import { keyframes, stagger, motionPath, sharedFly } from '@x80/reelspec';
const k = keyframes([0, 20, 30, 50], [700, 640, 660, 640]); // deterministic
const { x, y } = motionPath([[0,0],[200,0],[200,300]], 59); // Catmull-Rom → {x, y}
const late = stagger({ binding: 'interpolate', inputRange: [0,10], outputRange: [0,1] }, 2, 5);
// overlay fly across the cut at global frame 60: spans [54, 66]
const fly = sharedFly('fly', { x: 60, y: 800 }, { x: 330, y: 800 }, 60, { children: [...] });
```

`sharedFly` implements the FLIP/shared-element pattern as pure data: put the
fragment in top-level `overlays` (bindings address **global** frames) and hide
both act-local originals inside the window.

---

## 3. Shape + mask nodes unblocked

**What:** `shape` and `mask` previously threw `staged for a later milestone`.
Now: `shape` (`star | polygon | arrow | ellipse | line`) renders
deterministically in its local `0,0,w,h` box via the existing `drawPath`
(width/height kinetic, gradient fills, stroke, shadow); `mask` is a clip
container — children paint inside its `width × height` rect, or pass through
when no dims are given (paper-theatre cutouts, reveals, windows).

**Files:** `packages/core/src/scene/types.ts` (`ShapeNode` gains kinetic
`width/height: AnimNumber`, `Fill`, `shadow`; `MaskNode` gains optional
`width/height`), `packages/core/src/compositor/render.ts` (`shapeToPath`,
exported for tests; paint branches), `packages/reelspec/src/types.ts` +
`validate.ts` (`mask` added to node vocab).

**Use:**

```json
{ "id": "seal", "type": "shape", "shape": "star", "width": 120, "height": 120,
  "points": 5, "x": 210, "y": 560, "fill": "accent2",
  "rotation": { "binding": "interpolate", "inputRange": [0, 59], "outputRange": [0, 120] } }

{ "id": "frame", "type": "mask", "width": 476, "height": 560, "x": 32, "y": 180,
  "children": [
    { "id": "sky", "type": "rect", "width": 476, "height": 560, "x": 0, "y": 0, "fill": "#2b1a12" },
    { "id": "sun", "type": "shape", "shape": "ellipse", "width": 160, "height": 160, "x": 150, "y": 60, "fill": "accent2" }
  ] }
```

---

## 4. `checkSpec` — safety net for brave plans

**What:** HyperFrames-`check` concept, X80-pure (no browser, no network).
`validateSpec` rejects *broken* JSON; `checkSpec` warns about *risky but
valid* plans so the AI self-corrects novelty before rendering: far-outside-
canvas geometry, text in chrome/safe-zone edges (20px top, 80px bottom),
low-contrast titles (ratio < 3, hex only), bg-only acts, micro-acts (< 12f)
carrying copy, type-only acts. Silent (`[]`) on sane plans.

**Files:** `packages/reelspec/src/check.ts`, exported from
`packages/reelspec/src/index.ts` as `checkSpec` + `CheckIssue`.

**Use:**

```ts
import { validateSpec, checkSpec, compileReel } from '@x80/reelspec';
const errs = validateSpec(spec);
if (errs.length > 0) throw new Error(errs.join('\n'));
for (const i of checkSpec(spec)) console.log(`${i.path}: ${i.message}`);
// → e.g. "acts[0].nodes[3]: text y=8 inside chrome/safe-zone edge…"
const { plan, decisions, total } = compileReel(spec, { measure: measureFn });
```

Recommended pipeline order: `validateSpec` → `checkSpec` → `compileReel`.
(Not yet wired into the Studio HTTP API — library-level for now.)

---

## 5. `vars` + `subcomps` — reuse without templates

**What:** top-level `vars: {name: string|number}` with `{{name}}`
substitution in **every** string field (titles, fills, src, text) — applied
always, so unknown `{{refs}}` throw loudly instead of rendering literally.
Top-level `subcomps: {name: FreeNode(s)}` — named sub-compositions merged
into `components` at compile (collisions with `components` throw). Same JSON
→ same plan; composition aid, never a boundary.

**Files:** `packages/reelspec/src/types.ts` (`ReelSpec.vars/subcomps`),
`compile.ts` (`applyVars` + merge pre-pass), `validate.ts` (name/shape/
collision checks).

**Use:**

```json
{
  "vars": { "tide": "#4dd4ff" },
  "subcomps": {
    "band": { "id": "band", "type": "rrect", "width": 476, "height": 64, "radius": 12, "fill": "{{tide}}", "opacity": 0.85 }
  },
  "acts": [{ "role": "highwater", "duration": 60, "layout": "tidetable", "badge": false,
    "nodes": [{ "id": "b0", "use": "band", "x": 32, "y": 150 }] }]
}
```

---

## 6. scene3d v2 — real spatial composition on CPU (no GL)

**What:** the declarative `{type:'scene3d'}` stage grows up while staying
CPU-only and deterministic: **depth-sorted** painter's algorithm (far → near,
correct occlusion), **`light{top,side}`** face multipliers, **`fog{color,
near,far}`** (palette-aware mix), new **`disc`** (projected circle),
**`pillar`** (tall box), **`wire`** (edge-only box) kinds alongside
`box/plane/points`. Same JSON shape as v1 — old specs render identically
(defaults reproduce v1 shading; sort only changes multi-object overlap order
toward correctness).

**Files:** `packages/reelspec/src/layouts.ts` (`mixHex`, extended
`expandScene3d`).

**Use:**

```json
{ "id": "stage", "type": "scene3d", "width": 540, "height": 960,
  "camera": { "distance": 750, "tiltX": 18, "tiltY": -16 },
  "light": { "top": 1.25, "side": 0.55 },
  "fog": { "color": "bg", "near": -400, "far": 600 },
  "objects": [
    { "kind": "box", "x": 0, "y": 20, "z": 40, "w": 130, "h": 280, "d": 130, "color": "#4ade80" },
    { "kind": "disc", "x": 0, "y": -190, "z": 0, "r": 46, "color": "accent2" },
    { "kind": "wire", "x": 0, "y": -190, "z": 0, "w": 150, "h": 150, "d": 150, "color": "ink" },
    { "kind": "points", "x": 0, "y": -260, "z": -100, "w": 480, "h": 180, "d": 240, "count": 90, "seed": 21, "color": "#f2fbf4" }
  ] }
```

Animate the stage via parent `skew`/`rotation` bindings. A future GPU path
keeps this JSON shape behind `Renderer.drawScene3d` — specs won't change.

---

## 7. Capability index — intent → real keywords

**What:** `queryCapabilities("trophy court depth plinths")` scores plain words
against the **existing** engine surface and returns real effect / transition /
node / pattern names (`scene3d`, `grain`, `sharedFly`…) with `when` guidance
and examples. 30 entries, zero new presets — it fixes "the AI can't memorize
77 effects" without adding an effect.

**Files:** `packages/reelspec/src/capabilities.ts`, exported as
`queryCapabilities(q, limit?)` + `capabilityIds()`.

**Use:**

```ts
import { queryCapabilities } from '@x80/reelspec';
queryCapabilities('warm analog bloom on lifestyle footage');
// → [{ kind: 'effect', name: 'light-leak', when: 'warm analog bloom…', … }]
queryCapabilities('one element travels across a cut');
// → [{ kind: 'pattern', name: 'motion.sharedFly', … }]
```

---

## 8. Proof — four novel reels (no preset layouts)

Runner: `node examples/unlimited/prove-v2.mjs` → `output/unlimited-v2/<id>/
frame-{30,60,90}.png`. For each reel it asserts: `validateSpec == []`,
`checkSpec` reported, compile-twice byte-identical, `validateTimeline` clean,
each still rendered twice byte-identical. Result: **PROVE-V2 PASS, 12/12
stills deterministic.** Specs live in `examples/reelspec/specs/v2-*.json`
(2 acts × 60f, `fade` 16, `chrome:false`, `grain:false`, no footage/assets —
pure engine).

| Reel | System / layouts | Strategy | New systems exercised |
|---|---|---|---|
| `v2-tide-ledger` | `ledger` / `tidetable` | account rows swell/recede like water | keyframes tide bands, stagger entrances, kinetic type, vars, subcomps, rotating polygon seal |
| `v2-plinth-court` | `court` / `plinth-court` | tilted 3D trophy court, close-up 2nd act | scene3d v2 (light+fog+disc+wire+points, two cameras), path satellite, staggered nothing — depth does the work |
| `v2-paper-theatre` | `theatre` / `proscenium` | paper cutout parade behind a mask | mask stage, shape troupe (star/polygon/arrow/ellipse) with stagger rotation, overlay shared-fly chip across the cut |
| `v2-signal-choir` | `choir` / `switchboard` | dot choir blooming under stars | particles, stagger grid (opacity+scale), keyframed headline beats, subcomp verse block reused across acts |

Stills were eyeballed: four genuinely distinct compositions, none resembling
any preset reel or HyperFrames example.

---

## 9. Verification & suite

- New tests: `packages/core/tests/motion-v2.test.ts` (4: keyframes ≡
  interpolate; loud stops; shape determinism/distinctness; bad geometry) and
  `packages/reelspec/tests/unlimited-v2.test.ts` (13: motion helpers +
  compile expansion + unknown-binding throw; vars/subcomps; checkSpec warn/
  silent; capabilities; shape+mask; scene3d v2 fog/light/disc/wire/sort).
- Full suite green: **352/352** — core+reelspec+effects 232, media+encoding
  24, renderer-skia 90 (goldens untouched), planner 6. `tsc` clean in
  `core` + `reelspec`; `dist` rebuilt.
- Pre-existing drift found and fixed (test-only): 6 `unlimited.test.ts`
  failures from a stale `base()` helper using `nodes: []` (rejected by the
  guide's never-silent-black rule) plus one assertion contradicting its own
  comment. No engine semantics changed.

## 10. Environment notes (ephemeral, re-apply if the container resets)

- `node_modules/@esbuild/linux-x64/bin/esbuild` lost its exec bit →
  `chmod +x` it or vitest fails with `EACCES`/`EPIPE`.
- Root `node_modules/@x80/*` workspace links were missing/broken → symlinked
  all `packages/*` (removed a stray 0-byte `core` file first). Needed for any
  `dist`-based script (`prove-v2.mjs`, benchmarks).
- No network used for the engine; no dependencies added.

## 11. Deliberately NOT done (first pass)

Shader transitions, R3F/GSAP runtimes, new effects or presets, GPU work,
hosting, streaming media, variable fonts, 1080p output. All complexity
without design-space gain. (Studio HTTP wiring for `checkSpec` /
`queryCapabilities` was also deferred here — it landed in the ADD 2 pass
below.)

---

# ADD 2 PASS — THREE.JS + OPEN-ENDED CREATIVE POWER (2026-09-26)

## 12. Three.js audit: decision

Studied Three.js architecture (scene graph, cameras, geometries, curves,
materials/lighting, morphs, particles) plus the deterministic-server
rendering landscape (`headless-three` = three r162 + native `gl` + sharp in
a VM sandbox; `@headless-three/renderer` = native wgpu addon; three math
classes run dependency-free in pure Node).

**Role decided: (1) algorithms/concepts + (2) compile-time geometry/
animation authoring layer. No Three.js runtime, no new dependency.**

- three's math is MIT-licensed and small enough to reimplement natively
  (hierarchy composition, Euler rotations, perspective divide, parametric
  geometries, Lambert shading, 3D Catmull-Rom) — a few hundred lines, zero
  deps, zero version churn, JSON stays source of truth.
- Runtime WebGL rejected with evidence: native GL-driver dependency
  (pixels vary by driver → breaks same-JSON→same-bytes across machines),
  VM-sandbox/DOM-polyfill complexity, and GPU/infra work is out of scope.
- Per-capability verdicts: hierarchies YES, perspective camera YES, richer
  geometry YES, directional light YES, 3D curves (for tubes) YES, morph
  targets NO (covered by path `bakeMorph` + kinetic transforms), materials/
  shadows/shader-particles NO (needs a rasterizer), runtime renderer NO.

Ideal direction from the brief holds exactly:

```
AI → X80 JSON → compile → native 2D scene (+ optional 3D scene compiled
to 2D paths) → deterministic frame data → Skia → MP4
```

## 13. scene3d v3 — what the AI can now express

All CPU, compile-time, deterministic. Old JSON (no `fov`/`dir`/groups/
transforms/new-kinds) renders **byte-identically** — the v2 path runs
verbatim; v3 engages only for new specs.

| Addition | Unlocks | JSON |
|---|---|---|
| `group` nesting (arbitrary depth, T·R·S XYZ Euler) | solar systems, armatures, mobiles, articulated figures | `{kind:'group', ry:-20, children:[…]}` (transform+children only; anything else throws) |
| `camera.fov` 10–120 | true perspective dolly/zoom feel | `"camera": {…, "fov": 55 }` |
| `cylinder` (`r/rTop/rBottom/h/seg`) | columns, pillars, cans | `{kind:'cylinder', w:100, h:220, seg:10}` |
| `cone` (`r/h/seg`) | roofs, funnels, spikes | `{kind:'cone', w:100, h:200}` |
| `sphere` (`r/lat/lon`) | orbs, planets, buds | `{kind:'sphere', r:60, lat:5, lon:10}` |
| `torus` (`R/r/seg/tub`) | rings, arches, halos | `{kind:'torus', w:160, d:48}` |
| `tube` (3D `points` + `r/seg/sides`) | vines, vines-as-signals, cords, paths in space | `{kind:'tube', points:[[x,y,z],…], r:10}` |
| `light.dir` + `ambient` (Lambert) | light as design material | `"light": {dir:[0.3,-0.75,0.6], ambient:0.25}` |
| Per-object `rx/ry/rz/s/sx/sy/sz` | leaning towers, tilted courts, scaled instances | `{kind:'box', ry:25, …}` |

Global painter's sort across the whole stage; fog now keys on view depth.
New loud errors: unknown kinds (**also closed for legacy** — `teapot` used
to silently render as a box), children on non-groups, geometry fields on
groups, bad `fov`/`dir`/`ambient`, non-positive geometry, short tube paths.

**Files:** `packages/reelspec/src/layouts.ts` (v3 math block + `renderScene3dV3`;
v2 function kept verbatim for the legacy path), guide §1.9 scene3d block.

## 14. HyperFrames follow-through (gap closed)

Reviewed the ADD 1 learnings against X80: free composition ✓, capability
discovery ✓, validation ✓, reusable structures ✓, agent authoring ✓. The
one gap was that `checkSpec` + capability discovery lived library-only.
Closed: `POST /api/validate` now also returns `warnings[]` (checkSpec) and
`relating[]` (capability names + when-guidance; `?intent=` query overrides,
else derived from the spec's `concept.signature`). No new endpoints, no
infra. (`studio/server.mjs` validate branch only.)

## 15. Proof — three spatial reels

Runner: `node examples/unlimited/prove-v3.mjs` → `output/unlimited-v3/<id>/
frame-{30,60,90}.png` (validate + checkSpec + compile-twice + stills-twice,
same contract as prove-v2). **PROVE-V3 PASS, 9/9 deterministic.**

| Reel | System | Spatial strategy |
|---|---|---|
| `v3-orrery` | `orrery` | hierarchy-as-choreography: groups three deep (arm → planet → moon), torus orbit, fov 50/58, Lambert sun |
| `v3-colonnade` | `colonnade` | perspective étude: cylinder colonnade + cone roofs receding into fog, torus arch, wire survey frame, keyframed title |
| `v3-vine` | `signal-vine` | growth-as-geometry: tube along a 3D curve with threaded torus rings + sphere buds, grouped crown act |

Stills eyeballed: faceted Lambert shading reads (gold sun, stone columns,
green vine), hierarchies occlude correctly, all three distinct from each
other and from every v2 proof.

## 16. Verification & suite (ADD 2)

- New tests: 4× `scene3d v3 spatial layer` in `unlimited-v2.test.ts`
  (hierarchy identity/shift/nesting; exact face counts per geometry:
  cyl 24 / cone 16 / sphere 50 / torus 60 / tube 40; fov+light change output
  deterministically; 7 loud-error paths).
- Full suite green: **356/356** (was 352; +4 new, zero regressions).
  `tsc` clean; `dist` rebuilt; legacy scene3d specs render identically
  (asserted structurally: no `-f<N>` ids, `-front`/`-top` intact).
- Still deliberately NOT done: runtime GL/wgpu, morph targets, materials/
  shadows, GPU, hosting, streaming, variable fonts.

---

# STUDY + ADAPT — latent-spaces/brag → X80 TASTE (2026-09-26)

Studied `/brag` (SKILL.md, step-1 inspect, step-2 plan, tones; 5 parody
examples surveyed). Copied nothing runtime-related. Adapted the planning
discipline into `planning-dept.md §7` + per-reel checklist: premise-before-
composition plan blocks, show-ladder (live process > diagram > artifact >
type-only, max one type-only act), reading floors (0.8s label / 0.3s word /
hook gets most), sequential-moment contracts, restraint + every-frame rules,
specificity test, energy dial (defaults, never templates), banned defaults
with written-justification rule (hero-number, centering, back-to-back fades,
stock chrome, flat filler). `/api/validate` already returns warnings +
relating (prior pass).

**One instrument added (planning tooling, zero engine change):**
`checkSpec` reading-budget rule — words-per-act (titles + kicker + literal
text nodes; component copy excluded; lone punctuation not counted) vs
duration at §7.3 floors, micro-acts exempt. Fires as a load alarm with
cut-copy-or-split advice.

**Before/after test** (`output/taste-test/`, `prove-taste.mjs`): 3 fresh
briefs (lock mechanism, storm umbrella, phantom jam) with §7.1 plan blocks
(`specs/taste/plans.md`) written before JSON → specs → MP4s + stills.
Result: unjustified hero-numbers 0, centered-default heroes 0, fades 0,
stock chrome 0, unplanned dead space 0 — down on every axis vs the
batch-1/2 baselines. Instruments earned their keep: reading rule caught 1
true positive (fixed by tightening stagger, re-rendered) + 3 reviewed
borderlines; screenshot critique caught 1 real failure (w01 muddy flash +
floating shackle → rebuilt as 3-frame pop + restored lock body).
Full report: `output/taste-test/taste-report.md`.
Suite: 358/358.

---

# STUDY + ADAPT — TASTESKILL + EMIL + VERCEL → §8 (2026-09-26)

Studied three web-UI taste systems for transferable judgment (runtimes
explicitly excluded): TasteSkill (brief inference → one-line design read,
DESIGN_VARIANCE/MOTION_INTENSITY/VISUAL_DENSITY dials + inference tables,
anti-default discipline incl. serif/palette/eyebrow/layout bans, motion-must-
be-motivated, pre-flight), Emil Kowalski skills (animation vocabulary
glossary, purposeful-anticipation-follow-through-frequency-spatial rules,
default-flagging review with delete-first remedial hierarchy, review
rendered output not code), Vercel guidelines (optical ±1px alignment,
deliberate alignment, motion necessity/easing-fit/origin correctness,
lockup balance, consistency locks).

Integrated as **planning-dept §8, six concepts, docs only**: design read
(one line before anything), creative dials 1–10 per reel (planning controls,
never templates, with coherence rule), motion intent (7 allowed reasons;
"looked cool" → delete), X80-mapped motion vocabulary (reveal/stagger/
morph/shared-element/parallax/anticipation/follow-through/squash-stretch/
origin-aware/asymmetric-easing/orbit/pulse/float/typewriter + review terms),
optical composition (deliberate alignment, nudges, lockup balance,
consistency locks, palette rotation, serif/face discipline, kicker
restraint), final creative review (6 questions, fix-or-justify loop).
Checklist extended accordingly. **Instrument:** checkSpec reading-budget
rule (words-per-act vs §7.3 floors; punctuation-aware; micro-acts exempt).

**Fresh 4-topic test** (`output/dials-test/`, `prove-dials.mjs`): luxury
watch 5/3/3, night market 9/9/7, noise-cancelling explainer 5/5/4, memorial
4/2/2 — plan blocks with reads+dials+intents written first
(`specs/dials/plans.md`). Result: 0 unjustified hero-numbers, 0 default
centers, 0 unplanned dead space, 0 stock chrome, 1 justified fade pair;
dials honored on all 4; optical fix applied once (Y4 window); reading rule
fired once (ticker-ambient blind spot, logged). Full comparison:
`output/dials-test/dials-report.md`. Suite: 358/358.
