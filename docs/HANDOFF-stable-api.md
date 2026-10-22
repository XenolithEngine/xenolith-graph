# HANDOFF — STABLE-API audit, iteration 2 (doc/code reconciliation)

State: **landed on `main`** in this iteration's commits (audit gate script → render-pixi
`./internal` subpath → STABLE-API reconciliation → CI wiring). Gate `pnpm audit:api` is green
(exit 0). Previous iteration: added `scripts/audit-stable-api.mjs` and found 11 real failures
+ ~315 undeclared exports. This iteration fixed all of them.

## What was done

### Category A — STABLE-API.md truth fixes

- core: removed phantom `getTemplateBoundary` (never existed in any commit) and phantom `pinId`
  from the ID-minters row (core only mints via `createPinId`; `pinId` is a render-pixi member).
- editor: dropped the `PinSelector` name from the `connect` row — the resolver is internal;
  reworded instead of growing the frozen surface.
- render-pixi: `PathStyle` → `EdgePathStyle`, `computeRerouteSize` → `rerouteSize`,
  `cssVarsForTheme` → `themeCssVars`, `computeMacroLayout` removed (macro layout now lives
  inside `renderMacroFrame` / `MacroFrameView`).
- Themes: `xenTheme` re-attributed to `@xenolithengine/graph-render-pixi` (theme-xen ships only
  `xenTokens`/`mergeTheme`/token types); added the missing `graph-theme-daylight` row
  (`daylightTheme`, `daylightTokens`); `liquidGlassTokens` added.

### Category B — the four render-pixi PIXI helpers (the interesting one)

`markPinInteractive`, `readPinHandle`, `clearGlowTextureCache`, `clearGradientCache` were plain
exports reachable from the entry barrel; the doc claimed they were stripped. Two TS facts were
confirmed empirically (tsc 5.9.3) while fixing this:

1. **stripInternal does not strip names from a barrel line** `export { x } from './y.js'` — the
   function declarations vanish from `dist/node-renderer.d.ts` but the barrel line in
   `dist/index.d.ts` keeps referencing them (a dangling re-export hidden only by
   `skipLibCheck`). Tagging `@internal` alone leaves the leak in place and breaks downstream
   typecheck.
2. **tsc scans leading COMMENT TEXT for the literal `@internal`** — a plain `//` comment
   containing that string above an export is enough for declaration emit to treat the export as
   internal. A comment in `src/internal.ts` that merely mentioned the tag emptied
   `dist/internal.d.ts` down to `export {}`.

Fix (deterministic, no dependence on stripInternal quirks):

- `packages/render-pixi/src/index.ts`: the four names removed from the entry barrel →
  `dist/index.d.ts` is clean (this is what the audit checks).
- new `packages/render-pixi/src/internal.ts`: curated re-export of the four; new
  `./internal` entry in `packages/render-pixi/package.json` exports map.
- consumers re-pointed to `@xenolithengine/graph-render-pixi/internal`:
  `packages/editor/src/index.ts`, `packages/editor/src/pointer-controller.ts`,
  `packages/theme-liquid-glass/src/render-node.ts`, `packages/theme-daylight/src/render-node.ts`.
- **vite alias trap**: all app configs alias bare package names to `src/index.ts`; string alias
  entries prefix-match, so `…/internal` got swallowed and rewritten to `src/index.ts/internal`.
  Added a specific `…/internal` alias BEFORE the generic one in all 7 configs (playground,
  fairqueue-demo, comfy-demo, demo-react, wasm-demo, site/astro.config.mjs, and local-only
  baklava-parity — the latter is git-ignored, fix applies on disk only).
- STABLE-API `@internal` bullet reworded: not exported from the entry; reachable only via the
  `/internal` subpath, which is not public contract and may be removed at v1.0.

### Category C — declared the shipped surface (~315 names)

Decisions taken (owner had delegated disputed buckets):

- **Declared as stable** (mandatory bucket as proposed): controlled-protocol types
  (`GraphChanges`…`SnapshotEdge`), `XenolithEditorOptions`, `ConnectionRequest`,
  `ImportReactFlowOptions` + `ReactFlow*` + `ImportReport`,
  `diffNodesToChanges`/`diffEdgesToChanges` (adapter-core), schema/widget/plugin/proposal/audit
  types, adapter prop types, `XenTokens` family, `migrateNodePayload`, traversal helpers,
  `EvaluateGraphResult`/`NodeCompute`.
- **Disputed buckets — all declared** (they are real public exports of a package we intend to
  freeze; leaving them undocumented contradicts the doc's own "treat unlisted as internal"
  rule, and stripping ~300 symbols pre-freeze would be the wrong move):
  core macro/template plan layer (`planMacroCollapse`, `templateInterface`,
  `planTemplateExtraction`, …), undo types, `CommandContext`/`CommandBusOptions`,
  render-pixi rendering/LOD/geom helpers (grouped by family), svelte `./components` slice-2
  surface, autolayout engine types, `NodeStatus`, v1 doc types (`XenolithCommentV1`,
  `XenolithTemplateV1`, `XenolithGraphVersion`).
- **`VERSION`**: one sentence in the Stable intro ("every package exports a `VERSION` string")
  + `VERSION` named in the sections where it ships.
- **Experimental-tier packages**: `plugin-runtime`, `runtime-as`, `mcp-server` got their own
  Stable-section entries pinning the current export list, marked entirely experimental, plus a
  blanket sentence in Experimental: "every export the Stable section does not name is
  experimental by default".

## Verification

- `pnpm build` — 26/26 tasks OK.
- `pnpm typecheck` — 43/43 tasks OK.
- `pnpm test` — all suites green except one **perf-bound** editor test
  (`import-reactflow-fixtures.test.ts > XXL on demand: 5000 nodes / 8000 edges`) that flaked
  under full-suite parallel load; it passes in isolation (reran twice) and passed in the
  standalone editor run earlier the same day. Timing-bound, not a regression — no logic changed,
  only import paths and doc text.
- `pnpm audit:api` — exit 0, `0 failure(s)`, zero "never declared" lines. Events 25/25,
  @internal checks all pass.
- Manual: `dist/render-pixi/index.d.ts` contains none of the four names;
  `dist/render-pixi/internal.d.ts` re-exports all four; grep confirms no other consumers
  (playground/showcases/docs) of the four helpers.

## Files touched

- `STABLE-API.md` (main rewrite), `scripts/audit-stable-api.mjs` (from iteration 1), root
  `package.json` (`audit:api` script, iteration 1).
- `packages/render-pixi/`: `src/index.ts`, `src/internal.ts` (new), `src/node-renderer.ts`
  (doc comments only), `package.json` (`./internal` export).
- `packages/editor/src/{index,pointer-controller}.ts`, `packages/theme-{daylight,liquid-glass}/src/render-node.ts`: import path only.
- 6 tracked app configs + git-ignored `apps/baklava-parity/vite.config.ts`: `/internal` alias.

## Follow-ups & notes

1. The audit's informational lines (e.g. wc section referencing `xenolith`/`on` shipped
   elsewhere) are true attribution statements, left as is deliberately.
2. Known audit blind spots (from iteration 1, still true): name-level only — no default values,
   no semantics; svelte/angular scanned from src.
3. The next `chore(release)` commit should mention the new `./internal` subpath (additive) and
   the entry-barrel narrowing of the four helpers in its changelog/release notes.
