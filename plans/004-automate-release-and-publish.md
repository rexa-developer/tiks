# Plan 004: Automate releases — version sync script + tag-triggered npm publish with provenance

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 8c47034..HEAD -- package.json demo/index.html .github/workflows/`
> If the demo's esm.sh import line or the scripts block changed, compare
> against the "Current state" excerpts before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW (additive — no behavior change to the library; the workflow does nothing until a tag is pushed)
- **Depends on**: none (but land after 001–003 so the first automated release includes the fixes)
- **Category**: dx
- **Planned at**: commit `8c47034`, 2026-06-11

## Why this matters

Every release of this package is currently a hand-rolled, three-artifact sync:
bump `package.json`, bump the pinned `https://esm.sh/@rexa-developer/tiks@X.Y.Z`
URL in `demo/index.html`, and run `npm publish` locally. The git history shows
this pattern for every release since v0.1.2 (commit pairs like
`84960a6 chore: release v0.2.0` + `8c47034 chore(demo): bump to v0.2.0`).
Failure modes: demo pinned to a stale version (users hear old sounds on the
marketing page), publishing from a dirty tree, and no provenance attestation
on npm. After this plan: `npm version patch && git push --follow-tags` is the
entire release — the demo pin syncs automatically in the version commit, and
CI publishes to npm with `--provenance`.

## Current state

- `package.json:38-43` — scripts block:

  ```json
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  }
  ```

  `version` field is at line 3 (`"version": "0.2.0"`). `"files": ["dist"]` at
  lines 35-37 — `dist/` is gitignored and built by `npm run build` (tsup).

- `demo/index.html:444` — the version pin this plan automates:

  ```js
  import { tiks } from 'https://esm.sh/@rexa-developer/tiks@0.2.0'
  ```

  This is the **only** occurrence of `esm.sh/@rexa-developer/tiks@` in the file
  (verify with grep in Step 1).

- `.github/workflows/ci.yml` — existing CI: on push/PR to main, runs
  `npm ci` → `npm run typecheck` → `npm test` → `npm run build` on Node 20
  with `cache: 'npm'`. **Match this file's style** (action versions
  `actions/checkout@v4`, `actions/setup-node@v4`, step naming) in the new
  workflow.

- `.github/workflows/deploy-demo.yml` — deploys `demo/` to GitHub Pages,
  triggered by pushes to main touching `demo/**`. Useful side effect: the
  version-sync commit touches `demo/index.html`, so pushing a release
  automatically redeploys the demo. No changes needed to this file.

- There is no `scripts/` directory yet.

## Commands you will need

| Purpose   | Command             | Expected on success |
|-----------|---------------------|---------------------|
| Install   | `npm ci`            | exit 0              |
| Typecheck | `npm run typecheck` | exit 0              |
| Tests     | `npm test`          | 70+ tests pass      |
| Sync script (manual run) | `node scripts/sync-demo-version.mjs` | exit 0, demo pin matches package.json |
| Workflow lint (if available) | `actionlint .github/workflows/release.yml` | no errors (skip if actionlint not installed) |

## Scope

**In scope** (the only files you may create/modify):
- `scripts/sync-demo-version.mjs` (create)
- `package.json` (add one `version` lifecycle script)
- `.github/workflows/release.yml` (create)
- `RELEASING.md` (create — short)

**Out of scope** (do NOT touch):
- `.github/workflows/ci.yml` and `deploy-demo.yml` — they already do their jobs.
- `demo/index.html` — the script will rewrite it at release time; do not bump the version now.
- Do NOT run `npm version`, create tags, or publish anything as part of executing this plan.
- Do NOT add changesets/semantic-release or any new devDependency — the repo is intentionally zero-ceremony; plain `npm version` + a 20-line script is the right size.

## Git workflow

- Branch: `advisor/004-release-automation`
- Commit style: conventional commits (e.g. `chore(release): add version-sync script and publish workflow`)
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Confirm the demo pin is unique

**Verify**: `grep -c "esm.sh/@rexa-developer/tiks@" demo/index.html` → `1`.
If more than 1, the sync script below must replace **all** occurrences —
adjust accordingly and note it in your report.

### Step 2: Create `scripts/sync-demo-version.mjs`

A dependency-free Node script:

```js
import { readFileSync, writeFileSync } from 'node:fs'

const { version } = JSON.parse(readFileSync('package.json', 'utf8'))
const path = 'demo/index.html'
const html = readFileSync(path, 'utf8')
const updated = html.replace(
  /esm\.sh\/@rexa-developer\/tiks@[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?/g,
  `esm.sh/@rexa-developer/tiks@${version}`,
)
if (updated === html && !html.includes(`tiks@${version}`)) {
  console.error('sync-demo-version: no esm.sh pin found in demo/index.html')
  process.exit(1)
}
writeFileSync(path, updated)
console.log(`demo pinned to ${version}`)
```

**Verify**: `node scripts/sync-demo-version.mjs` → prints `demo pinned to 0.2.0`
(or current version) and `git diff demo/index.html` is empty (version already
matches — the script must be idempotent). Then `git checkout -- demo/index.html`
to be safe.

### Step 3: Wire it into `npm version`

Add to the `scripts` block in `package.json`:

```json
"version": "node scripts/sync-demo-version.mjs && git add demo/index.html"
```

(npm runs the `version` lifecycle script after bumping `package.json` but
before creating the release commit, so the staged demo change rides along in
the same commit.)

**Verify**: `node -e "const p=require('./package.json'); if(!p.scripts.version) process.exit(1)"` → exit 0. Do NOT test by running `npm version` (it creates commits/tags).

### Step 4: Create `.github/workflows/release.yml`

Triggered by version tags; gates on the same checks as CI, then publishes
with provenance:

```yaml
name: Release

on:
  push:
    tags: ['v*']

permissions:
  contents: read
  id-token: write   # npm provenance

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: npm ci

      - name: Verify tag matches package.json version
        run: |
          PKG_VERSION=$(node -p "require('./package.json').version")
          TAG_VERSION="${GITHUB_REF_NAME#v}"
          if [ "$PKG_VERSION" != "$TAG_VERSION" ]; then
            echo "Tag $GITHUB_REF_NAME != package.json $PKG_VERSION"; exit 1
          fi

      - name: Typecheck
        run: npm run typecheck

      - name: Test
        run: npm test

      - name: Build
        run: npm run build

      - name: Publish to npm
        run: npm publish --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**Verify**: `npx -y yaml-lint .github/workflows/release.yml` if available, otherwise `node -e "require('node:fs').readFileSync('.github/workflows/release.yml','utf8')" && git diff --stat` → file exists; visually confirm step style matches `ci.yml`.

### Step 5: Write `RELEASING.md`

Short doc (≤25 lines) covering:

1. One-time setup: create an npm **granular automation token** with publish
   rights for `@rexa-developer/tiks` and save it as the `NPM_TOKEN` repo
   secret (Settings → Secrets and variables → Actions). Until that exists,
   the workflow fails at the publish step — by design.
2. Release procedure: working tree clean on `main` →
   `npm version patch|minor|major` → `git push --follow-tags`.
3. What happens automatically: demo pin sync (version script), CI publish
   with provenance (release.yml), demo redeploy (deploy-demo.yml fires
   because the release commit touches `demo/`).

**Verify**: file exists; `grep -q "NPM_TOKEN" RELEASING.md` → exit 0.

## Test plan

No unit tests — this is release tooling. The gates are: the sync script's
idempotency check in Step 2, the YAML/structure checks in Step 4, and the
full existing suite still passing (`npm test`, `npm run typecheck`) to prove
nothing in the library changed.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `node scripts/sync-demo-version.mjs` exits 0 and is idempotent (no diff when versions already match)
- [ ] `package.json` has a `version` lifecycle script; `npm run typecheck` and `npm test` still pass
- [ ] `.github/workflows/release.yml` exists with `--provenance` and the tag/version guard
- [ ] `RELEASING.md` exists and documents the `NPM_TOKEN` setup
- [ ] `git status --porcelain` shows only: `scripts/sync-demo-version.mjs`, `package.json`, `.github/workflows/release.yml`, `RELEASING.md`, `plans/README.md`
- [ ] No tags created, nothing published (`git tag --points-at HEAD` → empty)

## STOP conditions

Stop and report back (do not improvise) if:

- The grep in Step 1 returns 0 (the demo no longer pins an esm.sh version — the design premise is gone).
- `demo/index.html` has drifted such that the import line differs structurally from the excerpt.
- You are tempted to run `npm version` or `npm publish` to "test" — don't; report that verification is limited to the checks above.

## Maintenance notes

- The `NPM_TOKEN` secret must be configured by a human before the first tagged release; the executor cannot do this.
- If the package ever moves to a monorepo or adds a second pinned-version reference (e.g. README CDN snippet gets pinned), extend `sync-demo-version.mjs`'s replace to cover it — the regex already handles multiple occurrences.
- Reviewer should scrutinize: the tag/version guard (prevents publishing a tag that doesn't match `package.json`) and that `permissions` are the minimal pair (`contents: read`, `id-token: write`).
