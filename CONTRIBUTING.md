# Contributing to XenolithGraph

Thanks for considering a contribution. This document covers what you need to know to send a PR that lands cleanly.

## TL;DR

- Test-first. Every change starts with a failing test. See [TDD](#tdd-is-mandatory) below — it's not optional.
- Headless `@xenolithengine/graph-core` stays zero-dep. Render and adapter packages may add deps but each one needs justification in the PR.
- Public API change → Vitest test. Interaction change → Playwright test. Visual change → renderer snapshot.
- Gzip budgets in `.size-limit.json` are hard CI gates. Frame-time targets are not.
- No comments unless the *why* is non-obvious. Identifiers say *what*; comments earn their place by explaining surprises.

## Getting started

```sh
# Requires: Node 20+, pnpm 9+
git clone https://github.com/XenolithEngine/xenolith-graph.git
cd xenolith-graph
pnpm install

# Pick one of these to start hacking:
pnpm --filter @xenolithengine/playground dev      # http://localhost:5173 — theme switcher + every editor feature
pnpm --filter @xenolithengine/site dev            # http://localhost:4321 — docs + landing
pnpm --filter @xenolithengine/demo-react dev      # http://localhost:5174 — the React showcase apps
```

Useful commands:

```sh
pnpm build                                   # tsc -b across all packages
pnpm test                                    # vitest across all packages
pnpm -w test:e2e                             # playwright (chromium + firefox)
pnpm -w typecheck                            # tsc --noEmit, no build
```

## TDD is mandatory

This repo is written **test-first**. The cycle is **red → green → refactor**:

1. Write a failing Vitest (unit) or Playwright (interaction) test that describes the behaviour you want. Run it — **it must fail for the right reason**.
2. Write the minimum implementation to pass. Run the full suite — **all tests green**.
3. Refactor with tests as your safety net. Tests stay green throughout.

Concrete rules:

- **No production code without a failing test first.** If you find yourself writing implementation before a test exists, stop and write the test.
- **Commit convention.** Test-only commits use `test:` prefix; the implementation commit that makes them pass uses `feat:` / `fix:`. The two are usually separate so the red → green transition is visible in history.
- **Bug fixes ⇒ regression test first.** Reproduce the bug as a failing test, then fix it.
- **PIXI shaders ⇒ docs first.** Don't guess at `GlProgram` / GLSL preamble / uniform-block conventions — verify against PIXI v8 source or the live docs at <https://pixijs.com/8.x/guides>. Cheap validation: ship a 5-line red-fill dummy shader into the playground and confirm it compiles before scaling up.

A refactor with zero test changes is the cleanest signal everything is fine. If a refactor forces a test rewrite, the test was probably coupled to implementation, not behaviour — flag it in the PR.

CI (`.github/workflows/ci.yml`) runs the package build, unit tests, playground Playwright excluding `@visual`, and `pnpm size`. It does not measure coverage, and it does not fail when a test is skipped.

## What kind of change is this?

| Change | Required tests |
|---|---|
| Public editor API (`editor.X(...)`) | Vitest |
| Interaction (drag, pan, zoom, pin connect, keyboard) | Playwright |
| Visual (renderer/theme/layout) | Vitest + renderer PNG snapshot (local-only — CI runs Playwright with `--grep-invert @visual` because Linux/macOS pixel rendering differs; update darwin baselines and eyeball them) |
| Bug fix | Vitest reproducing the bug, then the fix |
| Refactor | Existing tests stay green, no rewrite |
| Docs only | None — but check links + spelling |

## Architecture in one paragraph

Layered, headless-first. A layer may know about layers below it, never above.

```
┌──────────────────────────────────────────────────────────────┐
│ Framework adapters (React / Vue / Svelte / Solid / Angular)  │
├──────────────────────────────────────────────────────────────┤
│ @xenolithengine/graph-editor — composes Renderer + Interaction + Plugins │
├─────────────────────┬────────────────────┬───────────────────┤
│ @xenolithengine/graph-render-pixi│  Interaction       │  Plugin host     │
├─────────────────────┴────────────────────┴───────────────────┤
│ @xenolithengine/graph-core (headless: model, types, commands, events)    │
└──────────────────────────────────────────────────────────────┘
```

Full picture: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Design decisions: [`docs/adr/`](docs/adr/).

## Perf

Frame-time targets are product targets. CI does not measure them.

| Target | Where it is checked |
|---|---|
| 500 nodes / 1000 edges at 60fps on Apple Silicon / Ryzen 5 | Product target. No CI job. |
| 5-second drag, 0 GC pauses | Product target. No CI job. |
| Cold start with 100 nodes under 100 ms | Product target. No CI job. |
| `@xenolithengine/graph-core` < 30 kB gzip | `pnpm size` / `.size-limit.json` |
| `@xenolithengine/graph-render-pixi` < 80 kB gzip (PIXI excluded) | `pnpm size` / `.size-limit.json` |
| `@xenolithengine/graph-editor` < 120 kB gzip (PIXI excluded) | `pnpm size` / `.size-limit.json` |

A PR that blows a size-limit ceiling fails CI. Fix it in the same PR or open a discussion before merging.

## PR checklist

- [ ] Tests added (red → green visible in the commit history).
- [ ] `pnpm test` and `pnpm -w typecheck` pass locally.
- [ ] If you touched the renderer/theme: visual baselines re-captured locally (`playwright test tests/e2e/first-node.spec.ts --update-snapshots`) and visually reviewed.
- [ ] If you added or changed a public API: a CHANGELOG entry was added under `[Unreleased]`.
- [ ] CLAUDE.md / ADRs updated if the change affects how future contributors should reason about the code.
- [ ] No new deps in `@xenolithengine/graph-core` (zero-dep is enforced).
- [ ] Bundle-size budget respected for the touched packages.

## Code style

- TypeScript strict, ESM only, no CommonJS output.
- No comments unless the *why* is non-obvious. Identifiers explain the *what*.
- No backwards-compat shims pre-v1.0. Breaking changes ship in the CHANGELOG with a migration note.
- Don't add features, refactors, or abstractions beyond what the issue requires. A bug fix doesn't need surrounding cleanup; three similar lines beats a premature abstraction.
- Don't add error handling, fallbacks, or validation for scenarios that can't happen. Trust internal code; validate at system boundaries only.

## Releasing

Releases are **tag-driven** (`.github/workflows/release.yml`) — there is no changesets setup. To cut a release:

1. Bump `"version"` in **every** publishable `packages/*/package.json` to the same version, plus the `VERSION` constants and version strings in source (`core`/`render-pixi`/`editor`/`theme-*` `src/index.ts`, `mcp-server/src/server.ts`, `editor/src/mcp.ts`, `theme-xen/src/tokens.json`).
2. Move the CHANGELOG `[Unreleased]` entries into a new version section and write `docs/release-notes/v<version>.md`.
3. Commit, then tag `v<version>` and push the tag. The workflow rebuilds, re-runs unit tests + size gates, verifies every package version equals the tag, publishes to npm with provenance, and creates the GitHub Release from the notes file.

Until v1.0 releases are `0.7.x` betas; breaking changes are allowed inside a beta bump but must be flagged in the CHANGELOG entry.

## Reporting bugs

- Public bugs → [GitHub Issues](https://github.com/XenolithEngine/xenolith-graph/issues). Include a minimal repro (CodeSandbox / repo snippet preferred) and the expected vs. observed behaviour.
- Security issues → see [`SECURITY.md`](SECURITY.md). Don't open public issues for vulnerabilities.

## Getting help

- [Discussions](https://github.com/XenolithEngine/xenolith-graph/discussions) for design questions and "is this the right approach?" before you start coding.
- The Architecture doc and ADRs are the long-form context; the README is the entry point.

Thanks again — every PR makes this thing better.
