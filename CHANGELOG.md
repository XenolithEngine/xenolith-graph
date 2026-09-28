# Changelog

All notable changes to this project will be documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Until v1.0 every release is a `0.x` minor; breaking changes are flagged in their entry.

## [Unreleased]

### Added

- **New package `@xenolithengine/graph-test-utils`** — jsdom test kit for hosts: `mockPixi()` (canvas 2D/WebGL context stubs, ResizeObserver polyfill, deterministic manual rAF) boots the REAL editor under vitest+jsdom, `renderEditorToDOM()` is the one-call mount, `renderXenolithToDOM()` (subpath `/react`) mounts the real `<XenolithGraph>` adapter, and `/fake` exports a headless `FakeEditor` built on real core primitives (Graph/CommandBus/EventEmitter/NodeRegistry) for logic-level tests. Guide: [Testing your integration](https://graph.xenolith.studio/guides/testing/).
- `editor.autoLayout({ direction, spacing, fit })` — the layered DAG layout that powered the MCP `auto_layout` tool is now a public host API (extracted to `layout-ops.ts`; identical results for hosts and agents).

### Notes

- `0.7.0-beta.4` was tagged in the repo but never reached npm (the publish token had expired; fixed for beta.5). The registry jumps beta.3 → beta.5 — nothing is missing, beta.5 includes the full beta.4 scope.

## [0.7.0-beta.5] — 2026-09-25

Summary in [docs/release-notes/v0.7.0-beta.5.md](docs/release-notes/v0.7.0-beta.5.md).

### Added

- `evaluateGraph()` in `@xenolithengine/graph-core` — run a host dataflow pass over a graph: walk `topoOrder`, call one compute function per node, thread output-pin values into the next node's inputs. It is not an execution engine; hosts supply the functions. Guide: [Run your own nodes](https://graph.xenolith.studio/guides/run/).
- `editor.setDefaultEdgeOptions()` / `editor.getEdgeOptions()` — document-wide default edge styling (path style, colours, arrowheads, animated dashes) merged under per-edge overrides.
- `inNodeBody: false` widget flag — sidebar-only widgets: rendered in the properties sidebar, contributing no node-body height or rows.
- `openSidebar` callback in the DOM-widget mount context (`reactWidget` / `vueWidget`) — custom widgets can open the node's properties sidebar.

### Fixed

- Full-graph PNG/JPEG export of graphs wider/taller than the GPU `MAX_TEXTURE_SIZE`: the export now renders in GPU-sized tiles and stitches them, instead of producing a blank image.
- Docs accuracy pass: stale pre-v0.1 descriptions, wrong CI-coverage and frame-time-gate claims, and the MCP tool count (25, not 24).

### Removed — breaking

- `@xenolithengine/graph-theme-holographic` and `@xenolithengine/graph-theme-synthwave`. Neither was documented in STABLE-API beyond a table row; migrate to `graph-theme-xen`, `graph-theme-daylight`, or `graph-theme-liquid-glass`.

### Internal

- Editor monolith split, tranche 1: macro/template/dive orchestration moved to `Subgraph`, pointer/gesture state machines to `PointerController`, comments to `CommentController` (`index.ts` 6742 → 5134 lines). **No public API change.** +38 unit tests covering the extracted modules.

## [0.7.0-beta.4]

First public beta. What shipped is summarised in [docs/release-notes/v0.7.0-beta.4.md](docs/release-notes/v0.7.0-beta.4.md). [`STABLE-API.md`](STABLE-API.md) is the surface intended to freeze at v1.0. It is not frozen.

[Unreleased]: https://github.com/XenolithEngine/xenolith-graph/commits/main
[0.7.0-beta.5]: https://github.com/XenolithEngine/xenolith-graph/compare/v0.7.0-beta.4...v0.7.0-beta.5
[0.7.0-beta.4]: https://github.com/XenolithEngine/xenolith-graph/compare/v0.7.0-beta.3...v0.7.0-beta.4
