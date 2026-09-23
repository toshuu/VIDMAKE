# X80 GENERATION GUIDE — Spec Reel JSON + Sprite-Sheet JSON

Feed this file to a planning AI (Claude). It contains the **entire engine
power surface**: every field, every allowed value, and the validation rules
that reject bad JSON loudly. Same JSON (+ same assets/fonts) → same MP4 bytes.

Pipeline: this JSON → `POST /api/validate` (self-check) →
`POST /api/render` → `GET /api/jobs/<id>` → MP4.
Canvas is locked: **540×960 @ 30fps**. A 15s reel = 450 frames.

Rule #0 for generated JSON: **never invent a field, kind, layout, style, or
transition name.** Anything unknown throws and the job fails. If you need a
new capability, ask for a new JSON option + engine pairing instead.

---

# PART A — SPEC REEL JSON

## A.1 Top-level object

| Field | Type | Required | Rules |
|---|---|---|---|
| `id` | string | yes | Non-empty. Used in the MP4 filename. Slug style (`india-fest-15s`). |
| `canvas` | `{w,h,fps}` | yes | Must be exactly `{w:540,h:960,fps:30}`. Locked. |
| `system` | string | yes | `"cinematic"` or `"stack"`. Kicker style must match (pill→stack, overline→cinematic). |
| `concept` | object | yes | Palette + faces + signature (below). |
| `durations` | number[] | yes | Length **=== acts.length**. Each an integer **≥ 30** frames. Sum = reel length. |
| `transitions` | object[] | yes | Length **=== acts.length − 1** (single-act reel → `[]`). `[]` with several acts = hard cuts + whooshes. |
| `acts` | object[] | yes | Non-empty array. |
| `audio` | object | no | `{stingers: 'cuts' \| number[]}`. `'cuts'` = whoosh on every act cut; array = explicit frames. |

## A.2 `concept` — palette, faces, signature

```json
"concept": {
  "palette": {
    "bg": "#0b1020", "ink": "#f4f1ea", "accent": "#e8b34b",
    "accent2": "#4dd4ff", "pillBg": "#10141f", "pillFg": "#f3d9a0"
  },
  "faces": { "display": "Rozha One", "hero": "Inter", "kicker": "Bebas Neue" },
  "signature": "dandiya dancer freeze-frame",
  "signatureWhy": "the one shot this reel is remembered by"
}
```

- Colors: `#rrggbb`, `#rrggbbaa`, or `rgba(...)`. Title `fill` additionally
  accepts the aliases `"ink"` and `"accent"`.
- `faces`: **verbatim Google Fonts family names** (`"Rozha One"`, never
  `"RozhaOne"`). `display` = giant titles, `hero` = subtitles/body,
  `kicker` = pills/numerals/overlines. **Any family auto-installs** from
  Google Fonts at job start if not cached (pinned by sha256, offline after).
- `signature` / `signatureWhy`: planning notes, recorded in decisions.
  No pixels depend on them.

## A.3 Acts

| Field | Type | Rules |
|---|---|---|
| `role` | string | `hook` \| `proof` \| `proof2` \| `scale` \| `cta`. Planning label only (recorded, never changes pixels). Recommended arc order as listed. |
| `duration` | number | Frames for this act (mirrored in top-level `durations`). |
| `layout` | string | One of §A.4. Unknown → throw. |
| `kicker` | object \| null | §A.5. `null` = none. |
| `title` | object | §A.6. |
| `center` | boolean | Centered title treatment (poster/takeover). |
| `titleSize` / `titleMaxW` / `titleY` | number | Title px size, max width, y. Defaults per layout. |
| `subY` / `subAt` | number | Subtitle y and entrance frame. |
| `subjects` | object[] | §A.7. Drawn behind type. |
| `cta` / `ctaAt` | string / object | CTA pill (takeover): `{y, at:[from,to], size?, h?, spring?}`. |
| `lockup` | string \| null | Brand line under the pill (takeover). |
| `badge` | boolean | `n/5` badge. Default **true**; set `false` to hide. |
| `design` | object | Layout extras: `numeral` (lower3rd ghost number string), `frame` (poster hairline bool), `ticket` (ticket card object), `veil` (takeover rising veil bool), `mark` (emblem mark string). |

## A.4 Layouts (7)

| Layout | System | Renders | Key fields |
|---|---|---|---|
| `giant` | cinematic | Huge kinetic title, kicker overline, sub | `title`, `titleY`, subjects |
| `lower3rd` | cinematic | Lower-band kinetic title + ghost numeral | `title`, `design.numeral` |
| `poster` | cinematic | Centered kinetic title, optional hairline frame | `center:true`, `design.frame`, `title` |
| `ticket` | either | Stub-card (`design.ticket`); **`title.lines` must be `[]`** | `design.ticket:{title,sub,x,y,w,h,rotation,rule?}` (`rule` = `[color1,color2]` gradient) |
| `takeover` | cinematic | Veil + kinetic title + CTA pill + lockup | `cta`, `ctaAt`, `lockup`, `design.veil` |
| `stack` | stack | Kicker pill + hero title + sub, subjects | `title`, `kicker.style:'pill'` |
| `lowtitle` | stack | Big hero title low + sub | `titleSize`, `titleY`, `subY` |

## A.5 Kicker

```json
"kicker": { "text": "INDIA ITSELF", "style": "pill", "face": "Bebas Neue", "y": 84, "at": 6, "x": 32 }
```

- `style`: `"pill"` (stack) or `"overline"` (cinematic). Must match `system`.
- `face`: optional family override (verbatim Google Fonts name). Weight is
  fixed 700 by the layout.
- `y` (pill y / overline y, default 84/96), `at` (entrance frame, default
  4–6), `x` (pill x, default 32).

## A.6 Title

```json
"title": { "face": "Rozha One", "size": 64,
  "lines": [
    { "text": "INDIA IS SERIOUSLY", "fill": "ink" },
    { "text": "A LAND OF FESTIVALS", "fill": "accent", "face": "Anton", "weight": 400,
      "glow": "rgba(232,179,75,0.45)" }
  ],
  "sub": "LOVING INDIA", "subY": 330 }
```

- `lines`: **1–2** items (`ticket` layout: must be `[]`). No `…`/`...` in text.
- `fill`: `"ink"` \| `"accent"` \| hex \| rgba.
- `glow`: optional shadow color (accent fills default to accent glow).
- Per-text font: line `face` wins → title `face` → slot face
  (`display` for kinetic/giant titles, `hero` for stack/lowtitle titles,
  `kicker` for pills, `hero` for sub). `weight`: integer 1–1000 (layout
  defaults: titles 800, kicker 700, sub 500). Unshipped weights render
  nearest-weight with a visible `font.*` warning in job decisions.
- `sub`: string (may be `''`). Always on the `hero` face, weight 500.
- Auto-fit shrinks oversized titles to `titleMaxW`; never wraps or clips.

## A.7 Subjects (behind type)

```json
"subjects": [
  { "kind": "bg", "style": "night", "top": "#1a2340", "mid": "#0b1020", "glow": "rgba(232,179,75,0.25)" },
  { "kind": "flipbook", "cast": "DandiyaWoman", "srcPrefix": "india-festival/",
    "box": [380, 540], "order": [0,1,2,3], "rate": 6, "x": 80, "y": 300, "scale": 1 },
  { "kind": "props", "items": [{ "src": "india-festival/diya", "box": [120,120], "x": 40, "y": 700, "float": true }] }
]
```

| Kind | Key params |
|---|---|
| `bg` | `style`: `night` (gradient+glow) \| `flat`. `color` (flat) or `top`/`mid`/`glow` (night). |
| `flipbook` | `cast`: row name (aliases resolve, §B.4). `srcPrefix`: sheet name + `/`. `box`: `[w,h]` or `{w,h}`. `order`: frame indices (repeats = ping-pong), `rate`: frames per sprite-frame. `hold`: `true` = play once + hold last; `N` = extend final pose N frames/cycle; omitted = loop. `at`: start frame. `x`: number or `{from,to,at:[f1,f2]}` slide; `y`: number; `scale`. |
| `icons` | `mode`: `chip` (disc) \| `trio` (3-disc row) \| `strip` (raw, no discs). `icons`: 1–3 asset ids. `srcPrefix?`. `at`: `[x,y]` anchor (bare number = entrance timing). `r`: disc radius. `entranceAt`. |
| `footage` | `clip`: clip id (`clip-sign`, `clip-buffet`, `clip-tables`, `clip-entry`, `clip-gods`). `zoom`: `[from,to]` Ken Burns (default `[1,1.07]`). `tint`: `{color, opacity}`. |
| `emblem` | `mark`: brand initial. `at`: `[x,y]`. `r?`. |
| `ticker` | `items`: string. `y?`, `at?`. |
| `props` | `items`: `{src, box, x, y, at?, float?}` — `float`: `true` or `[dx,dy]` drift. (`float:false` = static.) |

Shipped library (`GET /api/assets`): casts `india-festival/DandiyaWoman,
DholMan, DiyaWoman, TempleDancer, FestivalWoman`, `spr3/*`, `spr2/*`, `k2/*`;
props `india-festival/diya, dandiya, dhol, flowers, lantern`, `ic-*` icons;
clips listed above. Anything uploaded via §B appears here too.

## A.8 Transitions

`transitions[i]` sits between act *i* and *i+1*: `{ "type": "slide", "params": { "direction": "left" } }`.
`{ "type": "none" }` or `[]` (multi-act) = hard cut.

| Type | Params |
|---|---|
| `none`, `fade`, `dissolve` | `dissolve`: `{seed:int}` (default 7) |
| `slide`, `wipe`, `push-cut`, `swap` | `{direction: left\|right\|up\|down}`; `wipe` adds `{softness: 0..1}` |
| `flip` | `{axis: x\|y}` |
| `iris` | `{shape: "circle"}` (only circle implemented) |
| `clock-wipe`, `book-flip`, `zoom-blur`, `dreamy-zoom`, `film-burn`, `linear-blur`, `zoom-in-out`, `ripple`, `crosswarp`, `cross-zoom` | `{}` (defaults) |

## A.9 Validation (job fails listing these — self-check before sending)

Locked canvas · durations length = acts · each ≥ 30 · transitions length =
acts−1 · palette colors valid · faces non-empty · layouts known · title 1–2
lines (ticket: 0) · no truncation marks · fills valid · face strings non-empty ·
weights int 1–1000 · subject kinds/fields per §A.7 · unknown font family at
render time throws (auto-fetch attempted first).

## A.10 Spec examples (3)

**Ex.1 — Festival cinematic, 3 acts, shipped assets + custom display face:**
```json
{
  "id": "india-fest-15s",
  "canvas": { "w": 540, "h": 960, "fps": 30 },
  "system": "cinematic",
  "concept": {
    "palette": { "bg": "#0b1020", "ink": "#f4f1ea", "accent": "#e8b34b", "accent2": "#4dd4ff", "pillBg": "#10141f", "pillFg": "#f3d9a0" },
    "faces": { "display": "Rozha One", "hero": "Inter", "kicker": "Bebas Neue" },
    "signature": "dandiya dancer freeze-frame", "signatureWhy": "peak motion moment"
  },
  "durations": [150, 150, 150],
  "transitions": [{ "type": "slide", "params": { "direction": "left" } }, { "type": "fade" }],
  "acts": [
    { "role": "hook", "duration": 150, "layout": "giant",
      "kicker": { "text": "INDIA ITSELF", "style": "overline" },
      "title": { "lines": [{ "text": "LAND OF", "fill": "ink" }, { "text": "FESTIVALS", "fill": "accent" }], "sub": "A 15 SECOND TOUR" },
      "subjects": [
        { "kind": "bg", "style": "night" },
        { "kind": "flipbook", "cast": "DandiyaWoman", "srcPrefix": "india-festival/", "box": [380, 540], "order": [0, 1, 2, 3], "rate": 6, "x": 80, "y": 320 }
      ] },
    { "role": "proof", "duration": 150, "layout": "lower3rd",
      "kicker": { "text": "NAVRATRI NIGHTS", "style": "overline" },
      "title": { "lines": [{ "text": "NINE NIGHTS", "fill": "ink" }, { "text": "ONE RHYTHM", "fill": "accent" }], "sub": "DANDIYA • GARBA • DHOL" },
      "design": { "numeral": "1" },
      "subjects": [
        { "kind": "bg", "style": "night" },
        { "kind": "props", "items": [{ "src": "india-festival/diya", "box": [120, 120], "x": 40, "y": 700, "float": true }] }
      ] },
    { "role": "cta", "duration": 150, "layout": "takeover",
      "kicker": null,
      "title": { "lines": [{ "text": "COME", "fill": "ink" }, { "text": "CELEBRATE", "fill": "accent" }], "sub": "" },
      "cta": "FOLLOW FOR MORE", "ctaAt": { "y": 560, "at": [52, 64] }, "lockup": "INCREDIBLE INDIA",
      "subjects": [{ "kind": "bg", "style": "night" }] }
  ],
  "audio": { "stingers": "cuts" }
}
```

**Ex.2 — Minimal stack reel, per-line face, icons:**
```json
{
  "id": "chai-stack-15s",
  "canvas": { "w": 540, "h": 960, "fps": 30 },
  "system": "stack",
  "concept": {
    "palette": { "bg": "#14100b", "ink": "#faf3e6", "accent": "#d98a3d", "accent2": "#7dd4a8", "pillBg": "#1c150e", "pillFg": "#f3d9a0" },
    "faces": { "display": "Anton", "hero": "Inter", "kicker": "Inter" },
    "signature": "steam icons trio", "signatureWhy": "product ritual close-up"
  },
  "durations": [225, 225],
  "transitions": [{ "type": "dissolve", "params": { "seed": 7 } }],
  "acts": [
    { "role": "hook", "duration": 225, "layout": "stack", "badge": false,
      "kicker": { "text": "MORNING RITUAL", "style": "pill" },
      "title": { "lines": [{ "text": "CUTTING", "fill": "ink", "face": "Anton" }, { "text": "CHAI", "fill": "accent", "face": "Anton" }], "sub": "BREWED SLOW, SERVED HOT" },
      "subjects": [
        { "kind": "bg", "style": "flat", "color": "#14100b" },
        { "kind": "icons", "mode": "trio", "icons": ["ic-cloche", "ic-chef", "ic-menu"], "at": [270, 620], "r": 54 }
      ] },
    { "role": "cta", "duration": 225, "layout": "lowtitle",
      "kicker": { "text": "TODAY ONLY", "style": "pill" },
      "title": { "lines": [{ "text": "FIRST CUP", "fill": "ink" }, { "text": "HALF PRICE", "fill": "accent" }], "sub": "SHOW THIS REEL" },
      "subjects": [{ "kind": "bg", "style": "flat", "color": "#14100b" }] }
  ]
}
```

**Ex.3 — Ticket stub + auto-fetched display face:**
```json
{
  "id": "pass-ticket-15s",
  "canvas": { "w": 540, "h": 960, "fps": 30 },
  "system": "cinematic",
  "concept": {
    "palette": { "bg": "#0a0f1e", "ink": "#eef2fa", "accent": "#e8b34b", "accent2": "#4dd4ff", "pillBg": "#10141f", "pillFg": "#f3d9a0" },
    "faces": { "display": "Bebas Neue", "hero": "Inter", "kicker": "Inter" },
    "signature": "rotated ticket stub", "signatureWhy": "event pass reveal"
  },
  "durations": [450],
  "transitions": [],
  "acts": [
    { "role": "scale", "duration": 450, "layout": "ticket",
      "kicker": { "text": "ADMIT ONE", "style": "overline" },
      "title": { "lines": [], "sub": "" },
      "design": { "ticket": { "title": "FESTIVAL PASS", "sub": "DEC 12 • GATE 4", "x": 60, "y": 380, "w": 420, "h": 200, "rotation": -6, "rule": ["#e8b34b", "#4dd4ff"] } },
      "subjects": [
        { "kind": "bg", "style": "night" },
        { "kind": "flipbook", "cast": "TempleDancer", "srcPrefix": "india-festival/", "box": [300, 420], "order": [0, 1, 2], "rate": 8, "hold": true, "x": 120, "y": 120 }
      ] }
  ],
  "audio": { "stingers": "cuts" }
}
```

---

# PART B — SPRITE-SHEET (SPREADSHEET) JSON GUIDE

Upload art once via `POST /api/sheets`, then reference it from specs (§A.7).
Response: `{ ok:true, casts:[...], props:[...] }` — use those ids verbatim
(or bare row/cell names; aliases resolve).

## B.1 Template geometry (hard rules)

- Grid: **5 columns** × **1–8 rows**. `cell` default **256** px, `grid`
  (gutter) default **6** px, background default **magenta `[255,0,255]`**.
- Required size = `6 + 5×(cell+6)` wide × `6 + rows×(cell+6)` tall
  (default 5-col: 1316 × e.g. 1316 for 5 rows). **Any-size PNG is accepted —
  it is auto-scaled** to the template (smoothing off). Keep cells on the grid.
- `POST /api/sheets` body:

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | yes | Letters/digits/`-`/`_` only. Arbitrary — matching is by row/cell label, never by this. |
| `rows` | array \| `{rows:[...]}` | yes | 1–8 entries (a pasted `{"rows":[...]}` wrapper is tolerated). |
| `rows[].name` | string | yes | Row label (becomes cast id / prop filename base). |
| `rows[].kind` | string | yes | `"props"` = prop row (single-frame art); anything else (e.g. `"cast"`) = flipbook cast row. |
| `rows[].cells` | string[] | props only | Per-cell prop names. Omitted → `<row>-0 … <row>-4`. |
| `pngBase64` | string | yes | PNG bytes, base64. |
| `cell` / `grid` | number | no | Defaults 256 / 6. |
| `bg` | `[r,g,b]` | no | Default `[255,0,255]` (keyed out with tolerance 24). |

## B.2 Cast rows vs prop rows

- **Cast row** (`kind: "cast"` or any non-`props` value): each of the 5 cells
  becomes a flipbook frame. Registered id: `<sheet>/<row>` with frames
  `<sheet>/<row>-0 … -4`. Referenced via `flipbook` subject (`cast` = row
  name or full id, `srcPrefix` = sheet name + `/`, `order`, `rate`, `hold`).
- **Prop row** (`kind: "props"`): each cell becomes addressable art.
  Registered ids: `<sheet>/<cell>` per `cells[i]` (or `<sheet>/<row>-i`).
  Referenced via `props.items[].src` or `icons.icons[]`. Bare cell name
  resolves to cell 0 of its row; bare row name resolves to its first cell.

## B.3 Sheet examples (3)

**Ex.1 — Cast sheet (dancer, 2 rows):**
```json
{
  "name": "my-dancer",
  "rows": [
    { "name": "Spin", "kind": "cast" },
    { "name": "Bow", "kind": "cast" }
  ],
  "pngBase64": "<base64 of 1316x792 PNG: 5 cols x 2 rows on magenta>"
}
```
→ response `casts: ["my-dancer/Spin", "my-dancer/Bow"]`.
Use: `{ "kind": "flipbook", "cast": "Spin", "srcPrefix": "my-dancer/", "box": [380,540], "order": [0,1,2,3,4], "rate": 5, "x": 80, "y": 300 }`.

**Ex.2 — Props sheet (named cells):**
```json
{
  "name": "tea-props",
  "rows": [
    { "name": "gear", "kind": "props", "cells": ["Kettle", "Cup", "Steam", "Tray", "Spoon"] }
  ],
  "pngBase64": "<base64 of 1316x268 PNG: 5 cols x 1 row on magenta>"
}
```
→ response `props: ["tea-props/Kettle", "tea-props/Cup", "tea-props/Steam", "tea-props/Tray", "tea-props/Spoon"]`.
Use: `{ "kind": "props", "items": [{ "src": "tea-props/Kettle", "box": [140,140], "x": 60, "y": 640, "float": [0, 14] }] }`
(`float: true` = default drift, `[dx,dy]` = custom, `false`/omitted = static).

**Ex.3 — Mixed sheet, custom grid:**
```json
{
  "name": "fest-kit",
  "cell": 256, "grid": 6, "bg": [255, 0, 255],
  "rows": [
    { "name": "March", "kind": "cast" },
    { "name": "food", "kind": "props", "cells": ["Cloche", "Chef", "Cocktail", "Menu", "Stars"] }
  ],
  "pngBase64": "<base64 PNG>"
}
```
→ `casts: ["fest-kit/March"]`, `props: ["fest-kit/Cloche", ...]`.
Use: flipbook `{ "cast": "March", "srcPrefix": "fest-kit/", ... }` and
icons `{ "mode": "trio", "icons": ["Cloche", "Chef", "Menu"], "srcPrefix": "fest-kit/" }`.

## B.4 Referencing rules (read before writing specs)

1. Prefer the **exact ids** from the upload response. Bare row/cell names
   also resolve (first match) — convenient, ambiguous if duplicated.
2. `srcPrefix` is the sheet name + `/` (trailing slash handled).
3. `order` may repeat indices for ping-pong (`[0,1,2,1]`); `rate` = frames
   per sprite frame; `hold: true` plays once and holds the last frame.
4. Prop `box` is the display size (art scales to fit); `x,y` are integers.
5. `GET /api/assets` lists every cast/prop/clip/font currently registered —
   check names there when a spec fails with `unknown asset id` or
   `unpinned fonts`.
