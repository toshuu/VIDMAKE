# Improvements Needed — LIVE DOC

**Owner:** Planning Department + engine · **Reviewer:** ChatGPT (external check)
**Last updated:** 2026-09-23 · **Subject:** `output/feather30/feather-x80-30s.mp4` (900f; supersedes the 15s cut)
**Status legend:** 🔴 open · 🟡 partial (works, below bar) · 🟢 done (+ date)

Rule: an item moves to 🟢 only with pixels as evidence (still path + numeric
check), never on claim. Re-verify every 🟢 after any engine change.

---

## 1. Review verdicts (user review of the Feather reel, 2026-09-23; re-verified against the 30s cut)

| # | Issue | Owner | Status | Evidence / acceptance |
|---|---|---|---|---|
| 1 | Font game weak — pairing has no character; display/body blur together | plan | 🟢 2026-09-23 | Pairing rationale (30s): Poppins-700 kickers/numbers (geometric character) + Inter-800 heroes/body (neutral muscle) + Noto Sans Devanagari display (brief truth: Hindi-first product). Signature: orbit satellite + morph wave. On screen `output/feather30/` |
| 2 | Google Fonts pipeline unclear — are we even using it? | plan | 🟢 2026-09-23 | `docs/fonts.md` written: css vs css2, subset table, fontTools cmap gate, capK probe table |
| 3 | Text shadows thin; no outlines where needed | plan | 🟢 2026-09-23 | Every hero: black soft + colored glow; strokes on नमस्ते (gold-dark) + Hello (navy sticker). See `frame-270.png`, `frame-450.png` |
| 4 | No animated text highlights | plan+engine | 🟢 2026-09-23 | Sweep bar behind finale hero proven on screen (`output/feather30/frame-810.png`) |
| 5 | No morphing elements | engine | 🟢 2026-09-23 | Baked morphs proven on screen: sine wave ping-pong behind finale pill (`frame-810.png`). Full resampling: wont-fix with reason (§4.3) |
| 6 | Transitions are blends, not element-driven | plan (+engine guardrails) | 🟢 2026-09-23 | Gold chip flies cut 1 proven (`frame-178.png` zoom). Debug note: front-loaded bezier empties short flights — fly/ticker default linear |
| 7 | Ticker oversized, poorly designed | plan | 🟢 2026-09-23 | Ticker v2 on screen (`frame-630.png`): 20px, hairlines, edge fades, globe anchor |
| 8 | Too few quality cliparts/icons | plan | 🟢 2026-09-23 | Shared set: 9 feather SVGs (all probe-ok) + LICENSE-NOTE.txt. 30s reel uses mic + globe + zap + keyed logo on screen |
| 9 | Authoring footguns (orbit pivot, kicker stacking, fade/transition overlap) | engine | 🟢 2026-09-23 | `validateTimeline` in render path: overlap + aFreeze throws. Caught a REAL latent bug (montage aFreeze 57→17). Rotation: documented rule, no auto-warn |

---

## 2. Research

### 2.1 Anthropic Agent Skills (anthropics/skills + open spec)

Format: `SKILL.md` (frontmatter `name`+`description`) + `scripts/` +
`references/` + `assets/`; 3-level progressive disclosure
(metadata always ~100 tokens, body on trigger, resources on demand).
Relevant skill: **`frontend-design`** — approach as a design lead with a
point of view; hero is a thesis; **type pairing carries personality**
(display + body + utility, never the same default pair); **signature
element** (one memorable risk per brief); two-pass plan (tokens → review
against brief → build); anti-default calibration (cream+serif /
black+acid / broadsheet are defaults, not choices); screenshot critique.
Verdict: (a) fold into planning-dept (type-pairing rule, signature rule,
screenshot-critique step) — plan-side, no dependency; (b) author
`skills/x80-reel-design/SKILL.md` in-repo so future sessions/planners
inherit the discipline (this environment can't install external skills,
but it can vendor their method).

### 2.2 GSAP (v3.15, now 100% free incl. MorphSVG/SplitText/Flip/DrawSVG)

Verdict: **no runtime dependency — ever.** GSAP is wall-clock
(requestAnimationFrame); X80 is frame-pure `(plan, frame, fps)`. Mixing
them breaks determinism, the engine's core contract. Adopt techniques:
- **SplitText → stagger builders (plan-side, easy).** X80 already lays
  out per-word/per-char (M4/M8). Add `staggerIn` presets; no library.
- **Flip → shared-element transitions (plan-side, now).** Record pos in
  act A, continue pos in act B, bridge the cut with an overlay leaf
  interpolating x/y/scale across the 12f window. Pure data, no library.
- **MotionPath → `motionPath()` keyframe baker (plan-side, easy).**
  Sample cubic beziers into `anim()` keyframes (the orbit satellite
  already does this by hand — generalize it).
- **MorphSVG → engine feature (proposal, §4.3).** Only GSAP item needing
  engine work: interpolate same-structure path `d` by progress.
- **Easings → nothing to do.** X80 already covers expo/back/elastic/
  bounce/bezier with parity tests; GSAP adds no curves we lack.

### 2.3 Agent Skills — INSTALLED 2026-09-23 (user: "you can definitely")

OpenCode discovers `SKILL.md` dirs from `.opencode/skills/`,
`~/.config/opencode/skills/`, `.claude/skills`, `.agents/skills`
(verified in docs). Installed to BOTH `~/.config/opencode/skills/` and
`x80-video-engine/.opencode/skills/` (name↔dir validated). Note: the
session skill-tool catalog is a startup snapshot, so new skills load via
direct read this session and via the `skill` tool from next session.

| Skill | Source | Use for us |
|---|---|---|
| `frontend-design` | anthropics/skills | Type pairing, signature element, two-pass plan, anti-default calibration → planning-dept rules |
| `canvas-design` | anthropics/skills | Poster taste: philosophy-first, thin fonts, breathing room, no-overlap non-negotiable, refine-don't-add |
| `creating-canvas-video-animations` | siegerts/skill-canvas-video | Direct domain overlap: clarify → phase timeline → build → **validate** (no dead space, 0.5–1s overlaps, safe zones) → iterate → export. Adopt validation checklist verbatim. Conflicts noted: it mandates ms-time + overlapping phases; X80 mandates frame-count + non-overlapping leaves (determinism wins — our constraint is stricter) |

### 2.4 cube-motion.dev — evaluated, NOT integrated

JS UI micro-animation lib: 4 opinionated motions (rise/leave/morph/
reveal) on Web Animations API, zero-dep, DOM-bound, wall-clock. Same
verdict as GSAP: no runtime integration (determinism contract). What we
take: the preset TIMING NUMBERS as dept presets — rise 640ms/70ms
stagger (≈19f/2f @30fps), leave 320ms (≈10f), morph 220ms/130ms lead
(≈7f/4f) — our current timings already rhyme; now they are named presets.
Morph philosophy (shared letters persist, rest blurs in/out) informs the
shared-element pattern (§4.2).

---

## 3. Action plan (ordered)

1. `docs/fonts.md` — Google Fonts pipeline (css vs css2, subset pick,
   fontTools cmap gate, per-family capK probe). *(closes #2)*
2. Signature + pairing pass on next reel: brief → tokens → uniqueness
   review → build (frontend-design two-pass). *(closes #1)*
3. `highlightSweep` + ticker redesign + icon set ≥5 on next reel.
   *(closes #4, #7, #8)*
4. Shared-element fly on next reel (overlay-leaf pattern).
   *(closes #6)*
5. Engine: path-morph proposal → implement or wont-fix. *(closes #5)*
6. Engine: authoring validations (overlap, aFreeze, rotation).
   *(closes #9)*
7. ~~`skills/x80-reel-design/SKILL.md` vendored method.~~ DONE 2026-09-23 —
   better: 3 real skills installed (global + repo `.opencode/skills/`):
   `frontend-design`, `canvas-design`, `creating-canvas-video-animations`.
   Adopt canvas-video validation checklist + cube-motion timing presets
   into planning-dept on next reel.

---

## 4. Engine proposals (for ChatGPT review)

### 4.1 `highlightSweep` — plan-side, no engine change
Marker `rrect` (scaleX 0→1, anchorX 0) sequenced across laid word boxes
(`layoutWords` gives boxes today). Stagger 3f/word. Verdict: build as
kit builder.

### 4.2 Shared-element fly — plan-side, no engine change
Element exists in act A (pos P1) and act B (pos P2). Overlay container
leaf spanning `[cut-6, cut+6]` draws the element at
`interpolate(f, [0,12], [P1, P2])` + scale match; hide both originals in
that window (opacity bindings). Verdict: build as kit pattern + prove
on next reel.

### 4.3 Path morph — needs engine work
New `morph` node or `d`-binding: `{ from: <path d>, to: <path d>,
progress: AnimNumber }`, same command structure required (throw loudly
otherwise); compositor lerps numeric params per frame; optional
auto-resample later. Alternative honest answer: WONT-FIX — Skia canvas
has no path tweening and per-frame JS resampling breaks the perf budget;
use crossfade + scale instead. Verdict: decide after costing resample
at 540×960 (spike ≤2h, else wont-fix with reason).

### 4.4 Authoring validations — engine, cheap, high value
- Overlap: seq-leaf window ∩ transition window for the same frames →
  throw (today: silent double-draw).
- `aFreeze` outside A's actually-shown local range → throw.
- `rotation` on container/group with children → warn path (pivot
  semantics burned us on the orbit; keyframed positions won).
  Verdict: implement in `resolveTimeline`/`drawNode` + tests.

---

## 5. Log

- 2026-09-23 — doc opened from Feather review (8 verdicts). Research done
  (skills spec + frontend-design + GSAP 3.15). Suite 281/281. Next: items
  1–4 on the next reel.
- 2026-09-23 (later) — §6 added: 8 known lackings so the green table can't be misread as 'nothing lacking'.
- 2026-09-23 (later) — doc refresh: subject moved to the 30s cut; items #1/#3 closed with on-screen evidence; all 9 verdicts now 🟢. Awaiting user re-review.
- 2026-09-23 (later) — Feather 30s retry (`output/feather30/feather-x80-30s.mp4`, 900f, 6.9MB): all builders proven on screen. Validator caught a 1-frame double-draw in the new timeline pre-render.
- 2026-09-23 (later) — implemented everything below: fonts.md, kit builders (highlightSweep, ticker v2, motionPath, sharedFly, stagger/rise), 9-icon set (probed), baked morph + validations (suite 288/288). Open items need a REEL to prove: signature pass, highlightSweep/marquee/sharedFly in motion, ticker v2 on screen.
- 2026-09-23 (later) — user challenged skill installation: verified
  OpenCode skill discovery, installed `frontend-design`, `canvas-design`,
  `creating-canvas-video-animations` (global + repo). Evaluated
  cube-motion.dev (timing presets adopted, no runtime). siegerts
  canvas-video workflow conflicts mapped (frame-count + non-overlap win).
  Item 7 done; validation checklist + timing presets fold into
  planning-dept next.

---

## 6. Known lackings (still open — tracked here from 2026-09-23)

These were NOT part of the 9 verdicts. Listed so "all green" never reads
as "nothing lacking".

| # | Lacking | Type | Status |
|---|---|---|---|
| L1 | Full path-morph resampling (different point counts) | engine | Wont-fix with reason (§4.3); baked same-structure morphs only |
| L2 | Rotation-on-container auto-warning | engine | Rule-only (planning-dept #15); no runtime check |
| L3 | GPU backend (all raster is CPU Skia) | engine | Queued; irrelevant to quality (Chrome is CPU raster too) |
| L4 | Streaming media (decode-all breaks past ~10s footage) | engine | Queued; reels use stills + short clips |
| L5 | Flex/grid authoring (manual x/y everywhere) | engine | Queued; kit `column()`/`centerX()` cover reels |
| L6 | Variable-font axes | engine | Queued; static instances vendored instead |
| L7 | 1080p output (reels render 540×960) | plan | Queued; 2× upscale path open, unverified |
| L8 | Taste verdicts are human — ChatGPT/user may still find fonts weak | plan | Open; next re-review decides |

---

## 7. Vrindavan verdicts (user review of the restaurant promo, 2026-09-23)

Same contract as §1: an item moves to 🟢 only with pixels as evidence.
All fixes below are ENGINE-WIDE (shared builders / core), verified on
`output/vrindavan/` but owned by every reel. Rules codified as
planning-dept #16–#20.

| # | Issue | Owner | Status | Evidence / acceptance |
|---|---|---|---|---|
| V1 | Fonts: Inter-only titles, pairing rule never applied (Poppins registered nowhere in reel render scripts) | plan | 🟢 2026-09-23 | Kickers now Poppins-700 in `plan-sprite` builder + planner `compose`; Poppins registered in all 3 reel render scripts; heroes stay Inter-800. On screen `output/vrindavan/frame-45.png` |
| V2 | Kicker pills: estimated widths, wrong ending-side padding (trailing `ls` unaccounted) | plan+engine | 🟢 2026-09-23 | `kickMeasure` (Skia ink minus trailing ls, optical y=9); planner `compose` same contract. `frame-45.png` pads balanced |
| V3 | Bottom/top scrims read as flat bands, not fades | plan | 🟢 2026-09-23 | Three-stop knees (`0.82→0.38→0` top, `0→0.38→0.85` bottom) in reel scrims + `kit.scrimBottom`. `frame-135.png` |
| V4 | Icons: single chip, same spot, no concept (template feel) | plan | 🟢 2026-09-23 | `chipRow` trio builder; chips alternate right/center-trio/top-right/left/left across the five acts; `titleLow` for the tables act. `frame-135.png` (trio), `frame-225.png` (low title) |
| V5 | Short clips wrap-loop (visible jump) inside longer acts | engine | 🟢 2026-09-23 | Core `loop: 'pingpong'` (`mediaFrameIndexAt` triangle wave + 1 new test, suite 12/12 in file); all sub-act clips use it. No jump, no freeze |
| V6 | No planning variety — five identical stacks | plan | 🟢 2026-09-23 | Dept rules #16–#20; per-act layout decisions recorded in plans. Stills 45/135/225/315/405 distinguishable |

Open (not regressions, next iteration): marker-swash highlights need
measured widths (no builder yet); balanced two-line wraps (greedy splits
mid-phrase); GPU/streaming/flex unchanged (L3–L5).

**For external review (ChatGPT):** question is taste, not fidelity —
do the five Vrindavan stills read as one designed reel with act-level
variety, or as a template? Fidelity evidence: 540×960 H264+AAC,
15.00s, ffprobe-clean; planner suite 6/6; core media-mapping 12/12.
