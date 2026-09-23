# X80 — HOW TO USE (planner contract v2)

**Audience:** an external planning AI (ChatGPT or equivalent).
**Deal:** YOU do 100% of the thinking — requirement, story, concept,
reel type, acts, assets — and deliver it as ONE JSON snippet
(`ReelSpec`). The ENGINE compiles that JSON to pixels deterministically:
same JSON → same bytes, no agentic loop, no missing pieces.
Proven: `examples/reelspec/specs/vrindavan2.json` compiles to
byte-identical frames of the shipped reel (5/5 stills, see §8).

**Repo:** `/kaggle/working/x80-video-engine/` · **Canvas:** 540×960, 30fps ·
**Default reel:** 15s = 450 frames, 5 acts · **Measured cost:** ~20s
end-to-end (decode + 5 stills + 450f H264+AAC). Compiler package:
`@x80/reelspec` (`packages/reelspec/src/`).

---

## 1. What you need from the user (ask for all of it, in this order)

1. **REQ** — brief text, goal + exact CTA, duration (default 15s),
   must-include facts (names, dates, numbers).
2. **ASSETS** — footage/stills/audio files (you reference by id).
   Sprite sheets come AFTER your cast list, never before (§6).
3. Never invent what wasn't supplied. Ask when it's missing.

## 2. How to think (in this sequence — do not skip steps)

1. **REQ → STORY.** Compress the brief into 5 beats with one emotion
   each (e.g. wonder → energy → emotion → awe → invitation). Name the
   feeling per beat; the quiet beat is mandatory (contrast makes peaks).
2. **STORY → ART CONCEPT.** One metaphor, one signature shot, one
   palette (bg/ink/accent/accent2/pillBg/pillFg), one face trio
   (display/hero/kicker, §4). Record WHY each fits THIS brief.
3. **CONCEPT → REEL TYPE.** Pick ONE system and obey it end to end:
   - `cinematic` — varied durations, A/B transitions, overlines (no
     pill kickers), kinetic staggered titles, numerals, poster frames,
     tilted cards, takeover finales. For footage-led promos.
   - `stack` — equal beats, hard cuts + whooshes, pill kickers,
     hero/sub stacks, icon chips, badges. For sprite/character reels.
   Mixing systems inside one reel is forbidden.
4. **REEL TYPE → ACTS.** One layout per act from §3. Never the same
   stack twice running. Full layout (incl. CTA) complete by frame ~40
   of every act.
5. **ACTS → ASSETS.** Name every clip/frame/prop id used. Clips shorter
   than their act get `"loop": "pingpong"` (never wrap, never freeze).
6. **SELF-CRITIQUE.** Run §7. A failing plan is revised, never shipped.

## 3. The JSON (single snippet — the ONLY deliverable)

```json
{
  "id": "reel-id-15s",
  "canvas": { "w": 540, "h": 960, "fps": 30 },
  "system": "cinematic",
  "concept": {
    "palette": { "bg": "#0b1026", "ink": "#ffffff", "accent": "#e8b34b",
                 "accent2": "#4ade80", "pillBg": "#f2fbf4", "pillFg": "#0b1020" },
    "faces": { "display": "Inter", "hero": "Inter", "kicker": "Poppins" },
    "signature": "the one shot this reel is remembered by",
    "signatureWhy": "why it fits THIS brief"
  },
  "durations": [60, 100, 90, 80, 120],
  "transitions": [
    { "type": "slide", "params": { "direction": "left" } },
    { "type": "dissolve" },
    { "type": "slide", "params": { "direction": "left" } },
    { "type": "zoom-blur" }
  ],
  "acts": [
    {
      "role": "hook", "duration": 60, "layout": "giant",
      "kicker": { "text": "WEDDINGS • EVENTS • FEASTS", "style": "overline" },
      "title": {
        "lines": [
          { "text": "VRINDAVAN", "fill": "ink" },
          { "text": "LAWNS", "fill": "#e8b34b", "glow": "rgba(232,179,75,0.45)" }
        ],
        "sub": "grand lawns, grand feasts"
      },
      "titleSize": 76, "titleY": 200,
      "subjects": [
        { "kind": "footage", "clip": "clip-sign",
          "tint": { "color": "#3a5a9a", "opacity": 0.12 } }
      ]
    }
  ],
  "audio": { "stingers": "cuts" }
}
```

Field rules (the validator enforces all of this — read it as law):

- `canvas` must be exactly 540×960@30 (the locked reel canvas).
- `durations.length === acts.length`, each ≥ 30 frames.
- `transitions.length === acts.length - 1` (`[]` = hard cuts + whooshes).
- `title.lines`: 1–2 complete lines (0 allowed ONLY for `ticket`,
  whose copy lives in `design.ticket`). No `…`, no mid-word cuts.
  `fill`: `ink` | `accent` | explicit hex; `glow` optional shadow color.
- `kicker`: `{text, style: 'pill'|'overline', y?, at?}` or null.
  Pills auto-size from measured ink (you never set widths).
- Layouts: `giant` (kinetic shout) · `lower3rd` (+ optional
  `design.numeral`) · `poster` (`design.frame`) · `ticket`
  (`design.ticket: {title, sub, x, y, w, h, rotation, rule?}`) ·
  `takeover` (`design.veil`, `cta`, `ctaAt: {y, at, size?, h?, spring?}`,
  `lockup`) · `stack` · `lowtitle`. Unknown layouts throw.
- Subjects: `footage {clip, zoom?, tint?}` · `flipbook {cast, box,
  srcPrefix, order?, rate?, hold?, at?, x, y}` (x accepts
  `{from, to, at}` motion; rests must be integers) ·
  `icons {mode: chip|trio|strip, icons[1–3], at, r?, entranceAt?}` ·
  `emblem {mark, at, r?}` · `ticker {items, y?, at?}` ·
  `props {items: [{src, box, x, y, at?, float?}]}`.
- `titleSize/titleY/subY/subAt`, `badge: false` to drop the badge,
  `audio.stingers: 'cuts'` (whooshes at boundaries) or explicit frames.
- Palette/face values must be real (hex/rgba, vendored families §4).

## 4. Faces doctrine (read twice)

- **display** = titles that SHOUT (kinetic giants, emblem marks).
- **hero** = text that TALKS (subs, pills, quotes).
- **kicker** = labels that TAG (kickers, overlines, numerals, tickers,
  lockups, ticket heads).
- Shipped pairing: Poppins-700 tagging + Inter-800/500 talking.
- Vendored today: Inter 400–800, Poppins 600–800, NotoDev-700 (Hindi),
  Playfair Italic (quotes), **Rozha One (display serif, Latin +
  Devanagari — downloaded, NOT yet wired into any layout: set
  `faces.display: "Rozha"` only after confirming registration in the
  render script, otherwise the engine falls back silently in metrics
  but loudly in spirit — ask the implementer to confirm)**.
- Never one family for everything. Record `pairingWhy` per reel.

## 5. Clipart doctrine (placement + purpose)

Icons are wayfinding, not confetti. Max 3 per act, never over faces
or type, always with an entrance (fade + spring scale, staggered 5f).

| Form | When | Geometry | Purpose |
|---|---|---|---|
| `chip` | one hero object per act | cream disc r62, icon 80px, alternating sides per act | anchor the act's subject |
| `trio` | spec-heavy acts (spreads, lineups) | 3× r40 discs, centered row, staggered | say "range" without words |
| `strip` | editorial beats | raw 72px icons, no discs, baseline row | rhythm strip, not jewelry |
| `props` | fantasy/celebration beats | intrinsic size, float paths | atmosphere with a source |
| `emblem` | scale/brand beats | ring + satellite + initial | the memorable mark |

Discs are cream `#f2fbf4` + hairline ring + soft shadow, always.
Raw icons carry their own shadow. If an act already has a ticker,
band, or takeover veil, it gets ZERO chips — restraint is a layout.

## 6. Sprites (your flow, unchanged)

1. Cast list first (who, doing what, per act, at what scale).
2. User supplies ONE sheet: `examples/sprite-reel/sprite-sheet-TEMPLATE.png`
   (5×5, 256px cells, 6px grid, flat `#FF00FF`, feet y=232, guides
   hidden on export, row = character, cols = cycle).
3. Engine ingests to `Name-0…4.png` (slice → key → trim →
   feet-aligned normalize). Flipbooks reference
   `{cast, box, srcPrefix}`; single props go in `subjects` as `props`.
4. Non-conforming sheets (striped bg, wrong scale, guides left on)
   cost extraction surgery — send them back with the template link.
   Fast path is a property of the SHEET, not the engine.

## 7. Self-critique (all boxes or revise)

- [ ] Every word from the brief/brand/CTA; numbers are the brief's own.
- [ ] No truncation marks, no dropped lines, heroes ≤ 2 lines.
- [ ] One anchor per act; five distinguishable stills.
- [ ] Pills/badges/progress/grain present (or explicitly dropped with WHY).
- [ ] CTA complete by f40; lockup legible; scrims under all footage type.
- [ ] Short clips ping-pong; nothing wraps, nothing freezes mid-act.
- [ ] Chips ≤ 3/act, clear of faces and type.

## 8. Proof + limits

`examples/reelspec/specs/vrindavan2.json` compiles through
`@x80/reelspec` (`validateSpec` → layouts → `assembleTimeline` →
chrome) to **byte-identical frames** of the shipped reel (5/5 stills).
Same JSON (+ same measure) → same plan bytes, locked by 10 package
tests. Invalid JSON throws loudly with the exact field at fault —
a bad plan never renders broken, it doesn't render.

Hard limits (plan around, never against): 540×960@30 only; manual x/y
(no flex); static font instances; gradient stops don't animate; short
clips need `loop: "pingpong"`; decode-all media (~10s footage max);
unknown layouts/subjects/colors throw. The engine guesses nothing —
and neither do you.
