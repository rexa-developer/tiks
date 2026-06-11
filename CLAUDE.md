# CLAUDE.md — tiks

Procedural UI-sound library for the web. Pure Web Audio synthesis, zero runtime
dependencies, zero audio files. Published as `@rexa-developer/tiks`.

## Commands

| Purpose           | Command                                              | Success |
|-------------------|------------------------------------------------------|---------|
| Type-check        | `npm run typecheck`                                  | exit 0  |
| Lint + format     | `npm run lint` (fix: `npm run lint:fix`)             | exit 0  |
| Run tests         | `npm test`                                           | exit 0  |
| Watch tests       | `npm run test:watch`                                 | —       |
| Build (`dist/`)   | `npm run build`                                      | exit 0  |
| Single test file  | `npx vitest run src/tests/<file>`                    | exit 0  |

`dist/` is gitignored. ESM + CJS dual build via tsup. Biome handles lint+format
(`biome.json` — config matches house style; run `npm run lint:fix` before committing).

## Architecture

```
src/engine.ts          AudioEngine singleton — AudioContext lifecycle, autoplay unlock,
                       mute/volume/reduced-motion state, hover throttle. One shared instance.
src/tiks.ts            TiksEngine — per-instance theme, delegates all playback to engine.
src/index.ts           Exports: singleton `tiks`, class `TiksEngine`, tree-shakeable
                       functional wrappers (click(), hover(), …), bindTiks, createTiks.
src/generators/        One pure SoundGenerator per sound: (ctx, dest, theme) => void
  _util.ts             startTime() helper + noise source factory
  pop.ts               Smallest exemplar — copy this for new sounds
  toggle.ts            makeToggle(startRatio, endRatio) factory → toggleOn/toggleOff
  index.ts             Re-exports all generators
src/themes.ts          SOFT/CRISP/ARCADE/GLASS presets, resolveTheme(), defineTheme()
src/noise.ts           Cached white/pink noise AudioBuffer factories
src/bind.ts            bindTiks() — delegated data-tiks click binding
src/create.ts          createTiks() factory (TiksApi) — basis for svelte/solid adapters
src/react.ts           useTiks() hook (optional peer: react ≥ 18)
src/vue.ts             useTiks() composable (optional peer: vue ≥ 3)
src/svelte.ts          useTiks = createTiks re-export (framework-free, no peer dep)
src/solid.ts           useTiks = createTiks re-export (framework-free, no peer dep)
src/tests/             vitest + jsdom; setup.ts installs MockAudioContext globally
```

## Invariants (do not "simplify" these)

Autoplay policy has caused four separate release fixes (`886f2df`, `674a04a`,
`17a2cdb`, `b09c855`). These patterns are load-bearing:

1. **AudioContext created only inside a gesture handler** — `bindGestureUnlock`
   (`src/engine.ts:106`) defers `createContext()` to the first qualifying pointer/key
   event. Creating it eagerly in `init()` triggers Chrome's autoplay warning.

2. **`playSound` bails silently when no context** — `src/engine.ts:160-166`. Do not
   "fix" by lazily creating a context there; that re-introduces the warning.

3. **Never check `ctx.state` synchronously after `resume()`** — always schedule on
   the promise (`src/engine.ts:168-177`). Synchronous check always reads
   `'suspended'` and drops the sound.

4. **`unmute()` must never override reduced-motion muting** — `_muted` and
   `_respectReducedMotion` are separate state variables (`src/engine.ts:14-16`).
   The comment at `src/engine.ts:67-72` explains the split. `isMuted()` ORs both.

5. **Generators schedule with `startTime(ctx)`** — 5 ms offset
   (`src/generators/_util.ts:4-9`). Safari drops events scheduled exactly at
   `ctx.currentTime`.

6. **Option semantics are last-explicit-wins** — `init()` only overwrites `muted`,
   `hoverThrottleMs`, and `respectReducedMotion` when the caller supplies them
   (`src/engine.ts:31-39`). Calling `init()` again without them preserves state.

7. **Deliberate sound tuning must change the characterization tests in the same
   commit** — `src/tests/generators.test.ts` pins every envelope/frequency under
   SOFT; a sound change without a matching test diff is a regression, not a tune.

## Conventions

- **Commit style**: conventional commits (`feat:`, `fix:`, `docs:`, `chore:` …).
- **Bundle size is a feature**: core ~3.5 KB gzip everything-included (README badge,
  measured via `cat dist/index.js dist/chunk-*.js | gzip -c | wc -c`). Additions must
  justify their bytes — no utility libraries, no polyfills.
- **Generators are pure**: `(ctx: AudioContext, dest: AudioNode, theme: TiksTheme) => void`.
  No side-effects beyond scheduling Web Audio nodes.
- **Adding a sound**: follow `src/generators/pop.ts`; register in
  `src/generators/index.ts`, `src/tiks.ts`, `src/index.ts`, `src/create.ts`,
  `src/bind.ts` (SOUNDS map), and the README sound table; add characterization tests.
- **Zero runtime dependencies** in the published package (`peerDependencies` only;
  svelte/solid adapters deliberately have none).

## Releasing

See `RELEASING.md` (`npm version patch|minor|major && git push --follow-tags`;
requires the `NPM_TOKEN` repo secret).

## Plans directory

`plans/` (local-only, gitignored) holds advisor-generated implementation plans
and execution records; read `plans/README.md` before starting work there.
