<!-- One-liner what this PR does (not the implementation — the OUTCOME). -->

## What changes

<!-- Bullet list of user-visible changes. Group public API / interaction / visual / docs. -->

## Why

<!-- Issue this fixes, the use case, or the design reasoning. Link the issue if one exists. -->

## TDD

<!-- Per CONTRIBUTING.md the cycle is red → green → refactor. Confirm: -->

- [ ] Tests added BEFORE implementation (a failing-for-the-right-reason commit, then a passing one)
- [ ] Public API change → Vitest in `packages/*/src/*.test.ts`
- [ ] Interaction change → Playwright in `apps/playground/tests/`
- [ ] Visual change → renderer PNG snapshot updated and visually reviewed

## Checks

- [ ] `pnpm -w typecheck` clean
- [ ] `pnpm test` clean across all packages
- [ ] Bundle-size budget respected
- [ ] Changeset added (`pnpm changeset`) for any public API change
- [ ] No new dep in `@xenolith/core`

## Screenshots / video

<!-- For UI/visual changes. Optional but appreciated. -->
