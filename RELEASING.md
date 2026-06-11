# Releasing tiks

## One-time setup

Create an npm **granular automation token** with publish rights for
`@rexa-developer/tiks`, then save it as a repo secret named `NPM_TOKEN`:

> Settings → Secrets and variables → Actions → New repository secret

Until `NPM_TOKEN` exists, the workflow will fail at the publish step — by design.

## Release procedure

1. Ensure the working tree is clean and on `main`.
2. Run one of:
   ```sh
   npm version patch   # 0.2.0 → 0.2.1
   npm version minor   # 0.2.0 → 0.3.0
   npm version major   # 0.2.0 → 1.0.0
   ```
3. Push the version commit and tag:
   ```sh
   git push --follow-tags
   ```

That's it.

## What happens automatically

- **Demo pin sync** — the `version` lifecycle script (`scripts/sync-demo-version.mjs`)
  rewrites the `esm.sh` import in `demo/index.html` to the new version and stages
  it, so the version commit includes both `package.json` and `demo/index.html`.
- **npm publish with provenance** — pushing the `vX.Y.Z` tag triggers
  `.github/workflows/release.yml`, which runs typecheck → test → build → publish.
- **Demo redeploy** — the release commit touches `demo/index.html`, which triggers
  `.github/workflows/deploy-demo.yml` to redeploy GitHub Pages automatically.
