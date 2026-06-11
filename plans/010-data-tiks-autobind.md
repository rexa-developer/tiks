# Plan 010: Declarative `data-tiks` auto-binding for the no-build audience

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. Your reviewer maintains `plans/README.md`.
>
> **Drift check (run first)**: your branch builds on plans 006–009 (engine,
> toggle, hover changes expected). If `src/index.ts`'s export shape or
> `src/tiks.ts`'s singleton differ beyond those plans' changes, STOP.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW (purely additive module; nothing existing changes behavior)
- **Depends on**: plans/009 (sequencing on the shared branch chain)
- **Category**: direction / feature
- **Planned at**: commit `5ea26e0`, 2026-06-11

## Why this matters

The CDN section of the README (~line 176) is the no-build pitch, yet its
example hand-wires `onclick` per element — exactly the audience least willing
to write JS. One delegated listener turns the integration into markup:
`<button data-tiks="click">`. The demo page itself hand-binds every button the
same way (demo/index.html:571+), evidence that even the maintainer does this
chore. Budget: this is a size-marketed library (~2 KB gzip badges); the
module must stay roughly 300–400 B minified and be tree-shakeable (zero cost
to importers who don't use it).

## Current state

- `src/tiks.ts` — exports the `tiks` singleton (class `TiksEngine`); sound
  methods: `click, toggle(on), success, error, warning, hover, pop, swoosh, notify`.
- `src/index.ts` — flat re-exports + functional wrappers; new exports go here.
- `package.json` `sideEffects: false`; tsup builds `index`, `react`, `vue`
  entries — the new module is part of the main entry (no new subpath).
- Test conventions: jsdom; see `src/tests/tiks.test.ts` for
  `document.dispatchEvent` usage; spy targets live on `audioEngine`
  (`src/engine.ts` exports the singleton).

API design (advisor-decided — do not redesign):

```ts
// src/bind.ts
import { tiks } from './tiks'

export function bindTiks(root: Document | Element = document): () => void
```

Behavior:
- Calls `tiks.init()` once on bind (safe/idempotent — context still defers to
  first gesture).
- Adds ONE delegated `click` listener on `root`.
- Handler: `const el = (event.target as Element | null)?.closest?.('[data-tiks]')`;
  ignore if null or if `root` doesn't contain it.
- `data-tiks` values: `click | success | error | warning | hover | pop |
  swoosh | notify` → call the matching `tiks` method via an explicit map
  (no index-by-string `any` casts).
- `data-tiks="toggle"`: play `tiks.toggle(state)` where
  `state = el instanceof HTMLInputElement ? el.checked : el.getAttribute('aria-pressed') === 'true'`.
  (For checkboxes, `click` fires *after* the checked state flips, so
  `el.checked` is the new state — correct. For `aria-pressed` buttons the
  attribute may not be updated yet when the sound fires; document this in the
  README as "set aria-pressed before the click handler returns, or use
  toggle-on/toggle-off".)
- `data-tiks="toggle-on"` / `"toggle-off"`: explicit variants calling
  `tiks.toggle(true/false)`.
- Unknown values: silently ignored.
- Returns an unbind function removing the listener.

## Commands you will need

| Purpose   | Command             | Expected on success |
|-----------|---------------------|---------------------|
| Install   | `npm ci`            | exit 0              |
| Typecheck | `npm run typecheck` | exit 0              |
| One file  | `npx vitest run src/tests/bind.test.ts` | all pass |
| Tests     | `npm test`          | full suite passes   |
| Size      | `npm run build && gzip -c dist/index.js \| wc -c` | report the number |

## Scope

**In scope**:
- `src/bind.ts` (create)
- `src/index.ts` (add `export { bindTiks } from './bind'`)
- `src/tests/bind.test.ts` (create)
- `README.md` (extend the CDN section with the data-tiks example)

**Out of scope**:
- `demo/index.html` — migrating the demo to data-tiks is a separate decision.
- No `MutationObserver`, no auto-bind-on-import, no hover/focus events —
  click delegation only. Resist scope creep; the budget is ~400 B.
- React/Vue adapters.

## Git workflow

- Branch: `advisor/010-data-tiks-autobind` (created from `advisor/009-hover-throttling`)
- Commit style: e.g. `feat: declarative data-tiks click binding`
- Do NOT push or open a PR.

## Steps

### Step 1: Implement `src/bind.ts`

Per the API design above. Explicit method map:

```ts
const SOUNDS: Record<string, () => void> = {
  click: () => tiks.click(),
  success: () => tiks.success(),
  // …error, warning, hover, pop, swoosh, notify
  'toggle-on': () => tiks.toggle(true),
  'toggle-off': () => tiks.toggle(false),
}
```

Export from `src/index.ts`.

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Tests in `src/tests/bind.test.ts`

Spy on `audioEngine.playSound` / `audioEngine.playHover`
(`vi.spyOn(audioEngine, 'playSound')`) and assert the generator argument
identity (`import * as generators from '../generators'`). jsdom pattern:
build DOM with `document.body.innerHTML`, dispatch
`new MouseEvent('click', { bubbles: true })` on the target. Cases:

1. `<button data-tiks="click">` click → `playSound` called with `generators.click`.
2. Click on a **child** of the annotated element (nested `<span>`) → still fires (closest()).
3. `<input type="checkbox" data-tiks="toggle">` click → `playSound` with `generators.toggleOn` when newly checked; second click → `toggleOff`.
4. `<button data-tiks="toggle" aria-pressed="true">` → `toggleOn` (reads the attribute).
5. Unknown value `data-tiks="kaboom"` → no play, no throw.
6. Element without the attribute → no play.
7. The returned unbind function: after calling it, clicks no longer play.
8. `data-tiks="hover"` routes through the hover path (assert `playHover` spy if plan 009 landed, else `playSound` with `generators.hover`).

Clean up `document.body.innerHTML` and unbind in `afterEach`.

**Verify**: `npx vitest run src/tests/bind.test.ts` → all pass; `npm test` → suite passes.

### Step 3: README — CDN section

After the existing CDN snippet (~line 176), add the declarative variant:

```html
<button data-tiks="click">Save</button>
<input type="checkbox" data-tiks="toggle">

<script type="module">
  import { bindTiks } from 'https://esm.sh/@rexa-developer/tiks'
  bindTiks()
</script>
```

Plus 2–3 sentences: supported values, the `toggle` state-detection rule and
its aria-pressed caveat, and that `bindTiks` returns an unbind function.

**Verify**: `grep -n "bindTiks" README.md src/index.ts` → present in both.

### Step 4: Size check

**Verify**: `npm run build` → exit 0. `gzip -c dist/index.js | wc -c` → record
the gzipped size in your report; it should be ≲ 2600 bytes (was ~2 KB; bind
adds ~300–400 B). If it exceeds 3000, STOP — the implementation is too heavy.

## Test plan

Step 2's eight cases in `src/tests/bind.test.ts`, modeled on
`src/tests/tiks.test.ts` for DOM-event-driven assertions.

## Done criteria

- [ ] `npm run typecheck` exits 0; `npm test` exits 0 with ≥8 new tests
- [ ] `bindTiks` exported from `src/index.ts`; README CDN section shows the markup example
- [ ] `npm run build` succeeds; gzipped `dist/index.js` ≤ 3000 bytes (size reported)
- [ ] Only the 4 in-scope files changed

## STOP conditions

- jsdom's `closest`/event delegation behaves differently than specced and a
  case can't be made to pass without changing the API design.
- Gzipped core exceeds 3000 bytes.
- You're tempted to add MutationObserver/auto-init-on-import — out of scope.

## Maintenance notes

- If the demo later adopts `data-tiks`, its hand-bound listeners
  (demo/index.html:571+) can collapse to one `bindTiks()` — separate PR.
- Future: a `data-tiks-on="pointerenter"` event-selection attribute is the
  obvious extension; deliberately omitted to hold the size budget.
