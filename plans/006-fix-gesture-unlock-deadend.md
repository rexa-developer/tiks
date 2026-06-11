# Plan 006: Fix the gesture-unlock dead-end when resume() resolves in a non-running state

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. Your reviewer maintains `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 5ea26e0..HEAD -- src/engine.ts src/tests/`
> If in-scope files changed since planning, compare the "Current state"
> excerpts against the live code; on a mismatch, STOP.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `5ea26e0`, 2026-06-11

## Why this matters

The first user gesture creates the AudioContext and, if it starts `suspended`,
calls `resume()`. On iOS, `resume()` can resolve while the context is in a
non-`running` state (e.g. `interrupted` during a phone call or Siri overlay).
In that path the `unlocking` re-entrancy flag is never reset and the teardown
is never called — so every subsequent gesture hits `if (unlocking) return` and
the unlock listeners are permanently inert while still bound. `playSound`'s own
resume-retry partially masks the bug, but the dedicated unlock path (which also
fires the iOS silent-buffer trick) is dead for the rest of the page's life.
One-line state fix plus regression tests.

## Current state

`src/engine.ts:103-123` at commit `5ea26e0` (inside `bindGestureUnlock`):

```ts
    let unlocking = false
    const unlock = () => {
      if (unlocking) return
      unlocking = true
      const c = this.createContext()
      if (!c) return
      if (c.state === 'suspended') {
        c.resume().then(
          () => { if (c.state === 'running') this._unlockTeardown?.() },
          () => { unlocking = false },
        )
      }
      // iOS Safari additionally needs a node started inside the gesture.
      try {
        const src = c.createBufferSource()
        src.buffer = c.createBuffer(1, 1, 22050)
        src.connect(c.destination)
        src.start(0)
      } catch {}
      if (c.state === 'running') this._unlockTeardown?.()
    }
```

The defect: in the `resume().then` **success** handler, the
`c.state === 'running'` check has no `else` — resolve-but-not-running leaves
`unlocking === true` forever. (The rejection handler already resets it.)

Also relevant: `this._unlockTeardown` (`src/engine.ts:129-134`) removes the
gesture listeners; `GESTURE_EVENTS` is `['pointerdown', 'touchstart',
'mousedown', 'keydown']` (`src/engine.ts:8`).

Test conventions: `src/tests/setup.ts` installs a global `MockAudioContext`
(initial `state: 'running'`, `resume` resolves). `src/tests/reduced-motion.test.ts`
demonstrates the fresh-module pattern for testing the singleton
(`vi.resetModules()` + dynamic `import('../engine')`) — model the new tests
on it.

## Commands you will need

| Purpose   | Command             | Expected on success |
|-----------|---------------------|---------------------|
| Install   | `npm ci`            | exit 0              |
| Typecheck | `npm run typecheck` | exit 0              |
| Tests     | `npm test`          | 79 existing + new all pass |
| One file  | `npx vitest run src/tests/unlock.test.ts` | all pass |

## Scope

**In scope**:
- `src/engine.ts` (the `resume().then` success handler only)
- `src/tests/unlock.test.ts` (create)

**Out of scope**:
- The rest of `bindGestureUnlock` — the listener wiring, silent-buffer trick,
  and synchronous `running` fast-path are load-bearing autoplay-policy fixes
  (see CLAUDE.md invariants 1–3). Do not restructure.
- `src/tests/setup.ts` — keep any context-state manipulation local to the new
  test file.

## Git workflow

- Branch: `advisor/006-fix-gesture-unlock-deadend`
- Commit style: conventional commits (e.g. `fix(engine): retry gesture unlock when resume resolves non-running`)
- Do NOT push or open a PR.

## Steps

### Step 1: Reset `unlocking` on resolve-but-not-running

Replace the success handler so both resolution outcomes are handled:

```ts
        c.resume().then(
          () => {
            if (c.state === 'running') this._unlockTeardown?.()
            else unlocking = false
          },
          () => { unlocking = false },
        )
```

No other lines change.

**Verify**: `npm run typecheck` → exit 0. `npm test` → all 79 existing tests pass.

### Step 2: Regression tests in `src/tests/unlock.test.ts`

Use the fresh-module pattern from `src/tests/reduced-motion.test.ts`. To
simulate the iOS behavior, subclass the global mock before importing the
engine:

```ts
class StuckSuspendedContext extends (globalThis.AudioContext as any) {
  state: AudioContextState = 'suspended'
  resume = vi.fn(() => Promise.resolve())   // resolves, state stays 'suspended'
}
vi.stubGlobal('AudioContext', StuckSuspendedContext)
```

Cases (each with a fresh engine via `vi.resetModules()` + dynamic import,
restoring globals in `beforeEach` with `vi.unstubAllGlobals()`):

1. **Retry after resolve-but-not-running** (the regression): stub the stuck
   context → `init()` → dispatch `pointerdown` → `await Promise.resolve()`
   (flush the resume promise) → dispatch `pointerdown` again → the context's
   `resume` mock has been called **twice**. (Before the fix it is called once —
   confirm the test fails on the unfixed code if convenient, but do not commit
   that state.)
2. **Teardown still happens on success**: stub a context whose `resume`
   sets `this.state = 'running'` before resolving → `init()` → `pointerdown` →
   flush microtasks → `pointerdown` again → `resume` called only **once**
   (listeners were torn down).
3. **Rejection still allows retry** (guards existing behavior): `resume`
   rejects, state stays `suspended` → two dispatches with a flush between →
   `resume` called twice.

**Verify**: `npx vitest run src/tests/unlock.test.ts` → all pass. `npm test` → full suite passes.

## Test plan

Covered by Step 2 — three cases in `src/tests/unlock.test.ts`, modeled on
`src/tests/reduced-motion.test.ts` (fresh module + stubbed globals).

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npm test` exits 0; `src/tests/unlock.test.ts` exists with ≥3 passing tests
- [ ] The success handler of `resume().then` in `bindGestureUnlock` contains an `else` branch resetting `unlocking`
- [ ] Only `src/engine.ts` and `src/tests/unlock.test.ts` changed in your commit

## STOP conditions

- The excerpt above doesn't match `src/engine.ts:103-123`.
- The mock-subclass approach cannot make the engine observe a suspended
  context (e.g. `createContext` caches a previous mock) and you cannot fix it
  within the test file.
- Any pre-existing test fails after Step 1.

## Maintenance notes

- Plans 007–013 stack on this branch; nothing else touches `bindGestureUnlock`.
- Reviewer: confirm the synchronous `running` fast-path at the bottom of
  `unlock()` is untouched — it's what unbinds listeners in the common
  Chrome case where the context is born running.
