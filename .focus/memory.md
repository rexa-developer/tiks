# Memory

## Project Context
- Stack: TypeScript, Web Audio API, tsup (esbuild), Vitest
- Package name: `tiks` (npm available)
- Target: ~3KB minified+gzipped, zero dependencies
- Build: tsup → ESM + CJS + .d.ts
- Test runner: Vitest (to be set up)
- React hook as separate entry point (`tiks/react`)

## Principles
- Zero audio files — all sounds are procedural synthesis
- No reverb in v1 — use longer decay to approximate
- Two API surfaces: class singleton + tree-shakeable functions
- Sound design quality is the moat — tune frequencies/envelopes carefully
- Ship 2 themes only (soft + crisp) — others deferred to v1.1+
- React hook only — no Vue composable in v1
- Demo page built last

## Decisions
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-16 | Name: tiks (not tink) | tink taken on npm by abandoned npm experiment |
| 2026-04-16 | No reverb v1 | Adds ~1-2KB, barely perceptible on 30-80ms sounds |
| 2026-04-16 | 2 themes (soft, crisp) | Polish > quantity, defineTheme() for custom |
| 2026-04-16 | React hook only | React ~70% market, Vue deferred to v1.1 |
| 2026-04-16 | Both class + functional API | Class for convenience, functions for tree-shaking |
| 2026-04-16 | Runtime library not CLI | Pure synthesis angle is the differentiator |
| 2026-04-16 | MIT, fully free | Monetize later if adoption warrants |
| 2026-04-16 | Demo page with visual waveform feedback | For muted users, built last |

## Open Items
- [ ] Build tiks v1

## Last Session
- Date: 2026-04-16
- Task: tiks v1 full implementation
- Status: Complete
- Key files: src/index.ts, src/tiks.ts, src/engine.ts, src/themes.ts, src/noise.ts, src/generators/*.ts, src/react.ts, demo/index.html
- Notes: All 11 tasks complete. 62 tests passing. Bundle: 1.93KB gzipped. On feat/tiks-v1 branch, not yet merged to main. Demo page needs browser testing.
