# Plan 009: Built-in hover throttling (default 80 ms, configurable, 0 disables)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. Your reviewer maintains `plans/README.md`.
>
> **Drift check (run first)**: your branch builds on plans 006–008; their
> changes to `src/engine.ts` (unlock fix) and `src/generators/toggle.ts` are
> expected. If `playSound`, `TiksOptions`, or `tiks.hover()` differ from the
> excerpts below beyond those plans' changes, STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW (additive; default changes hover behavior only under rapid fire — that is the feature)
- **Depends on**: plans/006 (same file `src/engine.ts`; sequencing)
- **Category**: direction / feature
- **Planned at**: commit `5ea26e0`, 2026-06-11

## Why this matters

The README (lines 51-54) warns: hover "fires constantly as the pointer moves,
and audio on every hover causes fatigue… debounce it." That pushes rate
limiting onto every consumer, and nobody does it. Building a minimum-interval
gate into the engine productizes the library's own advice: `hover()` simply
cannot machine-gun, and the README warning becomes a description of a default
rather than a chore. API addition: `init({ hoverThrottleMs })`, default 80,
`0` disables — a last-explicit-wins global, consistent with `volume`/`muted`.

## Current state

- `src/engine.ts` — `playSound(generator, theme)` at ~line 145 is the single
  playback gate (mute check → context check → suspended-resume path →
  `generator(ctx, master, theme)`). Engine fields and `init()` shown at
  lines 10-37 (post-plan-006 the unlock handler differs slightly — irrelevant
  here). Pattern to copy for the option: `volume` in `init()`:
  `if (options?.volume !== undefined) this._volume = Math.max(0, Math.min(1, options.volume))`.
- `src/tiks.ts` — `hover()` is `audioEngine.playSound(generators.hover, this.theme)`.
- `src/types.ts` — `TiksOptions` has `theme`, `volume`, `muted`,
  `respectReducedMotion` (the latter with a JSDoc line — match that style).
- `src/index.ts` — functional wrapper `export function hover() { tiks.hover() }`.
- README Options block (lines ~111-119) and the hover warning blockquote
  (lines 51-54).
- Test conventions: `src/tests/engine.test.ts` uses the shared singleton with
  per-test state resets.

Design decisions (made by the advisor — do not redesign):

- Throttle lives in **AudioEngine** (global, like volume/mute — auditory
  fatigue is global, and two `useTiks` components hovering in the same 80 ms
  should still produce one tick).
- New public engine method `playHover(generator, theme)`; `TiksEngine.hover()`
  switches to it. Other sounds are NOT throttled.
- Clock: `performance.now()` with a `Date.now()` fallback
  (`typeof performance !== 'undefined'`).
- Default `80` (ms). `init({ hoverThrottleMs: 0 })` disables. Negative values
  clamp to 0. Last explicit value wins; omitted option preserves current.

## Commands you will need

| Purpose   | Command             | Expected on success |
|-----------|---------------------|---------------------|
| Install   | `npm ci`            | exit 0              |
| Typecheck | `npm run typecheck` | exit 0              |
| Tests     | `npm test`          | full suite passes   |
| One file  | `npx vitest run src/tests/engine.test.ts` | all pass |

## Scope

**In scope**:
- `src/engine.ts`, `src/tiks.ts`, `src/types.ts`
- `src/tests/engine.test.ts` (add tests)
- `README.md` (Options block + hover blockquote)

**Out of scope**:
- `src/react.ts` / `src/vue.ts` — they pass `options` through to `init()`;
  nothing to do. (The React hook's `useEffect` deps don't include
  `hoverThrottleMs`; acceptable — note it, don't fix it here.)
- `src/generators/hover.ts` — the sound itself is unchanged.
- No per-sound throttling framework. Hover only, one field, one method.

## Git workflow

- Branch: `advisor/009-hover-throttling` (created from `advisor/008-dedupe-toggle-generators`)
- Commit style: e.g. `feat(engine): throttle hover() to one tick per 80ms (configurable)`
- Do NOT push or open a PR.

## Steps

### Step 1: Engine support

In `src/engine.ts` add fields:

```ts
private _hoverThrottleMs = 80
private _lastHoverAt = -Infinity
```

In `init()`, after the `muted` line, following the volume clamp pattern:

```ts
if (options?.hoverThrottleMs !== undefined) {
  this._hoverThrottleMs = Math.max(0, options.hoverThrottleMs)
}
```

New method next to `playSound`:

```ts
// hover() fires on every pointer pass; gate it to one tick per interval so
// dense UIs can't machine-gun the sound (README told users to debounce —
// now the engine does).
playHover(generator: SoundGenerator, theme: TiksTheme) {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
  if (now - this._lastHoverAt < this._hoverThrottleMs) return
  this._lastHoverAt = now
  this.playSound(generator, theme)
}
```

In `src/types.ts`, add to `TiksOptions` with a JSDoc line matching
`respectReducedMotion`'s style:

```ts
/** Minimum ms between hover() sounds. Default: `80`. `0` disables throttling. */
hoverThrottleMs?: number
```

In `src/tiks.ts`, change `hover()` to
`audioEngine.playHover(generators.hover, this.theme)`.

**Verify**: `npm run typecheck` → exit 0; `npm test` → existing suite passes.

### Step 2: Tests in `src/tests/engine.test.ts`

Use `vi.spyOn(performance, 'now')` (or `vi.useFakeTimers()` +
`vi.setSystemTime` — pick one; mockReturnValue sequencing on `performance.now`
is simpler) to control the clock. Cases:

1. Two `playHover` calls 10 ms apart → generator called once.
2. Two calls 100 ms apart (default 80) → called twice.
3. `init({ hoverThrottleMs: 0 })` → two immediate calls both play.
4. `init({ hoverThrottleMs: 200 })` then calls at +100 ms → second blocked; at +250 ms → plays.
5. Throttle state is global: two different `TiksEngine` instances (import
   `TiksEngine` from `../tiks`), `hover()` on both within 10 ms → one play
   (spy on `audioEngine.playSound` or count via a stubbed generator on one
   engine — simplest: spy on `audioEngine['playSound']`).

Reset between tests: `init({ hoverThrottleMs: 80 })` and restore mocks; note
`_lastHoverAt` persists on the singleton — advance the mocked clock well past
the window at each test start instead of trying to reset the private field.

**Verify**: `npx vitest run src/tests/engine.test.ts` → all pass. `npm test` → full suite passes.

### Step 3: README

- Options block: add `hoverThrottleMs: 80,    // Min ms between hover() sounds. 0 disables.`
- Hover blockquote (lines 51-54): rewrite to say throttling is built in
  (default 80 ms, configurable via `hoverThrottleMs`), keep the advice to
  avoid binding hover to dense lists.

**Verify**: `grep -n "hoverThrottleMs" README.md` → both spots.

## Test plan

Step 2's five cases; pattern source `src/tests/engine.test.ts` (singleton +
state-reset convention).

## Done criteria

- [ ] `npm run typecheck` exits 0; `npm test` exits 0 with ≥5 new tests
- [ ] `grep -n "playHover" src/engine.ts src/tiks.ts` → definition + one call site
- [ ] Only the 5 in-scope files changed in your commit
- [ ] README documents the option in both places

## STOP conditions

- `playSound`'s shape differs materially from the excerpt (plans 006-008
  shouldn't have touched it).
- Throttling appears to require changes to the React/Vue adapters to work.
- The singleton's persisted `_lastHoverAt` makes tests order-dependent in a
  way clock-advancing can't fix.

## Maintenance notes

- If per-sound throttling is ever generalized, fold `playHover` into a
  `playSound(generator, theme, { minIntervalMs })` option — don't grow
  parallel `playX` methods.
- The React hook won't react to `hoverThrottleMs` prop changes (not in its
  dep array) — fine for a tuning constant; revisit if users ask.
