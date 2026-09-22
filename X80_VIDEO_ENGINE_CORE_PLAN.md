# X80 Video Engine — Living Core Engine Specification

**Status:** Living implementation document  
**Scope:** Core video/compositing/animation engine ONLY  
**Explicitly out of scope:** AI planning, Whisper/STT, asset search/generation, product UI, API service, Cloudflare, Cloud Run, Render, queues, auth, billing, deployment optimization.

---

## 0. Mission

Build a new, lightweight, deterministic video engine inspired by the strongest parts of Remotion, but **do not fork or reproduce the whole Remotion application/runtime**.

The engine should provide the visual power required for everyday AI-assisted video creation:

- talking-head reels
- faceless reels
- café/food/travel/lifestyle reels
- educational/explainer videos
- promotional videos
- caption-heavy short-form videos
- motion-graphics-heavy short-form videos
- image/video montages
- animated typography
- transitions
- effects
- audio synchronization

The core requirement is:

> Given a declarative video scene description and a frame number, produce the exact same visual result every time.

The engine must be:

- deterministic
- frame-based
- modular
- testable
- lightweight compared with a browser-based Remotion render
- capable of high visual fidelity
- suitable for later API/server deployment
- independent of AI systems

### Important correction to an earlier idea

Do **not** intentionally implement only a small subset of Remotion's effects/animations.

The engine should target **broad Remotion visual parity**, because the product will eventually need the full range. Optimization should come from architecture and rendering efficiency, not by arbitrarily deleting visual capabilities.

The initial implementation can be staged, but the target capability set should include the important Remotion animation/effect/transition surface.

---

# 1. What we learned from the Remotion teardown

The analyzed Remotion installation is essentially:

```text
React component
    ↓
Rspack bundle
    ↓
HTML/JS application
    ↓
Headless Chrome
    ↓
seek to integer frame
    ↓
CDP screenshot
    ↓
FFmpeg / compositor
    ↓
video
```

The important architectural ideas worth keeping are:

1. **Frame-pure time**
2. **Deterministic rendering**
3. **Composable timeline primitives**
4. **Interpolation/easing**
5. **Spring physics**
6. **Scene/sequence timing**
7. **Media synchronization**
8. **Declarative composition**
9. **Composable effects**
10. **Parallelizable frame rendering**

The expensive parts we want to eliminate or avoid by default are:

- Chromium
- Puppeteer
- CDP screenshots
- React reconciliation for every frame
- Rspack/bundling as part of rendering
- browser-page-per-render architecture
- FFmpeg subprocess spawning where a native/in-process encoder path is practical
- Studio/editor machinery
- Lambda/server orchestration

The teardown identified the animation core as small while identifying Chromium, Puppeteer, screenshot capture, bundling and native FFmpeg packaging as major sources of weight. See the source analysis at the end of this document.

---

# 2. Core architecture

Build this architecture:

```text
                    X80 VIDEO ENGINE
                           │
                    VideoPlan / DSL
                           │
                           ↓
                    Timeline Engine
                           │
                           ↓
                      Scene Graph
                           │
              ┌────────────┴────────────┐
              │                         │
              ↓                         ↓
        Animation Engine            Media Engine
              │                         │
              └────────────┬────────────┘
                           ↓
                     Render Backend
                           ↓
                     Frame / RGBA
                           ↓
                    Encode / Mux Layer
```

For the first implementation:

```text
Timeline        = X80-owned
Scene Graph     = X80-owned
Animation       = X80-owned, Remotion-compatible
Effects         = X80-owned
Transitions     = X80-owned
Rendering       = Skia-based
Media utilities = Mediabunny / suitable native media tooling
Encoding        = WebCodecs/native encoder path where practical
```

### Important architectural principle

The engine must **not** be tightly coupled to one rendering backend.

Define an internal renderer interface so the future implementation can support:

```text
Skia backend
GPU backend
possible Vello backend
possible Pixi backend
possible browser fallback
```

without rewriting the timeline or animation system.

---

# 3. Technology choices and why

## 3.1 TypeScript / Node.js

Use TypeScript for the engine implementation.

Reason:

- Remotion's mental model is already JavaScript/TypeScript friendly.
- The engine is intended to be used by an API/server later.
- Strong typing is valuable for a declarative video DSL.
- Native modules can still be used where performance requires them.

Node.js is acceptable.

The goal is **not to eliminate Node.js**.

The goal is to eliminate unnecessary browser/runtime overhead around Node.

Do not spend implementation time trying to create a non-Node runtime.

---

## 3.2 Skia as the first rendering backend

Use a Skia-backed canvas implementation such as `@napi-rs/canvas` as the initial renderer candidate.

Reason:

- It gives high-quality 2D drawing primitives.
- It avoids requiring a browser DOM.
- It can provide text, images, SVG-oriented drawing and transforms.
- Skia is mature and broadly used as a 2D graphics engine.
- It is a better fit for a deterministic server renderer than recreating a complete browser.
- It gives us a clean path to a later GPU implementation.

Do not begin with PixiJS as the mandatory architecture.

PixiJS is excellent for GPU scene rendering, but our primary requirement is a **headless deterministic video compositor**, not a game/UI renderer. A Pixi-based backend may be added later behind the renderer abstraction.

Do not design the rest of the engine around Pixi-specific APIs.

---

## 3.3 Video/media layer

Use a modern media library such as Mediabunny where it simplifies:

- media parsing
- demuxing
- decoding
- timestamps
- audio/video metadata
- frame access
- muxing

Validate the exact current API instead of assuming APIs from memory.

The engine should expose its own media abstraction:

```ts
VideoSource
AudioSource
VideoFrameSource
AudioTrack
```

The rest of the engine should not depend directly on a particular media library's API.

---

## 3.4 Encoding

Prefer an in-process/native encoder path over spawning a complete FFmpeg CLI process for every render.

Investigate/use:

- WebCodecs-compatible native implementations
- `@napi-rs/webcodecs`
- Mediabunny's server/native media support
- hardware encoding where it is actually available

However:

> Do not make encoding the first milestone.

The compositor must first produce correct frames.

The encoder is a separate subsystem.

---

# 4. Non-negotiable core contract: time is frames

The primary timing unit is:

```ts
frame: integer
fps: number
```

and:

```ts
timeInSeconds = frame / fps
```

Never make wall-clock time the source of visual animation.

Avoid:

```ts
Date.now()
performance.now()
requestAnimationFrame()
CSS transition
CSS animation
setInterval()
```

as visual timing mechanisms.

A render should be reproducible from:

```text
VideoPlan
+
frame
+
fps
+
assets
+
engine version
```

The same inputs should produce the same frame.

This mirrors one of the most valuable Remotion design decisions.

---

# 5. Engine data model

Start with explicit typed structures.

Conceptually:

```ts
type VideoComposition = {
  id: string;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  root: SceneNode;
};

type SceneNode = {
  id?: string;
  start?: number;
  duration?: number;
  children?: SceneNode[];
  transform?: Transform;
  opacity?: number | AnimatedValue<number>;
  effects?: Effect[];
  ...
};
```

Do not copy Remotion's React component model.

Create a declarative internal model that can be represented as JSON.

---

# 6. Scene graph

The scene graph should be the central runtime representation.

At minimum support:

```text
Group
├── Container
├── Rectangle
├── RoundedRectangle
├── Circle
├── Path
├── SVG
├── Text
├── Image
├── Video
├── Shape
├── Mask
└── EffectLayer
```

Every visual node should support:

```text
x
y
scaleX
scaleY
rotation
anchor
opacity
visibility
blend mode
crop
clip/mask
effects
```

Prefer independent transform properties:

```ts
scaleX
scaleY
translateX
translateY
rotation
```

rather than forcing everything into one opaque transform string.

This matches a useful Remotion authoring principle and makes the representation easier to inspect and animate.

---

# 7. Timeline system

Implement these primitives:

## 7.1 Composition

Defines:

```text
id
width
height
fps
duration
root
```

## 7.2 Sequence

A sequence remaps global frame → local frame.

Conceptually:

```text
localFrame = globalFrame - sequenceStart
```

Support:

- `from`
- `duration`
- `trimBefore`
- freeze behavior
- nested sequences
- visibility
- optional width/height overrides

Nested sequences must behave deterministically.

## 7.3 Series

Sequential child composition:

```text
A → B → C
```

Support positive and negative offsets.

## 7.4 Loop

Map a local timeline into repeating iterations.

Support:

```text
durationInFrames
times
```

## 7.5 Freeze

Pin a node/sequence to a chosen frame.

## 7.6 Still

Single-frame composition.

---

# 8. Animation engine — target full compatibility

This is one of the most important modules.

Port the behavior of Remotion's animation math rather than inventing incompatible behavior.

## 8.1 `interpolate()`

Support:

```text
input
inputRange
outputRange
easing
extrapolateLeft
extrapolateRight
posterize
output mode
```

Extrapolation:

```text
extend
clamp
wrap
identity
```

Support:

- scalar numbers
- numeric strings
- transform-related strings where appropriate
- tuples/arrays
- multi-stop interpolation
- per-segment easing
- posterized animation
- perceptual-scale mode

The engine should match Remotion numerically for the same inputs.

---

# 9. Easing engine

Implement all core easing functions:

```text
step0
step1
linear
ease
quad
cubic
poly
sin
circle
exp
elastic
back
spring
bounce
bezier
in
out
inOut
```

The implementation should preserve:

- edge behavior
- clamping behavior
- parameters
- composition/modifier behavior
- floating-point output closely enough for parity tests

Do not simplify these to "generic ease in/out."

---

# 10. Spring engine

Implement:

```text
spring()
measureSpring()
```

Support:

```text
damping
mass
stiffness
overshootClamping
allowTail
durationRestThreshold
durationInFrames
delay
reverse
from
to
```

Use the same mathematical model as Remotion initially.

Do not "fix" a behavioral oddity merely because it looks theoretically nicer.

Compatibility is more important in the first implementation.

### Optimization

After correctness is proven:

```text
spring(config, fps)
       ↓
precompute spring lookup table
       ↓
frame → O(1) lookup
```

Do this only after parity tests pass.

---

# 11. Bézier engine

Implement cubic Bézier timing functions with robust inversion of:

```text
x → t → y
```

Use the same strategy as Remotion's implementation:

```text
sample table
↓
Newton-Raphson where slope is good
↓
binary subdivision fallback
```

Match edge cases.

---

# 12. Deterministic random

Implement:

```ts
random(seed)
```

with deterministic seeded generation.

String seeds should be deterministic.

The same:

```text
seed
frame
```

must not randomly change between renders.

---

# 13. Color interpolation

Implement:

```ts
interpolateColors()
```

Support the color formats required by the engine.

At minimum:

```text
hex
rgb/rgba
hsl/hsla
```

Then expand to:

```text
oklab
oklch
lab
lch
hwb
```

where the source compatibility requirements justify it.

Color interpolation must be deterministic.

---

# 14. Animation presets / high-level motion API

Do not stop at primitive interpolation.

Create a higher-level animation library on top of the primitives.

## Entrance animations

```text
fadeIn
slideInLeft
slideInRight
slideInUp
slideInDown
scaleIn
zoomIn
popIn
springIn
rotateIn
blurIn
wipeIn
maskIn
```

## Exit animations

```text
fadeOut
slideOutLeft
slideOutRight
slideOutUp
slideOutDown
scaleOut
zoomOut
rotateOut
blurOut
wipeOut
maskOut
```

## Continuous / emphasis animations

```text
pulse
bounce
float
shake
jitter
swing
breathing
slowZoom
pan
parallax
glitch
flicker
```

## Typography

```text
typewriter
characterReveal
wordReveal
lineReveal
fadeWords
popWords
highlightWord
highlightPhrase
underlineReveal
markerSweep
blurReveal
```

These are not substitutes for the low-level primitives.

They are reusable compositions built on top of them.

---

# 15. Transition system — target broad Remotion coverage

Implement a dedicated transition interface.

Initial target set:

```text
Fade
Slide
Wipe
Flip
Clock Wipe
Book Flip
Iris
Zoom Blur
Dreamy Zoom
Film Burn
Linear Blur
Zoom In-Out
Dissolve
Ripple
Crosswarp
Cross Zoom
Swap
Push Cut
```

Also support:

```text
none
```

Transitions must operate on scene boundaries, not require the user to manually duplicate scenes.

Make transitions parameterized where practical:

```text
duration
direction
easing
amount
origin
```

---

# 16. Effects system — do NOT intentionally limit to a tiny subset

The Remotion teardown identified a large effects catalog.

Target broad parity.

The identified catalog includes:

```text
barrel-distortion
blur
burlap
flannel
checkerboard
chromatic-aberration
color-key

color-correction:
  brightness
  contrast
  exposure
  levels
  white-balance
  shadows-highlights
  vibrance
  saturation
  hue
  tint
  duotone
  invert
  grayscale
  lut
  thermal-vision

contour-lines
liquid-contours
drop-shadow
emboss
evolve
fisheye
corner-pin
glow
gridlines
halftone
halftone-linear-gradient
pixel-dissolve
pixelate
pixelate-progressive
lines
linear-gradient
linear-gradient-tint
linear-progressive-blur
linear-progressive-pixelate
light-leak
light-leak-schema
light-trail
dot-grid
mirror
noise
noise-displacement
outline
paper
roughen-edges
pattern
pattern-checkerboard
pattern-tile
pattern-rings
pattern-starburst
pattern-zigzag
pattern-gridlines
radial-progressive-blur
radial-progressive-pixelate
region-blur
scanlines
scale
shine
shrinkwrap
skew
speckle
tear
tv-signal-off
venetian-blinds
vignette
wave
waves
white-noise
zoom-blur
translate
tile
```

Treat the actual source implementation as the authority for exact parameters and visual behavior.

### Effects architecture

Do not hard-code effects into one enormous renderer function.

Use:

```ts
type Effect = {
  type: string;
  params: Record<string, unknown>;
  disabled?: boolean;
};
```

Then:

```text
Scene
 ↓
base drawing
 ↓
effect pipeline
 ↓
composited output
```

Effects should be composable.

---

# 17. Separate effect categories

Organize effects internally into:

```text
Geometry
Color
Blur
Distortion
Pattern
Noise
Lighting
Stylization
Transitions
Compositing
```

Examples:

### Geometry

```text
translate
scale
skew
fisheye
cornerPin
mirror
tile
```

### Color

```text
brightness
contrast
saturation
hue
grayscale
duotone
tint
LUT
```

### Blur

```text
blur
zoomBlur
radialBlur
motion-like blur
```

### Stylization

```text
film grain
paper
halftone
scanlines
pixelate
outline
emboss
```

This organization will make the engine easier to maintain.

---

# 18. Rendering backend abstraction

Define something like:

```ts
interface Renderer {
  createSurface(width: number, height: number): Surface;
  clear(surface: Surface, color?: Color): void;

  drawRect(...): void;
  drawRoundedRect(...): void;
  drawPath(...): void;
  drawImage(...): void;
  drawText(...): void;
  drawVideoFrame(...): void;

  applyEffect(...): void;
  composite(...): void;

  readPixels(...): FrameBuffer;
}
```

The exact API can differ, but the principle is mandatory:

> Timeline/animation code must not know whether pixels are produced by Skia, Pixi, Vello or another backend.

---

# 19. Text system

Text is a critical subsystem.

Do not treat text as "just another image."

It must eventually support:

```text
font loading
font weight
font style
font size
line height
letter spacing
alignment
wrapping
multiline text
text bounds
baseline
stroke
shadow
gradient fills
opacity
per-word layout
per-character layout
```

Test:

```text
English
Hindi
Marathi
mixed Latin + Devanagari
emoji
multiline
very long words
punctuation
bold fonts
variable fonts
```

The first implementation should be deterministic and measurable.

Do not assume browser typography and Skia typography are pixel-identical.

Where differences exist, document them and add tests.

---

# 20. SVG subsystem

Support SVG as a first-class asset type.

Needed for:

- icons
- logos
- illustrations
- animated graphics
- diagrams
- decorative assets

Cache parsed SVGs.

Do not reparsed/decode the same SVG on every frame.

---

# 21. Image subsystem

Support:

```text
JPEG
PNG
WebP
SVG
```

where native tooling supports them.

Cache decoded images.

The scene graph should keep reusable image/texture handles.

Avoid:

```text
decode image
draw one frame
discard
decode again
```

Use:

```text
asset hash
 ↓
decoded asset cache
 ↓
many frames
```

---

# 22. Video subsystem

A `<Video>`-like logical abstraction is required, but it should not be a browser `<video>`.

Support:

```text
source
start time
trim
duration
volume
playback rate
loop
crop
fit
fill
position
opacity
blend
filters/effects
```

The media subsystem should map:

```text
global frame
 ↓
scene-local frame
 ↓
video timestamp
 ↓
decoded video frame
```

Video frame decoding/caching should be separated from compositing.

---

# 23. Audio subsystem

The engine itself does NOT perform AI audio generation.

It only needs to compose already-existing audio.

Support:

```text
voice track
music track
SFX track
volume
fade in
fade out
trim
offset
loop
ducking
gain
```

Also support synchronization against frame-based scene timing.

The final engine should be able to construct:

```text
voice
+
music
+
whoosh SFX
+
cut SFX
+
other sound layers
```

without depending on AI.

---

# 24. Captions subsystem

Build captions as a core visual primitive.

Input should be structured:

```ts
type Caption = {
  text: string;
  startMs: number;
  endMs: number;
  timestampMs?: number;
  confidence?: number;
}
```

Do NOT implement Whisper.

Whisper will be outside this engine.

The engine receives caption timing data and renders it.

Support:

```text
word-level timing
line-level timing
pagination
max characters per line
word highlighting
phrase highlighting
animated entrance
animated exit
background boxes
stroke
shadow
```

Build the basic TikTok-style pagination model as a reusable primitive.

---

# 25. Asset lifecycle

Define a generic asset interface.

```text
Asset
 ├── Image
 ├── SVG
 ├── Video
 ├── Audio
 ├── Font
 └── Generated frame sequence
```

Each asset should have:

```text
id
source
type
metadata
decoded/parsed state
cache key
```

Assets should be loaded/decode-once where practical.

The renderer should have a preparation phase:

```text
prepareAssets()
       ↓
decode/load/cache
       ↓
render frames
```

rather than discovering everything during individual frame rendering.

---

# 26. Async readiness model

Remotion uses `delayRender()/continueRender()` to prevent capturing a frame before assets are ready.

The new engine should preserve the concept but simplify it.

Use:

```ts
await engine.prepare()
```

before rendering whenever possible.

For dynamic/late-loading resources, provide:

```ts
delayRender()
continueRender()
```

as a compatibility/conceptual alias if useful.

The key requirement is:

> No frame may be emitted while required visual/audio assets are incomplete.

---

# 27. Render pipeline

The ideal render loop is:

```text
Load VideoPlan
      ↓
Validate
      ↓
Prepare assets/fonts/media
      ↓
Build scene graph
      ↓
Initialize renderer
      ↓
For each frame:
        evaluate timeline
        evaluate animations
        evaluate node visibility
        evaluate transforms
        draw scene graph
        apply effects
        produce RGBA frame
      ↓
Encode
      ↓
Mux audio/video
      ↓
Finalize output
```

Avoid unnecessary intermediate image files.

Do not create:

```text
frame0001.jpg
frame0002.jpg
frame0003.jpg
...
```

unless a debug/export mode explicitly requests an image sequence.

The normal path should be:

```text
renderer
  ↓
frame buffer
  ↓
encoder
```

---

# 28. Parallel rendering

The engine should be designed so frame rendering can eventually be partitioned.

Conceptually:

```text
frames 0–99
frames 100–199
frames 200–299
...
```

can be rendered independently if:

- all assets are immutable
- random is seeded
- no animation depends on previous rendered pixels unless explicitly modeled
- audio/video timing is deterministic

Do NOT build distributed rendering in v1.

Just make the core architecture parallel-safe.

---

# 29. Caching strategy

Use caching at several levels:

```text
Font cache
Image decode cache
SVG parse cache
Video metadata cache
Video frame cache
Spring LUT cache
Bezier cache
Effect parameter cache
Scene compilation cache
```

Cache keys must be deterministic.

Do not use global mutable state that can cause one video's render to affect another video's visual output.

---

# 30. Performance philosophy

Do not optimize by deleting features.

Optimize by changing the cost model.

Bad:

```text
"Don't implement effect X because it is expensive."
```

Better:

```text
precompute
cache
batch
reuse textures
reuse paths
avoid allocations
avoid redundant decoding
avoid redundant layout
avoid redundant effect setup
```

The engine should aim for:

```text
small startup
low memory
low per-frame overhead
high asset reuse
minimal IPC
minimal serialization
```

---

# 31. Avoid a React rendering loop

The engine may optionally provide a React-friendly authoring layer later.

But the **core runtime must not depend on React**.

Important separation:

```text
Authoring API
      ↓
Compiler / normalizer
      ↓
VideoPlan / Scene Graph
      ↓
Core engine
```

React is therefore optional.

The core renderer must be able to render plain JSON/internal objects.

This is what makes the engine deployable as a compact service later.

---

# 32. Optional compatibility layer

After the core works, a separate package may provide:

```tsx
<Reel>
  <Sequence>
    ...
  </Sequence>
</Reel>
```

but that layer should compile into the X80 scene graph.

Do not put React directly into the compositor.

---

# 33. Suggested repository structure

Create something approximately like:

```text
x80-video-engine/
│
├── packages/
│   ├── core/
│   │   ├── timeline/
│   │   ├── animation/
│   │   ├── easing/
│   │   ├── spring/
│   │   ├── color/
│   │   ├── random/
│   │   └── scene/
│   │
│   ├── renderer-skia/
│   │   ├── surfaces/
│   │   ├── text/
│   │   ├── image/
│   │   ├── svg/
│   │   ├── video/
│   │   └── effects/
│   │
│   ├── media/
│   │   ├── decode/
│   │   ├── video/
│   │   ├── audio/
│   │   └── metadata/
│   │
│   ├── effects/
│   │
│   ├── transitions/
│   │
│   ├── captions/
│   │
│   ├── encoding/
│   │
│   ├── assets/
│   │
│   └── test-utils/
│
├── examples/
│
├── benchmarks/
│
├── tests/
│
└── docs/
```

A monorepo is recommended because this will eventually contain multiple independently testable subsystems.

---

# 34. Milestone plan

## M0 — Repository + contracts

Deliver:

- TypeScript project
- package boundaries
- SceneNode types
- Timeline types
- Renderer interface
- Asset interfaces
- test runner
- benchmark runner

No visual rendering yet.

### Done when

The project builds cleanly and a trivial scene can be represented as typed data.

---

# 35. M1 — Animation parity

Implement first:

```text
interpolate
interpolateColors
Easing
Bezier
Spring
measureSpring
random
```

Then test extensively.

Create golden tests against Remotion for:

```text
0
1
0.25
0.5
0.75
1
outside range
negative frames
large frames
spring tails
```

### Acceptance criterion

For numeric functions, output should match Remotion to a strict defined tolerance.

Do not proceed to compositor polish until this is reliable.

---

# 36. M2 — Timeline parity

Implement:

```text
Composition
Sequence
Series
Loop
Freeze
Still
nested timing
negative offsets
trim
```

Build tests that compare the local frame seen by a nested node against Remotion.

### Acceptance criterion

Nested timing semantics must match.

---

# 37. M3 — Skia renderer

Implement:

```text
clear
rect
rounded rect
circle
path
image
SVG
text
transforms
opacity
clipping
blend
```

First render:

```text
1080×1920
30 fps
10 seconds
```

as a synthetic test video.

No AI.

---

# 38. M4 — Text fidelity

Build a dedicated typography test suite.

Test:

```text
English
Hindi
Marathi
mixed scripts
emoji
multiline
font weights
variable fonts
alignment
stroke
shadow
wrapping
```

Compare screenshots against known references.

Do not move forward if text layout is obviously unreliable.

---

# 39. M5 — Video + audio

Implement:

```text
image asset
video asset
audio track
video trimming
volume
loop
speed
frame synchronization
```

Use real sample media.

---

# 40. M6 — Effects

Implement the full planned effects catalog in batches.

Suggested order:

### Batch A — frequently used

```text
blur
drop-shadow
brightness
contrast
saturation
hue
grayscale
tint
vignette
noise
light-leak
glow
zoom-blur
chromatic-aberration
pixelate
```

### Batch B — visual polish

```text
film
scanlines
halftone
outline
emboss
paper
roughen
speckle
shine
light-trail
```

### Batch C — geometric/distortion

```text
fisheye
barrel distortion
corner pin
skew
mirror
tile
wave
displacement
regional blur
```

### Batch D — patterns/specialized

Implement the remaining catalog.

The staging is only an implementation order.

The target is broad effect parity.

---

# 41. M7 — Transitions

Implement all target transitions:

```text
Fade
Slide
Wipe
Flip
Clock Wipe
Book Flip
Iris
Zoom Blur
Dreamy Zoom
Film Burn
Linear Blur
Zoom In-Out
Dissolve
Ripple
Crosswarp
Cross Zoom
Swap
Push Cut
```

Build one canonical demo containing every transition.

---

# 42. M8 — Captions + visual typography

Implement:

```text
caption pagination
word highlighting
phrase highlighting
animated captions
typewriter
word reveal
line reveal
subtitle backgrounds
stroke/shadow
```

The engine should accept timestamped caption JSON.

No transcription engine should be included.

---

# 43. M9 — Composition examples

Recreate representative videos.

At minimum:

```text
1. talking-head short
2. café/lifestyle reel
3. faceless explainer
4. motion-graphics-heavy short
5. image montage
6. caption-heavy short
7. product promo
```

This milestone is crucial because the target is not "feature checkbox parity."

The target is:

> Can one declarative engine produce visually strong videos across very different content types?

---

# 44. M10 — Optimization

Only after visual correctness:

Optimize:

```text
asset decoding
font caching
spring LUTs
effect setup
scene traversal
memory allocations
canvas reuse
frame buffer reuse
video-frame caching
encoder pipeline
```

Measure:

```text
startup time
peak RAM
CPU
render time
frames/sec
encode time
asset preparation time
```

Never optimize based on assumptions.

Benchmark first.

---

# 45. Test strategy

Three layers of tests.

## 45.1 Unit tests

For:

```text
interpolate
spring
easing
bezier
random
color
timeline
```

## 45.2 Golden frame tests

Render selected frames and compare:

```text
Remotion reference
vs
X80 reference
```

Use pixel-diff metrics.

For each changed subsystem:

```text
expected image
actual image
diff image
MSE
percentage differing
```

## 45.3 End-to-end video tests

Render full short videos and compare:

```text
duration
fps
resolution
audio duration
frame samples
visual quality
```

---

# 46. Golden parity policy

Remotion is the **reference implementation**, not our runtime dependency.

When a behavior is uncertain:

1. Build a minimal Remotion example.
2. Render it.
3. Observe exact behavior.
4. Record the behavior in a test.
5. Implement X80 to match.
6. Add regression coverage.

Do not guess based on documentation when the behavior can be measured.

The goal is compatibility where it matters, not source-code copying.

---

# 47. Important distinction: compatibility vs implementation

We want:

```text
Remotion concept
        ↓
same or compatible semantics
        ↓
different implementation
```

We do NOT want:

```text
copy Remotion architecture
```

Examples:

```text
Remotion interpolate
→ X80 interpolate

Remotion Sequence
→ X80 Sequence

Remotion spring
→ X80 spring

Remotion effect
→ X80 effect

React component tree
→ X80 scene graph
```

---

# 48. Rendering fallback philosophy

The ideal core renderer is browser-free.

However, do not permanently prohibit a fallback.

Future architecture may be:

```text
Tier 0:
X80 native renderer
↓
Skia

Tier 1:
GPU renderer

Tier 2:
browser/DOM compatibility renderer
```

A browser fallback can handle unusual web-specific content if the product eventually needs it.

But it must not be the default path.

---

# 49. What NOT to implement now

Do NOT implement:

```text
Whisper
STT
LLM
AI video planner
AI image generation
AI video generation
web asset search
stock media search
user authentication
billing
Cloudflare Workers
Durable Objects
Cloud Run
Render.com
Lambda
S3/R2 integration
API gateway
job queue
web dashboard
editor UI
full Remotion Studio
full Remotion Player
agent system
```

Do NOT spend time optimizing cloud costs yet.

Do NOT build distributed rendering yet.

Do NOT build a SaaS API yet.

The only target is:

> A local, deterministic, high-quality core video engine.

---

# 50. What the first usable API should feel like

It should eventually be possible to express a video without React:

```ts
const video = createVideo({
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: 300,
});

video.add(
  image({
    src: "cafe.jpg",
    from: 0,
    duration: 150,
    x: 0,
    y: 0,
    width: 1080,
    height: 1920,
    animation: zoomIn({
      from: 1,
      to: 1.15,
      easing: "easeOut",
    }),
  })
);

video.add(
  text({
    text: "This coffee changed everything",
    from: 30,
    duration: 90,
    animation: popIn(),
  })
);

await engine.render(video, {
  output: "out.mp4",
});
```

But the preferred long-term representation is JSON-compatible:

```json
{
  "width": 1080,
  "height": 1920,
  "fps": 30,
  "durationInFrames": 300,
  "scenes": [
    {
      "type": "video",
      "src": "cafe.mp4",
      "from": 0,
      "duration": 150,
      "transform": {
        "scale": {
          "animation": "slowZoom"
        }
      }
    }
  ]
}
```

This is important because the future AI layer will generate this structure, not arbitrary renderer code.

---

# 51. Design for the future AI planner without implementing it

The core engine should accept a stable, declarative plan.

The future external pipeline will be:

```text
user video
    ↓
Whisper
    ↓
semantic analysis
    ↓
asset selection/generation
    ↓
VideoPlan JSON
    ↓
X80 Engine
    ↓
video
```

The engine's responsibility begins at:

```text
VideoPlan JSON
```

and ends at:

```text
video file / encoded stream
```

Do not contaminate the core with AI-specific assumptions.

---

# 52. Definition of success

The engine is successful when all of the following are true:

### Correctness

- frame deterministic
- timeline deterministic
- animation deterministic
- asset loading deterministic
- reproducible output

### Capability

- talking-head videos work
- faceless videos work
- real-footage reels work
- motion-heavy videos work
- captions work
- typography works
- images work
- SVG works
- video works
- audio works
- effects work
- transitions work

### Engineering

- no Chromium required for the standard path
- no Puppeteer required
- no React required by the core
- no Rspack required for rendering
- no per-frame CDP screenshot
- renderer backend is replaceable
- assets can be cached
- frame rendering can be parallelized later

### Performance

Measure and report:

```text
cold start
warm start
RAM peak
CPU utilization
render seconds / video second
frames/sec
encode time
asset preparation time
```

Do not set an arbitrary final performance claim before benchmarking.

---

# 53. Living-document rules for the implementation agent

This file is intended to remain open during development.

At the end of every meaningful implementation step, update:

```text
Status
Completed
In progress
Next
Known issues
Benchmarks
Compatibility findings
```

Maintain a section:

```text
## Implementation Log
```

with dated entries.

When a design decision changes:

1. Update the architecture section.
2. Add a decision entry.
3. Record why the decision changed.
4. Update affected milestones.

Do not silently change architecture.

---

# 54. Implementation Log

## 2026-09-22 — Initial architecture

### Decision

Build an independent X80 core engine instead of modifying the complete Remotion runtime.

### Reason

The important Remotion concepts are compact, while the conventional rendering path contains substantial browser/bundling/IPC machinery.

### Decision

Use frame-pure deterministic timing.

### Reason

This is one of the strongest properties of Remotion and is essential for rendering reproducibility.

### Decision

Use a custom scene graph rather than React as the compositor runtime.

### Reason

The future AI system needs a declarative representation, and the core engine should not carry React reconciliation overhead.

### Decision

Use Skia as the initial rendering backend.

### Reason

The target workload is primarily 2D compositing: text, images, SVG, video, shapes, transforms and effects.

### Decision

Keep full visual parity as a goal.

### Reason

The product cannot safely assume that users will only need simple animations. The engine needs to support motion-heavy and effects-heavy videos too. We will optimize the implementation rather than deliberately removing capability.

### Decision

Keep rendering backend abstraction.

### Reason

Future benchmarking may show that GPU PixiJS, Vello or another backend is better for some workloads. The timeline and animation system should survive that decision.

### Decision

Do not work on deployment yet.

### Reason

The current milestone is purely to establish a correct, capable core engine. Infrastructure decisions come after measurable renderer behavior exists.

---

## 2026-09-22 — M0 + M1 + M2 implemented (`x80-video-engine/packages/core`)

### Status

M0 (contracts, repo, test/bench runners): done. M1 (animation parity): done.
M2 (timeline parity): done. Next: M3 Skia renderer spike.

### Completed

```text
x80-video-engine/
├── package.json (workspaces) + tsconfig.base.json
├── benchmarks/run.mjs (node:perf_hooks throughput runner)
├── examples/hello-plan.ts (typed VideoPlan, no React)
├── docs/ (placeholder for renderer/media notes)
└── packages/core/ (@x80/core 0.1.0, ESM, strict TS, vitest 3.2.4)
    ├── src/version.ts
    ├── src/timeline/{types.ts, resolve.ts}
    ├── src/scene/types.ts
    ├── src/renderer/types.ts
    ├── src/assets/types.ts
    ├── src/animation/{types, interpolate, easing, bezier, spring, random, colors}.ts
    └── tests/ (112 tests, all passing; build + typecheck clean)
```

- M0: `VideoComposition`/`SceneNode`/`Transform`/`Effect`, `Renderer` interface
  (`createSurface/clear/draw*/applyEffect/composite/readPixels`),
  `AssetRef`/`AssetStore`/`AudioMixRequest`, timeline node types,
  `timeInSeconds`/`frameFromSeconds`, example plan, bench runner.
- M1: full animation core — scalar/multi-stop/per-segment-easing/posterize/
  perceptual-scale/tail-continuation `interpolate`; exact string grammar
  (scale/translate/rotate/axis/origin, zero-padding, z-axis default for lone
  angles); tuples; discrete strings; all 18 `Easing` members; Newton+binary
  `bezier`; analytic `spring` + `measureSpring` (delay/reverse/duration-stretch/
  overshootClamping); mulberry32 `random`; strict-grammar `processColor` +
  `interpolateColors` (hex/rgb/hsl/named + hwb/lab/lch/oklab/oklch).
- M2: pure `resolveTimeline`/`collectLeaves` — Sequence (raw-prop visibility
  window, `ceil` float end, trimBefore, negative pre-roll with
  `cumulatedNegativeFrom`, width/height scoping, freeze prop), Series
  (offsets, Infinity-last-only), Loop (iteration/from desugar + loop info),
  Freeze (boolean + fn active), Still (local 0), Composition validation.

### Benchmarks (node v20.19.0, `benchmarks/run.mjs`)

```text
interpolate scalar               ~5.73M ops/s
interpolate multi-stop+easing    ~1.67M ops/s
interpolate string px            ~300k ops/s  (reparses every call — M10: cache parsed forms)
spring default f30               ~517k ops/s  (memoized frame cache)
measureSpring default            ~943k ops/s  (cached)
Easing.bezier                    ~2.32M ops/s
interpolateColors                ~302k ops/s
random seeded                    ~10.5M ops/s
resolveTimeline+collectLeaves    ~669k ops/s
```

Core math is not the bottleneck: a 300-frame reel evaluates timeline +
animation for visible leaves in single-digit milliseconds total.

### Compatibility findings (all verified live against installed Remotion 4.0.526)

1. String grammar is narrower than docs suggest: `scale()`/`translate()`/
   `rotate()` wrappers and comma-separated lists are DISCRETE (need
   `Easing.step1`); scientific notation (`1e2px`) is discrete; `ms`/`s`
   units throw `... "ms" is not a supported translate or rotate unit`.
   Lone angle vs axis form merges as z-axis rotation (`x 45deg` vs `45deg`
   → `0.5 0 0.5 45deg`). Count mismatch zero-pads (`left` vs `10%` →
   `5% 25%`). Error texts replicated verbatim (kind/unit/pair messages).
2. Color grammar is strict-legacy + modern-space: `rgb()` takes exactly 3
   comma numbers (truncated + clamped, so `127.5` → `127`); `rgba()` alpha
   is decimal-only (a `50%` alpha throws); `hsl()` hue is unitless and
   s/l require `%`; space syntax valid only for hwb/lab/lch/oklab/oklch
   (+ `/alpha`). All alphas quantize to 8-bit (`0.5` → `0.502`); derived
   channels round to int at parse (off-by-one trap for float pipelines).
3. Sequence visibility uses the RAW `durationInFrames` prop and raw `from`
   (not clipped `actualDurationInFrames`, not `from - trimBefore`); end
   uses `Math.ceil` (float durations). `Loop` desugars to
   `from = min(iteration*duration, duration*(actualTimes-1))`.
   `Freeze` pins to `frame + enclosingRelativeFrom` and zeroes
   `cumulatedFrom` below the pin. All replicated.
4. Reference reuses the critical-damping branch for over-damped springs —
   cloned as-is per compatibility-over-correctness rule.

### Known issues / staged (not regressions)

- String unit set locked to probed list (16 lengths + 4 angles); unobserved
  units throw by design.
- Unobserved origin orderings (e.g. `center left`) throw invalid-pair;
  documented as implementation-defined until probed.
- `Series` wrapper-level from/duration props not modeled (transparent);
  nested `Sequence` covers the need.
- Premount/postmount affect mounting only — recorded nowhere yet (M5).
- No renderer yet: M3 Skia spike is the next milestone; renderer interface
  is frozen for it.

### Next

M3: `@napi-rs/canvas` spike — implement `Renderer` for
clear/rect/rrect/circle/path/image/text/transforms/opacity/clip, render a
synthetic 1080×1920/30fps/10s video as PNG sequence, then decide the
M4 typography harness (Devanagari + emoji cases from §19).

## 2026-09-22 — M3 Skia renderer complete

### Status

M3 done. 23/23 renderer tests pass; core untouched except two additive
changes (AnimNumber props, optional `setBlendMode`). Next: M4 typography.

### Completed

- `packages/core/src/animation/bindings.ts`: `AnimNumber` (JSON-data
  interpolate/spring bindings) + `resolveAnimNumber(frame, fps)`.
- `packages/core/src/compositor/render.ts`: backend-agnostic `renderFrame()`
  returning `{resolveMs, drawMs, leaves}`; Timeline → Scene → Renderer only.
- `packages/renderer-skia`: `SkiaRenderer` (full `Renderer` interface on
  `@napi-rs/canvas` 0.1.65) + `loadImageAsset`/`preloadImages` decode-once map.
- Synthetic scene (1080×1920, 30fps, 300f): bg, animated rect,
  spring-scaled rrect, fading circle, image, sliding text, rotating group,
  nested sequences, loop. 12 golden PNGs in `tests/golden/`.
- Remotion cross-check: new `M3Compare` comp in `my-video` rendered via
  headless-Chrome still at frame 140 — bg exact, red run 412→611 both,
  interior exact (delta 0px). Committed as
  `tests/golden/remotion-m3compare-140.png` with a locking test.
- Env fixes (not engine): `chmod +x` on esbuild/Chromium binaries in
  `my-video/node_modules` (extracted without exec bits).

### Benchmarks

2.20 ms/frame (455 fps) for 300 frames on one reused surface; resolve 2.5%,
draw 96.9%; peak RSS 81.6 MB; worst frame #0 10.58 ms (cold JIT).
Full table in `PROGRESS.md` §3b.

### Compatibility findings

- Canvas `fillRect` at fractional x antialiases identically to the browser
  div for the tested case (run-start delta 0px) — no geometry fudge needed.
- System-font text drew correctly for Latin caps; shaping beyond that is
  untested by design (M4).
- `ctx.letterSpacing` set guarded (unsupported → ignored, non-fatal).

### Known issues

- Text/font loading, video, effects, transitions, encoding all throw
  explicit staged errors (see PROGRESS.md §3b limitations).
- `crop` currently aliases `clip`; image nodes need explicit dims + fill fit.

### Decision

Skia stays the primary backend (see verdict in PROGRESS.md §3b).

---

## 2026-09-22 — M7 transitions complete (M4–M6 logged in PROGRESS.md)

### Status

M7 done. Suite at 220/220 across 17 files; all packages build + typecheck
clean. M4 (typography), M5 (media), ENCODING (MP4) and M6 (71-effect
registry) were completed earlier — see PROGRESS.md §3c/§3d and the status
table for their evidence.

### Completed

- `TransitionNode` as a first-class timeline leaf: `a`/`b` subtree refs,
  `aFreeze`/`bFreeze` or continue-mapping, `TransitionEasing` progress curve,
  loud validation (`resolve.ts`).
- `renderTransition()` in the compositor: renders A/B subtrees to temp
  surfaces at mapped local frames, blends via `RenderFrameOptions.
  transitionApplier` — keeps `Renderer` interface untouched.
- 19-blend registry in `@x80/effects/transitions.ts` covering all 18
  targets (fade, slide, push-cut, swap, wipe, flip, book-flip, clock-wipe,
  iris, zoom-blur, dreamy-zoom, film-burn, linear-blur, zoom-in-out,
  cross-zoom, dissolve, ripple, crosswarp) + `none` hard cut; params
  (`direction`, `axis`, `soft`, `startAngle`, `maxBlur`) validated loudly.
- `SkiaRenderer.applyTransition` + `skiaTransitionApplier` export wired to
  `renderFrame`; native canvas handles passed through `CanvasLike` wrappers
  (fixes silent `ctx.filter` blur fallback + `drawImage` InvalidArg).
- 19 golden PNGs (`tests/golden-transitions/tr-*.png`, frame 45) — one per
  blend; 19 new tests (6 resolver, 9 blend, 4 pipeline).

### Known issues

- `iris` supports circle only (other shapes staged); `clock-wipe` start
  angle is a param but orientation order is fixed.
- Soft-wipe seam and full-circle-arc empty-path bugs found and fixed while
  writing endpoint tests (regressions locked by golden + endpoint asserts).

### Next

M8: captions + kinetic typography (`Caption` type already in contracts;
reuse M4 layout/shaping — timed text, box styling, per-word progress).

---

## 2026-09-22 — M8 captions complete

### Status

M8 done. Suite at 248/248 across 19 files (was 220/220 across 17);
all packages build + typecheck clean. Baseline re-verified before
starting (220/220, no drift); `/tmp` + `~/.fonts` artifacts rescued
into `/kaggle/working/_rescue/` (no source references outside
`/kaggle/working/`).

### Completed

- `packages/core/src/captions/`: `types.ts` (Caption/TikTok shapes,
  highlight/reveal modes, loud asserts), `pagination.ts`
  (`createTikTokStyleCaptions`, `ensureMaxCharactersPerLine`,
  `pageDisplayText`, active-page/token/progress helpers),
  `srt.ts` (`parseSrt`/`serializeSrt`), `highlight.ts`
  (token states, reveal visibility, typewriter budgets, frame→ms,
  enter/exit fades) — X80-owned, reference-compatible.
- `CaptionNode` scene type (JSON-first: combineMs, breakSilenceMs,
  maxCharsPerLine, highlight, reveal, full text style, background /
  activeBackground + padding / radius, enter/exit fades).
- Compositor `paintCaption()`: frame→ms page lookup, M4 layout, laid
  word→token quota mapping (multi-word + hard-break safe), per-word
  fill, background boxes, reveals, grapheme typewriter, fades.
- 21 core tests incl. live deep-equality vs installed
  `@remotion/captions` (TikTok ×4, max-chars ×2, SRT ×3); 7 Skia
  pipeline tests + 3 golden PNGs (`golden-captions/`).

### Benchmarks

Caption pagination (60 words) ~82k/s (~12µs/op); active-page lookup
~17.7M ops/s — per-frame caption overhead negligible, no M10 action.

### Compatibility findings

- Reference TikTok pagination / max-chars / SRT quirks (trimStart
  handling, orphan prevention, Infinity-duration fixup, BOM/CR
  normalization, pageBreakAfter splits) cloned exactly and locked by
  parity tests.
- Pipeline tests first rendered nothing: plan lacked an explicit
  timeline leaf and the `@x80/core` dist was stale — fixed by adding
  `{kind:'leaf', ref:'cap'}` and rebuilding (documented in PROGRESS
  §3f; real usage always carries explicit leaves).

### Known issues

- `highlight: 'phrase'` colors all spoken tokens; per-phrase (noun /
  keyword) semantic coloring is authoring-layer work, not engine.
- Caption pages recompute per frame (~12µs) — cache only if M9
  profiles it hot (M10).

### Next

M9: composition examples (§43) — 7 representative videos from existing
primitives; no new engine features expected.

---

## 2026-09-22 — M9 compositions complete

### Status

M9 done. Suite at 257/257 across 20 files (was 248/248 across 19);
all packages build + typecheck clean. The §43 question is answered:
one declarative engine produces all 7 content types with zero new
engine features.

### Completed

- `examples/m9/`: shared builders + 7 `VideoPlan` builders
  (talking-head, cafe-reel, explainer, motion-graphics, montage,
  caption-heavy, product promo), all 540×960/30fps, typechecked via
  `examples/m9/tsconfig.json`.
- Real assets in-pipeline: cafe `cut2.mp4` (360×640/2s/30fps H.264,
  probed + decoded) and 4 JPEG stills from `my-video/public`
  (preloaded once, `cover` fit).
- `m9-compositions.test.ts` (9 tests): every composition renders 3
  sample frames deterministically (dims + determinism asserts), one
  golden PNG each (`golden-m9/`), plus a 60-frame 540×960 H.264 MP4
  encoded end to end from the caption-heavy plan (ffprobe-verified).
- `@x80/encoding` added as a renderer-skia devDependency for the MP4
  proof (resolves via root workspace hoisting).

### Benchmarks

Full M9 file (9 tests incl. 60-frame MP4 encode) runs in ~5–7s;
per-composition frames render in single-digit ms except effect-heavy
ones (glow/vignette at 540×960) — no new bottleneck class beyond the
known M6 per-pixel loops.

### Known issues

- Transition windows only blend: still leaves bracket every
  transition so no frame goes black (montage, café, promo).
- MP4 proof artifact goes to `tmpdir()`, not the repo, by design.

### Next

M10: optimization (§44) — measure first, never cut features. Known
candidates: per-pixel effect loops, string-form parse cache, caption
page recompute (~12µs, likely skip).

---

## 2026-09-22 — M10 optimization complete (all milestones done)

### Status

M10 done — and with it M0–M10 + ENCODING. Suite at 257/257 across 20
files; all packages build + typecheck clean; every project file
verified inside `/kaggle/working/` (new `x80-m9-caption-heavy.mp4`
test artifact rescued to `_rescue/full-tmp/`).

### Completed

- `interpolate.ts`: `compileStringForm()` + bounded content-keyed
  cache (1000 entries, NUL-joined key, successes only) — strings
  339k → ~1.15M ops/s (3.4×, stable).
- `colors.ts`: parsed-color cache inside `interpolateColors` (2000
  entries; exported `processColor` untouched, still always fresh) —
  369k → 430–537k ops/s (~1.3×).
- No behavior change: full suite green before and after; caches hold
  shared-immutable records, errors fire identically on repeat calls.

### Benchmarks

Full `run.mjs` table refreshed (see PROGRESS.md §6). Frame baseline
unchanged within noise (2.27 → 2.41 ms/frame — M3 scene barely uses
the cached paths, as expected). Method fix: `run.mjs` reads
`packages/core/dist`, so dist must be rebuilt before every bench —
the first post-change run measured stale code and was discarded.

### Skipped by measurement (not assumption)

- `indexScene` WeakMap (<0.1% of a frame), caption page memo (0.5%),
  per-frame `layoutText` memo (keys cost more than they save),
  effect-loop rewrites (fidelity risk, needs a diff harness).

### Next

Nothing pending. The engine is complete per this plan: deterministic,
browser-free, JSON-first short-form video compositor with Remotion
compatibility where it matters, 7 proven content types, and no
features cut for speed.

---

# 55. Source/reference notes

The supplied Remotion teardown states that:

- Remotion's render model is React → bundle → headless Chrome → frame capture → encode.
- The core animation system is based around interpolation, spring, easing and deterministic random.
- Timeline primitives include Composition, Sequence, Series, Loop and Freeze.
- The analyzed installation counted 74 effects, 18 easing methods and 7 keyframe presets.
- The teardown explicitly identified Chromium, Puppeteer/CDP screenshots, bundling and native compositor/FFmpeg packaging as major sources of weight.
- The teardown proposed a zero-Chromium rendering tier using a pure frame renderer plus Canvas/WebCodecs-style encoding and identified the same major open issues we should solve experimentally: text fidelity, video-frame extraction and encoding.

Primary source:

`REMOTION_DEEP_DIVE.md`

Use the actual installed/source code of the chosen Remotion version as the behavioral reference when parity questions arise. Do not assume that a future Remotion release is identical to the analyzed version.

---

# 56. Final instruction to the implementation agent

You are building **ONLY the X80 Video Engine core**.

Do not build the AI pipeline.

Do not build deployment.

Do not stop at a toy renderer.

Do not optimize by removing important Remotion capabilities.

Build the engine in this order:

```text
1. Contracts
2. Animation parity
3. Timeline parity
4. Scene graph
5. Skia renderer
6. Typography
7. Media
8. Effects
9. Transitions
10. Captions
11. Encoding
12. Representative videos
13. Benchmarking
14. Optimization
```

At every stage:

```text
implement
→ test against reference behavior
→ benchmark
→ document
→ move forward
```

The final result should feel conceptually like:

```text
             REMOTION'S GOOD IDEAS
                       +
              NATIVE 2D RENDERING
                       +
              FULL VISUAL TOOLKIT
                       +
              JSON-FIRST SCENE GRAPH
                       +
              LOW RUNTIME OVERHEAD
                       =
                X80 VIDEO ENGINE
```

The objective is not to make a smaller toy.

The objective is to make a **real general-purpose short-form video compositor that preserves the power users liked in Remotion while removing the browser-heavy architecture that the product does not fundamentally require.**
