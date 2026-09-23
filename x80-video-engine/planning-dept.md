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
