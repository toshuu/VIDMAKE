# X80 GENERATION GUIDE V2 — Spec Reel JSON + Sprite-Sheet JSON

**Supersedes `GENERATION-GUIDE.md`. Feed this file to a planning AI.**
X80 is an **unlimited creative engine**: the AI invents compositions, layouts,
visual metaphors, motion systems and spatial arrangements. Presets are
convenience shortcuts (appendix), never capability boundaries.
Same JSON (+ same assets/fonts) → same MP4 bytes, every time.

**Default authoring mode: FREE.** Start every reel with `system: "<your-invention>"`
(or `"free"`) + `layout: "free"` + `nodes` / `kind: "raw"` subjects (§1.9).
Name the system you invented (`orbital`, `ledger`, `theatre`, `choir`).
Reach for a preset layout only when it is genuinely the best shape for the beat.

**Pipeline:** this JSON → `POST /api/validate` + `checkSpec` self-check (overflow,
safe zones, contrast, dead space) → `POST /api/render` → `GET /api/jobs/<id>` → MP4.
Default canvas `{w:540,h:960,fps:30}` unless the brief demands otherwise (any
`w` 270–1080, `h` 480–1920, `fps` 24|25|30|60). A 15s reel = 450 frames.
Asset/font library: `GET /api/assets`. Intent search: `queryCapabilities("glow depth")`.

**Compiler:** `@x80/reelspec` (`validateSpec` → vars/subcomps → layouts → `assembleTimeline`).
It is pure data in, pure data out — no agentic choices, no guessing.
Invalid JSON never renders broken; it doesn't render, and the error names
the exact field at fault.

> **Rule #0 — invent, don't pick.**
> The open composition language (§1.9) is the primary surface: `FreeNode`
> fragments (`container/group/rect/rrect/circle/path/svg/text/image/video/
> shape/mask/effectLayer` + generative `particles`/`scene3d`), `layout` flex,
> `use/slots` components, `subcomps`, `vars{{}}`, `overlays` (global-frame
> shared-element flies), motion systems (`keyframes`/`motionPath`/`stagger`),
> every filter/gradient/blend/effect animatable.
> The 7 named layouts (§1.5 appendix), 7 preset subject kinds (§1.8), kicker
> styles (§1.6) and 5 role names are reusable presets for speed.
> **Invent arrangements, never engine keywords** — unknown node types, effect
> names, or layout names throw and the job fails. If you need a genuinely new
> engine capability, ask for a new JSON option + engine pairing instead.

---

# PART 1 — SPEC REEL JSON

## 1.1 Top-level object

| Field | Type | Required | Rules |
|---|---|---|---|
| `id` | string | yes | Non-empty slug, used in the MP4 filename (`india-fest-15s`). |
| `canvas` | `{w,h,fps}` | yes | Any `w` 270–1080, `h` 480–1920, `fps` 24\|25\|30\|60. Same JSON → same bytes at any size. Default reel canvas stays `{w:540,h:960,fps:30}` unless the brief demands otherwise (square, landscape, 60fps). |
| `system` | string | yes | `"cinematic"` or `"stack"` (preset rules apply, §1.4), or `"free"` / any custom name (no system rules, mixing allowed). **Custom names are encouraged** — name the system you invented (`orbital`, `isometric`, `field`). |
| `concept` | object | yes | Palette + faces + signature (§1.2). |
| `durations` | number[] | yes | Length **=== acts.length**. Preset systems: each an integer **≥ 30** frames. Free/custom systems: each an integer **≥ 1** (micro-acts, stingers, flashes allowed). Sum = reel length. |
| `transitions` | object[] | yes | Length **=== acts.length − 1** (single-act reel → `[]`). `[]` between acts = hard cuts + whooshes. §1.10. |
| `acts` | object[] | yes | Non-empty array. §1.3. |
| `audio` | object | no | `{stingers: 'cuts' \| number[]}`. `'cuts'` = whoosh on every act cut; array = explicit frames. §1.11. |
| `chrome` | boolean | no | Progress-bar chrome, default **true**. Set `false` when you invent your own chrome (or want none). §1.12. |
| `grain` | boolean | no | Film-grain overlay, default **true**. Set `false` for clean vector looks. §1.12. |
| `components` | object | no | Reusable fragments: `{name: FreeNode \| FreeNode[]}`, instantiated with `{use: name}` (§1.9). Composition aid — identical to inlining, never a boundary. |
| `overlays` | object[] | no | Full-reel fragments painted above acts: persistent chrome, shared-element flies across cuts, watermarks. **Bindings address GLOBAL frames** (act-local bindings address their act). One fragment can travel from act A's position to act B's straight through a cut. |

## 1.2 `concept` — palette, faces, signature

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

- **Palette:** all six slots required, each `#rgb`, `#rrggbb`, `#rrggbbaa`,
  `rgba(...)`, or `hsl(...)/hsla(...)`. Aliases `bg/ink/accent/accent2/pillBg/pillFg`
  resolve anywhere a free-node color is expected (§1.9); title `fill` accepts
  any alias or explicit color.
- **Faces:** **verbatim Google Fonts family names** (`"Rozha One"`, never
  `"RozhaOne"`). `display` = shouting titles, `hero` = talking text
  (subs/body/pills), `kicker` = tagging labels. **Any family auto-installs**
  from Google Fonts at job start if not cached (pinned by sha256, offline
  after). Never use one family for everything — record the pairing rationale
  in `signatureWhy`.
- **`signature` / `signatureWhy`:** planning notes, recorded in the decisions
  log. No pixels depend on them.

## 1.3 Acts

| Field | Type | Rules |
|---|---|---|
| `role` | string | Preset `hook` \| `proof` \| `proof2` \| `scale` \| `cta`, or any custom label (`montage`, `bridge`, `reveal`…). Planning label only — recorded, never changes pixels. Recommended arc order as listed. |
| `duration` | number | Frames for this act. Must mirror top-level `durations[i]`. |
| `layout` | string | 7 presets (§1.5) or `"free"` / `"custom"` (§1.9). **Under a free/custom system ANY layout name is valid and composes as free** — invent names that describe what you built (`orbit`, `plinth-court`, `scatter`). Under preset systems unknown names throw. **Any act may also carry additive `nodes`** — extend a preset without forking it. |
| `kicker` | object \| null | §1.6. `null`/omitted = none. |
| `title` | object | §1.7. Required on presets; optional on `free`. |
| `center` | boolean | Centered title treatment (poster/takeover/free). |
| `titleSize` / `titleMaxW` / `titleY` | number | Title px size, max width, y. Defaults per layout. |
| `subY` / `subAt` | number | Subtitle y and entrance frame. Defaults per layout. |
| `subjects` | object[] | §1.8. Painted behind type. `bg` kinds always paint first regardless of order. |
| `cta` / `ctaAt` | string / object | CTA pill (takeover): label + `{y, at:[from,to], size?, h?, spring?}`. |
| `lockup` | string \| null | Brand line under the pill (takeover). |
| `badge` | boolean | `n/5` badge, top-right. Default **true**; set `false` to hide. |
| `design` | object | Preset extras: `numeral` (lower3rd ghost number), `frame` (poster hairline, default on), `ticket` (ticket card object), `veil` (takeover rising veil, default on). |

## 1.4 Systems (free-first)

| System | Kicker rule | Mixing | Use for |
|---|---|---|---|
| `free` (or any custom name) — **default** | any style (`pill`/`overline`/`custom`/…) | anything | Everything you invent. Name it after the idea. |
| `cinematic` (preset appendix) | kicker must be `overline` | cinematic presets only | Footage-led promos when a preset is genuinely fastest. |
| `stack` (preset appendix) | kicker must be `pill` | stack presets only | Sprite/character reels when a preset is genuinely fastest. |

## 1.5 Layouts (open `free` + 7 preset appendix shortcuts)

`"free"` (alias `"custom"`) is the primary layout: no preset builder runs —
the act is `subjects` + optional kicker/title atoms + `nodes` (§1.9).
The named values below are **appendix shortcuts for speed**, not a menu to pick from.

| Layout | System | Renders | Key fields |
|---|---|---|---|
| `giant` | cinematic | Huge kinetic title (rise + settle-scale, staggered), overline, sub | `title`, `titleY` (d. 200), `subY` (d. 372) |
| `lower3rd` | cinematic | Lower-band kinetic title + ghost numeral | `title`, `titleY` (d. 560), `subY` (d. 610), `design.numeral` |
| `poster` | cinematic | Centered kinetic title, hairline frame | `center:true`, `design.frame`, `title` (size d. 58, y 340), `subY` (d. 500) |
| `ticket` | either | Rotated stub card; **`title.lines` must be `[]`** | `design.ticket:{title,sub,x,y,w,h,rotation,rule?}` (`rule` = `[color1,color2]` gradient, default accent→accent2) |
| `takeover` | cinematic | Rising veil + centered kinetic title + CTA pill + lockup | `cta`, `ctaAt`, `lockup`, `design.veil` |
| `stack` | stack | Pill kicker + hero title + sub | `title` (size d. 46, y 132), `subY` (d. 252) |
| `lowtitle` | stack | Big hero title low + sub (full-frame subjects) | `titleSize` (d. 68), `titleY` (d. 588), `subY` (d. 716) |
| `free` / `custom` | free (or any) | Whatever `nodes` + `subjects` + optional kicker/title describe | `nodes`, any subjects, 0–8 title lines, custom kicker |

Kinetic titles default size 64 (takeover 72, poster 58); hero titles 46/68.
Oversized titles **auto-fit**: shrink to `titleMaxW` (never wrap, never clip).

## 1.6 Kicker

```json
"kicker": { "text": "INDIA ITSELF", "style": "pill", "face": "Bebas Neue", "y": 84, "at": 6, "x": 32 }
```

- `style`: `"pill"` (stack) or `"overline"` (cinematic) — must match a
  **preset** system. Under `free`/custom systems or `free` layouts, any style
  works: `"custom"` (or any name) renders the free-positioned label atom
  honoring `y/at/x/face/size/letterSpacing`.
- `face`: optional family override (verbatim name). Weight fixed 700.
- Defaults: pill `y` 84 / `x` 32; overline `y` 96; entrance `at` 4–6.
  Pills auto-size from measured ink (you never set widths).

## 1.7 Title

```json
"title": { "face": "Rozha One", "size": 64,
  "lines": [
    { "text": "INDIA IS SERIOUSLY", "fill": "ink" },
    { "text": "A LAND OF FESTIVALS", "fill": "accent", "face": "Anton", "weight": 400,
      "glow": "rgba(232,179,75,0.45)" }
  ],
  "sub": "LOVING INDIA", "subY": 330 }
```

- `lines`: presets take **1–2** complete lines (`ticket`: must be `[]`).
  `free` takes **0–8** lines, or omit `title` entirely when `nodes` carry
  the typography. No `…` / `...` in any text, ever.
- `fill`: `ink` \| `accent` \| `accent2` \| hex \| rgba.
- `glow`: optional shadow color (accent fills default to an accent glow).
- Font resolution per line: line `face` → title `face` → slot face
  (`display` for kinetic titles, `hero` for stack titles/subs, `kicker` for
  pills). `weight`: integer 1–1000 (titles default 800, kicker 700, sub 500).
- `sub`: string (may be `''`). Always `hero` face, weight 500.

## 1.8 Subjects (painted behind type)

```json
"subjects": [
  { "kind": "bg", "style": "night", "top": "#1a2340", "mid": "#0b1020", "glow": "rgba(232,179,75,0.25)" },
  { "kind": "flipbook", "cast": "DandiyaWoman", "srcPrefix": "india-festival/",
    "box": [380, 540], "order": [0,1,2,3], "rate": 6, "x": 80, "y": 300, "scale": 1 },
  { "kind": "props", "items": [{ "src": "india-festival/diya", "box": [120,120], "x": 40, "y": 700, "float": true }] }
]
```

| Kind | Params |
|---|---|
| `bg` | `style`: `night` (vertical gradient + warm radial glow) \| `flat` (one color, default `#0b1026` via `color`). `night` takes `top`/`mid`/`glow` overrides. Paints first, always. |
| `footage` | `clip`: clip id. `zoom`: `[from,to]` Ken Burns (default `[1,1.07]`, anchored center). `tint`: `{color, opacity}` overlay veil. Clips shorter than their act loop `pingpong` automatically — motion never stops, never jumps. |
| `flipbook` | `cast`: row name (aliases resolve, §2.5). `srcPrefix`: sheet name + `/`. `box`: `[w,h]` or `{w,h}` display size (required). `order`: frame indices, repeats = ping-pong (default all frames). `rate`: frames per sprite-frame (default 6). `hold`: `true` = play once + hold last; `N` = extend final pose N frames/cycle; omitted = loop. `at`: start frame (d. 0). `x`: number or `{from,to,at:[f1,f2]}` slide (rests are integers); `y`: number; `scale`. |
| `icons` | `mode`: `chip` (single disc) \| `trio` (disc row) \| `strip` (raw icons, no discs). `icons`: 1–8 asset ids (trio preset = 3; more lay out a longer row). `srcPrefix?`. `at`: `[x,y]` anchor — defaults per mode (trio `[270,800]`, chip `[440,620]`, strip `[300,800]`); a bare number is read as entrance timing, anchor defaults. `r`: disc radius (d. chip 62, trio 40). `entranceAt` (d. 20). Icons fade + spring-scale in, staggered. Max 3 per act as taste; 8 as law. |
| `emblem` | `mark`: brand initial. `at`: `[x,y]` center. `r?` (d. 84). Ring + orbiting satellite + glow halo. |
| `ticker` | `items`: marquee string. `y?` (d. 470), `at?` (d. 24). Glass band + scrolling text with edge fades. |
| `props` | `items`: `{src, box, x, y, at?, float?}` — `float: true` = default drift, `[dx,dy]` = custom drift, omitted/`false` = static. |
| `raw` | `nodes`: one FreeNode or array (§1.9) — arbitrary engine fragments inside ANY layout. |

Shipped library (`GET /api/assets`): casts `india-festival/DandiyaWoman,
DholMan, DiyaWoman, TempleDancer, FestivalWoman`, `spr3/*`, `spr2/*`, `k2/*`;
props `india-festival/diya, dandiya, dhol, flowers, lantern`, `ic-*` icons;
footage `clip-sign, clip-buffet, clip-tables, clip-entry, clip-gods`.
Anything uploaded via PART 2 appears here too.

## 1.9 Open composition language — FreeNode reference

A FreeNode is a direct handle on one engine scene node: arbitrary nesting,
positioning, fills, blends, filters, effects, and animation bindings.
The planner invents layouts by composing these.

```json
{ "id": "halo", "type": "circle", "radius": 220, "x": 50, "y": 300,
  "fill": { "kind": "radial",
    "stops": [{ "offset": 0, "color": "accent" }, { "offset": 1, "color": "rgba(0,0,0,0)" }] },
  "opacity": 0.5, "blendMode": "screen" }
```

| Field | Meaning |
|---|---|
| `id` | Non-empty. Namespaced per act (`act1-halo`) so acts never collide. |
| `type` | Engine primitive: `container` `group` `rect` `rrect` `circle` `path` `svg` `text` `caption` `image` `video` `shape` `effectLayer` — plus generative `particles` and `scene3d` (below). Unknown → throw. |
| `x`/`y`/`scaleX`/`scaleY`/`rotation`/`opacity` | Number, or motion binding: `{binding:'interpolate',…}` · `{binding:'keyframes', frames, values}` (explicit multi-beat track) · `{binding:'path', axis:'x'‖'y', points, duration, samples?}` (baked Catmull-Rom curve) · `{binding:'stagger', base, index, step}` (cascade shift) · `{binding:'spring',…}` · `{binding:'color',…}` (fills). |
| `skewX`/`skewY` (any node) | 2.5D tilt in degrees (shear), number or binding. Frame-pure cards, covers, leans, depth tilts — no GL needed. Composes as T·A·R·Sk·S·A⁻¹. |
| `width`/`height`/`radius` (rect/rrect/circle/image/video) | Kinetic geometry, number or binding. Growing bars, wipes, pulses, blooms — resolved per frame (finite, ≥ 0). Per-corner radius tuples stay static. |
| `filter` / `backdropBlur` | Every filter field (`blur/brightness/contrast/saturate/grayscale`) and `backdropBlur` accept numbers or bindings: focus pulls, grade shifts, blur reveals. |
| `layout` (container/group) | Measure-free flex: `{direction:'row'\|'column', gap?, align?:'start'\|'center'\|'end', padding?}`. Children without explicit x/y are stacked automatically — invent rows/cols without manual math. Extents come from declared width/height/radius. |
| `use` / `slots` | Component instantiation: `{use: name}` renders `components[name]` here; `{slots: {childId: props}}` deep-targets one descendant (e.g. per-instance labels). Same-component reuse never collides (descendants are namespaced per instance). |
| `fontSize`/`letterSpacing` (text) | Number or binding — kinetic type, re-laid-out per frame. |
| `fill` | Hex/rgba, palette alias (`bg/ink/accent/accent2/pillBg/pillFg`), gradient (`linear` + `angle`, `radial` + `cx/cy/inner/outer`, `conic` — each with `stops:[{offset,color}]`), or `{binding:'color',…}`. Aliases resolve inside gradient stops too. |
| `stroke` / `shadow` | Colors accept aliases (`shadow: {color, blur?, offsetX?, offsetY?}`). |
| `blendMode` / `filter` / `backdropBlur` / `clip` / `crop` / `effects` / `visible` | Full engine surface, e.g. `blendMode:'screen'`, `filter:{blur,brightness,contrast,saturate,grayscale}`, `effects:[{type:'vignette', params:{…}}]`. Unknown effect names throw. |
| `children` | Arbitrary nesting (`container → group → text …`). Validated recursively. |
| Type-specific | `rect/rrect/circle`: `width/height/radius` · `text`: `text/fontFamily/fontWeight/fontStyle/textAlign/maxWidth/lineHeight` · `image/video`: `src/fit/box/loop` · `path`: `d` (`frames?` for morph) · `caption`: timed word captions (`captions/combineMs/maxCharsPerLine/highlight/reveal/…`) |

Raw subjects embed the same fragments inside any act:
`{ "kind": "raw", "nodes": [{ "id": "blade", "type": "rect", … }] }`.

**Generative nodes** (compile to plain engine primitives — deterministic, no new renderer keywords):

```json
{ "id": "stars", "type": "particles", "count": 130, "seed": 5,
  "colors": ["#ffffff", "accent", "accent2"], "size": [1, 3],
  "area": { "w": 540, "h": 960 }, "at": [0, 0], "twinkle": true }
```
`count` 1–400, `seed` pins the layout (same seed → same sky). Static
positions + wrap-phase twinkle; animate the *parent container* for
drift/fall/rise. Starfields, dust, confetti, rain.

```json
{ "id": "stage", "type": "scene3d", "width": 540, "height": 960,
  "camera": { "distance": 750, "tiltX": 18, "tiltY": -16 },
  "objects": [
    { "kind": "box", "x": 0, "y": 20, "z": 40, "w": 170, "h": 170, "d": 230, "color": "#4ade80" },
    { "kind": "plane", "x": 0, "y": 200, "z": -60, "w": 480, "h": 120, "color": "ink" },
    { "kind": "points", "x": 0, "y": -160, "z": 0, "w": 480, "h": 200, "d": 300, "count": 90, "seed": 21, "color": "#f2fbf4" }
  ] }
```
Weak-perspective projection (CPU only, no GL): boxes render as three
shaded faces (`-top` lighter, `-side` darker, `-front` verbatim), planes as
quads, points as depth-scaled circles. Animate via parent `skew`/`rotation`
bindings. Colors accept palette aliases.

**Spatial layer (v3 — hierarchies, perspective, geometry, light).**
Opt in per stage with any of: `camera.fov` (10–120°, true perspective
divide), `light.dir` (`[x,y,z]` + `ambient` 0–1, Lambert shading),
`group` objects, per-object `rx/ry/rz/s/sx/sy/sz`, or new kinds
`cylinder/cone/sphere/torus/tube`. Everything compiles to flat 2D paths
(global painter's sort) — no renderer changes, still deterministic.

```json
{ "id": "sys", "type": "scene3d", "width": 540, "height": 960,
  "camera": { "distance": 800, "tiltX": 24, "tiltY": -12, "fov": 50 },
  "light": { "dir": [0.3, -0.75, 0.6], "ambient": 0.25 },
  "fog": { "color": "bg", "near": -500, "far": 700 },
  "objects": [
    { "kind": "sphere", "x": 0, "y": 60, "z": 0, "r": 70, "lat": 6, "lon": 12, "color": "accent" },
    { "kind": "cylinder", "x": -120, "y": 0, "z": 0, "w": 100, "h": 220, "seg": 10, "color": "#4ade80" },
    { "kind": "cone", "x": 120, "y": 0, "z": 0, "w": 100, "h": 200, "seg": 10, "color": "accent2" },
    { "kind": "torus", "x": 0, "y": 200, "z": 0, "w": 160, "d": 48, "seg": 10, "tub": 6, "color": "accent2" },
    { "kind": "tube", "points": [[-200, 100, 0], [-60, -60, 60], [80, 40, -40]], "r": 10, "seg": 12, "sides": 5, "color": "ink" },
    { "kind": "group", "ry": -20, "children": [
      { "kind": "box", "x": 150, "w": 60, "h": 60, "d": 60, "color": "accent" },
      { "kind": "group", "x": 200, "children": [
        { "kind": "sphere", "r": 12, "color": "ink" } ] } ] }
  ] }
```

Groups nest arbitrarily (solar systems, armatures, mobiles); children are
local to the group origin. `cylinder` takes `r/rTop/rBottom/h/seg`;
`sphere` takes `r/lat/lon`; `torus` takes `R/r/seg/tub`; `tube` takes
3D `points` + `r/seg/sides`. Unknown kinds, bad `fov`/`dir`, children on
non-groups, and non-positive geometry all throw loudly. Specs without any
v3 trigger render byte-identically to before.

**Components** (top-level `"components": { "orb-chip": { …rrect + child text… } }`):
`{ "id": "chip0", "use": "orb-chip", "slots": { "orb-chip-t": { "text": "MARS" } }, "x": 100, "y": 200 }`.
Top-level keys beside `use`/`slots` (`x`, `y`, `opacity`…) override the
fragment root. Unknown component/slot names throw loudly.

## 1.10 Transitions + timeline model

`transitions[i]` sits between act *i* and *i+1*:
`{ "type": "slide", "params": { "direction": "left" } }`.
`{ "type": "none" }` = hard cut. Optional `duration` (integer **2–60**, default
**12**) varies the blend length — snappy 2f snaps and 48f dreamy dissolves
are both legal; optional `easing` overrides `ease-in-out`.
Omitting both reproduces the exact legacy 12-frame geometry.

Montage pattern (deterministic, no hand-rolled timelines): each transition
of length T overlaps its boundary — T−4 frames from the outgoing act, 4
into the incoming; the incoming act resumes with `trimBefore: T`; the
outgoing act freezes on its last frame for the blend. Total = Σ durations.
Consequence for planning: an act's last ~8 frames are blend zone — full
layout (incl. CTA) must read complete by ~frame 40 of every act, and still
leaves must bracket every transition (the compiler does this; `nodes`-only
free acts get it automatically).

| Type | Params |
|---|---|
| `none`, `fade`, `dissolve` | `dissolve`: `{seed:int}` (default 7) |
| `slide`, `wipe`, `push-cut`, `swap` | `{direction: left\|right\|up\|down}`; `wipe` adds `{softness: 0..1}` |
| `flip` | `{axis: x\|y}` |
| `iris` | `{shape: "circle"}` (only circle implemented) |
| `clock-wipe`, `book-flip`, `zoom-blur`, `dreamy-zoom`, `film-burn`, `linear-blur`, `zoom-in-out`, `ripple`, `crosswarp`, `cross-zoom` | `{}` (defaults) |

## 1.11 Audio

`"audio": { "stingers": "cuts" }` = whoosh on every act cut (cut midpoints);
an explicit `number[]` places stingers at exact frames. The engine mixes
(never generates): voice + music bed + stingers from already-existing audio.
Silent reels read as unfinished — budget audio like footage.

## 1.12 Implicit chrome (opt out when you invent your own)

Defaults per act: `n/5` badge (unless `badge:false`), film-grain overlay
(unless top-level `grain:false`), and a reel-wide progress bar + brand
chrome drawn last, always on top (unless top-level `chrome:false`).
Custom-chrome reels (`chrome:false`) must still orient the viewer —
invent your own progress, numbering, or lockup instead of deleting information.

## 1.13 Validation self-check (job fails listing these)

Canvas in range (`w` 270–1080, `h` 480–1920, `fps` 24|25|30|60) ·
`durations.length === acts.length` (preset systems: each ≥ 30; free/custom
systems: each ≥ 1) · `transitions.length === acts.length − 1`, each
`duration` (if present) integer 2–60 · palette six slots valid
(`#rgb/#rrggbb/#rrggbbaa/rgba()/hsl()/hsla()` or any palette alias) ·
faces non-empty · layout known presets, `free`/`custom`, or **any name under
a free/custom system (composes as free)** · preset titles 1–2 lines
(ticket: 0), free titles 0–8 lines or omitted · **free acts need title
lines, subjects, or nodes** (empty stages rejected — never silent black) ·
no `…`/`...` · fills valid · face strings non-empty · weights integer
1–1000 · subject fields per §1.8 (incl. `raw.nodes`) · act `nodes` (if
present) valid engine fragments (incl. `particles`/`scene3d`/`use`) ·
preset systems enforce kicker-style match (`cinematic`↔`overline`,
`stack`↔`pill`) · unknown font family at render time throws (auto-fetch
attempted first).

## 1.14 Spec examples

**Ex.A — Preset cinematic reel (3 acts, shipped assets):**
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

**Ex.B — Open reel (zero presets — no preset layout, role, or system):**
```json
{
  "id": "orbit-study-15s",
  "canvas": { "w": 540, "h": 960, "fps": 30 },
  "system": "atelier",
  "concept": {
    "palette": { "bg": "#0b1026", "ink": "#ffffff", "accent": "#e8b34b", "accent2": "#4ade80", "pillBg": "#f2fbf4", "pillFg": "#0b1020" },
    "faces": { "display": "Inter", "hero": "Inter", "kicker": "Poppins" },
    "signature": "orbit mandala + diagonal blade", "signatureWhy": "no preset has concentric orbits or a rotated stage"
  },
  "durations": [90, 120],
  "transitions": [{ "type": "fade", "duration": 16 }],
  "acts": [
    { "role": "mandala", "duration": 90, "layout": "free", "badge": false,
      "kicker": { "text": "ORBIT STUDY", "style": "custom", "y": 64, "x": 40, "size": 20, "letterSpacing": 8 },
      "nodes": [
        { "id": "ground", "type": "rect", "width": 540, "height": 960, "x": 0, "y": 0, "fill": "bg" },
        { "id": "halo", "type": "circle", "radius": 220, "x": 50, "y": 300,
          "fill": { "kind": "radial",
            "stops": [{ "offset": 0, "color": "accent" }, { "offset": 1, "color": "rgba(0,0,0,0)" }] },
          "opacity": 0.5, "blendMode": "screen" },
        { "id": "word", "type": "text", "text": "EVERYTHING ORBITS", "fontFamily": "Inter",
          "fontSize": { "binding": "spring", "from": 20, "to": 44 }, "fontWeight": 800, "fill": "ink",
          "x": 40, "y": 760 }
      ] },
    { "role": "blade", "duration": 120, "layout": "custom", "badge": false,
      "kicker": { "text": "CUT DIAGONALLY", "style": "custom", "y": 120, "x": 300 },
      "subjects": [
        { "kind": "raw", "nodes": [
          { "id": "shard", "type": "rect", "width": 700, "height": 500, "x": -80, "y": 100,
            "rotation": -18, "anchorX": 350, "anchorY": 250, "fill": "#141c38" },
          { "id": "blade", "type": "rect", "width": 700, "height": 14, "x": -80, "y": 470,
            "rotation": -18, "anchorX": 350, "anchorY": 7,
            "fill": { "kind": "linear", "angle": 90,
              "stops": [{ "offset": 0, "color": "accent" }, { "offset": 1, "color": "accent2" }] } }
        ] },
        { "kind": "bg", "style": "flat", "color": "#0b1026" }
      ],
      "nodes": [
        { "id": "big", "type": "text", "text": "SLASH", "fontFamily": "Inter", "fontSize": 120,
          "fontWeight": 800, "fill": "ink", "x": 36, "y": 560,
          "opacity": { "binding": "interpolate", "inputRange": [6, 24], "outputRange": [0, 1],
            "options": { "extrapolateLeft": "clamp", "extrapolateRight": "clamp" } } }
      ] }
  ]
}
```

**Ex.C — Ticket stub (single act, auto-fetched face):**
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

# PART 2 — SPRITE-SHEET JSON

Upload art once via `POST /api/sheets`, then reference it from specs (§1.8).
Response: `{ ok:true, casts:[...], props:[...] }` — use those ids verbatim
(or bare row/cell names; aliases resolve).

## 2.1 Template geometry (hard rules)

- Grid: **5 columns** × **1–8 rows**. `cell` default **256** px, `grid`
  (gutter) default **6** px, background default **magenta `[255,0,255]`**.
- Required size = `6 + 5×(cell+6)` wide × `6 + rows×(cell+6)` tall
  (defaults: 1316 wide, e.g. 1316 tall for 5 rows). **Any-size PNG is
  accepted — it is auto-scaled** to the template (smoothing off). Keep cells
  on the grid: feet at y≈232 within a 256 cell, guides hidden on export.
- Non-conforming sheets (striped bg, wrong scale, guides left on) cost
  extraction surgery — send them back with the template link. Fast path is a
  property of the SHEET, not the engine.

## 2.2 Upload body (`POST /api/sheets`)

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

## 2.3 Cast rows vs prop rows

- **Cast row** (`kind: "cast"` or any non-`props` value): each of the 5 cells
  becomes a flipbook frame. Registered id: `<sheet>/<row>` with frames
  `<sheet>/<row>-0 … -4`. Referenced via a `flipbook` subject (`cast` = row
  name or full id, `srcPrefix` = sheet name + `/`, plus `order`/`rate`/`hold`).
- **Prop row** (`kind: "props"`): each cell becomes addressable art.
  Registered ids: `<sheet>/<cell>` per `cells[i]` (or `<sheet>/<row>-i`).
  Referenced via `props.items[].src` or `icons.icons[]`. Bare cell name
  resolves to cell 0 of its row; bare row name resolves to its first cell.

## 2.4 Sheet examples

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
→ `casts: ["fest-kit/March"]`, `props: ["fest-kit/Cloche", …]`.
Use: flipbook `{ "cast": "March", "srcPrefix": "fest-kit/", … }` and
icons `{ "mode": "trio", "icons": ["Cloche", "Chef", "Menu"], "srcPrefix": "fest-kit/" }`.

## 2.5 Referencing rules (read before writing specs)

1. Prefer the **exact ids** from the upload response. Bare row/cell names
   also resolve (first match) — convenient, ambiguous if duplicated.
2. `srcPrefix` is the sheet name + `/` (trailing slash handled).
3. `order` may repeat indices for ping-pong (`[0,1,2,1]`); `rate` = frames
   per sprite frame; `hold: true` plays once and holds the last frame.
4. Prop `box` is the display size (art scales to fit); `x,y` are integers.
5. `GET /api/assets` lists every cast/prop/clip/font currently registered —
   check names there when a spec fails with `unknown asset id`.
6. **Flow:** cast list first (who, doing what, per act, at what scale) →
   user supplies ONE sheet on the template → engine ingests → flipbooks
   reference `{cast, box, srcPrefix}`. Sprite sheets come AFTER your cast
   list, never before.

---

# PART 3 — PLANNING WORKFLOW (how to think, in order — do not skip)

1. **REQ → STORY.** Compress the brief into beats with one emotion each
   (e.g. wonder → energy → emotion → awe → invitation). Name the feeling
   per beat; the quiet beat is mandatory (contrast makes peaks).
2. **STORY → ART CONCEPT.** One metaphor, one signature shot, one palette,
   one face trio. Record WHY each fits THIS brief.
3. **CONCEPT → SYSTEM.** `cinematic` for footage-led promos, `stack` for
   sprite/character reels, `free`/custom when no preset fits. Preset systems
   may not mix inside one reel; free reels may mix anything.
4. **SYSTEM → ACTS.** One layout per act (preset, `free`, or an invented
   name under a free/custom system — §1.3). Never the same
   full stack twice running — alternate arrangements so five stills read as
   five designs, not one template. Full layout (incl. CTA) complete by
   frame ~40 of every act.
5. **ACTS → ASSETS.** Name every clip/frame/prop id used. Short clips ride
   the automatic `pingpong`; sprite casts need their sheet (PART 2) before
   the spec references them. Never invent ids that weren't supplied — ask
   when missing.
6. **SELF-CRITIQUE.** Every word from the brief/brand/CTA (numbers are the
   brief's own) · no truncation marks, heroes complete · one anchor per act,
   distinguishable stills · pills/badges/progress present or explicitly
   dropped with WHY · CTA complete by f40, lockup legible · scrims under
   footage type · chips ≤ 3/act, clear of faces and type · short clips stay
   alive, nothing wraps or freezes mid-act. A failing plan is revised,
   never shipped.

## Common errors (validator message → fix)

| Error mentions | Fix |
|---|---|
| `canvas` | `w` 270–1080, `h` 480–1920, `fps` 24\|25\|30\|60. |
| `durations` | Length must equal acts; preset systems each integer ≥ 30, free/custom systems each ≥ 1. |
| `transitions` | Length must equal acts − 1; `duration` integer 2–60. |
| `layout … unknown` | Under preset systems: one of the 7 presets or `free`/`custom`. Under free/custom systems: **invent the name** — it composes as free. |
| `cinematic/stack preset expects` | Kicker style must match a preset system — or switch `system` to `free`. |
| `title.lines` | Presets: 1–2 (ticket: 0). Free: 0–8 or omit. |
| `empty stage` | A `free` act needs title lines, subjects, or nodes. |
| `truncation` | Full words only — no `…` / `...`. |
| `subject kind` / `node type` | One of the documented kinds/types — invent arrangements, never keywords. |
| `icons need 1–8` | Trim the list or split across acts. |
| `unknown asset id` | Check `GET /api/assets`; upload the sheet first (PART 2). |

---

*Provenance: `@x80/reelspec` (`validateSpec`, `compileReel`, `assembleTimeline`
in `packages/reelspec/src/`); engine primitives in `packages/core/src/`; live
parity tests in `packages/reelspec/tests/` (preset + open-ended suites).*
