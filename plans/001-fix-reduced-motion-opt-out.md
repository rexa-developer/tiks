# Plan 001: Make `respectReducedMotion: false` actually opt out, at any init order

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 8c47034..HEAD -- src/engine.ts src/tests/ README.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `8c47034`, 2026-06-11

## Why this matters

This library auto-mutes when the OS `prefers-reduced-motion` preference is set, and the README (line 116) documents `respectReducedMotion: false` as the way to opt out: "Set false to always play." That opt-out is broken whenever **any** `init()` call without the option runs first: `bindReducedMotion()` binds permanently on first default init, and a later `init({ respectReducedMotion: false })` returns early without unbinding. The failure is realistic, not theoretical — `useTiks()` (React and Vue) auto-initializes per component, so one component using `useTiks()` with no options permanently overrides another component's explicit opt-out. For an accessibility-related control, silently ignoring an explicit developer choice is the worst failure mode. After this plan, the option is honored regardless of call order, and the behavior has regression tests (it currently has **zero** test coverage).

## Current state

- `src/engine.ts` — the global `AudioEngine` singleton (`audioEngine`, exported at line 187). All reduced-motion logic lives here.
- `src/tests/engine.test.ts` — existing engine tests; uses the singleton directly.
- `src/tests/setup.ts` — installs `MockAudioContext` on `globalThis`; does **not** mock `matchMedia` (jsdom provides a stub whose `matches` is always `false` and never fires events).

The buggy code, `src/engine.ts:14-19` and `src/engine.ts:60-70` as of commit `8c47034`:

```ts
  private _muted = false
  private _reducedMotionMuted = false
  private _volume = 0.3
  private _lifecycleBound = false
  private _unlockBound = false
  private _reducedMotionBound = false
```

```ts
  // prefers-reduced-motion is respected by default. Tracked separately from
  // explicit mute() so an OS-level preference change can't be silently
  // overridden, and unmute() never re-enables sound the user asked to suppress.
  private bindReducedMotion(enabled?: boolean) {
    if (enabled === false) return
    if (this._reducedMotionBound) return
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    this._reducedMotionBound = true

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => { this._reducedMotionMuted = mq.matches }
    apply()
    mq.addEventListener('change', apply)
  }
```

Call site in `init()`, `src/engine.ts:30`:

```ts
    this.bindReducedMotion(options?.respectReducedMotion)
```

Consumers of the flag: `playSound()` at `src/engine.ts:140` (`if (this._muted || this._reducedMotionMuted) return`) and `isMuted()` at `src/engine.ts:171-173`.

The two defects:

1. Once `_reducedMotionBound` is true, `bindReducedMotion(false)` returns at the first guard **without** clearing `_reducedMotionMuted` or detaching the listener — the opt-out is a no-op.
2. Conversely the binding itself is conflated with the *policy*: whether the listener is attached and whether the preference should mute are one boolean, so the policy can never change after first bind.

**Convention to follow**: this file separates *mechanism* (listeners bound once, guarded by `_lifecycleBound` / `_unlockBound`) from *state* (private fields consulted at play time). The fix keeps that shape: bind the media-query listener once, unconditionally; make the *policy* a separate field consulted at play time.

## Commands you will need

| Purpose   | Command             | Expected on success |
|-----------|---------------------|---------------------|
| Install   | `npm ci`            | exit 0              |
| Typecheck | `npm run typecheck` | exit 0, no output   |
| Tests     | `npm test`          | all pass (70 existing + new) |
| One file  | `npx vitest run src/tests/reduced-motion.test.ts` | all pass |

## Scope

**In scope** (the only files you may modify/create):
- `src/engine.ts`
- `src/tests/reduced-motion.test.ts` (create)
- `README.md` (one clarifying sentence, step 3)

**Out of scope** (do NOT touch, even though they look related):
- `src/react.ts`, `src/vue.ts` — they already pass `respectReducedMotion` through; no change needed once the engine honors it.
- `src/tests/setup.ts` — do not add a global `matchMedia` mock there; keep the mock local to the new test file so other test files keep jsdom's default.
- `mute()` / `unmute()` semantics — `unmute()` must NOT clear reduced-motion muting (this is intentional; see the comment block excerpted above and keep it).

## Git workflow

- Branch: `advisor/001-fix-reduced-motion-opt-out`
- Commit style: conventional commits, matching repo history (e.g. `fix(engine): honor respectReducedMotion regardless of init order`)
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Separate policy from preference in `AudioEngine`

In `src/engine.ts`:

1. Add two private fields and remove none:
   ```ts
   private _respectReducedMotion = true      // policy: should the preference mute us?
   private _reducedMotionPreferred = false   // raw OS preference, tracked by the listener
   ```
2. Replace every read of `_reducedMotionMuted` with the computed form
   `this._respectReducedMotion && this._reducedMotionPreferred`
   (two sites: `playSound()` and `isMuted()`). Then delete the
   `_reducedMotionMuted` field.
3. Rewrite `bindReducedMotion` to take no parameter: it only attaches the
   listener once (keep the `_reducedMotionBound` guard and the
   `window`/`matchMedia` existence guards) and sets
   `this._reducedMotionPreferred = mq.matches` initially and on `change`.
   Keep the explanatory comment block above it, updated to describe the new
   split.
4. In `init()`, replace `this.bindReducedMotion(options?.respectReducedMotion)`
   with:
   ```ts
   if (options?.respectReducedMotion !== undefined) {
     this._respectReducedMotion = options.respectReducedMotion
   }
   this.bindReducedMotion()
   ```
   Semantics: default is `true`; an **explicit** value (true or false) from the
   most recent `init()` wins; an init call that omits the option does not
   override a previous explicit choice. This mirrors how `volume`/`muted` are
   documented as last-explicit-wins globals in the README's React section.

**Verify**: `npm run typecheck` → exit 0. `npm test` → all 70 existing tests still pass.

### Step 2: Add regression tests in a new file

Create `src/tests/reduced-motion.test.ts`. The engine is a module-level
singleton and `_reducedMotionBound` latches, so each test needs a **fresh
module instance** with a **controllable `matchMedia`**. Use this pattern
(model file structure after `src/tests/engine.test.ts` for the theme fixture):

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

type Listener = () => void

function installMatchMedia(initialMatches: boolean) {
  let matches = initialMatches
  const listeners = new Set<Listener>()
  const mql = {
    get matches() { return matches },
    addEventListener: (_: string, fn: Listener) => { listeners.add(fn) },
    removeEventListener: (_: string, fn: Listener) => { listeners.delete(fn) },
  }
  vi.stubGlobal('matchMedia', vi.fn(() => mql))
  return {
    setMatches(v: boolean) { matches = v; listeners.forEach(fn => fn()) },
  }
}

async function freshEngine() {
  vi.resetModules()
  const mod = await import('../engine')
  return mod.audioEngine
}

beforeEach(() => { vi.unstubAllGlobals() })
```

Note: `vi.stubGlobal('matchMedia', ...)` stubs `globalThis.matchMedia`, which
in jsdom is the same object as `window.matchMedia` — the engine reads
`window.matchMedia`. If the stub is not visible to the engine, stub
`window.matchMedia` directly instead.

Cover at minimum these cases (use the `testTheme` fixture shape from
`src/tests/engine.test.ts:4-8`, and create the context by dispatching
`document.dispatchEvent(new Event('pointerdown'))` after `init()` so
`playSound` has a context — see `src/tests/tiks.test.ts:6-11` for that
pattern):

1. **Default respects the preference**: matchMedia matches=true → `init()` →
   `isMuted()` is `true`; a `vi.fn()` generator passed to `playSound` is not
   called.
2. **Explicit opt-out works on first init**: matches=true →
   `init({ respectReducedMotion: false })` → `isMuted()` is `false`; generator
   IS called.
3. **The bug this plan fixes — opt-out after a default init**: matches=true →
   `init()` → `init({ respectReducedMotion: false })` → `isMuted()` is `false`;
   generator IS called.
4. **Optionless init does not clobber an explicit opt-out**: matches=true →
   `init({ respectReducedMotion: false })` → `init()` → `isMuted()` is still
   `false`.
5. **Runtime preference change**: matches=false → `init()` → generator called;
   then `setMatches(true)` → generator NOT called; then `setMatches(false)` →
   called again.
6. **`unmute()` does not override the preference**: matches=true → `init()` →
   `unmute()` → `isMuted()` is still `true`. (Preserves the documented
   intent of the existing comment block.)

**Verify**: `npx vitest run src/tests/reduced-motion.test.ts` → all new tests pass. `npm test` → full suite passes.

### Step 3: Document the precedence in README

In `README.md`, in the Options section (around line 116), extend the
`respectReducedMotion` comment line to state the precedence, e.g.:
`// Default: true. Last explicit value wins across init()/useTiks calls.`
Do not restructure the section.

**Verify**: `grep -n "respectReducedMotion" README.md` → shows the updated line.

## Test plan

Covered by Step 2 — six named cases in `src/tests/reduced-motion.test.ts`,
including the exact regression (case 3) and the precedence rule (case 4).
Pattern source: `src/tests/engine.test.ts` (fixtures, singleton handling),
`src/tests/tiks.test.ts:6-11` (gesture-driven context creation).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run typecheck` exits 0
- [ ] `npm test` exits 0; `src/tests/reduced-motion.test.ts` exists with ≥6 passing tests
- [ ] `grep -n "_reducedMotionMuted" src/engine.ts` returns no matches
- [ ] `git status --porcelain` shows changes only to `src/engine.ts`, `src/tests/reduced-motion.test.ts`, `README.md`, `plans/README.md`
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts in "Current state" don't match `src/engine.ts` at the cited lines.
- `vi.resetModules()` + dynamic import does not give a fresh engine (e.g. tests in this file observe state from each other) and you cannot isolate them within this file — do not weaken the assertions to pass.
- Honoring the option appears to require changes to `src/react.ts` or `src/vue.ts`.
- Any pre-existing test fails after Step 1 in a way unrelated to reading `_reducedMotionMuted`.

## Maintenance notes

- Plan 002 (muted-option fix) touches `init()` in the same file — land this first; 002's diff is written against this plan's shape of `init()` being irrelevant to it, but sequencing avoids conflicts.
- Reviewer should scrutinize: that `unmute()` still cannot defeat the OS preference (case 6), and that no `matchMedia` mock leaked into `src/tests/setup.ts`.
- Deferred: the media-query listener is never detached (the engine is an app-lifetime singleton; detaching has no observable benefit). Intentional, not an oversight.
