# X80 Video Engine — Outcomes

**Date:** 2026-09-22 · **Repo:** `/kaggle/working/x80-video-engine/` · **Reference (tests only):** Remotion 4.0.526 in `/kaggle/working/my-video/`
**Suite:** 276/276 across 25 files · `tsc` clean · builds clean

This document is the complete record: what was built, what is good, what is
bad, what is lacking, why — and the evidence behind each claim.

---

## 1. What the engine is

A deterministic, browser-free, JSON-first short-form video compositor.
`(VideoPlan, frame, fps, assets)` → PNGs + H.264/AAC MP4s. Same motion
philosophy as Remotion (frame-pure timing, `interpolate`/`spring`/`Easing`,
timeline primitives), native 2D rendering instead of headless Chrome.

```
VideoPlan (JSON data)
      ↓
resolveTimeline  →  visible leaves (refs + localFrames)
      ↓
scene lookup     →  declarative nodes + bindings @ localFrame
      ↓
Renderer         →  pixels (Skia today; GPU/Vello later)
      ↓
Encoder          →  H.264/AAC MP4 (in-process, no FFmpeg CLI)
```

Milestones M0–M10 + ENCODING complete: contracts, animation parity (1e-9
numerics, exact strings vs live reference), timeline parity, Skia backend,
typography (Chrome ink-box parity on Latin), video/audio decode + mix,
in-process encoding, 71-effect registry, 19 transitions, TikTok captions,
7 composition examples, measured optimization (string-form cache 3.4×,
color cache ~1.3×, zero behavior change).

---

## 2. Reels produced (all 540×960 / 30fps / 300f / 10s, H.264+AAC verified)

| Reel | Path | How | Verdict |
|---|---|---|---|
| iPhone v1 (cheap) | `output/iphone-reel/` | Hand-built, flat fills, toy shapes | ❌ Cheap: small type, navy+yellow, hollow phone, caption boxes over CTA |
| iPhone premium | `output/iphone-premium/` | 1:1 port of `IphonePromoVertical`, Inter, grain, whooshes | ✅ Premium |
| Café premium | `output/cafe-premium/` | Original design, real clips, scrims, marker, Playfair quote, music+whooshes | ✅ Premium |
| Water proof | `output/water-proof/` | **Kit-only**, new topic, no reference; stills + Ken Burns + glows + trickle bed | ✅ Premium on first render |

Plans: `examples/iphone-reel/plan*.mjs`, `examples/kit/plan-water.mjs`,
shared kit `examples/kit/kit.mjs`. Renders: adjacent `render-*.mjs`.

---

## 3. What is GOOD (with evidence)

- **Motion math is 1:1 with Remotion.** `interpolate` (numbers, strings,
  tuples, multi-keyframes, per-segment easing arrays, `perceptual-scale`,
  `posterize`), `interpolateColors`, `spring` (incl. over-damped branch),
  full `Easing` incl. `bezier`/`spring`. Locked by 90+ live parity tests.
- **Timing/delivery is solid.** Frame-pure determinism (frame-90
  byte-identical across runs, repeatedly verified). MP4s always valid
  (`ftyp`, ffprobe-clean H.264 + AAC, exact 10.00 s durations).
- **Geometry is pixel-exact vs Chrome.** M3 cross-check (bg + rect:
  exact). New `GroundworkCompare` conformance: same scene in headless
  Chrome vs X80 → mean diff **3.9/255**; gradient bar and shadowed card
  regions **0.1 (exact)**. Locked as `conformance.test.ts` with the
  Chrome PNG golden — drift fails the build.
- **The used CSS subset is closed.** Survey of every style property in all
  5 my-video compositions ranked the gap at exactly three items — all now
  implemented: linear/**radial**/**conic** gradients, **shape shadows**,
  declarative **`filter`** (blur/grades, native), **rounded clips**,
  **animated fills**, **kinetic type**, 16 blend modes, gradient text.
- **Speed is good except pixel loops.** Effect-free frames ~17 ms;
  full 300f encodes in 7–16 s. Core math (6–15M ops/s), resolve (~800k/s),
  captions (~12 µs/frame) are all sub-budget.
- **Audio is real.** Decode → `mixTracks` (placement, volume, trims,
  fades) → AAC mux, pitch-verified (440 Hz round-trip). Reels ship beds
  + stingers.
- **Taste is now shared code.** `kit.mjs` (tokens, type scale, column/
  center layout helpers, kicker/rule/marker/scrim/glow/grain/pill
  builders, `audioBed()`) + `HANDBOOK §2.5b` recipes. New reels compose
  proven parts instead of reinventing taste.

---

## 4. What is BAD (with causes)

- **iPhone v1 looked cheap — mostly plan taste, partly engine.** Flat navy
  + yellow palette, 96 px hero (reference: 190–230 px), unspaced kickers,
  toy phone/camera from flat rects, chunky per-word caption boxes stomping
  the CTA, linear motion where the reference uses expo-out springs, and
  total silence. The engine lacked gradients/shadows then; the plan made
  every wrong choice available.
- **Pixel-effect loops are slow.** `glow` frames cost ~135–150 ms at
  540×960 (vs ~17 ms effect-free) — per-pixel JS over `get/putImageData`.
  Mitigated by recipe (native `ctx.filter`, baked grain tile, declarative
  scrims), not fixed at the root.
- **Footguns existed and bit:** (a) containers + children both listed as
  leaves = double-draw (breaks container fades) — now one-leaf-per-act;
  (b) `assetInfo` reporting container dims for proxy decodes = half-black
  video — now documented (dims must describe decoded handles);
  (c) `npm run` benchmarks importing stale `dist` — always rebuild first.
- **Chrome-conformance residual:** text regions differ ~13–15/255
  (Arial-vs-Liberation glyphs) and blurs ~9 (kernel falloff). Same family,
  same tolerance class as M4's Devanagari 1.2 px — not defects.

---

## 5. What is LACKING (and why — architectural, not taste)

1. **GPU acceleration — but headless Chrome is CPU raster too**, so this
   is not the Remotion gap. It only matters for heavy pixel loops
   (blur/grain at 1080×1920). Recipes route around it.
2. **Streaming media.** Decode-all-frames breaks past ~10 s of footage
   (173 s ambience = 35 GB RGBA). Short-form reels are fine; long-form is
   a real ceiling. Remotion streams.
3. **Layout engine.** No flex/grid — manual x/y + kit `column()`/`centerX()`.
   Costs authoring effort, never pixels.
4. **Fonts.** Registered files only; no webfonts, no variable axes.
   Inter + Playfair vendored; SF Pro can't ship.
5. **Animated paint.** Only opacity/transforms/geometry animate; fills
   animate as whole colors (`{binding:'color'}`), gradient *stops* and
   shadow geometry don't. Breathing glows via node opacity instead.
6. **Masks/shapes staged** (`shape`/`mask` throw), path gradients throw,
   no 3D/perspective, no motion blur, no backdrop-filter.
7. **Ecosystem.** No Lottie/Three.js/Tailwind/React reuse — zero by design.
8. **Captions need timed input.** No transcription inside (Whisper stays
   outside); pagination/SRT semantics are byte-identical to the reference.

---

## 6. Key numbers

| Metric | Value |
|---|---|
| Suite | 276/276, 25 files (257 baseline + 19 new) |
| M3 frame baseline | 2.2 ms/frame, 455 fps, 81.6 MB RSS |
| String/color caches (M10) | 3.4× / ~1.3×, behavior unchanged |
| Glow-bound frame | ~135–150 ms vs ~17 ms effect-free |
| 300f encodes | 7–16 s (no pixel loops) / ~34 s (glow-heavy) |
| Chrome conformance | mean 3.9/255; bar/card 0.1; text ~14; glow ~9 |
| Grain tile bake | ~90 ms once → ~1 ms/frame drifted |
| Audio | 440 Hz AAC round-trip; beds+stingers in all premium reels |

---

## 7. How to verify

```bash
cd /kaggle/working/x80-video-engine
npm ci && npm run build
npx vitest run            # per-package via workspaces: expect 276/276
node examples/iphone-reel/render-premium.mjs   # → output/iphone-premium/
node examples/iphone-reel/render-cafe.mjs      # → output/cafe-premium/
node examples/kit/render-water.mjs             # → output/water-proof/
ffprobe -v error -show_entries stream=codec_name,width,height,duration \
  -of default=noprint_wrappers=1 output/water-proof/water-proof-10s.mp4
```

Chrome twin (needs `my-video/node_modules` + headless shell, both cached):
```bash
cd /kaggle/working/my-video
npx remotion still GroundworkCompare --frame=0 output-gw-chrome.png
```

---

## 8. Bottom line

Within the short-form reel domain — footage, type, gradients, glows,
grain, transitions, captions, sound — **no new reel has a structural
reason to come out cheaper than Remotion's**: the used CSS subset is
implemented, pixel parity vs Chrome is measured and locked, and taste
lives in a shared kit. The remaining failure mode is plan authorship,
reviewable against the kit. The remaining engine ceilings are streaming
media, GPU-heavy pixel work, layout authoring, variable fonts, and the
third-party ecosystem — all declared, none silent.

---

## 9. User observations (chronological — each drove the work above)

1. **"The video looks cheap… does not match Remotion quality at all.
   Video processing was smooth. Are we sure we copied all styles
   Remotion offers? Why no premiumness?"** → Honest audit (§4): the
   engine had cloned timing, never CSS styling; plus bargain plan
   choices. Led to the gradient/shadow extension + faithful iPhone port.
2. **"Make video using the same assets, so I can see time taken when
   assets are ready."** → Assets-ready bench: prep 2.4 ms, render
   98.5 ms/frame avg (10.1 fps), encode 33.9 s (8.9 fps); per-act split
   proved glow frames (~135–150 ms) vs effect-free (~17 ms).
3. **"Does premiumization work for other reels too, or just copying
   Remotion for iPhone?"** → Answered by building, not asserting: the
   original-design café reel (no reference) with real footage.
4. **"Capability-wise are we 1:1 head-to-head with Remotion? The café
   premium is not as good as the Remotion one."** → Answered no, with a
   receipt table from `CafeReel.tsx` (radial glows, film grain, music
   bed, vignette — each mapped to have/missing).
5. **"Match/beat it across the whole engine, not one reel. Font, color,
   texture game is weak — fix it. Look into skills files Remotion
   has."** → Engine-wide upgrade (§8 of PROGRESS): radial/conic
   gradients, animated fills, kinetic type, vendored Inter + Playfair,
   zero-cost grain tile, audio beds. Skills found
   (`remotion-dev/skills`,esp. `remotion-markup`) — codified taste, now
   mirrored in `HANDBOOK §2.5b` and the kit.
6. **"No more reel-by-reel mimicry — do the groundwork. Remotion has no
   GPU either. Are you really sure any new reel matches?"** → Correct on
   both counts (headless Chrome is CPU raster too). Answer: CSS survey
   → 3-item gap → all closed → Chrome conformance locked (3.9/255) →
   kit-only water proof reel. Assurance by construction (§8 above).
7. **"Include my observations and what were our tests."** → This
   section, and §10 below.

---

## 10. Test inventory (what the 276 tests actually check)

| File | Tests | What it proves |
|---|---|---|
| `core/captions.test.ts` | 21 | TikTok pagination + max-chars + SRT byte-identical to `@remotion/captions`; highlight/reveal state math |
| `core/interpolate.test.ts` | ~30 | Scalar/multi-stop/string interpolation vs live reference, easing arrays, perceptual-scale, posterize |
| `core/easing-colors.test.ts` | ~20 | All easings, bezier, `interpolateColors` strict grammar (incl. alpha quantization quirks) |
| `core/spring.test.ts` | ~15 | Spring physics incl. over-damped branch vs reference |
| `core/interpolate-strings.test.ts` | ~10 | String-shape grammar parity (units, colors-in-strings) |
| `core/timeline.test.ts` | ~22 | Sequence/Series/Loop/Freeze/Still formulas source-verified |
| `core/transitions.test.ts` | 6 | Transition progress easing, freeze/continue frame mapping |
| `core/text-layout.test.ts` | 10 | Wrap/align/justify/transforms on a monospace model |
| `core/media-mapping.test.ts` | ~12 | Video frame-index mapping (trim/loop/rate) |
| `effects/effects.test.ts` | 11 | 71-effect registry math (hand-verified color ops, blur paths) |
| `effects/transitions.test.ts` | 9 | 19 blend endpoints, determinism, loud errors |
| `encoding/encode.test.ts` | 4 | H.264/AAC mux, 440 Hz pitch round-trip |
| `media/media.test.ts` | 12 | Probe/decode, audio PCM, mix placement/gain/trims |
| `renderer-skia/m3-render.test.ts` | 23 | Frame determinism, goldens, Remotion still cross-check (exact) |
| `renderer-skia/m4-text.test.ts` | 14 | Shaping, emoji, weights, Chrome ink-box parity |
| `renderer-skia/m5-media.test.ts` | 6 | Video/image pipeline end to end |
| `renderer-skia/m6-pipeline.test.ts` | 5 | Effect pipeline + grades on real pixels |
| `renderer-skia/m7-transition.test.ts` | 4 | A/B transition applier + 19 goldens |
| `renderer-skia/m8-captions.test.ts` | 7 | Caption pipeline + 3 goldens |
| `renderer-skia/m9-compositions.test.ts` | 9 | 7 compositions deterministic + H.264 proof |
| `renderer-skia/gradient-fill.test.ts` | 8 | Linear/radial/conic determinism, angle sensitivity, loud specs, gradient text, shape shadow |
| `renderer-skia/kinetic-fill.test.ts` | 5 | Animated fills + kinetic type through compositor, bad-fontSize throws |
| `renderer-skia/filter-clip.test.ts` | 4 | Native blur spread/grades, bad filters throw, rounded clip cuts corners |
| `renderer-skia/texture.test.ts` | 3 | Grain tile determinism, mid-gray mean, loud options |
| `renderer-skia/conformance.test.ts` | 1 | **Headless-Chrome still vs X80 twin** (mean < 6, bar/card < 1.5, glow < 12) |

Conventions every file follows: determinism (render twice → equal
bytes), golden PNGs for visual locks, loud errors over silent guesses,
live parity against the installed reference where semantics are cloned.
