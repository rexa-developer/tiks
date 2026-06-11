# Plan 011: Add two built-in theme presets — `arcade` and `glass`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. Your reviewer maintains `plans/README.md`.
>
> **Drift check (run first)**: your branch builds on plans 006–010. If
> `src/themes.ts` or the demo's theme-switcher markup differ from the excerpts
> below, STOP.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW (additive; existing themes untouched). Caveat: the preset
  values are designed on paper, not by ear — flagged for maintainer tuning.
- **Depends on**: plans/010 (sequencing on the branch chain)
- **Category**: direction / feature
- **Planned at**: commit `5ea26e0`, 2026-06-11

## Why this matters

Themes are the library's personality axis and the README markets them
prominently ("Two built-in themes that change the character of every sound"),
but two presets is a thin gallery. A theme is a 12-line object — the
architecture makes new ones nearly free, and each preset is marketable surface
on the demo page (which already has a generic theme switcher driven by
`data-theme` attributes). Two additions with distinct characters: `arcade`
(square-wave, chiptune/retro-game) and `glass` (high, airy, resonant).

## Current state

- `src/themes.ts` (45 lines) — `SOFT_THEME`, `CRISP_THEME`, a
  `themes: Record<ThemeName, TiksTheme>` registry, `resolveTheme`,
  `defineTheme`. Excerpt:

  ```ts
  export const CRISP_THEME: TiksTheme = {
    name: 'crisp',
    baseFreq: 523,
    noiseColor: 'white',
    oscType: 'triangle',
    filterFreq: 5000,
    filterQ: 3.0,
    attack: 0.0015,
    decay: 0.6,
    brightness: 4000,
  }

  const themes: Record<ThemeName, TiksTheme> = {
    soft: SOFT_THEME,
    crisp: CRISP_THEME,
  }
  ```

- `src/types.ts` — `export type ThemeName = 'soft' | 'crisp'`.
- `src/index.ts` — re-exports `SOFT_THEME, CRISP_THEME` from `./themes`.
- `src/tests/themes.test.ts` — per-theme value assertions; model new tests on
  `'CRISP_THEME has expected values'`.
- `demo/index.html:360-362` — theme switcher:

  ```html
  <div class="theme-switcher">
    <button class="theme-btn active" data-theme="soft">Soft</button>
    <button class="theme-btn" data-theme="crisp">Crisp</button>
  </div>
  ```

  The click handler (demo/index.html:571-575) is generic:
  `tiks.setTheme(btn.dataset.theme)` — new buttons need no new JS.
- README Themes section (~lines 56-69) lists the two themes.

Preset values (advisor-specified — implement exactly; tuning by ear is the
maintainer's follow-up, see Maintenance notes):

```ts
export const ARCADE_THEME: TiksTheme = {
  name: 'arcade',
  baseFreq: 392,        // G4 — lower root, chunky
  noiseColor: 'white',
  oscType: 'square',    // chiptune character
  filterFreq: 2200,
  filterQ: 5.0,
  attack: 0.001,
  decay: 0.5,           // short and punchy
  brightness: 2800,
}

export const GLASS_THEME: TiksTheme = {
  name: 'glass',
  baseFreq: 660,        // E5 — high, airy
  noiseColor: 'pink',
  oscType: 'sine',
  filterFreq: 6500,
  filterQ: 6.0,         // resonant, "ping"
  attack: 0.004,        // softer onset
  decay: 1.4,           // longer ring
  brightness: 5500,
}
```

## Commands you will need

| Purpose   | Command             | Expected on success |
|-----------|---------------------|---------------------|
| Install   | `npm ci`            | exit 0              |
| Typecheck | `npm run typecheck` | exit 0              |
| Tests     | `npm test`          | full suite passes   |

## Scope

**In scope**:
- `src/themes.ts`, `src/types.ts` (ThemeName union), `src/index.ts` (re-exports)
- `src/tests/themes.test.ts`, `src/tests/generators.test.ts` (extend the
  existing no-throw loop to the new themes — one line each if the loop is
  parameterized by theme)
- `demo/index.html` (two buttons only)
- `README.md` (Themes section)

**Out of scope**:
- Generator code — if a generator misbehaves with these values (e.g. an
  exponential ramp from/to 0 throws), that's a STOP, not a generator patch.
- Demo styling/layout beyond the two `<button>` elements.

## Git workflow

- Branch: `advisor/011-theme-presets` (created from `advisor/010-data-tiks-autobind`)
- Commit style: e.g. `feat(themes): add arcade and glass presets`
- Do NOT push or open a PR.

## Steps

### Step 1: Add the presets

`src/themes.ts`: add both constants exactly as specified, register in the
`themes` record. `src/types.ts`:
`export type ThemeName = 'soft' | 'crisp' | 'arcade' | 'glass'`.
`src/index.ts`: add `ARCADE_THEME, GLASS_THEME` to the themes re-export line.

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Tests

- `src/tests/themes.test.ts`: `resolveTheme('arcade')`/`('glass')` return the
  constants; per-theme value assertions modeled on the CRISP test.
- `src/tests/generators.test.ts`: ensure every generator runs without throwing
  under both new themes (extend the existing SOFT/CRISP no-throw loop).

**Verify**: `npm test` → full suite passes.

### Step 3: Demo + README

- `demo/index.html`: add `<button class="theme-btn" data-theme="arcade">Arcade</button>`
  and `<button class="theme-btn" data-theme="glass">Glass</button>` inside the
  existing `.theme-switcher` div.
- `README.md` Themes section: change "Two built-in themes" to four, add the
  two `tiks.init({ theme: 'arcade' })`-style lines with one-phrase character
  descriptions (arcade: "chunky 8-bit, square-wave"; glass: "airy, resonant,
  high and ringing").

**Verify**: `grep -c "theme-btn" demo/index.html` → 4 buttons (plus CSS class
references — count only the `data-theme` buttons: `grep -c 'data-theme='
demo/index.html` → 4). `grep -n "arcade" README.md` → present.

## Test plan

Step 2 — registry resolution + value pinning for both presets; generator
no-throw under both.

## Done criteria

- [ ] `npm run typecheck` exits 0; `npm test` exits 0
- [ ] `resolveTheme('arcade')` and `resolveTheme('glass')` work (covered by tests)
- [ ] `grep -c 'data-theme=' demo/index.html` → 4
- [ ] README lists four themes
- [ ] Only in-scope files changed

## STOP conditions

- Any generator throws under the new theme values (would mean a value is out
  of a generator's safe domain — report which value/generator).
- The demo's theme handler turns out not to be generic (hardcodes
  soft/crisp) — report rather than rewriting demo JS.

## Maintenance notes

- **These values are designed on paper.** Before the next release the
  maintainer should audition all 10 sounds under both presets on the demo
  (`npx serve demo` or the Pages preview) and tune — especially `glass`'s
  `filterQ: 6` (risk: whistly click/swoosh) and `arcade`'s square-wave
  `notify` (risk: harsh). Plan 007's characterization tests only pin SOFT
  behavior, so tuning these presets won't break tests.
- Demo deploy: pushing the demo change to main triggers the Pages workflow
  (path filter `demo/**`) — the new buttons go live on merge+push.
