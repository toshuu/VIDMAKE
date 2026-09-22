# X80 Video Engine — Handbook

**Version:** 0.1.0 (`@x80/core`) · **Date:** 2026-09-22 · **Status:** M0–M10 + ENCODING complete

A deterministic, browser-free, JSON-first short-form video compositor.
Same good ideas as Remotion (frame-pure timing, `interpolate`/`spring`/`Easing`,
timeline primitives) with native 2D rendering instead of headless Chrome.

```text
VideoPlan (JSON data)
      ↓
resolveTimeline  →  visible leaves (refs + localFrames)
      ↓
scene lookup     →  declarative nodes + AnimNumber bindings @ localFrame
      ↓
Renderer         →  pixels (Skia today; GPU/Vello/Pixi later)
      ↓
Encoder          →  H.264/AAC MP4 (in-process, no FFmpeg CLI)
```

Golden rule: **every visual is a pure function of `(VideoPlan, frame, fps, assets)`.**
No wall-clock sources, no React in the render path, no network at render time.

---

## 1. Quick start

### 1.1 Install

```bash
cd /kaggle/working/x80-video-engine
npm ci            # restores all workspaces from package-lock.json
npm run build     # tsc in every package (core dist MUST be rebuilt
                  # before running benchmarks — they import dist, not src)
```

Requirements: Node ≥ 20. Native deps (`@napi-rs/canvas`, `@napi-rs/webcodecs-…`)
ship prebuilt binaries; if a fresh machine lacks them, `npm ci` fetches them.

### 1.2 Render your first frame (60 lines, zero browser)

```ts
import { renderFrame } from '@x80/core';
import type { VideoPlan } from '@x80/core';
import { SkiaRenderer, createSkiaMeasurer } from '@x80/renderer-skia';
import { writeFileSync } from 'node:fs';

const plan: VideoPlan = {
  composition: {
    id: 'hello', width: 540, height: 960, fps: 30, durationInFrames: 90,
    root: {
      id: 'root', type: 'container',
      children: [
        { id: 'bg', type: 'rect', width: 540, height: 960, fill: '#0e1626' },
        {
          id: 'title', type: 'text', text: 'Hello, X80',
          fontFamily: 'Noto Sans', fontSize: 64, fill: '#ffffff',
          x: { binding: 'interpolate', inputRange: [0, 60], outputRange: [-400, 70] },
          y: 440,
        },
      ],
    },
  },
  timeline: {
    kind: 'sequence', from: 0, durationInFrames: 90,
    children: [{ kind: 'leaf', ref: 'bg' }, { kind: 'leaf', ref: 'title' }],
  },
};

const renderer = new SkiaRenderer();
const surface = renderer.createSurface(540, 960);
renderFrame(renderer, surface, plan, 30, { measureText: createSkiaMeasurer() });
writeFileSync('frame-30.png', await renderer.encodePng(surface));
renderer.destroySurface(surface);
```

Fonts must be registered **before** measuring/drawing (deterministic, no
implicit fallback timing):

```ts
import { registerFontFile } from '@x80/renderer-skia';
registerFontFile('./fonts/NotoSans-Regular.ttf', 'Noto Sans');
```

### 1.3 Encode a full MP4

```ts
import { renderToMp4 } from '@x80/encoding';

const surface = renderer.createSurface(540, 960);
const mp4: Buffer = await renderToMp4({
  width: 540, height: 960,   // must both be EVEN (codec requirement)
  fps: 30, frameCount: 90,
  renderFrame: (f) => {
    renderer.clear(surface, '#000000');
    renderFrame(renderer, surface, plan, f, { measureText });
    return Buffer.from(renderer.readPixels(surface).data); // RGBA, W*H*4
  },
  audio: { pcm: stereoFloat32, sampleRate: 44100, channels: 2 }, // optional
});
writeFileSync('out.mp4', mp4);
```

Use `defaultVideoBitrate(width, height, fps)` to size the bitrate, or pass
`videoBitrate` / `audioBitrate` explicitly. Validate with
`ffprobe -show_entries stream=codec_name,width,height`.

---

## 2. Concepts

### 2.1 Frame-pure timing

The only clock is `(frame: integer, fps)`. Helpers in `@x80/core`:

```ts
timeInSeconds(frame, fps)      // frame / fps
frameFromSeconds(seconds, fps) // Math.round(seconds * fps)
```

Consequences: renders are byte-deterministic (same inputs → same pixels),
parallel-safe (frames partition trivially), and testable without sleeps.

### 2.2 VideoPlan

```ts
interface VideoPlan {
  composition: VideoComposition; // id, width, height, fps, durationInFrames, root
  timeline?: TimelineNode;       // overlay binding scene refs to time
  assets?: AssetRef[];           // declared inputs (see §2.7)
  audio?: AudioMixRequest[];     // mixed at encode time, ignored by compositor
}
```

Plans are plain data — serializable, generatable by an AI planner, diffable.

### 2.3 Timeline

Mirrors Remotion semantics with data instead of components:
`sequence` (window + offset children) · `series` (back-to-back with
overlap/gap offsets) · `loop` (repeat a window) · `freeze` (pin a frame) ·
`still` (single frame) · `leaf` (points at a scene node by `ref`) ·
`transition` (first-class A/B blend node).

Key semantics (cloned from the reference, locked by tests):

- Sequence visibility uses the **raw** `durationInFrames` prop and raw `from`;
  float ends use `Math.ceil`.
- `Loop` desugars to `from = min(iteration*duration, duration*(actualTimes-1))`.
- `Freeze` pins to `frame + enclosingRelativeFrom` and zeroes cumulated `from` below.
- Transition leaves carry eased `progress` + mapped `aFrame`/`bFrame`
  (`freeze` default for A, or `continue` with offsets).

Resolve then collect, every frame:

```ts
import { resolveTimeline, collectLeaves } from '@x80/core';
const leaves = collectLeaves(resolveTimeline(plan.timeline, frame, durationInFrames));
// → [{ ref: 'title', localFrame: 12, transition?: {...} }, ...]
```

⚠️ A bare `sequence` with no `children` yields **zero leaves** — every scene
node you want drawn needs an explicit `{ kind: 'leaf', ref: '<scene id>' }`
covering its frames, and still leaves must bracket every transition window
or frames go black outside the blend.

### 2.4 Animation (Remotion-compatible, X80-owned)

```ts
interpolate(input, inputRange, outputRange, options?) // numbers, strings, tuples
interpolateColors(input, inputRange, colorStops)      // → "rgba(r, g, b, a)"
spring({ frame, fps, from?, to?, config?, ... })      // physics, deterministic
measureSpring(...) / resolveSpringConfig(...)         // introspection
Easing          // step1, linear, quad/cubic/…, sin, exp, circ, back, bezier, …
bezier(x1, y1, x2, y2)                                // cubic-bezier factory
random(seed) / createSeededRng(stream)                // deterministic random
```

Deliberately cloned reference quirks (compatibility > elegance, all tested):
over-damped springs reuse the critical-damping branch; alpha quantizes to
8-bit (`0.5` → `0.502`); strict color/string grammars; 16 length + 4 angle
units — unobserved units/origins **throw loudly** instead of guessing.

**Declarative bindings** keep numeric scene props animated yet JSON-serializable:

```ts
x: { binding: 'interpolate', inputRange: [0, 60], outputRange: [0, 540],
     options: { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } }
scaleX: { binding: 'spring', from: 0.2, to: 1 }
opacity: { binding: 'spring', from: 0, to: 1, delay: 10 }
```

Evaluated per node against its **local** frame via `resolveAnimNumber(value, frame, fps)`.
Effect params accept the same `{ binding }` objects (resolved per frame by
`resolveEffectParams`).

### 2.5 Scene graph

Independent transform props (never one opaque string): `x/y/scaleX/scaleY/`
(animatable), `rotation` (degrees, animatable), `anchorX/anchorY`,
`opacity` (animatable), `visible`, `blendMode`, `crop`/`clip`, `mask`
(staged — throws), `effects[]`, `children[]`.

Node types: `container` · `group` · `rect` · `rrect` · `circle` · `path`
(SVG data) · `svg` · `text` · **`caption`** (M8) · `image` · `video` ·
`shape`/`mask` (staged — throw) · `effectLayer` (full-frame grade applied
to everything beneath in paint order).

- `text`: `fontFamily/Size/Weight/Style`, `lineHeight` (×fontSize, default
  1.2), `letterSpacing`, `textAlign` (incl. `justify` with `maxWidth`),
  `textTransform`, `fill/stroke/strokeWidth`, `shadow`, `maxWidth`.
  `fontSize` and `letterSpacing` accept `AnimNumber` (kinetic type,
  re-laid-out per frame — keep to a few nodes).
- `image`/`svg`: `src` asset id (preferred) or inline; `width/height` or
  probed asset info; `fit: cover|contain|fill|none` (`crop` currently aliases `clip`).
- `video`: `src`, `startFrom/trimBefore/trimAfter`, `volume`,
  `playbackRate`, `loop`, `fit`, `width/height`. Needs a video-frame
  resolver + asset info with `fps + durationSec` (see §4.4).
  **Proxy rule:** info dims must describe the *decoded handles*, never the
  container (a 540×960 proxy reports 540×960, or cover-crops misfire).
- `caption`: timed word captions (see §3.5).
- Paint: every shape/text `fill` accepts a flat color, a linear/radial/
  conic gradient (`{kind, angle?, cx?, cy?, inner?, outer?, stops[]}`,
  CSS semantics, resolved over the shape's bbox), or a keyframed
  `{binding:'color', inputRange, colorStops}` (strict color grammar;
  gradient stops are NOT animatable — cross-fade via node `opacity`).
  Shapes also take `shadow` (box-shadow approximation, no spread/inset).
  Paths reject gradient fills loudly (no bbox without rasterizing).

### 2.5b Premium look (recipes, all declarative)

- **Depth without GPU:** gradient scrims over footage (alpha stops),
  radial top-glows with `screen` blend, one `shadow` per hero shape.
  Prefer these to full-frame pixel effects (50–200 ms/frame at 1080×1920).
- **Film grain, zero per-frame cost:** `createGrainTile(w, h, {seed,
  amount})` once (oversize vs the comp, e.g. 660×1080 for 540×960),
  draw as an `image` node with `blendMode: 'overlay'`, opacity 0.05–0.12,
  and drift `x/y` across frames. Baked once (~90 ms), ~1 ms/frame after.
- **Marker annotations** (rough-notation Highlight equivalent): a
  translucent `rrect` behind the word, `scaleX` 0→1 with `anchorX: 0`.
- **Kinetic type:** animate `fontSize`/`letterSpacing` with clamp +
  expo-out easing; keep 1–3 such nodes (each re-runs layout per frame).
- **Timing surface (all in `interpolate` options):** per-segment
  `easing` arrays, `output: 'perceptual-scale'` for scale ramps,
  `posterize` for stepped looks — same vocabulary as the reference.
- **Sound is picture:** `decodeAudioToPCM` + `mixTracks` (bed with
  `fadeIn/OutFrames`, stingers at `fromFrame`) → `renderToMp4({audio})`.
  Silent reels read as unfinished; budget audio like footage.
- **Typefaces:** vendor static TTF/OTF next to the plan (Inter-class
  grotesque for UI, one expressive serif italic for quotes); register
  both weights up front. No implicit fallback timing, ever.

### 2.6 Renderer abstraction

`Renderer` is backend-agnostic: `create/destroySurface`, `clear`,
`save/restore`, `setOpacity`, `setBlendMode?`, `setTransform` (composes:
T·A·R·S·A⁻¹), `clipRect`, `drawRect/RoundedRect/Circle/Path/Image/Text/
VideoFrame`, `applyEffect`, `composite`, `readPixels`. Text `y` is the
**top** of the em box (`textBaseline 'top'`).

The compositor (`renderFrame(renderer, surface, plan, frame, options?)`)
is backend-free: resolve → leaves → scene lookup → bindings → draw calls.
`RenderFrameOptions` wires capabilities: `resolveAsset`, `measureText`,
`resolveVideoFrame`, `assetInfo`, `transitionApplier`. Missing wiring
throws a telling error (e.g. *"needs RenderFrameOptions.transitionApplier"*).

### 2.7 Assets: prepare once, reuse across frames

Pipeline: `prepareAssets()` → decode/load/cache → render frames.
**No frame may be emitted while required assets are incomplete.**

- Images/SVG: `preloadImages({ id: pathOrBuffer })` → `Map` → pass
  `resolveAsset: (src) => map.get(src)`; dims via `probeImage` →
  `assetInfo`.
- Video: `probeVideo(path)` → metadata; `decodeVideoFrames(path)` →
  store → `framesToCanvases(store)` → `clipResolver(clips)`; asset info
  needs `{ width, height, durationSec, fps }`.
- Fonts: `registerFontFile(path, family)` / `registerFontBuffer(buf, family)`,
  `ensureSystemFonts()`, `createSkiaMeasurer()` (measure cache built in),
  `probeLetterSpacingSupport()`.
- Audio: `decodeAudioToPCM`, `mixTracks`, `writeWav` (`MIX_SAMPLE_RATE`,
  `MIX_CH
...[truncated 17908 chars]