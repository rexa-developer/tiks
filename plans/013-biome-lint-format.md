# Plan 013: Add Biome lint + format with a CI gate (runs LAST in this round)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. Your reviewer maintains `plans/README.md`.
>
> **Drift check (run first)**: your branch builds on plans 006–012 — `src/`
> contains new files (`bind.ts`, `create.ts`, `svelte.ts`, `solid.ts`,
> new tests). That is expected. If a lint/format config already exists
> (`ls biome.json* .eslintrc* eslint.config.* .prettierrc* 2>/dev/null`), STOP.

## Status

- **Priority**: P2 (sequenced last because it may reformat files other plans touch)
- **Effort**: S–M
- **Risk**: LOW-MED (a formatting pass touches many lines; mitigated by configuring Biome to match the existing style so the diff stays minimal)
- **Depends on**: plans/006–012 (must run after all code-producing plans in this round)
- **Category**: dx
- **Planned at**: commit `5ea26e0`, 2026-06-11

## Why this matters

The repo has no linter or formatter — CI gates only typecheck + tests. Style
is currently consistent by discipline (single author), but external PRs have
already landed (the Vue adapter) and this round adds four new modules from
multiple executors. One tool, one config, one CI line prevents drift and
catches the bug classes tsc doesn't (unused vars, suspicious equality,
accidental `var`). Biome is the right size for this repo: a single dev
dependency providing both lint and format, fast, with a config that can match
the existing style exactly.

**Style-preservation rule**: the existing code style is the spec — Biome must
be configured to match it, not the reverse. Observed style: no semicolons,
single quotes, 2-space indent, trailing commas in multiline literals, lines
occasionally ~110 chars (`src/engine.ts:5`).

## Current state

- No lint/format config anywhere in the repo (verify in drift check).
- `package.json` scripts: `build`, `test`, `test:watch`, `typecheck`, `version`.
- `.github/workflows/ci.yml` — steps: checkout → setup-node (20, npm cache) →
  `npm ci` → Typecheck → Test → Build. Match its step style.
- Source layout: `src/**/*.ts(x)`, `scripts/*.mjs`, `demo/index.html`
  (inline JS — exclude it; Biome shouldn't churn a 600-line demo page),
  `plans/*.md` (markdown — not Biome's concern).

## Commands you will need

| Purpose   | Command             | Expected on success |
|-----------|---------------------|---------------------|
| Install   | `npm ci` then `npm i -D @biomejs/biome` | exit 0 |
| Lint+format check | `npx biome check .` | exit 0 after this plan |
| Auto-fix  | `npx biome check --write .` | exit 0 |
| Typecheck | `npm run typecheck` | exit 0              |
| Tests     | `npm test`          | full suite passes   |

## Scope

**In scope**:
- `biome.json` (create)
- `package.json` (devDependency + `lint` / `lint:fix` scripts)
- `package-lock.json` (from the install)
- `.github/workflows/ci.yml` (one `Lint` step between Typecheck and Test)
- Mechanical fixes Biome applies across `src/` and `scripts/` (formatting +
  safe lint fixes only)

**Out of scope**:
- `demo/index.html`, `plans/`, `dist/`, `RELEASING.md`, `CLAUDE.md` — exclude
  via config (`files.includes` limited to `src` and `scripts`).
- Any behavioral code change. If a lint rule demands a refactor (not a
  mechanical fix), disable/downgrade THAT RULE in `biome.json` with a comment
  — never change logic to satisfy a linter in this plan.
- Import reorganization is acceptable; renaming, restructuring, or
  `noExplicitAny`-driven type rewrites are not — disable rules that would
  force them (there are intentional `as unknown as` casts in tests/mocks).

## Git workflow

- Branch: `advisor/013-biome-lint-format` (created from `advisor/012-svelte-solid-adapters`)
- Commit style: e.g. `chore: add biome lint/format + CI gate`
- Do NOT push or open a PR.

## Steps

### Step 1: Install and configure

`npm i -D @biomejs/biome`. Create `biome.json` (adjust schema URL to the
installed version — `npx biome --version`):

```json
{
  "$schema": "https://biomejs.dev/schemas/<version>/schema.json",
  "files": { "includes": ["src/**", "scripts/**"] },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 120
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "asNeeded",
      "trailingCommas": "all"
    }
  },
  "linter": {
    "enabled": true,
    "rules": { "recommended": true }
  }
}
```

(Key names vary between Biome 1.x and 2.x — use `npx biome migrate` docs or
`npx biome check` error messages to fix key names for the installed major.
`lineWidth: 120` is deliberate: it keeps the existing long lines unwrapped.)

**Verify**: `npx biome check .` runs (errors are fine at this point; the
command itself must not fail on config parse).

### Step 2: Minimize, then apply

1. Run `npx biome check .` and review the diagnostics summary.
2. **Formatting**: run `npx biome format .` (no write) — if the would-change
   set rewraps large swaths of untouched code, tune `lineWidth`/options until
   the formatting diff is mostly no-ops. Target: `git diff --stat` after the
   write shows < ~120 changed lines across `src/` (mechanical commas/quotes
   only).
3. **Lint**: for each rule that fires demanding non-mechanical changes,
   add a targeted off/warn override in `biome.json` (e.g.
   `suspicious.noExplicitAny: "off"` for the test mocks) rather than touching
   code semantics.
4. Apply: `npx biome check --write .`

**Verify**: `npx biome check .` → exit 0. `npm run typecheck` → exit 0.
`npm test` → full suite passes (proves the fixes were mechanical).

### Step 3: Scripts + CI

`package.json` scripts:

```json
"lint": "biome check .",
"lint:fix": "biome check --write ."
```

`.github/workflows/ci.yml`: add between Typecheck and Test:

```yaml
      - name: Lint
        run: npm run lint
```

**Verify**: `npm run lint` → exit 0. YAML loads (`node -e` readFileSync check).

## Test plan

No new tests. Gates: `npm run lint` exit 0, full existing suite green,
typecheck green — together proving the pass was style-only.

## Done criteria

- [ ] `npm run lint` exits 0
- [ ] `npm run typecheck` exits 0; `npm test` exits 0 (same test count as before this plan)
- [ ] `biome.json` exists; CI has a Lint step
- [ ] `git diff <parent> --stat -- src/` shows only mechanical changes (report the stat); no file outside `src/`, `scripts/`, config files, lockfile, and `ci.yml` changed
- [ ] `demo/index.html` untouched

## STOP conditions

- A lint/format config already exists (drift check).
- After tuning, the formatting diff still rewrites > ~300 lines in `src/` —
  the config can't be made to match the house style; report the blockers.
- Any test fails after `--write` (a "safe" fix wasn't) — revert that fix,
  disable the rule, and note it; if it happens repeatedly, STOP.
- Biome's config schema differs so much from the sketch that you'd be
  guessing — STOP with the `biome check` output.

## Maintenance notes

- Executors and contributors now run `npm run lint:fix` before committing;
  consider mentioning it in CLAUDE.md's Commands table (one line — allowed as
  a follow-up, not in this plan's scope).
- The `noExplicitAny` (or similar) overrides exist for the test mocks —
  don't "clean them up" without checking `src/tests/setup.ts`.
- Renovate/Dependabot still unconfigured; Biome majors occasionally rename
  config keys (`npx biome migrate` handles it).
