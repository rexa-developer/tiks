# Plan 007: Characterization tests for generators — assert envelopes, frequencies, and scheduling

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. Your reviewer maintains `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 5ea26e0..HEAD -- src/generators/ src/tests/generators.test.ts src/tests/setup.ts`
> Plan 006's changes to `src/engine.ts`/`src/tests/unlock.test.ts` are expected
> in your branch history and are NOT drift. If the generators themselves
> changed, STOP.

## Status

- **Priority**: P1 (prerequisite for plan 008)
- **Effort**: M
- **Risk**: LOW (test-only; no source changes)
- **Depends on**: plans/006 (sequencing only — your branch builds on it)
- **Category**: tests
- **Planned at**: commit `5ea26e0`, 2026-06-11

## Why this matters

The generators are the product — the repo's history is dominated by `tune:`
commits adjusting envelope peaks, durations, and frequency ratios by ear
(`0c7a9b7`, `23bdffd`, `86f8903`). Yet `src/tests/generators.test.ts` asserts
only "does not throw" and arity, so any regression to those tuned values
passes CI silently. This plan pins the current sonic behavior as
characterization tests: exact frequencies, ramp targets, and start/stop times
captured from the mock. It is the safety net that makes plan 008's toggle
refactor (and any future tuning) reviewable: a diff in sound now shows up as
a test diff.

## Current state

- `src/generators/` — nine generator modules, all pure functions
  `(ctx, dest, theme) => void`. Scheduling always begins at
  `startTime(ctx) = ctx.currentTime + 0.005` (`src/generators/_util.ts:4-10`,
  `SCHEDULE_OFFSET = 0.005`). With the mock's `currentTime = 0`, **now = 0.005**
  in every assertion below.
- `src/tests/setup.ts` — the global `MockAudioContext`. Every mock node records
  calls: `gain.gain.setValueAtTime/linearRampToValueAtTime/exponentialRampToValueAtTime`
  are `vi.fn()`, `osc.frequency.*` likewise, `start`/`stop`/`connect` are `vi.fn()`.
  `createGain/createOscillator/createBufferSource/createBiquadFilter` return fresh
  mock nodes — spy on the context's factory methods to capture the nodes a
  generator creates (`vi.spyOn(ctx, 'createOscillator')` then
  `spy.mock.results[i].value`).
- `src/tests/generators.test.ts` — current content: a loop asserting
  no-throw with SOFT/CRISP themes, `fn.length === 3`, and no-throw with
  `decay: 0.1`. **Keep all of this**; add to it.
- Theme fixture: use `SOFT_THEME` (`src/themes.ts`) for exact-value assertions:
  `baseFreq: 440, noiseColor: 'pink', oscType: 'sine', filterFreq: 3000,
  filterQ: 2.0, attack: 0.002, decay: 1.0, brightness: 2000`.

Generator facts to characterize (verified against source at `5ea26e0` — re-read
each file before writing its assertions; the numbers below are leads, the
source is the truth):

- `toggle.ts` — `toggleOn`: osc freq `setValueAtTime(baseFreq * 0.8, now)` →
  `exponentialRampToValueAtTime(baseFreq * 1.2, now + 0.06*decay)`; gain
  `0.001 → linearRamp(0.75, now + attack) → expRamp(0.001, now + dur)`;
  plus a noise transient: `nGain.setValueAtTime(0.24, now)`,
  `expRamp(0.001, now + 0.01*decay)`, noise `start(now)`/`stop(now + 0.01*decay)`.
  `toggleOff`: identical except osc `setValueAtTime(baseFreq * 1.0)` →
  `expRamp(baseFreq * 0.6)`.
- `click.ts` — bandpass filter at `theme.filterFreq`/`filterQ`; noise gain peak
  `0.9`; duration `0.013*decay`.
- `hover.ts` — highpass at `theme.brightness`; peak `0.3`; duration `0.015*decay`.
- `pop.ts` — osc `800*scale → 200*scale` (scale = baseFreq/440); peak `0.9`;
  duration `0.08*decay`.
- `success.ts` — two oscs: `523*scale` and `784*scale`, second delayed
  `0.08*decay`, peaks `0.75`.
- `error.ts` — osc `280*scale → 180*scale`; lowpass 600 on the noise; noise
  peak `0.45`.
- `warning.ts` — two bursts at `baseFreq*1.2` and `baseFreq*1.2*1.0595`,
  gap `0.1*decay`, peaks `0.75`.
- `notify.ts` — oscs at `baseFreq*2` and `baseFreq*3`, second delayed
  `0.1*decay`, peaks `0.6`.
- `swoosh.ts` — bandpass sweep `filterFreq*2 → max(filterFreq*0.3, 20)`;
  peak `0.6`; duration `0.12*decay`.

## Commands you will need

| Purpose   | Command             | Expected on success |
|-----------|---------------------|---------------------|
| Install   | `npm ci`            | exit 0              |
| Typecheck | `npm run typecheck` | exit 0              |
| One file  | `npx vitest run src/tests/generators.test.ts` | all pass |
| Tests     | `npm test`          | full suite passes   |

## Scope

**In scope**:
- `src/tests/generators.test.ts` (extend)

**Out of scope**:
- Any file in `src/generators/` — this plan changes ZERO source. If an
  assertion fails, the test is wrong (re-read the source), not the generator.
- `src/tests/setup.ts` — the mock already records everything needed.

## Git workflow

- Branch: `advisor/007-generator-characterization-tests` (created from `advisor/006-fix-gesture-unlock-deadend`)
- Commit style: e.g. `test(generators): characterize envelopes, frequencies, scheduling`
- Do NOT push or open a PR.

## Steps

### Step 1: Full characterization of `toggleOn` / `toggleOff`

These two get **exhaustive** assertions (every scheduled call, both the osc
voice and the noise transient) because plan 008 refactors them and needs a
tight net. Pattern:

```ts
it('toggleOn schedules a rising 0.8x→1.2x sweep with the documented envelope', () => {
  const ctx = new AudioContext()
  const dest = ctx.createGain()
  const oscSpy = vi.spyOn(ctx, 'createOscillator')
  const gainSpy = vi.spyOn(ctx, 'createGain')
  const srcSpy = vi.spyOn(ctx, 'createBufferSource')

  toggleOn(ctx, dest, SOFT_THEME)

  const osc = oscSpy.mock.results[0].value
  const now = 0.005                       // ctx.currentTime (0) + SCHEDULE_OFFSET
  const dur = 0.06 * SOFT_THEME.decay
  expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(SOFT_THEME.baseFreq * 0.8, now)
  expect(osc.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(SOFT_THEME.baseFreq * 1.2, now + dur)
  // …gain envelope, osc.start/stop, noise gain 0.24, noise start/stop…
})
```

Use `toBeCloseTo`-style matchers where floating-point addition is involved:
`expect(call[1]).toBeCloseTo(now + dur, 10)` — read the actual mock call args
(`mock.calls`) when `toHaveBeenCalledWith` would be brittle on float sums.

**Verify**: `npx vitest run src/tests/generators.test.ts` → passes.

### Step 2: Key-value characterization for the other seven generators

For each of click, hover, pop, success, error, warning, notify, swoosh assert
at least: (a) the defining frequency value(s) or sweep endpoints, (b) the peak
gain value, (c) source `start`/`stop` times, (d) for filtered sounds, the
filter type and frequency. Use the facts table above as leads and the source
as truth. One `it` per generator, named for the behavior
(e.g. `'pop sweeps 800→200 Hz (scaled) with 0.9 peak'`).

**Verify**: `npx vitest run src/tests/generators.test.ts` → all pass (existing loop tests + ~11 new).

### Step 3: Full suite

**Verify**: `npm run typecheck` → exit 0. `npm test` → everything passes.

## Test plan

This plan IS the test plan. Net: existing no-throw loop retained; 2 exhaustive
toggle tests; 7+ per-generator characterization tests.

## Done criteria

- [ ] `npm run typecheck` exits 0; `npm test` exits 0
- [ ] `src/tests/generators.test.ts` contains exhaustive toggleOn/toggleOff tests (osc sweep endpoints, gain envelope, noise transient, start/stop times) and ≥1 characterization test per remaining generator
- [ ] `git diff --stat` of your commit touches only `src/tests/generators.test.ts`
- [ ] No generator source file modified

## STOP conditions

- A generator's actual scheduled values contradict the facts table AND the
  source — i.e. you cannot determine the true current behavior to pin.
- You feel the need to modify a generator to make a test pass — that is
  backwards; STOP and report the discrepancy.
- The mock turns out not to record a call type you need (e.g. a param method
  missing from setup.ts) — report rather than editing setup.ts.

## Maintenance notes

- These are characterization tests: when the maintainer deliberately re-tunes
  a sound, the test diff documents the sonic change — update values in the
  same commit as the tuning.
- Plan 008 (toggle dedup) must keep the toggle tests passing **unchanged**.
