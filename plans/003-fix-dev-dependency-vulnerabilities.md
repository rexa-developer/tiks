# Plan 003: Clear the npm audit report (3 dev-dependency vulnerabilities)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `npm audit` — if it already reports
> `found 0 vulnerabilities`, mark this plan DONE in `plans/README.md` and stop.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `8c47034`, 2026-06-11

## Why this matters

`npm audit` reports three vulnerabilities, all in **devDependencies** (the
published package has zero runtime dependencies, so users are unaffected):

- **critical** — `vitest < 3.2.6` (GHSA-5xrq-8626-4rwp): arbitrary file read/execute when the Vitest UI server is listening. This one affects the maintainer's own machine during development.
- **high** — `js-cookie <= 3.0.5` (GHSA-qjx8-664m-686j): prototype hijack (transitive, via the test toolchain).
- **moderate** — `ws 8.0.0–8.20.0` (GHSA-58qx-3vcg-4xpx): uninitialized memory disclosure (transitive, via jsdom).

All three have fixes available inside the existing semver ranges
(`vitest: ^3.0.0` in `package.json:76` allows 3.2.6+), so this is a
lockfile-only update. Cheap, and it un-reds the audit signal so future real
alerts aren't ignored.

## Current state

- `package.json` — devDependencies at lines 67-78; `"vitest": "^3.0.0"`, `"jsdom": "^26.0.0"`. No runtime `dependencies` key exists.
- `package-lock.json` — pins vitest 3.2.4 (confirmed by `npm test` banner: `RUN v3.2.4`).
- Verification baseline at planning time: `npm run typecheck` clean; `npm test` → 70/70 tests pass in ~1.7s.

## Commands you will need

| Purpose   | Command             | Expected on success |
|-----------|---------------------|---------------------|
| Fix       | `npm audit fix`     | exit 0              |
| Audit     | `npm audit`         | `found 0 vulnerabilities` |
| Typecheck | `npm run typecheck` | exit 0              |
| Tests     | `npm test`          | 70 tests pass       |
| Build     | `npm run build`     | exit 0 (writes only to gitignored `dist/`) |

## Scope

**In scope** (the only files you may modify):
- `package-lock.json`
- `package.json` — only if `npm audit fix` itself adjusts a range; do not hand-edit version ranges.

**Out of scope** (do NOT touch):
- Any file in `src/`, `demo/`, `.github/`.
- Do NOT run `npm audit fix --force` (it may jump major versions of the toolchain).
- Do NOT add `overrides` to `package.json` unless plain `npm audit fix` cannot clear the report (that's a STOP condition, not an improvisation point).

## Git workflow

- Branch: `advisor/003-dev-dependency-audit-fix`
- Commit style: conventional commits (e.g. `chore(deps): npm audit fix — vitest 3.2.6, js-cookie, ws`)
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Apply the fix

Run `npm audit fix` (no flags).

**Verify**: `npm audit` → `found 0 vulnerabilities`.

### Step 2: Confirm the toolchain still works

Run typecheck, tests, and build.

**Verify**:
- `npm run typecheck` → exit 0
- `npm test` → all 70 tests pass (vitest banner should now show ≥ 3.2.6)
- `npm run build` → exit 0
- `git status --porcelain` → only `package-lock.json` (and possibly `package.json`) modified

## Test plan

No new tests — the existing 70-test suite plus the build is the regression
gate for a toolchain bump.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm audit` reports `found 0 vulnerabilities`
- [ ] `npm run typecheck` exits 0
- [ ] `npm test` exits 0, 70 tests pass
- [ ] `npm run build` exits 0
- [ ] `git status --porcelain` shows only `package-lock.json` / `package.json` / `plans/README.md`
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `npm audit fix` leaves any vulnerability unresolved (would need `--force` or `overrides` — a human should decide).
- `npm audit fix` modifies `package.json` with a **major**-version change to any devDependency.
- Any test fails after the update.

## Maintenance notes

- Consider enabling Dependabot/Renovate later so audit drift doesn't recur; deliberately out of scope here.
- Reviewer: just eyeball the lockfile diff size — it should touch only the three advisory chains, not re-resolve the world.
