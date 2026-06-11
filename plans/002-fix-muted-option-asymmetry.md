# Plan 002: Make `init({ muted: false })` able to unmute (last-explicit-wins)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 8c47034..HEAD -- src/engine.ts src/tests/engine.test.ts README.md`
> Plan 001 intentionally modifies `src/engine.ts` before this plan runs — that
> diff is expected. Confirm the specific line excerpted below still exists
> verbatim; if it doesn't, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/001-fix-reduced-motion-opt-out.md (same file; sequencing only, not a hard dependency)
- **Category**: bug
- **Planned at**: commit `8c47034`, 2026-06-11

## Why this matters

`tiks.init({ muted: ... })` is documented in the README (Options section, ~line 115: `muted: false, // Start muted`) and is wired as a reactive dependency in the React hook — `src/react.ts:21-23` re-runs `init(options)` whenever the `muted` option changes. But the engine only ever *sets* the flag: `init({ muted: true })` mutes, and a subsequent `init({ muted: false })` silently does nothing. A React user toggling `useTiks({ muted: isSoundOff })` gets a one-way switch: sound turns off and never comes back. The fix is one line plus tests, and it makes `muted` behave like the other last-explicit-wins global options (`volume`, and `respectReducedMotion` after plan 001).

## Current state

- `src/engine.ts` — `AudioEngine.init()`; the buggy line at `src/engine.ts:28` (commit `8c47034`):

  ```ts
  init(options?: TiksOptions) {
    if (!AudioCtxCtor) return

    if (options?.volume !== undefined) this._volume = Math.max(0, Math.min(1, options.volume))
    if (this.masterGain) this.masterGain.gain.value = this._volume

    if (options?.muted) this._muted = true   // ← line 28: sets, never clears
    ...
  ```

  Note how the `volume` line directly above already uses the
  `!== undefined` last-explicit-wins pattern — match it.

- `src/react.ts:15-23` — the hook extracts `muted` and re-inits on change:

  ```ts
  const volume = options?.volume
  const muted = options?.muted
  const respectReducedMotion = options?.respectReducedMotion

  useEffect(() => {
    engineRef.current!.init(options)
  }, [themeKey, volume, muted, respectReducedMotion])
  ```

- `src/tests/engine.test.ts` — existing engine tests, including
  `'mutes when init with muted option'` (~line 76), which only covers the
  `true` direction.

Interaction to preserve: explicit `mute()` / `unmute()` calls
(`src/engine.ts:163-169`) use the same `_muted` field. `init({ muted: false })`
clearing a mute that was set by `mute()` is acceptable and consistent —
both are explicit caller intents on the same global flag; latest call wins.

## Commands you will need

| Purpose   | Command             | Expected on success |
|-----------|---------------------|---------------------|
| Install   | `npm ci`            | exit 0              |
| Typecheck | `npm run typecheck` | exit 0, no output   |
| Tests     | `npm test`          | all pass            |
| One file  | `npx vitest run src/tests/engine.test.ts` | all pass |

## Scope

**In scope** (the only files you may modify):
- `src/engine.ts` (one line)
- `src/tests/engine.test.ts` (add tests)
- `README.md` (one clarifying comment, step 3)

**Out of scope** (do NOT touch):
- `src/react.ts`, `src/vue.ts` — already correct once the engine honors the option.
- `mute()`/`unmute()`/`isMuted()` — unchanged.
- Reduced-motion logic — owned by plan 001.

## Git workflow

- Branch: `advisor/002-fix-muted-option-asymmetry`
- Commit style: conventional commits (e.g. `fix(engine): let init({ muted: false }) unmute`)
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Fix the assignment

In `src/engine.ts` `init()`, replace:

```ts
if (options?.muted) this._muted = true
```

with:

```ts
if (options?.muted !== undefined) this._muted = options.muted
```

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Add regression tests

In `src/tests/engine.test.ts`, next to the existing
`'mutes when init with muted option'` test, add (matching its style — the
file uses the shared `audioEngine` singleton and resets state at the end of
each test):

1. `init({ muted: true })` then `init({ muted: false })` → `isMuted()` is `false`.
2. `init({ muted: true })` then `init()` (no option) → `isMuted()` is still `true` (omitted option does not clobber).
3. After `init({ muted: false })`, `playSound` with a `vi.fn()` generator calls the generator (use the existing `testTheme` fixture at the top of the file; the suite's earlier tests already create the context).

End each new test with the engine unmuted (`audioEngine.unmute()`), matching the file's existing cleanup convention.

**Verify**: `npx vitest run src/tests/engine.test.ts` → all pass, including 3 new tests. `npm test` → full suite passes.

### Step 3: Document the semantics in README

In `README.md` Options section, change the `muted` line's comment from
`// Start muted` to `// Mute/unmute. Last explicit value wins (shared globally).`
Do not restructure the section.

**Verify**: `grep -n '"muted"\|muted:' README.md | head -3` → shows the updated comment.

## Test plan

Covered in Step 2 — three cases in `src/tests/engine.test.ts`, modeled
structurally on the existing `'mutes when init with muted option'` test.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run typecheck` exits 0
- [ ] `npm test` exits 0 with 3 new engine tests passing
- [ ] `grep -n "options?.muted !== undefined" src/engine.ts` returns exactly one match
- [ ] `git status --porcelain` shows changes only to `src/engine.ts`, `src/tests/engine.test.ts`, `README.md`, `plans/README.md`
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `src/engine.ts` no longer contains the line `if (options?.muted) this._muted = true` (drifted or already fixed — check `plans/README.md` and git log, then report).
- Any existing test fails after Step 1 — in particular if some test depends on `init({ muted: false })` being a no-op.
- The fix appears to require changing the React or Vue adapter.

## Maintenance notes

- The `muted` flag is global across all `TiksEngine` instances (single `audioEngine`); two `useTiks` hooks passing opposite `muted` values will fight, last-mounted wins. That is pre-existing, documented behavior (README React note) — not changed here.
- Reviewer should scrutinize: that test 2 (omitted option preserves state) passes — it guards against an over-eager `this._muted = !!options?.muted` rewrite, which would clobber.
