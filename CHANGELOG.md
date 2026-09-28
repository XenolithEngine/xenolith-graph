# Changelog

All notable changes to this project will be documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Until v1.0 every release is a `0.x` minor; breaking changes are flagged in their entry.

## [Unreleased]

### Fixed

- **Docs truth pass (F3)** — MCP README rewrote its tool table to reality (26 tools in three categories, 3 resources incl. `audit://recent`, a proposal-mode section with the honest limits); stale counts corrected everywhere: 26 tools · 3 resources (was 25/2), 25 events / 7 preventable (was 24/4), `EDITOR_EVENT_NAMES` 25 (was 24). README test counts regenerated from the actual suites via the new `scripts/update-test-counts.mjs` (1259 unit · 112 e2e — the badge had drifted to 1012/142). Human-in-the-loop guide (EN/RU/ZH) documents the built-in review panel + `<XenolithProposalQueue>`; `/agents.md` explains proposal receipts to agents.
- `@xenolithengine/graph-wc` crashed server bundles at import (`HTMLElement is not defined` — the element class extended `HTMLElement` at module scope). The base is now lazily guarded; the package (and every other `@xenolithengine/*` entrypoint) imports cleanly in bare-node/SSR environments, enforced by a node-purity test suite.
- `editor.isDestroyed` was listed in STABLE-API but had drifted out of the code — public getter restored.

### Added

- **Propose-mode demo (F2)** — `?demo=agent&mode=propose`: the scripted agent session now runs its whole build through the REAL proposal pipeline (`buildHandlers(mode:'propose')`, hand-wired queue+panel — the embedded-handlers pattern), the transcript marks steps `queued #N`, and a scripted human clicks the actual badge → panel → Approve all. Three e2e tests pin the contract: badge counts 33 while pending; approval lands 14 nodes / 17 edges; ONE undo reverts the ENTIRE batch. Capture committed as `docs/screenshots/agent-propose.gif`; README tells the "Agents propose. Humans approve." story. `record-mcp-demo.mjs --propose` records it.

- **Proposal review panel (F1)** — the built-in face of `editor.mcpProposals`: a floating badge surfaces while an agent's proposals wait (`[data-xeno-proposals-badge]`), clicking opens the review panel (`[data-xeno-proposals-panel]`) listing each pending op (tool, args digest, predicted effect, client identity — labelled transport-provided/not-authenticated in the DOM). Approve all routes through `queue.approve()` (ONE undoable transaction); per-entry ✕ and Reject all discard. The queue emptying from any path closes the panel. Public API: `editor.chrome.showProposals()` / `hideProposals()` / `isProposalsVisible`, plus declarative `<XenolithProposalQueue>` components in React and Vue (mount → open, unmount → hide; render no DOM of their own — the panel is core, themed via `--xeno-*`). Auto-created on the first `connectMCP(..., { mode: 'propose' })`; hosts with custom UI simply never open it.

- **Agent proposal mode (C-Bet1b / ADR 0007)** — `connectMCP(url, { mode: 'propose' })`: mutating MCP tool calls enqueue for human approval instead of applying. `editor.mcpProposals` exposes the review queue (`entries` / `approve` / `reject` / `onChange`); approve replays the batch as ONE atomic command-bus transaction (one undo step, failures roll back and the queue survives for retry) with provisional→real node-id translation so agents can chain ops within a batch; reject discards. Reads stay live; audit records at approval; default mode unchanged ('auto' — opt-in trust boundary). Guide: Human-in-the-loop agent editing (EN/RU/ZH).

- **MCP audit log (C-Bet1a)** — every document-mutating tool call appends one bounded-ring entry (default 500, evictions counted): client id, tool, argument digest, effect deltas (nodes/edges ±), ok/error, monotonic seq, timestamp. Read/view tools are not audited. Surfaced three ways: `get_audit_log` tool, `audit://recent` MCP resource, and `editor.mcpAudit` for host UIs (one ring per editor, shared across reconnects; injectable via `buildHandlers`/`McpClient` options). Multi-client groundwork: `McpClient` carries a `clientId` (also in the WS hello). **Security, stated plainly:** entries contain graph data; `clientId` is transport-provided, NOT authenticated.

- **Commit-time controlled protocol (ADR 0006)** — `editor.on('graph:changed', …)` emits coalesced change-arrays at command-bus COMMIT time (one per transaction / undo-group / top-level command / undo-redo step; per-frame drag ticks stay silent and positions collapse to the final commit). The write side `editor.applyChanges(changes)` maps arrays back onto core commands in ONE transaction and is echo-idempotent; `reduceGraphChanges(mirror, changes)` is the pure reducer for external stores; `loadJSON`/`clear` emit synthetic replace bursts (their data path bypasses the bus); unmapped commands (comments/macros/templates in v1) surface in `changes.unsupported` instead of vanishing. React: `useNodesState()` — the controlled triple without React Flow's re-render-per-drag disease. Core: `CommandBus.collecting` + `history:undone`/`history:redone` events (one per history step, carrying results).

- **React Flow importer** — `importFromReactFlow(json, opts?)` (pure, zero deps) and `editor.importReactFlow(json, opts?)`: bring a React Flow (xyflow) `toObject()` graph into `xenolith.v1`. Pins synthesize from edge handles (typed via `inferType` or `schemas[]`), RF edge types map onto `pathStyle`, and the returned `ImportReport` accounts for every dropped field, unknown endpoint and structural mismatch — nothing is lost silently. Guide: [Migrate from React Flow](https://graph.xenolith.studio/guides/migrate-react-flow/).
- `xenolith.v1` edge opts now round-trip `pathStyle` (`step`/`smoothstep`/`linear`; `bezier` stays the implicit default, unknown literals are ignored on parse) — previously edge path styles did not survive save/load.
- **Canonical `editor.connect(from, ref, to, ref, opts?)`** — one typed wire API with MCP-grade pin resolution (`PinSelector`: pin id → label case-insensitive → numeric index → `'in'`/`'out'` → `undefined` = single-pin default), extracted to `pin-resolve.ts` and shared with the MCP `connect_pins` tool. Errors list the node's available pins of the needed direction.
- **New package `@xenolithengine/graph-test-utils`** — jsdom test kit for hosts: `mockPixi()` (canvas 2D/WebGL context stubs, ResizeObserver polyfill, deterministic manual rAF) boots the REAL editor under vitest+jsdom, `renderEditorToDOM()` is the one-call mount, `renderXenolithToDOM()` (subpath `/react`) mounts the real `<XenolithGraph>` adapter, and `/fake` exports a headless `FakeEditor` built on real core primitives (Graph/CommandBus/EventEmitter/NodeRegistry) for logic-level tests. Guide: [Testing your integration](https://graph.xenolith.studio/guides/testing/).
- `editor.autoLayout({ direction, spacing, fit })` — the layered DAG layout that powered the MCP `auto_layout` tool is now a public host API (extracted to `layout-ops.ts`; identical results for hosts and agents).

### Fixed

- `editor.connect()` now actually honours the documented "every mutation goes through the bus, undoable" contract: the old direct-index implementation bypassed the command bus (not undoable, no `edge:connecting` veto, no type gate, no wire-colour seeding). The numeric call shape `connect(a, 0, b, 1)` still works — it now resolves through the same path (behaviour change: connects are undoable and can throw on incompatible pins / vetoes, matching `addEdge` and drag-dropped wires).

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
