# Plan 005: Add a CLAUDE.md so agents get the project map for free

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `ls CLAUDE.md AGENTS.md 2>/dev/null` — if either
> already exists, STOP (someone created one since this plan was written;
> reconcile instead of overwriting).
> Then `git diff --stat 8c47034..HEAD -- src/ package.json` — if plans 001/002
> landed, their engine changes are expected; fold their semantics (noted below)
> into the invariants section.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW (documentation only — no source changes)
- **Depends on**: none (but written best after 001/002/004 land, so it documents the fixed semantics and release flow)
- **Category**: dx
- **Planned at**: commit `8c47034`, 2026-06-11

## Why this matters

This repo is maintained with AI agents in the loop (plans in `plans/` are
executed by agents), but there is no `CLAUDE.md`, so every session re-derives
the same facts: how to run checks, the singleton-engine architecture, and —
critically — the **non-obvious Web Audio invariants** (autoplay-policy
handling, gesture-deferred context creation) that look like refactoring
targets but are load-bearing, hard-won fixes (see commits `886f2df`,
`674a04a`, `17a2cdb`, `b09c855` — four separate releases fought autoplay
policy). A 60-line CLAUDE.md prevents an agent from "simplifying" that code
into a regression and removes recon cost from every future task.

## Current state

- No `CLAUDE.md`, `AGENTS.md`, or `CONTRIBUTING.md` exists in the repo root.
- Facts to encode (verified at commit `8c47034` — re-verify the commands run before writing them down):
  - Commands: `npm run typecheck` (tsc --noEmit), `npm test` (vitest run), `npm run test:watch`, `npm run build` (tsup → `dist/`, gitignored).
  - Layout: `src/engine.ts` (AudioEngine singleton: context lifecycle, autoplay unlock, mute/volume/reduced-motion state) → `src/tiks.ts` (TiksEngine: per-instance theme, delegates to the engine) → `src/index.ts` (singleton + tree-shakeable functional API) → `src/generators/*` (one pure `SoundGenerator` per sound: `(ctx, dest, theme) => void`) → `src/themes.ts`, `src/noise.ts` (cached noise buffers), `src/react.ts` / `src/vue.ts` (thin adapters, optional peers).
  - Tests: vitest + jsdom; `src/tests/setup.ts` installs a `MockAudioContext` globally; generator tests assert no-throw against the mock.
  - Conventions: conventional commits (see `git log --oneline`); zero runtime dependencies in the published package; ESM+CJS dual build via tsup; bundle-size is a marketed feature (~2KB gzip — README badges), so additions must justify their bytes.
- Invariants that MUST be listed (each maps to a comment block in `src/engine.ts` at commit `8c47034`):
  1. The `AudioContext` is created **only inside a user-gesture handler** (`bindGestureUnlock`, `engine.ts:87-129`) — never eagerly in `init()`. Creating it earlier re-introduces Chrome's autoplay warning. (`886f2df`)
  2. `playSound` with no context **bails silently** (`engine.ts:141-147`) — do not "fix" by lazily creating a context there.
  3. After `resume()`, never check `ctx.state` synchronously — schedule on the promise (`engine.ts:149-158`).
  4. `unmute()` must never override reduced-motion muting (`engine.ts:57-59`).
  5. Generators schedule with `startTime(ctx)` (+5ms offset, `src/generators/_util.ts:4-10`) because Safari drops events scheduled exactly at `currentTime`.
  6. If plans 001/002 have landed: `respectReducedMotion` and `muted` init options are last-explicit-wins globals.

## Commands you will need

| Purpose   | Command             | Expected on success |
|-----------|---------------------|---------------------|
| Verify commands you document | `npm run typecheck && npm test` | exit 0 |

## Scope

**In scope** (the only file you may create):
- `CLAUDE.md` (repo root)

**Out of scope** (do NOT touch):
- Everything else. This plan changes zero source files. Do not also create AGENTS.md (CLAUDE.md suffices; other harnesses read it too).

## Git workflow

- Branch: `advisor/005-add-claude-md`
- Commit style: conventional commits (e.g. `docs: add CLAUDE.md`)
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Write `CLAUDE.md`

Target 50–80 lines, markdown, these sections in order:

1. **What this is** — 2 lines: procedural UI-sound library, Web Audio synthesis, zero runtime deps, published as `@rexa-developer/tiks`.
2. **Commands** — the four npm scripts as a table, plus "run a single test file: `npx vitest run src/tests/<file>`".
3. **Architecture** — the layout map from "Current state" above, as a short tree with one-line annotations.
4. **Invariants (do not "simplify" these)** — the six numbered items from "Current state", each one line + `file:line` pointer. Re-verify each line number against the live code before writing it.
5. **Conventions** — conventional commits; bundle size is a feature (~2KB gzip, README badges) so justify added bytes; generators are pure functions of `(ctx, dest, theme)`; new sounds follow the pattern in `src/generators/pop.ts` (smallest exemplar) and get registered in `src/generators/index.ts` + `src/tiks.ts` + `src/index.ts` + README's sound table.
6. **Releasing** — if `RELEASING.md` exists (plan 004), one line pointing to it; otherwise describe the current manual flow (bump package.json + demo pin + npm publish).
7. **Plans directory** — one line: `plans/` holds advisor-generated implementation plans; read `plans/README.md` before starting work there.

**Verify**: `npm run typecheck && npm test` → exit 0 (proves the commands you documented work). `wc -l CLAUDE.md` → between 40 and 100.

### Step 2: Cross-check every file:line reference

For each `file:line` cited in CLAUDE.md, open the file and confirm the
reference points at the described code (the repo may have drifted from
commit `8c47034`, especially `src/engine.ts` if plans 001/002 landed).

**Verify**: `git status --porcelain` → only `CLAUDE.md` (and `plans/README.md`).

## Test plan

Not applicable — documentation only. The verification gate is that every
documented command runs successfully and every cited line number is accurate
at the commit where this lands.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `CLAUDE.md` exists at repo root, 40–100 lines, containing the strings `npm run typecheck`, `bindGestureUnlock`, and `startTime`
- [ ] Every command listed in CLAUDE.md exits 0 when run
- [ ] `git status --porcelain` shows only `CLAUDE.md` and `plans/README.md`
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- A `CLAUDE.md` or `AGENTS.md` already exists.
- A command you're about to document does not exit 0.
- The invariant code blocks in `src/engine.ts` no longer exist where described and you cannot locate their successors by searching for the comment text.

## Maintenance notes

- CLAUDE.md rots: whenever the engine's autoplay handling or the npm scripts change, the invariants section must change in the same PR. Reviewers should treat a CLAUDE.md-untouched engine refactor as a smell.
- Deferred deliberately: per-directory CLAUDE.md files — the repo is ~600 source lines; one root file is the right size.
