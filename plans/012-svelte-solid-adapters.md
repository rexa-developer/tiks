# Plan 012: `createTiks` core factory + Svelte and Solid subpath adapters

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. Your reviewer maintains `plans/README.md`.
>
> **Drift check (run first)**: your branch builds on plans 006–011. If
> `src/vue.ts`, `package.json`'s exports map, or `tsup.config.ts` differ from
> the excerpts below, STOP.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW (additive entries; existing entries untouched)
- **Depends on**: plans/009 (uses the post-009 method list incl. unchanged API), sequencing after 011
- **Category**: direction / feature
- **Planned at**: commit `5ea26e0`, 2026-06-11

## Why this matters

The Vue adapter arrived from an outside contributor (PR #1) — direct demand
signal for framework-native entry points. The React and Vue adapters are
30–42 lines each, and crucially the Vue one uses no real framework reactivity
(it wraps a `TiksEngine` in a `shallowRef` it never updates). That reveals the
honest design: an adapter is just "make an engine, init it, hand back bound
methods." This plan extracts that as a framework-free `createTiks()` factory
in core, then ships `@rexa-developer/tiks/svelte` and `…/solid` as one-line
wrappers — zero new peerDependencies, because neither wrapper needs framework
APIs. Svelte and Solid users get idiomatic imports; vanilla users get
`createTiks` for multi-instance use.

## Current state

- `src/vue.ts` (30 lines) — the shape to extract: creates `new TiksEngine()`,
  calls `engine.init(options)`, returns an object of arrow-function wrappers
  for all 13 methods (`click, toggle, success, error, warning, hover, pop,
  swoosh, notify, mute, unmute, setVolume, setTheme`).
- `src/tiks.ts` — `TiksEngine` class + `tiks` singleton.
- `package.json` exports map — three entries (`.`, `./react`, `./vue`), each
  with `types`/`import`/`require` triplets pointing at `dist/<name>.*`:

  ```json
  "./vue": {
    "types": "./dist/vue.d.ts",
    "import": "./dist/vue.js",
    "require": "./dist/vue.cjs"
  }
  ```

- `tsup.config.ts` — `entry: { index, react, vue }`, `external: ['react', 'vue']`.
- `peerDependencies`: react and vue, both optional via `peerDependenciesMeta`.
- Tests: `src/tests/vue.test.ts` mounts a component; for the new adapters no
  framework mounting is needed (they're plain functions) — a plain unit test
  suffices.

API design (advisor-decided — do not redesign):

```ts
// src/create.ts
import { TiksEngine } from './tiks'
import type { TiksOptions, TiksTheme, ThemeName } from './types'

export interface TiksApi {
  click: () => void
  toggle: (on: boolean) => void
  success: () => void
  error: () => void
  warning: () => void
  hover: () => void
  pop: () => void
  swoosh: () => void
  notify: () => void
  mute: () => void
  unmute: () => void
  setVolume: (v: number) => void
  setTheme: (t: ThemeName | TiksTheme) => void
}

export function createTiks(options?: TiksOptions): TiksApi {
  const engine = new TiksEngine()
  engine.init(options)
  return { click: () => engine.click(), /* …all 13, mirroring src/vue.ts */ }
}
```

```ts
// src/svelte.ts  — and identically src/solid.ts
export { createTiks as useTiks } from './create'
export type { TiksApi } from './create'
```

(Per-instance `theme`, global `volume`/`muted` — same semantics as the
existing hooks. No framework imports, so no new peerDependencies.)

## Commands you will need

| Purpose   | Command             | Expected on success |
|-----------|---------------------|---------------------|
| Install   | `npm ci`            | exit 0              |
| Typecheck | `npm run typecheck` | exit 0              |
| Tests     | `npm test`          | full suite passes   |
| Build     | `npm run build`     | exit 0; dist has svelte.* and solid.* |

## Scope

**In scope**:
- `src/create.ts`, `src/svelte.ts`, `src/solid.ts` (create)
- `src/index.ts` (export `createTiks` + `TiksApi` type)
- `package.json` (two exports-map entries; nothing else)
- `tsup.config.ts` (two entries)
- `src/tests/create.test.ts` (create)
- `README.md` (short Svelte + Solid sections after the Vue section)

**Out of scope**:
- `src/react.ts`, `src/vue.ts` — do NOT refactor them onto `createTiks` here;
  they're shipped API with framework-specific behavior (React's reactive
  re-init). Surgical changes only.
- Adding `svelte`/`solid-js` to peerDependencies or devDependencies — the
  wrappers must not import from the frameworks.

## Git workflow

- Branch: `advisor/012-svelte-solid-adapters` (created from `advisor/011-theme-presets`)
- Commit style: e.g. `feat: createTiks factory + svelte/solid adapters`
- Do NOT push or open a PR.

## Steps

### Step 1: `src/create.ts` + index export

Implement per the design. Add to `src/index.ts`:
`export { createTiks } from './create'` and
`export type { TiksApi } from './create'`.

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Adapters + build wiring

Create `src/svelte.ts` and `src/solid.ts` (re-export wrappers as designed).
`tsup.config.ts`: add `svelte: 'src/svelte.ts', solid: 'src/solid.ts'` to
`entry`. `package.json`: add `./svelte` and `./solid` exports entries shaped
exactly like the `./vue` entry above.

**Verify**: `npm run build` → exit 0; `ls dist/svelte.js dist/svelte.cjs dist/svelte.d.ts dist/solid.js dist/solid.cjs dist/solid.d.ts` → all exist.

### Step 3: Tests in `src/tests/create.test.ts`

1. `createTiks()` returns all 13 methods (typeof function loop — mirror
   `src/tests/vue.test.ts`'s method list).
2. Two `createTiks` instances have independent themes: spy on
   `audioEngine.playSound`; instance A `setTheme('crisp')`, instance B stays
   soft; `A.click()` and `B.click()` → the spy's `theme` argument (3rd? check
   `playSound(generator, theme)` — 2nd) differs (`name: 'crisp'` vs `'soft'`).
3. Volume is shared/global: `A.setVolume(0.6)` → `audioEngine.getVolume()` is 0.6
   (reset to 0.3 after).
4. Methods don't throw before any gesture (no context) — call each once.
5. The svelte and solid modules re-export the same function:
   `import { useTiks } from '../svelte'` → `expect(useTiks).toBe(createTiks)`
   (and same for solid).

**Verify**: `npx vitest run src/tests/create.test.ts` → all pass; `npm test` → suite passes.

### Step 4: README

After the Vue section, add **Svelte** and **Solid** sections (4–6 lines each):
import from `@rexa-developer/tiks/svelte` / `/solid`, one usage snippet, and
the same global/per-instance semantics note the Vue section has. Also add a
one-liner about `createTiks` for vanilla multi-instance use under the
Tree-Shakeable Imports section.

**Verify**: `grep -n "tiks/svelte\|tiks/solid\|createTiks" README.md` → all present.

## Test plan

Step 3's five cases in `src/tests/create.test.ts`; pattern source
`src/tests/vue.test.ts` (method-list assertions).

## Done criteria

- [ ] `npm run typecheck` exits 0; `npm test` exits 0 with ≥5 new tests
- [ ] `npm run build` exits 0; all six new dist files exist
- [ ] `node -e "const p=require('./package.json'); if(!p.exports['./svelte']||!p.exports['./solid'])process.exit(1)"` → exit 0
- [ ] `grep -rn "from 'svelte'\|from 'solid-js'" src/` → no matches (framework-free)
- [ ] Only in-scope files changed

## STOP conditions

- The adapters genuinely need framework APIs (e.g. you believe cleanup on
  component destroy is required) — they don't (the engine holds no
  per-instance listeners), but if you find evidence otherwise, STOP and
  report instead of adding peer deps.
- `tsup` dts generation fails on the new entries.

## Maintenance notes

- If Svelte/Solid users later want reactive option updates (like React's
  hook), that's when real framework adapters with peer deps get written —
  this plan deliberately ships the 90% version at zero dependency cost.
- Consider (separately) refactoring `src/vue.ts` onto `createTiks` — it's
  semantically identical today; left untouched here per surgical-change policy.
