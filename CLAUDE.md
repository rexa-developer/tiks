# CLAUDE.md — tiks

Procedural UI-sound library for the web. Pure Web Audio synthesis, zero runtime
dependencies, zero audio files. Published as `@rexa-developer/tiks`.

## Commands

| Purpose           | Command                                              | Success |
|-------------------|------------------------------------------------------|---------|
| Type-check        | `npm run typecheck`                                  | exit 0  |
| Run tests         | `npm test`                                           | exit 0  |
| Watch tests       | `npm run test:watch`                                 | —       |
| Build (`dist/`)   | `npm run build`                                      | exit 0  |
| Single test file  | `npx vitest run src/tests/<file>`                    | exit 0  |

`dist/` is gitignored. ESM + CJS dual build via tsup.

## Architecture

```
src/engine.ts          AudioEngine singleton — AudioContext lifecycle, autoplay unlock,
                       mute/volume/reduced-motion state. One instance shared by all.
src/tiks.ts            TiksEngine — per-instance theme, delegates all playback to engine.
src/index.ts           Exports: singleton `tiks`, class `TiksEngine`, tree-shakeable
                       functional wrappers (click(), hover(), …).
src/generators/        One pure SoundGenerator per sound: (ctx, dest, theme) => void
  _util.ts             startTime() helper + noise source factory
  pop.ts               Smallest exemplar — copy this for new sounds
  index.ts             Re-exports all generators
src/themes.ts          SOFT_THEME, CRISP_THEME, resolveTheme(), defineTheme()
src/noise.ts           Cached white/pink noise AudioBuffer factories
src/react.ts           useTiks() hook (optional peer: react ≥ 18)
src/vue.ts             useTiks() composable (optional peer: vue ≥ 3)
src/tests/             vitest + jsdom; setup.ts installs MockAudioContext globally
```

## Invariants (do not "simplify" these)

Autoplay policy has caused four separate release fixes (`886f2df`, `674a04a`,
`17a2cdb`, `b09c855`). These patterns are load-bearing:

1. **AudioContext created only inside a gesture handler** — `bindGestureUnlock`
   (`src/engine.ts:98`) defers `createContext()` to the first qualifying pointer/key
   event. Creating it eagerly in `init()` triggers Chrome's autoplay warning.

2. **`playSound` bails silently when no context** — `src/engine.ts:153`. Do not
   "fix" by lazily creating a context there; that re-introduces the warning.

3. **Never check `ctx.state` synchronously after `resume()`** — always schedule on
   the promise (`src/engine.ts:158-164`). Synchronous check always reads
   `'suspended'` and drops the sound.

4. **`unmute()` must never override reduced-motion muting** — `_muted` and
   `_respectReducedMotion` are separate state variables (`src/engine.ts:14-16`).
   The comment at `src/engine.ts:61-66` explains the split. `isMuted()` ORs both.

5. **Generators schedule with `startTime(ctx)`** — 5 ms offset
   (`src/generators/_util.ts:4-9`). Safari drops events scheduled exactly at
   `ctx.currentTime`.

6. **`respectReducedMotion` and `muted` are last-explicit-wins** — `init()` only
   overwrites these when the caller supplies them (`src/engine.ts:29-33`). Calling
   `init()` a second time without them preserves the current value.

## Conventions

- **Commit style**: conventional commits (`feat:`, `fix:`, `docs:`, `chore:` …).
- **Bundle size is a feature**: ~2 KB gzip (README badges). Additions must justify
  their bytes — no utility libraries, no polyfills.
- **Generators are pure**: `(ctx: AudioContext, dest: AudioNode, theme: TiksTheme) => void`.
  No side-effects beyond scheduling Web Audio nodes.
- **Adding a sound**: follow `src/generators/pop.ts`; register in
  `src/generators/index.ts`, `src/tiks.ts`, `src/index.ts`, and README sound table.
- **Zero runtime dependencies** in the published package (`peerDependencies` only).

## Releasing

See `RELEASING.md`.

## Plans directory

`plans/` holds advisor-generated implementation plans; read `plans/README.md`
before starting work there.
