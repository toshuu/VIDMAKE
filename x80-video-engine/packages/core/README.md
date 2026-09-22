# @x80/core

X80 Video Engine core: deterministic timeline + animation + scene/renderer/asset contracts.

- `src/animation/` — Remotion-compatible `interpolate`, `Easing` (18), `bezier`,
  `spring`/`measureSpring`, `random`, `interpolateColors`.
- `src/timeline/` — `Composition`/`Sequence`/`Series`/`Loop`/`Freeze`/`Still`
  types + pure `resolveTimeline` / `collectLeaves` resolver.
- `src/scene/` — JSON-compatible scene graph types.
- `src/renderer/` — backend-agnostic `Renderer` interface.
- `src/assets/` — asset lifecycle contracts.

```bash
npm install
npm test        # vitest, includes live parity tests vs installed Remotion reference
npm run build   # tsc → dist/
```

Parity policy: the installed Remotion 4.0.526 copy under
`/kaggle/working/my-video/node_modules` is the behavioral reference for
tests only — never a runtime dependency.
