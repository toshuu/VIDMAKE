# VIDMAKE — X80 Video Engine

Deterministic, browser-free, JSON-first short-form video compositor.
Remotion's good ideas (frame-pure timing, `interpolate`/`spring`/`Easing`,
timeline primitives) with native 2D rendering instead of headless Chrome.

**Status:** M0–M10 + ENCODING complete · **257/257 tests green** · full handbook in
`x80-video-engine/HANDBOOK.md`, progress log in `x80-video-engine/PROGRESS.md`,
build spec in `X80_VIDEO_ENGINE_CORE_PLAN.md`.

## Layout

```text
x80-video-engine/   The engine monorepo (@x80/core, effects, media,
                    encoding, renderer-skia, examples/m9, tests, goldens)
my-video/           Remotion reference project (behavioral reference only,
                    never a runtime dep) + public media assets
shorts-dl/          Sample clips
_rescue/            Session-persistence backups (fonts, scripts, RESTORE.md)
```

## Restore (fresh machine)

```bash
cd x80-video-engine && npm ci && npm run build
npx vitest run    # expect 20 files, 257/257
```

`node_modules/` and `dist/` are intentionally not committed (regenerable).
`_rescue/full-tmp/` (115MB of regenerable binaries) is excluded; its manifest
lives in `_rescue/RESTORE.md`.
