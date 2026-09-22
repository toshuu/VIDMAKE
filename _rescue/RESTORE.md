# Session-rescue backup (2026-09-22)

Only `/kaggle/working/` persists between sessions. This folder holds copies
of everything the X80 build used that lived OUTSIDE `/kaggle/working/`.

## Contents
- `fonts/` — copies of `~/.fonts/*.ttf` (NotoSans Regular/Bold,
  NotoSansDevanagari Regular) used for the M4 Chrome ink-box cross-check.
  NOTE: the repo already vendors these + Bold Devanagari + Emoji in
  `x80-video-engine/packages/renderer-skia/tests/fonts/`, so tests run
  without this folder. This is a backup of the exact system-font files.
  Restore: `mkdir -p ~/.fonts && cp _rescue/fonts/*.ttf ~/.fonts/`
- `tmp-scripts/enctrial-trial.mjs` — from `/tmp/enctrial/trial.mjs`,
  the in-process H.264/AAC → MP4 trial that became `@x80/encoding`.
- `tmp-scripts/fxperf.mjs` — from `/tmp/fxperf.mjs`, effects perf probe.
- `tmp-scripts/smoke.mjs` — from `/tmp/smoke.mjs`, tiny import smoke test.
- `tmp-scripts/probe.ttf` — from `/tmp/probe.ttf` (14-byte probe stub).
- `m3-remotion-140.png`, `m4-remotion.png` — raw Remotion stills from `/tmp`.
  Already committed as goldens:
  `packages/renderer-skia/tests/golden/remotion-m3compare-140.png` and
  `packages/renderer-skia/tests/golden-text/remotion-m4compare.png`.

## What does NOT need rescue
- `x80-video-engine/` (repo, incl. `node_modules/` + `package-lock.json` +
  all goldens + font fixtures) — already inside `/kaggle/working/`.
- `my-video/` (Remotion reference, 5 compositions) — already in working.
- `X80_VIDEO_ENGINE_CORE_PLAN.md`, `PROGRESS.md` — already in working.
- `shorts-dl/` sample MP4s — already in working.
- No source file references `/tmp`, `/root`, or `$HOME` absolute paths
  (verified by grep; only node_modules docs + one PROGRESS.md doc mention).

## Reinstall after a fresh session
```bash
cd /kaggle/working/x80-video-engine
npm ci            # restores node_modules from package-lock.json
npx vitest run    # expect 17 files, 220/220 (pre-M8 baseline)
```
