# ASK — Google Fonts API loading for X80 (headless Skia renderer)

This file is a prompt for Claude. Goal: get a concrete implementation plan for
loading Google Fonts via API into our deterministic headless renderer.

## 0. Status correction — the old premise is DISPROVEN, do not re-litigate it

An earlier version of this file claimed Inter/Poppins "paint identically" in
`@napi-rs/canvas` 0.1.65 and asked for a draw-path fix. That was wrong — the
"identical/sparse paint" numbers came from broken test harnesses (malformed
timeline plans that painted nothing; pixel scans of the wrong glyph-span rows).
Verified facts (Node 20, `@napi-rs/canvas` 0.1.65, current `dist/`):

1. All three families register, measure, AND paint distinctly: widths
   Inter 570.7 / Poppins 572.06 / RozhaOne 494.3 at 96px; ink Inter ~18k,
   Poppins ~21k, RozhaOne ~11k px. No FontCollection-cache bug reproduces,
   in any order (canvas-before-registration included).
2. `drawText` (`packages/renderer-skia/src/skia-renderer.ts`, ~line 507)
   appends `, sans-serif` to the same string `fontStringFor` builds
   (`packages/renderer-skia/src/fonts.ts:65`). Harmless: the requested family
   resolves first; identical ink with and without the fallback.
3. Multiple weights under one alias work: registering Inter 400–800 under
   `"Inter"` keeps all 5 weights and resolves per-weight
   (400→556.1px vs 700→570.7px on the same string).
4. End-to-end A/B on a real spec (kicker `Poppins` vs `Inter`, same layout):
   **77/90 frames differ**. `compileReel` → `renderFrame` → `SkiaRenderer`
   renders families differently. Exported MP4s contain real text.
5. Why it *looked* identical: Inter-700 and Poppins-700 are both wide
   geometric sans faces — near-indistinguishable at title/kicker sizes even
   in a correct render. RozhaOne (the visibly distinct face) was never wired
   into any spec (`assets.json` registers it as `"Rozha"`, nothing requests it).

Do NOT propose upgrading `@napi-rs/canvas`, "fixing" the draw string, or
re-diagnosing measure-vs-draw. That work is done and the answer is: it works.

## 1. What X80 actually is (30 seconds)

Server-side deterministic reel renderer, Node 20, headless, no DOM/CSS/network
at render time. Pipeline: `packages/reelspec` (JSON → node tree) →
`packages/core` (timeline/layout) → `packages/renderer-skia`
(`@napi-rs/canvas`/Skia) → `packages/encoding` (MP4). Binding product rule:
**same JSON → same bytes**. Today fonts are 9 hand-downloaded TTFs in
`examples/india-reel/fonts/`, registered at boot via
`registerFontFile(path, family)` → `GlobalFonts.registerFromPath`.

## 2. New requirement: Google Fonts API loading

We are going to need Google Fonts API loading anyway. Requirement:

- A spec may name **any** Google Fonts family + weights (e.g.
  `"faces": {"display": "Rozha One", "weights": [400, 700]}` or per-node
  `fontFamily`/`fontWeight`).
- The engine resolves family/weight/style → **fetches the font files via the
  Google Fonts API at ingest/boot time**, verifies them, caches them on disk,
  pins exact bytes (sha256 manifest), and registers them into `GlobalFonts`.
- **Render stays offline and deterministic**: once cached + pinned, the same
  spec renders the same bytes with no network. Missing cache entry or hash
  mismatch must **fail loudly** (never silent fallback).
- No `<link>`, no browser, no woff2-unless-accepted: only formats
  `registerFromPath`/`register` actually accepts may enter the pipeline
  (state which ones those are — this is a question, not an assumption).

Sketch (improve or replace): `fetch-fonts` step reads spec faces →
`GET` Google Fonts css2/API → picks file URLs per weight/style → downloads →
sha256 → stores `fonts/cache/<family>-<weight>-<style>.ttf` + writes
`fonts.manifest.json` `{family, weight, style, url, sha256}` → boot registers
from cache → `validateSpec` rejects unpinned families.

## 3. Questions for Claude (one authoritative answer each)

1. **Correct server-side fetch path.** Which Google Fonts endpoint gives us
   usable font *files* from Node (css2 with a TTF-yielding UA? `fonts.gstatic`
   direct URLs? the `google/fonts` GitHub repo? the developer API?) — concrete
   URLs/headers, and which file formats result. If woff2 is all that's served,
   state the conversion step (fonttools/wawoff2 or other) explicitly.
2. **Canonical naming rule.** css2 family name vs internal TTF name vs
   registration alias for `registerFromPath`: one rule for what string text
   nodes must carry, given Q1's files.
3. **Manifest + cache design** honoring `same JSON → same bytes`: file layout,
   hash pinning, offline-first render, cache-miss behavior, how a font version
   bump is detected and adopted deliberately (not silently).
4. **Weight/style coverage + fail-loud validation**: what must be fetched per
   family so any requested `fontWeight`/`fontStyle` hits a real file; exact
   boot-time and spec-validate-time checks (which `GlobalFonts` APIs to assert
   on) so a missing family/weight throws instead of falling back.
5. **Where to hook it**: new module (`packages/renderer-skia/src/google-fonts.ts`?)
   vs `studio/server.mjs` boot vs a `fetch-fonts` CLI; keep the render path
   itself offline. Name the files/functions to add or change.
6. **Proof**: wire RozhaOne through the new loader (not hand-copied TTF) and
   show Inter vs Poppins vs RozhaOne differing in one exported frame.

## 4. Constraints the answer must respect

- Node 20, `@napi-rs/canvas` 0.1.65, headless; render path works offline from cache.
- `same JSON → same bytes` is binding: network only at fetch/pin time, never at render.
- No silent fallback anywhere: unregistered family, missing weight, hash mismatch → throw.
- Prefer one authoritative rule per question over options. Short.

## 6. Outcome — implemented 2026-09-23 (do not re-ask)

Claude's answers (Q1–Q6) were implemented verbatim with one addition
(legacy-family allowance, last bullet):

- **Endpoint (Q1):** official Developer API
  `GET https://www.googleapis.com/webfonts/v1/webfonts?key=KEY[&family=...]`.
  Default response already yields static TTF `files` URLs — no css2/UA hack,
  no conversion. Variant rule kept: only weights in the family's own
  `variants` array are fetchable; anything else is a fetch-time throw.
- **Naming (Q2):** alias = API `family` string verbatim (`"Rozha One"`).
  Slug only for disk paths.
- **Code (Q5):** `packages/font-fetch/src/google-fonts.ts` (lookup/variant/slug),
  `packages/font-fetch/src/fetch-fonts.ts` (CLI: `--family --weights --styles
  [--update] [--root] [--key]`; sha256 pin; `--update` required to adopt an
  upstream URL/hash change), `packages/font-fetch/src/index.ts`.
  `studio/server.mjs` boot reads `fonts/manifest.json`, verifies sha256,
  registers (throws on miss/mismatch; no network). `fonts.ts` untouched.
- **Validate (Q4):** `assertPlanFontsPinned(plan)` in `studio/server.mjs`,
  called in `runJob` right after `compileReel`: manifest families require the
  exact `weight-style` combo pinned; legacy `LIB.fonts` families (e.g. Hindi)
  are family-allowed; anything else throws before any frame renders.
- **Cache committed:** `fonts/cache/{inter,poppins}/400..800-normal.ttf`,
  `fonts/cache/rozha-one/400-normal.ttf` (11 files, ~2.8MB) + `fonts/manifest.json`.
- **Proof (Q6):** manifest-only registration renders Inter 700 (488px/6199 ink),
  Poppins 700 (562px/7764), Rozha One 400 (559px/5046) — all distinct.
  Server boot log: `fonts registered: 9` + `manifest fonts registered: 11`.

## 7. Files to read first

- `packages/renderer-skia/src/fonts.ts` — registration, `fontStringFor`, measurer.
- `packages/renderer-skia/src/skia-renderer.ts` (~line 507, `drawText`).
- `studio/server.mjs` (boot section: font loop, `LIB.fonts`) + `studio/assets.json`.
- `packages/reelspec/src/compile.ts` + `packages/core/src/compositor/render.ts` (text path).
- `examples/india-reel/fonts/` — current hand-shipped TTFs.
- `diag-fonts.mjs` — the (now-passing) registration probe; extend, don't redo.
