# X80 Video Engine — Progress Report

**Date:** 2026-09-22
**Spec:** `/kaggle/working/X80_VIDEO_ENGINE_CORE_PLAN.md` (living document, §§53–54)
**Repo:** `/kaggle/working/x80-video-engine/` (`@x80/core` 0.1.0)
**Reference (tests only, never a runtime dep):** Remotion 4.0.526 in `/kaggle/working/my-video/node_modules`

---

## 1. What happened (story so far)

1. **Remotion teardown.** Explored the existing `my-video` project (5 compositions:
   `IphonePromo`, `IphonePromoVertical`, `WaterReel`, `WaterReelV2`, `CafeReel`)
   and reverse-engineered how Remotion works internally: React → Rspack bundle →
   headless Chrome → per-frame CDP screenshots → FFmpeg encode. Documented in
   `my-video/REMOTION_DEEP_DIVE.md` (488 lines). Key finding: the valuable part
   is small (frame-pure timing + `interpolate`/`spring`/`Easing` + timeline
   primitives); the weight is Chromium/Puppeteer/bundling/FFmpeg packaging.
2. **Plan written.** `X80_VIDEO_ENGINE_CORE_PLAN.md` defined a browser-free,
   JSON-first, deterministic core engine with milestones M0–M10, full visual
   parity as the goal (optimize via architecture, not by cutting features).
3. **M0 built.** Monorepo scaffold, all contract types, test + bench runners.
4. **M1 built.** Complete animation core with live golden-parity tests vs the
   installed Remotion copy. Two deep grammar investigations (string
   interpolation, color parsing) were resolved by probing the reference.
5. **M2 built.** Pure timeline resolver (Sequence/Series/Loop/Freeze/Still)
   with formulas verified against the reference sources.
6. **M3 built.** Skia backend (`@x80/renderer-skia`) + backend-agnostic
   compositor + declarative animation bindings. Synthetic 1080×1920 scene,
   12 golden PNGs, Remotion still cross-check exact, 455 fps baseline.
7. **M4 built.** Typography subsystem: font registry, pure wrap/align/
   justify layout, word/char boxes, shaped Devanagari + emoji, Chrome
   ink-box parity (Latin pixel-identical).
8. **M5 + ENCODING built.** `@x80/media` (probe/decode video, frame mapping,
   stereo mixer, WAV) and `@x80/encoding` (in-process H.264/AAC → MP4,
   pitch-verified). Full chain runs with zero browser involvement.
9. **M6 built.** Effects catalog (batches A–D, broad parity) as a modular
   registry + node→temp→effect-pipeline→composite.
10. **M7 built.** Transition nodes + 19-blend registry + Skia applier +
    19 goldens; suite at 220/220.
11. **Plan updated.** Implementation log entries (§54) with status, benchmarks,
    compatibility findings, known issues, and next step.
12. **M8 surveyed.** Spec (§24/§42) + contracts read: no `Caption` type
    exists anywhere in `packages/**` yet; captions will be a new
    `packages/core/src/captions/` module (types + pagination + word
    highlight) layered on the M4 text layout, with compositor wiring and
    Skia pipeline tests/goldens to follow.
13. **Baseline re-verified + persistence secured.** Full suite re-run:
    **220/220 across 17 files** — no drift since M7. All `/tmp` +
    `~/.fonts` artifacts rescued into `/kaggle/working/_rescue/`
    (`fonts/`, `tmp-scripts/`, `full-tmp/`, `RESTORE.md`); no source
    file references paths outside `/kaggle/working/`.
14. **M8 built.** Caption subsystem as a core visual primitive:
    `packages/core/src/captions/` (types, TikTok pagination, max-chars
    segments, SRT parse/serialize, highlight + reveal state) with live
    parity tests vs the installed `@remotion/captions` copy; new
    `CaptionNode` scene type wired into the backend-agnostic compositor
    (per-word highlight, background boxes, word/line/typewriter reveals,
    enter/exit fades) on top of the M4 text layout; Skia pipeline tests
    + 3 golden PNGs; suite at 248/248.
15. **M9 built.** 7 representative compositions in `examples/m9/`
    (talking-head, café reel, explainer, motion-graphics, montage,
    caption-heavy, product promo) — 540×960/30fps, JSON-first, zero new
    engine features. All render end to end (timeline → Skia) with real
    assets (cafe cut2.mp4, 4 stills); 7 golden PNGs; caption-heavy also
    encodes a valid 540×960 H.264 MP4; suite at 257/257.
16. **M10 built (measured, nothing cut).** String-form compile cache:
    `interpolate` strings ~339k → ~1.15M ops/s (**3.4×**); parsed-color
    cache: `interpolateColors` ~369k → ~430–537k ops/s (~1.3×). Suite
    still 257/257 (zero behavior change). Skipped with measurements:
    `indexScene` cache (<0.1%/frame), caption page memo (~12µs/frame).
    All project files verified inside `/kaggle/working/`.

## 2. Milestone status

| Milestone | Status | Evidence |
|---|---|---|
| M0 — Repository + contracts | ✅ Done | Builds clean, `examples/hello-plan.ts` typechecks, bench runner works |
| M1 — Animation parity | ✅ Done | 90 animation tests pass vs live reference, strict tolerance (1e-9 numerics, exact strings) |
| M2 — Timeline parity | ✅ Done | 22 timing tests pass, formulas source-verified |
| M3 — Skia renderer | ✅ Done | 23 renderer tests pass; 12 golden PNGs; Remotion still cross-check exact; 455 fps baseline |
| M4 — Text fidelity | ✅ Done | 10 layout + 14 Skia tests; EN/HI/MR/emoji goldens; Chrome ink-box parity |
| M5 — Video + audio | ✅ Done | probe/decode/mapping; stereo mixer + WAV; 12 media + 4 render tests |
| ENCODING — H.264/AAC MP4 | ✅ Done | in-process webcodecs + Mediabunny mux; pitch-verified; 4 tests |
| M6 — Effects | ✅ Done | 71-effect registry; pipeline + effectLayer; animated params; 11+5 tests; blur 4.3s→68ms |
| M7 — Transitions | ✅ Done | 19-blend registry; core nodes + applier; 19 tests; 19 goldens at frame 45 |
| M8 — Captions + typography | ✅ Done | TikTok pagination + max-chars + SRT vs live reference (exact); CaptionNode + compositor wiring; 21+7 tests; 3 goldens; caption frame overhead ~12µs |
| M9 — Composition examples | ✅ Done | 7 plans in examples/m9 (540×960/30fps, real clip + stills); 7 goldens; caption-heavy → valid H.264 MP4; 9 tests; no new engine features |
| M10 — Optimization | ✅ Done | String cache 3.4×, color cache ~1.3×, 257/257 unchanged; indexScene + caption-memo skipped by measurement; all files in /kaggle/working |
| M9 — Composition examples | ⬜ Queued | 7 representative videos (§43) |
| M10 — Optimization | ⬜ Queued | First target known: cache parsed string forms (~300k ops/s) |

**Totals:** core 9 test files (**160/160 passing**, incl. 21 caption
parity/state tests), media 1 (**12/12**), renderer-skia 7 (**66/66**,
incl. 7 M8 pipeline + 9 M9 composition tests), encoding 1 (**4/4**),
effects 2 (**15/15**) — **257/257 across 20 files**, `tsc --noEmit`
clean in all packages, builds clean.

## 3. Where we are right now

- **Working:** full frame pipeline — timeline → scene → Skia pixels, wrapped/
  shaped multi-script text, video decode + frame mapping, image/SVG
  probing + fit, stereo audio mix → WAV, in-process H.264/AAC → MP4, effects
  pipeline, A/B scene transitions (19 blends), TikTok-style timed
  captions, and 7 representative compositions across content types.
  `(plan, frame, fps)` → deterministic PNGs *and* MP4s, zero browser.
- **Proven:** 257/257 tests; geometry pixel-exact vs Remotion still; Latin
  text ink-box identical to Chrome, Devanagari within 1.2px; 440 Hz tone
  round-trips through AAC; 455 fps M3 baseline; 19 transition goldens;
  caption pagination/SRT byte-identical to `@remotion/captions`; 7
  composition goldens + a 540×960 H.264 MP4 rendered end to end.
- **Not yet started:** nothing — M0–M10 + ENCODING all done.
- **Immediate next action:** none pending. Engine is feature-complete per
  the plan: deterministic browser-free `(plan, frame, fps)` → PNGs + MP4s
  across 7 content types, 257/257 tests, optimized without cutting
  features.

## 3b. M3 deliverable detail

**Files added:**
```text
packages/core/src/animation/bindings.ts   AnimNumber (interpolate/spring, JSON data) + resolver
packages/core/src/compositor/render.ts    renderFrame(): resolve → leaves → draw (backend-agnostic)
packages/core/src/compositor/index.ts
packages/core/src/scene/types.ts          (changed) x/y/scale/rotation/opacity accept AnimNumber
packages/core/src/renderer/types.ts       (changed) optional setBlendMode
packages/renderer-skia/{package.json, tsconfig.json, vitest.config.ts}
packages/renderer-skia/src/skia-renderer.ts  SkiaRenderer (all Renderer methods)
packages/renderer-skia/src/assets.ts         loadImageAsset/preloadImages (decode-once map)
packages/renderer-skia/src/m3-scene.ts       synthetic 1080×1920/30fps/300f plan + fixture
packages/renderer-skia/src/index.ts
packages/renderer-skia/tests/m3-render.test.ts (23 tests)
packages/renderer-skia/tests/golden/frame-{0,10,30,89,100,120,150,160,185,210,299}.png
packages/renderer-skia/tests/golden/remotion-m3compare-140.png
benchmarks/m3-perf.mjs
my-video/src/M3Compare.tsx (+ Composition registration — Remotion-side fixture)
```

**Tests (23):** 5× byte-determinism + 7 goldens; rect motion; spring
half-width scan vs live `spring()` value (±4px); opacity blends at 1/6 and
1/2 (±2–3); nesting windows (frames 89/100/120); loop iterations 0/1 through
pixels; image placement; text-band density; offscreen text; interface units
(clear/rrect/clip/composite/nested-opacity); error paths; group rotation;
Remotion cross-check (bg exact, rect run-start ≤1px, interior exact).

**Benchmarks (`benchmarks/m3-perf.mjs`, node v20.19.0, one reused surface):**

| Metric | Value |
|---|---|
| renderer init | 0.0 ms |
| asset preload (in-memory PNG) | 8.8 ms |
| surface creation (1080×1920) | 0.2 ms |
| total 300 frames | 658.8 ms |
| avg per frame | 2.20 ms (**455 fps**) |
| worst frame (#0, cold JIT) | 10.58 ms |
| timeline resolve share | 2.5% (16.5 ms) |
| skia draw share | 96.9% (638.7 ms) |
| peak RSS | 81.6 MB |

**Sample renders:** `packages/renderer-skia/tests/golden/` — frame-150 shows
the amber circle + pulse dot after seqA expiry; frame-210 shows circle,
cross-hatched test image, "X80 ENGINE" text, and pulse dot.

**Remotion cross-check:** `M3Compare` (bg + red rect, same `interpolate`
motion) rendered via headless Chrome still at frame 140 vs X80 frame 140:
bg `(14,22,38,255)` exact both; red run `412→611` both (delta 0px);
interior `(229,72,77,255)` exact both.

**Known limitations (M3-era — items marked ✅ superseded by M4/M5):**
- ✅ Text/font loading/shaping — fixed in M4 (registry, layout, parity).
- ✅ `Renderer.drawVideoFrame` / video nodes — fixed in M5 (decode + mapping).
- ✅ Image `fit` + intrinsic dims — fixed in M5 (probe + `computeFit`).
- Still true: `crop` == `clip`; `node.mask`, shapes/mask/effectLayer nodes,
  and all `effects` throw explicit staged errors (M6 in progress);
  3D/perspective transforms don't exist in the model.
- Still true: blend `setBlendMode` is optional on the interface; Skia
  implements it.
- Still true: string-shape animation bindings not supported (numeric/spring
  only) — scene props are numeric by type.
- Blend `setBlendMode` is optional on the interface; Skia implements it.
- String-shape animation bindings not supported (numeric/spring only) —
  scene props are numeric by type.

**Verdict: Skia is viable as the primary backend.** Cold init is nil,
2.2 ms/frame leaves ~30ms/frame headroom for effects and text, memory is
flat, and geometry matches the browser pixel-for-pixel on the cross-check.
Continue with Skia for M4; keep the interface frozen so Vello/GPU can be
evaluated later without touching the compositor.

## 3c. M4 deliverable detail (typography)

**Files added/changed:**
```text
packages/core/src/text/{types,layout,index}.ts   TextStyle/Measurer, greedy wrap,
                                                 align/justify, transforms, word/char boxes
packages/core/src/scene/types.ts                 (changed) TextNode.textTransform
packages/core/src/renderer/types.ts              (changed) DrawTextOptions.shadow
packages/core/src/compositor/render.ts           (changed) layout path when
                                                 measureText provided (per-line; per-word
                                                 for justify), legacy path otherwise
packages/renderer-skia/src/fonts.ts              registerFontFile/Buffer,
                                                 ensureSystemFonts, createSkiaMeasurer
                                                 (cached), probeLetterSpacingSupport
packages/renderer-skia/src/skia-renderer.ts      (changed) shadow draw + reset
packages/renderer-skia/tests/fonts/              NotoSans R/B, Devanagari R/B,
                                                 NotoColorEmoji (fixtures)
packages/core/tests/text-layout.test.ts          (10 tests, monospace model)
packages/renderer-skia/tests/m4-text.test.ts     (14 tests)
packages/renderer-skia/tests/golden-text/        script-{english,hindi,marathi,
                                                 mixed,punct}.png, wrap-center.png,
                                                 stroke-shadow.png, x80-m4compare.png,
                                                 remotion-m4compare.png
my-video/src/M4Compare.tsx (+ registration — browser-side fixture)
```

**Results:** conjunct shaping proven (`क्ष` 34.2 < parts 88.8); emoji real
glyphs; weight/family selection works; wrap/align/justify/transforms locked
by pure tests; `letterSpacing` honored by backend (probed, not assumed).
Chrome cross-check (same Noto Sans files via `~/.fonts`): Latin ink box
**pixel-identical** (x=140, w=473, h=62 both); only y differs by line-box
convention (backend `textBaseline 'top'` vs browser line box) — documented,
not a bug. Devanagari width within 1.2px (test allows 3px).

**Known limitations:** no variable-font axes control; `justify` needs
`maxWidth`; hyphenation not implemented (greedy + hard-break only);
`textTransform` is ASCII `toUpperCase/LowerCase`; vertical text not supported.

## 3d. M6 deliverable detail (effects)

**Files added/changed:**
```text
packages/effects/{package.json,tsconfig,vitest.config}
packages/effects/src/types.ts        EffectContext/CtxLike/CanvasLike (standard
                                     Canvas2D structural; works Skia/browser)
packages/effects/src/util.ts         point ops, integral→sliding blur, separable
                                     native ctx.filter fast path, convolve3,
                                     hash/value-noise/fbm, bilinear/nearest
packages/effects/src/fx-color.ts     16 color ops (exact hand-verified math)
packages/effects/src/fx-blur.ts      blur/progressive/zoom/motion/shadow/glow/
                                     chromatic/vignette
packages/effects/src/fx-noise.ts     grain/patterns/weaves/contours/evolve + overlays
packages/effects/src/fx-distort.ts   affine/fisheye/barrel/wave/ripple/displace/
                                     corner-pin/pixelate/dissolve/tear/tv-off
packages/effects/src/fx-light.ts     shine/leak/gradient washes (screen)
packages/effects/src/fx-stylize.ts   outline/emboss/roughen
packages/effects/src/registry.ts     71-name EFFECTS map, region snapshot-restore,
                                     disabled, loud unknown-name errors
packages/effects/tests/effects.test.ts (11 tests)
packages/core/src/compositor/render.ts (changed) effect pipeline (temp surface
                                     → chain → composite), effectLayer grades,
                                     resolveEffectParams (animated params)
packages/core/src/animation/random.ts  (changed) createSeededRng stream
packages/renderer-skia/src/skia-renderer.ts (changed) applyEffect → registry
                                     via napi adapter (+filter)
packages/renderer-skia/tests/m6-pipeline.test.ts (5 tests)
packages/renderer-skia/tests/golden-fx/fx-{vignette-glow,duotone-leak,
                                     chromatic-grain}.png
```

**Design points:** effects run on drawn nodes (leaves), never on undrawn
wrappers; full-frame grades use `effectLayer` (in-place, paint-order);
regions enforced by snapshot-restore (clip paths don't bind pixel ops);
effect params accept `{binding}` values resolved per local frame.

**Perf (1080×1920):** point ops 65–165 ms, native blur 68 ms (was 4.3 s with
naive kernels → integral → sliding-window → `ctx.filter`), fisheye/
corner-pin ~200 ms, full chains (glow/vignette) ~0.9 s. Per-pixel JS loops
are get/putImageData-bound — M10 territory, capabilities intact.

**Deferred with reasons:** shrinkwrap (size-changing, incompatible with the
in-place pipeline), LUT file loading (inline tables only), temporal evolution
(seed/offset per frame, documented), `light-leak-schema` (schema, not effect).

## 3e. M7 deliverable detail (transitions)

**Files added/changed:**
```text
packages/core/src/timeline/types.ts     TransitionNode/TransitionInfo/Mode/Easing
packages/core/src/timeline/resolve.ts   'transition' leaf + eased progress +
                                        freeze/continue frame mapping + validation
packages/core/src/compositor/render.ts  TransitionSpec/TransitionApplier,
                                        renderTransition() (A/B subtree temps)
packages/core/tests/transitions.test.ts (6 tests)
packages/effects/src/transitions.ts     19 blend defs (all 18 targets + none)
packages/effects/src/registry.ts        TRANSITIONS map + applyTransitionByName
packages/effects/tests/transitions.test.ts (9 tests: endpoints, determinism, errors)
packages/renderer-skia/src/skia-renderer.ts  applyTransition +
                                        skiaTransitionApplier export
packages/renderer-skia/tests/m7-transition.test.ts (4 pipeline tests)
packages/renderer-skia/tests/golden-transitions/tr-*.png   19 goldens, frame 45
```

**Design points:** transitions are first-class timeline nodes (not clip
overlap heuristics); each blend is a pure `(ctx, p, params, a, b)` function
with declared defaults; unknown type/direction/axis throw loudly; `none` is
a hard cut; blend implementations live in `@x80/effects` so any backend can
reuse them via `TransitionApplier`.

**Known bug fixed en route:** `CanvasLike` wrappers hid napi's native
canvas handle, so `drawImage` failed and `ctx.filter` blur silently fell
back to the slow path — wrappers now pass the native canvas through.
`clock-wipe` full-circle arc (empty per spec) gets an explicit p≥1
fast path; soft `wipe` at p=1 no longer leaves a feather seam.

## 3f. M8 deliverable detail (captions)

**Files added/changed:**
```text
packages/core/src/captions/types.ts       Caption/TikTokToken/TikTokPage,
                                          HighlightMode/Reveal/TokenState + asserts
packages/core/src/captions/pagination.ts  createTikTokStyleCaptions,
                                          ensureMaxCharactersPerLine,
                                          pageDisplayText, activePage/TokenIndexAt,
                                          tokenProgressAt
packages/core/src/captions/srt.ts         parseSrt/serializeSrt (reference-compatible)
packages/core/src/captions/highlight.ts   tokenStatesAt, visibleTokenIndices,
                                          typewriterCharsForToken,
                                          captionTimeMsAtFrame,
                                          tokenEnterOpacity/pageExitOpacity
packages/core/src/captions/index.ts
packages/core/src/scene/types.ts          (changed) CaptionNode (JSON-first timed
                                          captions: combineMs/breakSilenceMs/
                                          maxCharsPerLine/highlight/reveal/style/
                                          boxes/fades)
packages/core/src/compositor/render.ts    (changed) paintCaption(): page lookup at
                                          frame→ms, M4 layout, laid-word→token
                                          mapping, per-word fill/boxes/reveal/
                                          typewriter/fades
packages/core/src/index.ts                (changed) export captions
packages/core/tests/captions.test.ts      (21 tests: 5 TikTok parity + 2 max-chars
                                          parity + 3 SRT parity/round-trip + 11
                                          helpers/state/validation)
packages/renderer-skia/tests/m8-captions.test.ts (7 pipeline tests)
packages/renderer-skia/tests/golden-captions/caption-{phrase,word-reveal,
                                          typewriter}.png
```

**Design points:** no transcription inside (Whisper stays outside — engine
takes timed JSON); TikTok pagination + max-chars + SRT semantics cloned
from the installed `@remotion/captions` copy (live deep-equality tests,
not docs); `highlight: 'word'` colors only the active token while
`'phrase'` colors all spoken tokens; reveals hide the future
(`word-reveal`/`line-reveal`/`typewriter`, typewriter slices graphemes
proportionally); empty captions draw nothing; all bad inputs throw loudly.

**Perf:** pagination of 60 words costs ~12µs (82k paginations/s),
`activePageIndexAt` runs at ~17.7M ops/s — caption overhead per frame is
negligible; multi-word tokens and hard-broken pieces map to laid words by
quota consumption with clamping, so counts can never desync.

**Known bug fixed en route:** pipeline tests initially rendered nothing —
the test plan lacked an explicit timeline `{kind:'leaf', ref:'cap'}` (the
default bare sequence yields zero leaves) and the stale `@x80/core` dist
didn't know the `caption` node type; both fixed (timeline added, rebuilt).

## 3g. M9 deliverable detail (compositions)

**Files added/changed:**
```text
examples/m9/shared.ts            W/H/FPS/FONT, leaf/seq/words/plan builders
examples/m9/{talking-head,cafe-reel,explainer,motion-graphics,
  montage,caption-heavy,product-promo}.ts   7 VideoPlan builders (540×960/30fps)
examples/m9/{index,tsconfig}.json           barrel + typecheck config
packages/renderer-skia/tests/m9-compositions.test.ts (9 tests: 7 determinism +
                                          goldens + H.264 MP4 proof)
packages/renderer-skia/tests/golden-m9/    7 golden PNGs (one per composition)
packages/renderer-skia/package.json        (changed) @x80/encoding devDep for MP4 proof
```

**Coverage per composition:** talking-head (portrait shapes, sliding
lower-third, word captions); café reel (real cut2.mp4 360×640 clip +
vignette grade + slide transition to still card); explainer (sequenced
kinetic beats + phrase captions); motion-graphics (spring hero, rotating
orbit group, animated glow param, marquee); montage (3 cover-fit stills +
push-cut transitions + caption strip); caption-heavy (typewriter word
captions, maxChars 18, level bars — also the 60-frame MP4 source);
product promo (spring card/price, slide-in features, iris to end card).

**Answer to §43's question:** yes — one declarative engine produces all
7 content types with zero new engine features; every primitive used
existed at M8. Real assets decode in-pipeline (H.264 clip, 4 JPEGs).

**Known issues:** montage/café still leaves bracket transitions so no
frame goes black (transition windows only blend); MP4 proof writes to
`tmpdir()` (test artifact, not repo); goldens are 540×960 (~1.4MB for
photo-heavy frames).

## 3h. M10 deliverable detail (optimization)

**Files changed:**
```text
packages/core/src/animation/interpolate.ts  compileStringForm() + bounded
                                            cache (1000 entries, NUL-joined
                                            key, successes only)
packages/core/src/animation/colors.ts       COLOR_CACHE in interpolateColors
                                            (2000 entries, successes only;
                                            processColor itself untouched)
```

**Measured results (`benchmarks/run.mjs`, node v20.19.0):**
```text
interpolate string px:   339k → 1,150k ops/s   (3.4×, stable across runs)
interpolateColors:       369k → 430–537k ops/s (~1.3×, run variance noted)
all other ops:           unchanged (scalar ~7M, spring ~1.2M, bezier ~3M,
                         random ~13M, resolve ~780k)
suite:                   257/257 before and after (zero behavior change)
frame baseline (m3-perf): 2.27 → 2.41 ms/frame (noise; M3 scene barely
                         touches string/color paths, as expected)
```

**Method note:** the first post-change bench showed no gain — the runner
imports `packages/core/dist`, which was stale. Rebuilt, re-measured,
then confirmed with a repeat run. Lesson recorded: always rebuild dist
before trusting `run.mjs`.

**Deliberately skipped (measured, not assumed):**
- `indexScene` WeakMap — 10-node walk ≈ 1–2µs vs 2.27ms frames (<0.1%).
- Caption page memo — pagination costs ~12µs/frame (0.5%).
- Per-frame `layoutText` memo — style objects are rebuilt per frame, so
  content keys would cost more than they save.
- Effect-loop rewrites (the real 50–200ms cost at 1080×1920) — fidelity
  risk without a pixel-diff harness beyond goldens; left for future work
  with the same measure-first rule.

**Cache safety:** content-keyed pure functions (same input → same
output), bounded with clear-on-full (same pattern as the M4 measure
cache), successes only (loud errors fire identically), shared records
never mutated by callers.

## 4. Key decisions locked in (do not revisit without a log entry)

- Frame-pure deterministic timing; integer `frame` + `fps` only.
- Remotion-compatible semantics, X80-owned implementation (no fork, no copy).
- Reference quirks cloned deliberately: over-damped spring branch, 8-bit alpha
  quantization (`0.5` → `0.502`), strict color/string grammars, raw-prop
  Sequence visibility window, `Math.ceil` float end threshold.
- JSON-first scene graph; React is a possible future authoring layer only.
- Backend-agnostic `Renderer` interface; Skia first, GPU/Vello/Pixi later.
- Encoder is a separate subsystem — frames must be correct first.

## 5. How to verify (run this)

```bash
cd /kaggle/working/x80-video-engine
npx vitest run   # expect: 20 files, 257/257 tests, all pass
node benchmarks/run.mjs       # core math throughput (see §6)
node benchmarks/m3-perf.mjs   # full-frame render baseline (see §3b)
```

## 6. Latest benchmark snapshot (node v20.19.0)

| Op | Throughput |
|---|---|
| interpolate scalar | ~6.5–7.5M ops/s |
| interpolate multi-stop + easing | ~1.7–2.0M ops/s |
| interpolate string | **~1.15M ops/s** (was ~339k — M10 string-form cache, 3.4×) |
| spring (memoized) | ~1.0–1.2M ops/s |
| Easing.bezier | ~3.0M ops/s |
| interpolateColors | **~430–537k ops/s** (was ~369k — M10 color cache, ~1.3×) |
| random seeded | ~12.7–15.7M ops/s |
| resolveTimeline + collectLeaves | ~730–830k ops/s |
| caption paginate (60 words) | ~82k paginations/s (~12µs/op) |
| caption activePageIndexAt | ~17.7M ops/s |

Takeaway: core math is not the bottleneck — a 300-frame reel resolves in
single-digit milliseconds. Full-frame render baseline (§3b): 2.20 ms/frame
(455 fps), 81.6 MB peak RSS, draw 96.9% / resolve 2.5%.

## 7. Risks / open questions

1. All milestones M0–M10 + ENCODING are done. If future work needs more
   speed, the measured backlog is: per-pixel JS effect loops (~50–200
   ms/frame at 1080×1920, needs a pixel-diff harness first), then
   nothing else above noise — core math, resolve, pagination, and lookup
   paths are all sub-frame-budget with headroom.
2. Full-frame per-pixel JS loops (fisheye/barrel/corner-pin/wave) run
   ~50–200 ms/frame at 1080×1920 — schedule M10 work accordingly;
   do NOT cut effects to fix it.
3. `center left`-style unobserved origin orderings throw by design; revisit if
   real content hits them (they will fail loudly, not silently).
4. Variable-font axes control is unimplemented (M4 limitation); revisit if M9
   compositions need it.

## 8. Premium capability upgrade (2026-09-22, engine-wide)

**Why:** iPhone v1 looked cheap; audit vs `my-video` reels + Remotion
Agent Skills (`remotion-markup`: Google Fonts, SFX, timing, rough-notation
highlights) showed the gap was ~40% missing primitives (radial glow, cheap
grain, blur-as-paint, animated color, kinetic type, premium faces) and ~60%
plan taste (silence, no grain, linear moves, flat fills).

**Engine changes (all tested, suite 257 → 271/271):**
- `FillInput` gains radial + conic gradients (`renderer/types.ts`;
  bbox-relative CSS semantics; conic staged if backend lacks it).
- `{binding:'color'}` keyframed fills via strict `interpolateColors`
  grammar (`animation/bindings.ts`; gradient stops stay static by design).
- Kinetic `fontSize`/`letterSpacing` on text nodes (re-laid-out per frame,
  loud on non-positive sizes).
- `createGrainTile()` (`renderer-skia/texture.ts`): seeded tile baked once
  (~90 ms), drifted via x/y bindings under `overlay` — animated grain at
  ~1 ms/frame instead of 100 ms+ pixel loops.
- Vendored faces: Inter 400/700, Playfair Italic 500/700
  (`examples/iphone-reel/fonts/`); Liberation kept as fallback.
- Contract doc: `assetInfo` dims must describe decoded handles (proxy
  cover-crop bug found via café reel: container dims + proxy frames =
  half-black video).

**Proof (both 540×960/30fps/300f, H.264+AAC verified):**
- `output/iphone-premium/`: Inter, grain, whoosh SFX on act cuts.
- `output/cafe-premium/`: original design (no reference), real clips,
  alpha scrims, hairline gradients, marker swash, Playfair quote,
  Ken Burns, music bed + 3 whooshes.

**Still not Remotion (honest):** no GPU (blur/grain cost CPU), no
streaming media (decode-all breaks past ~10s footage), no flex/grid,
no webfonts/variable axes, no ecosystem (Lottie/Three/Tailwind), fills
beyond color + shadow geometry not animatable.

## 9. Groundwork sprint (2026-09-22, answers "any new reel?")

CSS survey across all my-video comps ranked every used property; the
entire gap was three items — now closed:
- Declarative `filter` (blur/brightness/contrast/saturate/grayscale) on
  every node, native `ctx.filter` (no pixel loops), loud on bad values.
- Rounded `clip` radius (overflow:hidden + border-radius equivalent).
- `examples/kit/kit.mjs`: tokens (APPLE/WARM), EASE/SPRING, column()/
  centerX() layout helpers, kicker/rule/marker/scrim/glow/grain/pill
  builders, audioBed() finishing chain.
- Proof: `examples/kit/plan-water.mjs` ("Every drop counts", stills +
  Ken Burns + marker + glows + trickle bed) built kit-only, zero
  reference — premium on first render.
- Chrome conformance: `my-video/GroundworkCompare` (radial glow + blur
  + gradients + gradient text + box-shadow + kicker) vs X80 twin —
  mean abs diff 3.94/255; bar/card regions 0.1 (exact); text 13–15
  (Arial-vs-Liberation glyphs), glow 9.1 (blur kernels). Locked as
  `renderer-skia/tests/conformance.test.ts` with the Chrome PNG golden.

Suite: 276/276. Still honestly missing: GPU (irrelevant — headless
Chrome is CPU raster too), streaming media, flex/grid authoring,
variable fonts, ecosystem libs, animated paint beyond color.

## 10. Apple-to-apple human verdict (2026-09-22)
Same Google plan in Remotion and X80 renders visually identical
bit-to-bit (diffs 3.0–9.5, rasterization only; springs bit-identical).
Author disliked both versions: objection is to visual elements/taste,
not rendering quality or engine. Engine parity closed; remaining work
is art direction (reference/style tests/new topic) — next session.
