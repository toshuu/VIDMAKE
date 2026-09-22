# Remotion 4.0.526 — Complete Internal Teardown
### Goal: understand it well enough to build a better, lightweight, everyday-use, high-fidelity alternative

> Generated from live analysis of `/kaggle/working/my-video` (Remotion 4.0.526, React 19.2.3, Rspack, Tailwind v4).
> Sources: `node_modules/remotion/dist/cjs/*`, `node_modules/@remotion/*`, `.agents/skills/*/SKILL.md`, `src/*.tsx`, `remotion.config.ts`, `out/*`.
> Date: 2026-09-22

---

## 0. TL;DR

Remotion is **React → deterministic frame function → headless-Chrome screenshots → FFmpeg encode**.

```
React component (frame: number) ──bundle (Rspack)──▶ static HTML+JS
        ▲                                              │
        │ useCurrentFrame() = globalFrame - offsets    ▼
        └────────────────────────────────── headless Chrome (?frame=N)
                                                       │ CDP Page.captureScreenshot (jpeg/png per frame)
                                                       ▼
                                              FFmpeg / Rust compositor → mp4/webm/gif + audio mux
```

Key ideas that make it great:

1. **Time = integer frame.** No `requestAnimationFrame`, no wall-clock. `frame / fps = time`. Everything (`interpolate`, `spring`, `random(seed)`, `<Sequence>`, `<Video>`) is a pure function of `frame`. That gives scrubbing, parallel rendering, and reproducibility.
2. **Composition as registry.** `<Composition id durationInFrames fps width height component>` declares a render target. Studio/renderer enumerates them without playing anything.
3. **Remount-per-frame rendering.** The bundler serves one page; the renderer navigates to `?frame=N` (conceptually `seekToFrame(N)`) and screenshots when `window.remotion_renderReady === true`.
4. **`delayRender / continueRender` gate.** Async assets (fonts, video, images) block the screenshot via a handle counter.
5. **Animation engine is tiny but complete:** `interpolate` + `spring` + `Easing` + `random`. ~99 countable primitives installed (74 effects + 18 easings + 7 keyframe presets, see §5).
6. **Ecosystem is packages + skills.** 25 `@remotion/*` packages on disk; 12 agent `SKILL.md` files that teach an LLM how to author/preview/render.

Biggest costs (our opening for a better alternative): Chromium + Puppeteer pool + FFmpeg native binaries = heavy install (~hundreds of MB), slow cold start, per-frame browser round-trip, no real-time GPU timeline, React remount overhead, Tailwind/CSS-animation footguns.

This project right now:

| Item | Value |
|---|---|
| Compositions (`src/Composition.tsx`) | `IphonePromo` 1920×1080, `IphonePromoVertical` 1080×1920, `WaterReel` 1080×1920, `WaterReelV2` 1080×1920, `CafeReel` 1080×1920 — all 300f @30fps (10s) |
| Components | `IphonePromo.tsx`, `IphonePromoVertical.tsx`, `WaterReel.tsx`, `WaterReelV2.tsx` (679 lines), `CafeReel.tsx` (492 lines) |
| Config (`remotion.config.ts`) | `setRspack(true)`, `setVideoImageFormat("jpeg")`, `setOverwriteOutput(true)`, `setChromiumOpenGlRenderer("angle")`, `enableTailwind` |
| Outputs (`out/`) | `cafe-reel.mp4` 9.9M, `water-scarcity-reel-v2.mp4` 22M, `water-scarcity-reel.mp4` 1.3M, iphone promos, stills |
| Deps | `@remotion/cli,effects,google-fonts,media,tailwind-v4`, `remotion`, `react 19`, `tailwindcss 4` |

---

## 1. Step-by-step: how Remotion works (end to end)

### 1.1 Author

```tsx
// src/Root.tsx
registerRoot(RemotionRoot); // once
export const RemotionRoot = () => (<><MyComposition/></>);

// src/Composition.tsx
<Composition id="CafeReel" component={CafeReel} durationInFrames={300} fps={30} width={1080} height={1920} />

// src/CafeReel.tsx (per-frame)
const frame = useCurrentFrame();
const opacity = interpolate(frame, [0, 30], [0, 1], {easing: Easing.bezier(0.16,1,0.3,1), extrapolateRight: 'clamp'});
return <AbsoluteFill style={{opacity}}>…<Sequence from={40} durationInFrames={60}>…</Sequence></AbsoluteFill>;
```

Rules enforced by skills (`remotion-markup`, `remotion-interactivity`):

- Animate with `useCurrentFrame() + interpolate()` inline in `style`. No CSS `transition`/`animation`, no Tailwind `animate-*` — they use wall-clock and won't render deterministically.
- Prefer `scale/translate/rotate` props or individual transform props over `transform` strings where Studio-editable.
- Wrap editable nodes in `<Interactive.Div name="…">` with inline text so Studio codemods can write back.
- Fonts via `@remotion/google-fonts` + `delayRender` until loaded.
- Media via `@remotion/media` `<Video>/<Audio>` (premount, WebGL2, loop props), not raw `<video>`.

### 1.2 Bundle (Rspack)

`@remotion/bundler/dist/bundle.js:bundle()/internalBundle()` → `rspack-config.js:rspackConfig()` (because `Config.setRspack(true)`, else webpack).

- Entry = app entrypoint + `remotion.config.ts`.
- Output = temp dir: `bundle.js`, `index.html` (`indexHtml()`), `public/` copied, `staticHash`.
- All React + CSS/Tailwind collapsed to **one HTML page**. Page URL carries `?frame=N&props=…`; React remounts per frame.
- CLI: `npx remotion bundle`, `npx remotion compositions`, `npx remotion studio`.

### 1.3 Evaluate / enumerate

`@remotion/renderer/dist/get-compositions.js:internalGetCompositions()` loads bundle in headless Chrome, reads `VideoConfig`:

```ts
type VideoConfig = {id, width, height, fps, durationInFrames, props, defaultProps,
  defaultCodec, defaultOutName, defaultVideoImageFormat, defaultPixelFormat, …};
```

Dynamic path: `calculateMetadata({defaultProps, props, abortSignal, compositionId, isRendering})` can change duration/fps/dims/props asynchronously.

No React Server Components: `_check-rsc.js` throws if `React.createContext` is missing (`add "use client"`). Evaluation imports bundle in Node and reads `compositionsRef.getCompositions()`. Window contract (`index.d.ts`): `remotion_setBundleMode({type:'composition'|'index'|'evaluation', …})`, `remotion_getCompositionNames`, `remotion_calculateComposition`, `collectAssets`, `inputProps`, `staticFiles`, `publicPath`.

### 1.4 Preview (Studio / Player)

- **Studio** (`@remotion/studio` shell + `studio-server` backend + `studio-shared` contracts + `studio-protocol` drag protocol + `studio-codemods` AST edits + `canvas` selection math + `timeline-utils` waveform/timeline): `npx remotion studio --no-open`. Single store `TimelineContext frame: Record<compId, number>`, advanced only via `window.remotion_setFrame(f, comp)` → `setFrame` → `requestAnimationFrame(continueRender)`. Timeline scrub = set integer frame.
- **Player** (`@remotion/player`: `<Player>/<Thumbnail>`, `PlayerRef`, event emitter, controls): embeddable preview that plays frames with RAF but still derives visuals from `frame` integer.

### 1.5 Render (local)

`cli/dist/render-flows/render.js:render()` → `renderer/dist/render-media.js:internalRenderMedia()` → `render-frames.js:internalRenderFrames()` + `stitch-frames-to-video.js:internalStitchFramesToVideo()`.

1. `prepare-server.js:prepareServer()` serves bundle on `localhost:PORT`.
2. `ensure-browser.js` + `open-browser.js:internalOpenBrowser()` + `get-browser-instance.js` opens Chrome Headless Shell / Chrome-for-Testing (`--chrome-mode`, `--gl=angle` from our config).
3. `get-concurrency.js:resolveConcurrency()` → N pages: `make-page.js:makePage()` + `pool.js:Pool`, `render-partitions.js:renderPartitions()` work-stealing queue. Default ≈ half CPU cores; override `--concurrency` / `Config.setConcurrency()`.
4. Per frame `render-frame.js:renderFrame()` → `seek-to-frame.js:seekToFrame(frame)` → `waitForReady()` polls `window.remotion_renderReady` → `take-frame.js:takeFrame()` → `puppeteer-screenshot.js:screenshot({type:'jpeg'|'png'})` via CDP `Page.captureScreenshot`.
5. Encode — two paths (`render-media.js:139-180`):
   - **Parallel (default for h264/h265/vp8/vp9/av1/gif/prores):** `prespawn-ffmpeg.js` starts FFmpeg early; frame buffers piped via `write-with-backpressure.js`. No intermediate image sequence.
   - **Serial:** render all frames to `outputDir` (`get-frame-padded-index.js`, `image-sequence-pattern`), then `ffmpeg-args.js:generateFfmpegArgs({codec,crf,pixelFormat,x264Preset,gopSize,colorSpace})` → `call-ffmpeg.js` spawns `compositor-*/ffmpeg`.
   - Audio: `extract-audio.js`, `combine-audio.js`, `create-audio.js`, `mux-video-and-audio.js`, `finalize-fast-start.js` (`-movflags faststart`).
6. `renderStill` shortcut (`render-still.js`): bundle → 1× `seekToFrame` + `takeFrame` (`png|jpeg|pdf|webp`).

Image format (`image-format.d.ts`): video frames `png|jpeg|none` (default `jpeg`, ours explicitly `jpeg`, `jpegQuality=80`); stills `png|jpeg|pdf|webp` (default `png`). `jpeg` ≈ 3–10× smaller/faster than `png`; `png` required for alpha (`yuva420p`, checked by `validateSelectedPixelFormatAndImageFormatCombination()`); `none` skips screenshots (audio-only/test).

`delayRender(label?, {timeoutInMilliseconds=30000, retries?}): handle` / `continueRender(handle)` (`remotion/dist/cjs/delay-render.js`): pushes onto `window.remotion_delayRenderHandles`, sets `renderReady=false`; built-ins (`<Img>`, `<Video>`, `<Audio>`, `<IFrame>`) call it while fetching. Renderer `waitForReady` throws on timeout listing open handles + `DELAY_RENDER_CALLSTACK_TOKEN` stack.

Codecs (`codec.d.ts`): `h264|h265|vp8|vp9|av1|mp3|aac|wav|prores|h264-mkv|h264-ts|gif`. Flags: `--crf --pixel-format --scale --frame-range --every-nth-frame --muted --enforce-audio-track --audio-bitrate --video-bitrate --x264-preset --gop --color-space --prores-profile --number-of-gif-loops --disallow-parallel-encoding --repro --binaries-directory --chrome-mode --gl --port --props --env-file --log --license-key --sample-rate --hardware-acceleration --offthreadvideo-cache-size --media-cache-size`.

### 1.6 Scale (Lambda / Cloud Run / Web)

- **Lambda** (`cli/dist/lambda-command.js`): split into `frameRange` chunks → 100s–1000s parallel Lambdas each `renderFrames+stitch` → S3 partials → coordinator `combine-chunks.js / combine-video-streams-seamlessly.js` concat. Needs deployed site (`bundle`→S3 `serveUrl`), IAM, license key. Cloud Run mirrors on GCP.
- **Web** (`@remotion/web-renderer/dist/render-media-on-web.js:renderMediaOnWeb()`): in-browser encode via Mediabunny + WebCodecs/Canvas, no Puppeteer/FFmpeg. Check `canRenderMediaOnWeb()` first; limited codecs. This is the seed for a lightweight alternative (§8).

Native backend: `@remotion/compositor-linux-x64-gnu|musl/` ships Rust `remotion` binary (`ExtractFrame`, `GetVideoMetadata`, `GetSilences`, `ExtractAudio` — `renderer/dist/compositor/payloads.d.ts`) + static `ffmpeg`/`ffprobe` + `libav*.so`, driven by `compositor.js:startLongRunningCompositor()` over length-delimited JSON stdin/stdout. Pure-JS probing via `@remotion/media-parser` (`parseMedia()`), browser helpers via `@remotion/media-utils` (`getVideoMetadata`, `getAudioData`, `visualizeAudio`, …).

---

## 2. Core framework (React layer)

Files: `node_modules/remotion/dist/cjs/{Composition,Sequence,series/index,loop/index,Freeze,Still,Folder,AbsoluteFill,use-current-frame,timeline-position-state,delay-render,register-root,RemotionRoot}.js`.

### 2.1 `<Composition>` — declaration, not playback

```ts
// Composition.d.ts:29-62 (simplified)
type Props = {id: string; schema?: Schema} & (
  | {width?: number; height?: number; fps?: number; durationInFrames?: number; calculateMetadata: Fn} // dynamic
  | {width: number; height: number; fps: number; durationInFrames: number; calculateMetadata?: Fn}   // static
) & ({component: Component} | {lazyComponent: () => Promise<{default: Component}>});
```

`InnerComposition` (`Composition.js:33,144`):

1. Throws if `CanUseRemotionHooks == true` (no nesting inside a comp or `<Player>`).
2. Resolves folder chain (`FolderContext`), lazy identity.
3. `useEffect(registerComposition({id, folderName, parentFolderName, component: lazy, defaultProps, width, height, fps, durationInFrames, schema, calculateMetadata, stack}))`; dup `id` throws (`CompositionManagerProvider.js:37,44`); cleanup unregisters.
4. `useResolvedVideoConfig(id)` (`ResolveCompositionConfig.js:18`): static → validate + merge `{...defaultProps, ...editorProps, ...inputProps}`; dynamic → `ResolveCompositionContext[id]` (`loading|success|success-and-refreshing|error`).
5. Renders via portal only when `environment.isStudio|isRendering && video.id == id`: `<CanUseRemotionHooksProvider><Comp {...props}/></portal>` inside `Suspense` (`delayRender('Waiting for Root…')`).

`<Still> = <Composition durationInFrames={1} fps={1}>` (`Still.js:14`). `<Folder name>` only scopes registry (`Folder.js:19`).

### 2.2 `<Sequence from duration>` — time remapping

```ts
SequenceProps = {from?: number (=0); durationInFrames?: number (=Infinity);
  trimBefore?: number; freeze?: number|null; name?: string;
  width?: number; height?: number; layout?: 'absolute-fill'|'none';
  premountFor?; postmountFor?; showInTimeline?; hidden?; …};
```

Math (`Sequence.js:24,412`; consumption `use-current-frame.js:22`):

```
effectiveRelativeFrom = from - trimBefore
cumulatedFrom   = parent ? parent.cumulatedFrom + parent.relativeFrom : 0
absoluteFrom    = (parent?.absoluteFrom ?? 0) + effectiveRelativeFrom
actualDuration  = max(0, min(video.durationInFrames - from, parentDuration))
localFrame      = globalFrame - (cumulatedFrom + relativeFrom)   // Σ down ancestor chain
visible iff cumulatedFrom+from ≤ globalFrame ≤ ceil(cumulatedFrom+from+duration-1)
layout='absolute-fill' → wrap <AbsoluteFillElement> (absolute;inset:0;flex column)
layout='none' → raw, no size/crop
negative `from` → pre-roll bookkeeping (cumulatedNegativeFrom shifts media startMediaFrom)
freeze={n} → <Freeze frame={n}> pin
```

### 2.3 `Series`, `Loop`, `Freeze`

- `<Series>` (`series/index.js:91,56`): wrapper `<Sequence layout="none" name="<Series>">`; children must all be `<Series.Sequence durationInFrames|Infinity(last only); offset?: int>`. Expands recursively: `cur = start+offset; next = start+duration+offset`; `offset<0` overlap, `>0` gap.
- `<Loop durationInFrames; times?=Infinity>` (`loop/index.js:51`): `iteration = floor(local/duration)`; `from = min(iteration*duration, duration*(actualTimes-1))`; renders `<Sequence from duration>` so inner `useCurrentFrame()` sees `0..duration-1` repeating. `Loop.useLoop(): {iteration, durationInFrames}|null`.
- `<Freeze frame; active?=true|fn>` (`freeze.js:15`): swaps `TimelineContext` to `{isPlaying:()=>false, isInsideFreeze:true, frame:{[id]: freezeTo+relativeFrom}}` + zeroes `cumulatedFrom`. Time pinned, media paused.

### 2.4 Hooks

Public (`index.d.ts:148-154`): `useCurrentFrame(): number` (relative, throws outside comp/Player), `useVideoConfig(): VideoConfig`, `useRemotionEnvironment(): {isStudio,isRendering,isPlayer,isClientSideRendering,…}`, `useDelayRender(): {delayRender,continueRender}`, `useBufferState/useBuffering/usePlaying`, `useCurrentScale/usePixelDensity/useIsPlayer` (Experimental).

Internals (`timeline-position-state.js`, `internals.d.ts`): `useTimelinePosition()` (clamped `state.frame[id]`), `useAbsoluteTimelinePosition()` (ignores Freeze), `useIsInsideFreeze()`, `useTimelineContext()`, `usePlaybackRate()`, `useTimelineSetFrame()`, `useUnsafeVideoConfig()` (honors `<Sequence width height duration>` override), `useVideo()`, `Loop.useLoop()`, `useMediaStartsAt()`, `useFrameForVolumeProp()`, `useMediaInTimeline()`.

### 2.5 Determinism contract

Single source `TimelineContextProvider (TimelineContext.js:26)`: `frame: Record<compId, number>`. Studio/Player advance only via `window.remotion_setFrame(f, comp)` → `setFrame` → RAF `continueRender`. Renderer injects `window.remotion_initialFrame`. Clamp: `max(0, min(duration-1, frame))` (`timeline-position-state.js:39`). `Date.now()` only for mount/logging/timeout — never for visuals. `random(seed)` is `mulberry32(hash(seed))`, `interpolate/spring` pure in `frame`.

### 2.6 Root / RSC guard

`register-root.js:10`: `registerRoot(comp)` once + listener fan-out; `getRoot()`, `waitForRoot(fn)`. Bundler entry calls it (`src/Root.tsx`); renderer/Studio `waitForRoot` then mounts `RemotionRootContexts > CompositionManagerProvider > <Root/>` (`RemotionRoot.js:15`: LogLevel > Timeline(Set+Absolute+PlaybackRate) > MediaEnabled > EditorProps > Prefetch > SequenceManager > Durations > Buffering > SharedAudio). `_check-rsc.js:4` throws without `React.createContext` (RSC import fails fast).

Paint order = DOM order; no `z-index.js`. `<AbsoluteFill> = <Sequence layout="none"><AbsoluteFillElement/></Sequence>` (`AbsoluteFill.js:29`). Our reels (`CafeReel`, `WaterReelV2`, `IphonePromo`) all follow: `AbsoluteFill + Sequence + Interactive.Div + useCurrentFrame/interpolate/Easing.bezier/spring` per cut (`useCut()->{flash,punch}`, `Leak` sweep).

---

## 3. Animation engine (the part to clone first)

Files: `node_modules/remotion/dist/cjs/{interpolate,interpolate-colors,spring/index,spring/spring-utils,spring/measure-spring,easing,bezier,random}.js`. (`noise.js` does **not** exist in core; noise = `@remotion/effects/noise` subpath.)

### 3.1 `interpolate(input, inputRange, outputRange, opts?)` — `interpolate.js:342-488`

```ts
type Extrapolate = 'extend'|'identity'|'clamp'|'wrap'; // default 'extend'
type OutputOpt = 'linear'|'perceptual-scale';
type Opts = {easing?: Fn|Fn[]; extrapolateLeft?: Extrapolate; extrapolateRight?: Extrapolate;
  output?: OutputOpt; posterize?: number};
interpolate(input: number, inputRange: number[], outputRange: number[], opts?): number;
interpolate(input: number, inputRange: number[], outputRange: string[], opts?): string; // parsed units
// + number[][] tuple overload
```

Scalar core per 2-element segment:

```
1. extrapolate: x<min → clamp→min | identity→return x | wrap→((((x-min)%R)+R)%R)+min | extend→noop (mirror right)
2. if outMin==outMax → return outMin
3. t = (x-min)/(max-min); t = easing(t)
4. linear: t*(outMax-outMin)+outMin
   perceptual-scale: fromSignedArea(t*(toSigned(outMax)-toSigned(outMin))+toSigned(outMin))
   where toSigned(s)=sign(s)*s², fromSigned(a)=sign(a)*√|a|   // scale feels linear to the eye
```

Multi-stop: `findRange` linear scan for segment `i` with `inputRange[i] ≥ input`; per-segment easing if array (length must be `inputRange.length-1`); `posterize=p` quantizes input first (`floor(x/p)*p` — stepped motion). Validations: equal lengths, finite, `inputRange` strictly increasing, `posterize>0`.

Tail-continuation (`Easing.spring({allowTail:true})` sets `fn.remotionShouldExtendRight=true`, `interpolate.js:408-486`): a segment with `extrapolateRight:'clamp'` but tail-easing is evaluated as `extend`, and all prior tail-segments add overshoot `continued - outputRange[i+1]`. This is how a spring overshoots past a keyframe.

String mode (`interpolateString :489-591`): parses `scale | translate (px % em rem vh vw …) | rotate (deg rad grad turn) | transform-origin keywords | axis rotation (x 45deg)` into `{kind, values[≤4], units[]}`; each axis numeric-interpolated, re-serialized (`normalize-number.js`: `round(v*1e6)/1e6`). Mixed kinds / mismatched units throw. Discrete strings (`:592-642`, e.g. arbitrary keywords): requires every easing `=== Easing.step1`, else throw. Tuples (`:664-672`): `number[][]` same length, per-component.

| extrapolate | behavior |
|---|---|
| `extend` (default) | linear continuation past range |
| `clamp` | pin to endpoint |
| `wrap` | modulo wrap |
| `identity` | return raw input, bypass mapping |

### 3.2 `spring({frame, fps, config, from=0, to=1, durationInFrames?, durationRestThreshold?, delay?, reverse?})` — `spring/index.js:15-62`

Defaults (`spring-utils.js:4-9`): `{damping: 10, mass: 1, stiffness: 100, overshootClamping: false}`; `damping ≤ 0` throws.

- Natural duration via `measureSpring({fps, config, threshold=0.005})` when `reverse || durationInFrames !== undefined`.
- `reverse` mirrors around `duration|natural`; `delay` shifts (`+delay` if reverse else `-delay`); `durationInFrames` time-stretches (`frame * natural/duration`); past end with explicit duration → `to`.
- `overshootClamping` pins to `to` (direction-aware `min/max`).
- Remap `from→to` via `interpolate(inner,[0,1],[from,to])` unless `0→1`.

Integrator (`spring-utils.js:4-64`) — analytic damped harmonic oscillator, `Δt = min(now-last, 64)ms`:

```
ζ = c/(2√(k·m))   (damping ratio);  ω₀ = √(k/m)
ζ<1 (under-damped): envelope = e^(-ζ·ω₀·t)
  pos = to − envelope·(sin(ω₁t)·(v₀+ζω₀x₀)/ω₁ + x₀·cos(ω₁t)),  ω₁ = ω₀√(1−ζ²)
ζ≥1: envelope = e^(-ω₀t); pos = to − envelope·(x₀ + (v₀+ω₀x₀)·t)   // critical branch reused for over-damped
```

`springCalculation`: from `{current:0,toValue:1,velocity:0}` step integer frames `f/fps*1000` then exact fractional remainder. Memoized on joined-key cache.

`measureSpring` (`measure-spring.js:11-76`): step until `|current−to| < threshold` (default `0.005`; `0→Infinity`, `1→0`, `NaN/¬finite/<0` throw) **and stays under for 20 consecutive frames** (bounciness guard). Map-cached.

### 3.3 `Easing.*` — `easing.js:16-120` (18 statics)

`clampUnit(t)=min(1,max(0,t))` inside `circle/bounce` so `extend` doesn't NaN.

| fn | formula |
|---|---|
| `step0(n)` | `n>0?1:0` |
| `step1(n)` | `n>=1?1:0` (required for discrete strings) |
| `linear(t)` | `t` |
| `ease(t)` | `bezier(0.42,0,1,1)(t)` (CSS ease) |
| `quad(t)` | `t²` |
| `cubic(t)` | `t³` |
| `poly(n)` | `tⁿ` |
| `sin(t)` | `1−cos(t·π/2)` (ease-in sine) |
| `circle(t)` | `1−√(1−u²)`, `u=clampUnit(t)` |
| `exp(t)` | `2^(10·(t−1))` |
| `elastic(b=1)` | `1−cos(t·π/2)³·cos(t·b·π)` |
| `back(s=1.70158)` | `t²·((s+1)·t−s)` |
| `bounce(t)` | piecewise on `u`: `<1/2.75:7.5625u²`; `<2/2.75:…+0.75`; `<2.5/2.75:…+0.9375`; else `…+0.984375` |
| `bezier(x1,y1,x2,y2)` | §3.4 |
| `in(f)` | `f` |
| `out(f)` | `t→1−f(1−t)` |
| `inOut(f)` | `t<.5 ? f(2t)/2 : 1−f(2(1−t))/2` |
| `spring({allowTail?, threshold?, damping,mass,stiffness,overshootClamping}?)` | `t≤0→0`; `!allowTail&&t≥1→1`; `allowTail`: `spring({fps:30, frame:t·measureSpring(30)})` else `spring({fps:30, frame:t·30, durationInFrames:30})`; sets `remotionShouldExtendRight=allowTail` |

### 3.4 `bezier(mX1,mY1,mX2,mY2)` — `bezier.js` (React-Native port)

`NEWTON_ITERATIONS=4, NEWTON_MIN_SLOPE=0.001, SUBDIVISION_PRECISION=1e-7, MAX_ITER=10, table=11, step=0.1`. `x1,x2∉[0,1]` throws. `calcBezier(t)=((a·t+b)·t+c)·t`, `slope=3at²+2bt+c`; sample table → interval lerp guess → Newton-Raphson if slope≥0.001 else binary subdivide; `y(getTForX(clamp01(x)))`. Linear shortcut when `x1==y1 && x2==y2`.

### 3.5 `random(seed)` / colors

```ts
random(seed: number|string|null): number // [0,1)
mulberry32(a): t=a+0x6D2B79F5; t=imul(t^(t>>>15),t|1); t^=t+imul(t^(t>>>7),t|61); ((t^(t>>>14))>>>0)/2³²
string → mulberry32(hashCode(str)); null → Math.random(); number → mulberry32(seed*1e10)
```

`interpolateColors(input, inputRange, outputRange: string[], {easing,posterize}?) → "rgba(…)"` (`interpolate-colors.js`): parses hex3/4/6/8, rgb(a), hsl(a), named CSS, oklch/oklab/lab/lch/hwb (space-separated + `/alpha`, `none`, `%|deg|rad|grad|turn`) → 32-bit RGBA; per-channel `interpolate(…, {extrapolate:'clamp'})`; RGB `round`, alpha `toFixed(3)`.

### 3.6 What our reels actually use (proof of sufficiency)

`CafeReel.tsx:42`, `WaterReelV2.tsx:33`: `useCut()` = `flash=interpolate(frame,[0,3],[0.6|0.65,0])` + `punch=interpolate(frame,[0,9|10],[1.14|1.16,1],{easing:PUNCH})` with `EASE=bezier(0.16,1,0.3,1)`, `PUNCH=bezier(0.12,0.9,0.25,1)`; `Leak` = `sweep=interpolate(frame,[0,49],[-500,1300])` + breathe; grain via inline SVG data-URI overlay (`GRAIN`). **No WebGL, no Lottie, no Three — pure CSS + interpolate hits high fidelity.** That validates the lightweight thesis: the 4-function animation core + good easing + grain/light-leak CSS covers 90% of everyday reels.

---

## 4. Rendering engine (why it's heavy, where to slim)

| Stage | Remotion today | Cost |
|---|---|---|
| Bundle | Rspack full React app → temp `bundle.js` + HTTP server | Node toolchain, seconds cold start |
| Browser | Puppeteer pool (N pages), `seekToFrame` + `waitForReady` + CDP screenshot per frame | Chrome download (~150MB+), RAM per page, IPC per frame |
| Compositor | Rust binary + static FFmpeg + libav | platform binaries (`gnu`+`musl`), license surface |
| Encode | pre-spawned FFmpeg (parallel) or stitch-after (serial) + audio mux + faststart | CPU encode time dominates |
| Scale | Lambda/CloudRun chunk fan-out + S3 concat | ops complexity, cloud $ |

Concurrency: `validateConcurrency/getMaxConcurrency/getMinConcurrency` + `resolveConcurrency()` (≈½ CPUs) → `Pool(pages)` + `renderPartitions` work-stealing (`innerRenderFrames`). Stitch parallel unless `--disallow-parallel-encoding`. Compositor long-running JSON-RPC (`serialize-command`, `make-nonce`).

Browser/media details: `openBrowser('chrome')`, `chrome-mode=headless-shell|chrome-for-testing`, `chromiumOptions.gl="angle"`; media probing pure-JS (`media-parser: parseMedia()`), browser helpers (`media-utils`), client encode (`web-renderer: renderMediaOnWeb()` via Mediabunny+WebCodecs — no Puppeteer).

**Slimming levers (§8):** skip Chromium for the common case (Canvas2D/WebCodecs direct render or single-page persistent context + `captureStream`), keep Puppeteer only as fallback; replace FFmpeg-spawn with Mediabunny (MP4/MOV, in-process); cache bundle aggressively (HMR-style); default `jpeg/80` + parallel pipe already good — keep.

---

## 5. Feature / animation catalog (what's installed)

### 5.1 Counts

- **Effects: 74 importable** (`@remotion/effects`: root barrel 11 helpers + 73 named subpaths; 75 export keys incl. `package.json`). Subpaths: `barrel-distortion, blur, burlap, flannel, checkerboard, chromatic-aberration, color-key, color-correction{brightness,contrast,exposure,levels,white-balance,shadows-highlights,vibrance,saturation,hue,tint,duotone,invert,grayscale,lut,thermal-vision}, contour-lines, liquid-contours, drop-shadow, emboss, evolve, fisheye, corner-pin, glow, gridlines, halftone{+linear-gradient}, pixel-dissolve, pixelate{+progressive}, lines, linear-gradient{+tint}, linear-progressive-{blur,pixelate}, light-leak{+schema}, light-trail, dot-grid, mirror, noise, noise-displacement, outline, paper, roughen-edges, pattern{checkerboard,tile,rings,starburst,zigzag,gridlines}, radial-progressive-{blur,pixelate}, region-blur, scanlines, scale, shine, shrinkwrap, skew, speckle, tear, tv-signal-off, venetian-blinds, vignette, wave{waves}, white-noise, zoom-blur, translate, tile`. Each `(params & {disabled?}) => EffectDescriptor`, composable via `EffectsProp`. Granular subpaths keep bundles small. **Quality: highest — this is the moat for looks.**
- **Easing: 18 statics** (§3.3).
- **Keyframe presets: 7** (`studio-shared`: `ease-in, ease-out, ease-in-out, hold, spring, bouncy-spring, tail-spring` + `LINEAR/HOLD/EASE/QUAD/CUBIC` consts; `keyframe-easing-presets`, `keyframe-interpolation-function`, `parse-spring-easing-config`).
- **Core motion:** `spring(+measureSpring), interpolate(+interpolateColors), random` + `Sequence/Series/Loop/Freeze/Still`.
- **Transitions/shapes/motion-blur/lottie/three/skia/gif/lambda packages: 0 on disk** — only doc refs (`remotion-markup/transitions.md, lottie.md`). Must `npm i` separately.
- **Installed countable total: 74 + 18 + 7 = 99** (+ timing-component family).

### 5.2 Package-by-package (all 4.0.526)

**Authoring (installed):** `remotion` (65 export lines: Composition/Still/Folder/Series/Sequence/Loop, AbsoluteFill/Img/Video/OffthreadVideo/Audio/IFrame/AnimatedImage/CanvasImage, hooks, interpolate/colors, random, spring/measureSpring, Easing, delayRender/continueRender, staticFile/getStaticFiles/prefetch/getInputProps, registerRoot/cancelRender/Artifact/Interactive/HtmlInCanvas/Solid/createEffect, Experimental/Config/NoReact) · `@remotion/effects` (above) · `@remotion/media` (`Audio, Video, AudioForPreview, MediaErrorAction, …`, premount/WebGL2/loop/toneFrequency) · `@remotion/captions` (`Caption{text,startMs,endMs,timestampMs,confidence}`, `createTikTokStyleCaptions` ★, `ensureMaxCharactersPerLine`, `parseSrt/serializeSrt`) · `@remotion/google-fonts` (1835 fonts, tree-shaken per-font subpaths, `getAvailableFonts/loadFont`, must delayRender) · `@remotion/tailwind-v4` (`enableTailwind(config)` glue only) · `@remotion/player` (`Player/Thumbnail/PlayerRef/Methods/Props`, controls, RSC guard — SaaS primitive).

**Render/CLI:** `@remotion/cli` (150+ files: bundle/compositions/studio/preview/render/still/lambda/cloudrun/ffmpeg/ffprobe/gpu/upgrade/add/skills/benchmark/versions) · `@remotion/renderer` (51 exports: getCompositions/renderFrames/combineChunks/ensureBrowser/openBrowser/extractAudio/getVideoMetadata/getSilentParts, Codec/Crf/PixelFormat/ImageFormat/…/FrameRange, makeCancelSignal, RemotionServer) · `@remotion/bundler` (bundle/rspack-config/index-html/fast-refresh) · `@remotion/compositor-linux-x64-gnu|musl` (Rust+ffmpeg/ffprobe/libav) · `@remotion/web-renderer` (`renderMediaOnWeb/renderStillOnWeb/getEncodableCodecs/canRenderMediaOnWeb` — Mediabunny path) · `@remotion/streaming` (`makeStreamer` — Studio preview).

**Media:** `@remotion/media-parser` (10 exports: `parseMedia/downloadAndParseMedia`, controller, tracks/samples, node/web/worker entries) · `@remotion/media-utils` (`getAudioData/useAudioData/useWindowedAudioData`, `getAudioDuration(InSeconds)`, `getVideoMetadata`, `getImageDimensions`, `visualizeAudio/Waveform`, `getWaveformPortion`, `createSmoothSvgPath`, `audioBufferToDataUrl` — creative-coding toolkit ★) · `@remotion/timeline-utils` (`extractFrames/renderFrameStrip/resizeVideoFrame/frameDatabase`, waveform peaks, loop segments — Studio-internal, reusable).

**Studio:** `@remotion/studio` (shell; `./renderEntry, ./internals, ./previewEntry`) · `studio-server` (file-watcher, client-render-queue, codemods, figma, canvas-capture, `detect-outdated-remotion-skills`) · `studio-shared` (api-requests, drag-data, config-*, keyframe-* — easing presets ★) · `studio-protocol` (drag/drop + discovery) · `studio-codemods` (parse-and-apply-codemod, insert/delete/duplicate-jsx, sequence-props, composition/folder edits, reorder/split — Interactive write-back ★) · `canvas` (Canvas/controller, calculateTimeline, cascaded start, selection) · `zod-types` (`zColor/zMatrix/zTextarea`) · `licensing` (telemetry) · `eslint-config-flat` · `bundler/canvas/captions` already counted.

### 5.3 Qualities worth stealing

Determinism (frame-pure) · scrubability · parallelizability · testability (stills as unit tests — our `out/still-*.png`, `v2-*.png` prove it) · Studio-editability (inline styles + Interactive names + codemods) · granular imports · JSON-first captions · font-as-code · preloading gate (`delayRender`) · parallel pipe encode · web-render escape hatch.

---

## 6. Skills (12 agent skills — the "how to use it well" layer)

All in `.agents/skills/*/SKILL.md` (+ `REFERENCE.md`, `techniques/`, `agents/openai.yaml`), pinned in `skills-lock.json` (`remotion-dev/skills`, `version: 1`).

| Skill | Teaches |
|---|---|
| `remotion-best-practices` | Router: which of the other 11 to load; preserve-user-edits rule |
| `remotion-captions` | JSON `Caption` flow; `transcribe/display/import-srt-captions.md` |
| `remotion-create` | `create-video --blank` scaffold (empty vs non-empty dir), multi-scene, Tailwind opt-in, preview |
| `remotion-docs` | Algolia search POST + fetch `url.md`; never rely on memory |
| `remotion-interactivity` | `Interactive.Div + name`, inline text, keep markup Studio-parseable or controls grey out |
| `remotion-maps` | Exactly one `TECHNIQUE.md`: static/Mapbox/MapLibre/MapTiler/CesiumJS |
| `remotion-markup` | ★ Core craft: `useCurrentFrame+interpolate` inline, `Easing.bezier/spring`, `scale/translate/rotate` > `transform`, `output:'perceptual-scale'`; 20+ refs (effects, transitions, lottie, audio-viz, gifs, google-fonts…) |
| `remotion-multimedia` | Mediabunny browser AV; `get-audio-duration/video-dimensions/video-duration.md` |
| `remotion-render` | `npx remotion render/still` + `transparent-videos.md` |
| `remotion-saas` | Templates, `<Player>`, Lambda/Vercel/Cloudflare/Express/client-render choice, Vue/Angular/Svelte |
| `remotion-studio` | `npx remotion studio --no-open` + `--log/--port/--force-new` |
| `remotion-upgrade` | `npx remotion upgrade` else manual pin all `@remotion/*` + `zod/mediabunny/@huggingface/transformers`; `npx skills update` |

Highest signal: `docs, best-practices, markup, create`. Thin routers: `maps, multimedia, saas`.

---

## 7. Weaknesses (design openings)

1. **Heavy runtime:** Chromium + Puppeteer + FFmpeg binaries; cold start seconds; disk hundreds of MB. Overkill for text-over-video reels.
2. **Per-frame browser round-trip:** remount + poll `renderReady` + CDP screenshot per frame; IPC/encode often dominates (our `jpeg` default mitigates, doesn't remove).
3. **React tax:** full reconciler per frame; `Sequence` nesting math per render; no GPU timeline — all CPU DOM.
4. **Footguns:** CSS animations/transitions silently don't render; Tailwind `animate-*` same; font loading must be gated manually; alpha needs `png`+`yuva420p` awareness.
5. **Spring cost:** `springCalculation` loops per frame (memoized, but still per-frame integration); `measureSpring` scans to rest +20 frames.
6. **Ops:** Lambda fan-out/S3 concat for scale; local concurrency tuning (`½ CPUs`) manual.
7. **Missing on disk:** transitions/shapes/motion-blur/lottie/three/skia/gif as packages — discoverability gap (docs reference, code doesn't ship).

---

## 8. Proposal: lightweight everyday-use high-fidelity alternative ("Reelcore")

### 8.1 Non-goals / goals

- **Non-goal:** replace Remotion for VFX-heavy/3D/Lambda-scale cinema.
- **Goal:** <5s install, <300ms preview start, 1080×1920 10s reel in <30s on laptop CPU, visually indistinguishable for the everyday cases (captions, promos, reels, audiograms, slideshows) — our `CafeReel`/`WaterReelV2` fidelity with zero Chromium by default.

### 8.2 Architecture (3 tiers, progressive enhancement)

```
Tier 0 — Pure function renderer (default, no browser):
  scene(frame: number) → Canvas2D draw list → WebCodecs/Mediabunny MP4 (in-process, no FFmpeg spawn)
Tier 1 — Single persistent WebView (only when DOM/CSS needed):
  one page, set frame via postMessage, capture via captureStream/WebCodecs (no remount-per-frame, no CDP screenshots)
Tier 2 — Fallback: headless Chromium screenshot (Remotion-compatible) for arbitrary React/CSS
```

- **Scene graph, not DOM:** authors write `div`-like JSX but we compile to canvas draw ops (rect/text/image/video-frame/effect). Keeps `interpolate/spring/Easing` API identical so Remotion skills transfer.
- **Encode in-process:** Mediabunny (MP4/MOV, H.264) + WebCodecs where available; FFmpeg only for exotic codecs (prores/gif/av1).
- **Assets:** `fetch` + decode once, cache by hash; `await fonts.ready` replaces manual `delayRender` (keep `delayRender` as compat alias).
- **Time:** keep Remotion's contract exactly: integer `frame`, `fps`, `Sequence/Series/Loop/Freeze` math (§2.2–2.3), `random(seed)` mulberry32. Compatibility > novelty.

### 8.3 Animation engine v1 (clone Remotion's, then extend)

Port verbatim (formulas in §3): `interpolate` (+string/tuple/discrete, extrapolations, posterize, perceptual-scale, tail-continuation), `interpolateColors`, `spring` (defaults `damping:10,mass:1,stiffness:100`, analytic integrator, `measureSpring` threshold `0.005` +20-frame guard, `delay/reverse/durationInFrames/overshootClamping`), `Easing` (all 18), `bezier` (Newton+binary constants), `random` (mulberry32). Add: `clamp/remap/lerp` helpers, `useSpringValue(frame)` memo hook, precomputed spring LUT per `{config,fps}` (avoid per-frame loop), SIMD/batched interpolate for audiogram bars (`visualizeAudio` port).

Fidelity rule: pixel-diff test against Remotion stills (`out/still-*.png`, `v2-*.png`) — must be <1% MSE before shipping an easing/spring change.

### 8.4 Authoring (keep what works, remove footguns)

```tsx
// same mental model, fewer ways to break
<Reel id="Cafe" fps={30} duration={300} size={[1080,1920]}>
  <Cut from={0} dur={60}><Title text="…” /></Cut>   // Cut = Sequence + flash/punch preset
</Reel>
const f = useFrame();                               // alias useCurrentFrame
const x = lerp(f, [0,30], [0,1], easeOut);          // interpolate+clamp shorthand
```

- Inline-style-only visuals; linter **errors** on CSS `animation/transition` and Tailwind `animate-*` (Remotion today only warns via docs).
- `<Cut>` presets encode our proven `useCut` (flash `interpolate(frame,[0,3],[0.6,0])` + punch `1.14→1` + leak sweep) so everyday cuts look good by default.
- `<Caption>` TikTok pagination built-in (port `createTikTokStyleCaptions`).
- Fonts: `await loadFont('Inter:600')` auto-gates render; no manual handles.
- Effects: port top-15 used (blur, noise/grain, vignette, light-leak, duotone/tint, pixelate, chromatic-aberration, glow, zoom-blur, corner-pin, lut, scanlines, wave, translate/scale) as Canvas2D/WebGL-lite shaders with `disabled?` flag; granular imports like `@remotion/effects/*`.

### 8.5 Studio-lite

No full Studio clone v1: file-watch + frame slider + still-export + `render` CLI. Reuse `timeline-utils` math and keyframe presets (7). Interactive naming (`name="…"`) preserved for future codemod write-back.

### 8.6 Milestones

- **M1 Engine parity:** `interpolate/spring/easing/bezier/random/colors` + still tests vs Remotion.
- **M2 Timing parity:** `Sequence/Series/Loop/Freeze/Composition` math + scrub test.
- **M3 Tier-0 render:** Canvas2D → Mediabunny MP4, `CafeReel`-class reel <30s, stills pixel-match.
- **M4 Captions/audio:** SRT/JSON captions, `visualizeAudio` audiogram, `<Video>` frame抽取.
- **M5 Tier-1 DOM fallback + CLI:** `reel render/preview/still`, `jpeg` default, concurrency auto.
- **M6 Polish:** 15 effects, font-as-code, TikTok presets, upgrade skill.

### 8.7 What we keep from Remotion verbatim

Frame-pure determinism · `interpolate/spring` signatures · `Sequence` remap math · `delayRender` compat alias · `jpeg/80` + parallel-pipe defaults · granular effect imports · JSON captions · font-as-code · Interactive names · keyframe presets.

---

## 9. Quick reference (commands / files)

```bash
# this repo
npx remotion studio --no-open
npx remotion render CafeReel out/cafe-reel.mp4 --codec=h264 --image-format=jpeg
npx remotion still CafeReel out/still.png --image-format=png
npx remotion compositions
npx remotion upgrade
```

| Concern | File |
|---|---|
| Time remap | `node_modules/remotion/dist/cjs/Sequence.js`, `use-current-frame.js`, `timeline-position-state.js` |
| Registration | `Composition.js`, `CompositionManagerProvider.js`, `ResolveCompositionConfig.js`, `register-root.js` |
| Animation | `interpolate.js`, `interpolate-colors.js`, `spring/{index,spring-utils,measure-spring}.js`, `easing.js`, `bezier.js`, `random.js` |
| Preload gate | `delay-render.js` (`delayRender/continueRender`) |
| Bundle | `node_modules/@remotion/bundler/dist/{bundle,rspack-config,index-html}.js` |
| Render | `node_modules/@remotion/renderer/dist/{render-media,render-frames,render-frame,seek-to-frame,take-frame,stitch-frames-to-video,compositor/compositor}.js` |
| Native | `node_modules/@remotion/compositor-linux-x64-{gnu,musl}/{remotion,ffmpeg,ffprobe}` |
| Browser AV | `node_modules/@remotion/{media,media-parser,media-utils,web-renderer}/dist/*` |
| Looks | `node_modules/@remotion/effects/dist/*` (74), `google-fonts/dist/*` (1835) |
| Preview/SaaS | `node_modules/@remotion/{studio,studio-server,studio-shared,studio-protocol,studio-codemods,canvas,player,timeline-utils}/dist/*` |
| Agent knowledge | `.agents/skills/*/SKILL.md` (12), `skills-lock.json` |
| Ours | `src/{Root,Composition,CafeReel,WaterReel{,V2},IphonePromo{,Vertical}}.tsx`, `remotion.config.ts`, `out/*` |

---

## 10. Open questions (to resolve before building)

1. Tier-0 canvas text shaping vs browser text (kerning/emoji) — acceptable delta?
2. Video-frame extraction without FFmpeg for `<Video>` overlays — MediaParser + WebCodecs sufficient?
3. Exact `spring` overdamped branch: Remotion reuses critical formula for ζ≥1 — clone bug-for-bug or fix?
4. License/telemetry posture (`@remotion/licensing`) for commercial SaaS use.
5. Keep React JSX or move to plain `scene(frame)` functions for Tier-0 speed?

*End — extend this file as M1–M6 land. Next: port `interpolate.js:342-488` + `spring-utils.js:4-64` and add still-diff tests against `out/`.*
