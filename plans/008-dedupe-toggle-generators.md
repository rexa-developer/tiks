# Plan 008: Consolidate toggleOn/toggleOff into one parameterized factory

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. Your reviewer maintains `plans/README.md`.
>
> **Drift check (run first)**: confirm `src/tests/generators.test.ts` contains
> exhaustive toggleOn/toggleOff characterization tests (from plan 007, merged
> into your branch). If they are absent, STOP — this refactor must not proceed
> without that net.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW (behavior pinned by plan 007's tests)
- **Depends on**: plans/007 (hard dependency — characterization net)
- **Category**: tech-debt
- **Planned at**: commit `5ea26e0`, 2026-06-11

## Why this matters

`src/generators/toggle.ts` is 72 lines: two generators that are byte-for-byte
identical except for two frequency ratios (`toggleOn`: 0.8 → 1.2;
`toggleOff`: 1.0 → 0.6). Every past tuning pass had to edit both blocks in
lockstep — and a missed edit would desynchronize the pair silently (no test
caught envelope values until plan 007). One factory removes the duplication
and makes the on/off relationship explicit.

## Current state

`src/generators/toggle.ts` at `5ea26e0`: `toggleOn` (lines 4-37) and
`toggleOff` (lines 39-72) each contain:

```ts
export const toggleOn: SoundGenerator = (ctx, dest, theme) => {
  const now = startTime(ctx)
  const duration = Math.max(0.06 * theme.decay, 0.005)

  // Rising sine: 0.8x → 1.2x
  const osc = ctx.createOscillator()
  osc.type = theme.oscType
  osc.frequency.setValueAtTime(theme.baseFreq * 0.8, now)
  osc.frequency.exponentialRampToValueAtTime(theme.baseFreq * 1.2, now + duration)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.001, now)
  gain.gain.linearRampToValueAtTime(0.75, now + theme.attack)
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

  osc.connect(gain)
  gain.connect(dest)

  osc.start(now)
  osc.stop(now + duration)

  // Noise transient
  const noiseDuration = Math.max(0.01 * theme.decay, 0.005)
  const noise = createNoiseSource(ctx, theme)

  const nGain = ctx.createGain()
  nGain.gain.setValueAtTime(0.24, now)
  nGain.gain.exponentialRampToValueAtTime(0.001, now + noiseDuration)

  noise.connect(nGain)
  nGain.connect(dest)
  noise.start(now)
  noise.stop(now + noiseDuration)
}
```

`toggleOff` differs only in the comment (`// Falling sine: 1.0x → 0.6x (ends
below toggleOn's 1.2x peak)`) and the two frequency lines
(`theme.baseFreq` / `theme.baseFreq * 0.6`).

Existing test (`src/tests/generators.test.ts`) asserts `fn.length === 3` for
every generator — the factory's returned arrow function must keep all three
parameters.

## Commands you will need

| Purpose   | Command             | Expected on success |
|-----------|---------------------|---------------------|
| Install   | `npm ci`            | exit 0              |
| Typecheck | `npm run typecheck` | exit 0              |
| Toggle net | `npx vitest run src/tests/generators.test.ts` | all pass, UNCHANGED |
| Tests     | `npm test`          | full suite passes   |

## Scope

**In scope**:
- `src/generators/toggle.ts` only

**Out of scope**:
- `src/tests/generators.test.ts` — the characterization tests must pass
  **without modification**; editing them defeats the purpose.
- Any other generator — do not generalize the factory beyond toggle.

## Git workflow

- Branch: `advisor/008-dedupe-toggle-generators` (created from `advisor/007-generator-characterization-tests`)
- Commit style: e.g. `refactor(generators): parameterize toggle on/off into one factory`
- Do NOT push or open a PR.

## Steps

### Step 1: Replace both bodies with a factory

Target shape (preserve the existing comments' content):

```ts
import type { SoundGenerator } from '../types'
import { createNoiseSource, startTime } from './_util'

// Pitch snap with a noise transient. On rises 0.8x → 1.2x; off falls
// 1.0x → 0.6x (ending below on's peak so the pair reads as open/close).
const makeToggle = (startRatio: number, endRatio: number): SoundGenerator =>
  (ctx, dest, theme) => {
    /* the shared body, with
       osc.frequency.setValueAtTime(theme.baseFreq * startRatio, now)
       osc.frequency.exponentialRampToValueAtTime(theme.baseFreq * endRatio, now + duration) */
  }

export const toggleOn = makeToggle(0.8, 1.2)
export const toggleOff = makeToggle(1.0, 0.6)
```

Every scheduled value (durations, 0.75 / 0.24 / 0.001 gains, attack, noise
start/stop) must be identical to the current code.

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Prove behavior is unchanged

**Verify**: `npx vitest run src/tests/generators.test.ts` → all pass with
zero edits to the test file (`git diff --stat src/tests/` → empty).
Then `npm test` → full suite passes.

## Test plan

No new tests — plan 007's characterization tests are the gate. The whole
point is that they pass untouched.

## Done criteria

- [ ] `npm run typecheck` exits 0; `npm test` exits 0
- [ ] `src/tests/generators.test.ts` is byte-identical to before this plan (`git diff <parent> -- src/tests/` empty for your commit)
- [ ] `src/generators/toggle.ts` contains exactly one envelope body (grep: `linearRampToValueAtTime` appears once in the file)
- [ ] `toggleOn`/`toggleOff` still exported with the same names; `fn.length === 3` test still passes

## STOP conditions

- The toggle characterization tests from plan 007 are missing or were written
  loosely (e.g. only assert no-throw) — report; do not proceed on a weak net.
- Any characterization test fails after the refactor and the fix would require
  editing the test rather than the refactored code.

## Maintenance notes

- Future tuning of the toggle pair now edits ratios at the two `makeToggle`
  call sites; the shared envelope edits once.
- Do NOT extend `makeToggle` to other generators without a maintainer
  decision — the other duplication was explicitly judged not worth the
  regression risk (see plans/README.md, rejected findings).
