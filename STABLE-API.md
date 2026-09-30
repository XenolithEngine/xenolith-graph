# STABLE-API.md — v0.7 BETA

This document lists the public API surface we plan to freeze at v1.0. **At v0.7 BETA it is NOT
frozen yet** — breaking changes can still land in any 0.7.x release. Pin an exact version if you
adopt now. The [Stable](#stable) section is the surface we have highest confidence in; the rest
of the v0.7.x cycle is for shaking out the corners before we commit to the freeze.

Everything outside [Stable](#stable) is one of:

- **`@internal`** — exists at runtime, but lock-in we don't promise. Will be hidden from `.d.ts`
  before v1.0. Don't depend on it.
- **Experimental** — early surface that may change shape. Annotated below.

If you find a public method that isn't listed here, treat it as `@internal` until proven
otherwise. File an issue and we'll classify it.

---

## Stable

### `@xenolithengine/graph-core`

| Symbol | Notes |
|---|---|
| `Graph` class | Read-only — host shouldn't mutate directly. |
| `Graph.internals()` / `GraphInternals` | The friend surface (ADR 0008): the command-bus mutation backdoor the in-repo editor uses. NOT for hosts — mutating through it skips undo, preventable events and `graph:changed` commits. Use editor commands / `editor.applyChanges`. |
| `Selection` class | |
| `NodeRegistry`, `TypeRegistry` | Register / unregister / list. |
| `EventEmitter`, `Unsubscribe` | |
| Commands: `AddNode`, `RemoveNode`, `ConnectPins`, `DisconnectEdge`, `MoveNode`, `SetNodeState`, `SetNodePins`, `SetNodeWidgets` | The atomic mutation set. Other commands exist (macros, templates) — those are stable too but listed in their respective module sections below. |
| `CommandBus` (read interface) | `apply`, `undo`, `redo`, `canUndo`, `canRedo`, `transaction`, `clearHistory`. |
| Types: `Node`, `Edge`, `Pin`, `NodeId`, `EdgeId`, `PinId`, `NodeGlyph`, `Vec2`, `Unsubscribe` | |
| Traversal: `topoOrder`, `wouldCreateCycle`, `reachableFrom`, `evaluateGraph` | `evaluateGraph(graph, compute)` runs a host dataflow pass. It is not an execution engine. |
| ID minters: `createNodeId`, `createEdgeId`, `createPinId`, `pinId`, `createCommentId` | |
| `defaultWidgetValue`, `comboOptions`, `clampWidgetValue` | |
| Template helpers: `isTemplateInstance`, `isTemplateBoundary`, `getTemplateBoundary` | |
| Macro helpers: `isMacro`, `createMacro`, `macroMembers`, `flattenMacroProxies` | |
| Reroute: `isReroute`, `createReroute`, `REROUTE_NODE_TYPE` | |

### `@xenolithengine/graph-editor`

The `XenolithEditor` class is the main entry point. The **namespaces** below group the surface.
The viewport and history verbs also live on the class root (`editor.fitView`, `editor.setViewport`,
`editor.screenToWorld`, `editor.undo`, `editor.redo`, `editor.canUndo`, `editor.canRedo`) and
**stay there through v1.0** — that is the call shape hosts already type. `editor.view` and
`editor.history` are the same functions. Chrome and clipboard stay namespaced.

| Stable | Notes |
|---|---|
| `XenolithEditor.init(target, opts)` → `Promise<XenolithEditor>` | Mount the editor. |
| `editor.destroy()`, `editor.isDestroyed` | |
| `editor.on(event, handler)` → `Unsubscribe` | The 25 public events listed below. |
| `editor.loadJSON(data: unknown)`, `editor.toJSON()`, `editor.getGraphReadonly()`, `editor.graphNodes()`, `editor.graphEdges()`, `editor.getNode(id)`, `editor.readGraph()` | Three reads, not six. `toJSON()` is the document snapshot (xyflow `toObject`); `getGraphReadonly()` returns that same snapshot. `exportJSON()` wraps it in a download `Blob`. `graphNodes`/`graphEdges`/`getNode` and `readGraph()` are the LIVE graph (`readGraph()` is what the core traversal helpers take) — read-only by convention. |
| `importFromReactFlow(json, opts?)` → `{ doc, report }`, `editor.importReactFlow(json, opts?)` → `ImportReport` | React Flow (xyflow) `toObject()` JSON → xenolith.v1. Pins synthesized from edge handles (`inferType` or `schemas[]` for typing), loss accounting in the report — nothing drops silently. Guide: Migrate from React Flow. |
| `editor.transaction(fn)`, `editor.beginGroup(opts?)`, `editor.endGroup()` | Group many mutations into ONE undo entry; `beginGroup({ idleTimeoutMs })` auto-closes for keystroke coalescing. |
| `editor.setNodeState(nodeId, state)` | Bus-routed `SetNodeState` — **merges** keys into `node.state` (omitted keys stay). Undoable, fires events. |
| `editor.applyChanges(changes)`, `editor.getGraphMirror()`, `reduceGraphChanges(mirror, changes)`, `snapshotGraph(nodes, edges)` | The write side of the controlled protocol: one transaction per call (one undo step), echo-idempotent (re-adding/re-removing/no-op positions skip). `reduceGraphChanges` is the pure store reducer (Zustand/Redux); React hosts get `useNodesState()` in `@xenolithengine/graph-react`. ADR 0006. |
| `editor.addNode`, `editor.removeNode`, `editor.moveNode`, `editor.addEdge`, `editor.disconnectEdge`, `editor.deleteEdge`, `editor.setSelection`, `editor.clear` | Mutation API — every call goes through the bus, fires events, undoable. |
| `editor.connect(from, fromRef, to, toRef, opts?)` → `EdgeId`, `editor.connect({ source, sourceHandle, target, targetHandle }, opts?)` → `EdgeId` | **The canonical wire API.** Positional refs and the object form (`ConnectEndpoints`, the React Flow `onConnect` shape) share one resolver (`PinSelector`): pin id → label (case-insensitive) → numeric index → `'in'`/`'out'` keyword → `undefined` or `null` = the node's single pin of that direction. `source` / `target` are a node or its id. Undoable (one `history.undo()`), fires `edge:connecting` (veto throws) + `edge:connected`, gates on pin compatibility, seeds wire colour from the source pin type. Throws with available-pins context on unresolvable refs, and `connect: source node '<id>' was not found` when the id is missing. |
| `editor.setNodeStatus`, `editor.clearNodeStatuses` | |
| `editor.addComment`, `editor.removeComment`, `editor.setCommentText`, `editor.setCommentColor` | |
| `editor.createMacroFromSelection`, `editor.ungroupMacro`, `editor.expandMacro`, `editor.collapseMacro` | |
| `editor.createTemplateFromSelection`, `editor.renameTemplate`, `editor.unpackTemplateInstance`, `editor.convertTemplateInstanceToMacro`, `editor.convertMacroToTemplate`, `editor.diveInto`, `editor.diveOut`, `editor.diveDepth`, `editor.definitions` | |
| `editor.registerWidget(name, controller)`, `editor.setWidgetValue`, `editor.getWidgetValue`, `editor.setPinLiveValueProvider`, `editor.setNodeGlyph` | |
| `editor.exportJSON()`, `editor.exportImage(opts)`, `editor.exportNodeImage(id, opts)` | |
| `editor.setTheme(theme)`, `editor.theme`, `editor.tokens`, `editor.setCategoryPalette`, `editor.setDefaultEdgeOptions`, `editor.getEdgeOptions`, `editor.setEdgeOptions`, `editor.setEdgeAnimated` | `setDefaultEdgeOptions` fills fields a wire does not set itself. `getEdgeOptions` returns the merge. |
| `editor.openPalette(screen?)`, `editor.closePalette`, `editor.isPaletteOpen`, `editor.insertNode`, `editor.insertRerouteOnEdge`, `editor.setPaletteSidebar` | |
| `editor.findNodes(q)`, `editor.focusNode(id)`, `editor.openSearch()`, `editor.closeSearch`, `editor.isSearchOpen` | Ctrl+F search over EXISTING nodes (H1): `findNodes` shares semantics with the MCP `find_nodes` tool; the search box folds type matches into title matches; picking a result selects + centers (`focusNode`). Types `FindNodesQuery` / `FoundNode`. |
| `editor.openSidebar(nodeId)`, `editor.closeSidebar`, `editor.isSidebarOpen`, `editor.refreshSidebar` | |
| `editor.setBreadcrumbVisible(v)` | |
| `editor.setInteractive(v)`, `editor.interactive`, `editor.setLiveMode(v)`, `editor.liveMode` | |
| `editor.setIsValidConnection(predicate)` | |
| `editor.connectMCP(url, { clientId? })`, `editor.mcpAudit` | MCP client with optional audit identity; `mcpAudit` is the bounded agent-mutation ring (C-Bet1a) — entries carry graph data, clientId is transport-provided NOT authenticated. Exposed to MCP clients as `get_audit_log` / `audit://recent`. |
| `editor.connectMCP(url, { clientId?, mode? })`, `editor.mcpProposals` | Proposal mode (C-Bet1b / ADR 0007): `mode: 'propose'` makes mutating MCP tools enqueue for human approval; `mcpProposals` is the review queue (`entries`/`approve`/`reject`/`onChange`) — approve lands ONE atomic undoable transaction with provisional→real id translation; audit records at approval. Guide: Human-in-the-loop agent editing. |
| **Namespaces:** | |
| `editor.view.{pan, zoomAt, resetView, fitView, setViewport, state, screenToWorld, worldToScreen, lastPointerWorld}` | Viewport. |
| `editor.autoLayout({direction, spacing, fit})` | Layered DAG layout — the same layout the MCP `auto_layout` tool uses, now public for hosts. |
| `editor.history.{undo, redo, canUndo, canRedo, clear}` | Undo/redo + history. |
| `editor.clipboard.{copy, paste, duplicate, selectAll, deleteSelection}` | Clipboard ops. |
| `editor.chrome.{setControls, setMinimapVisible, setMinimapPosition, setStatsVisible, toggleStats, showOverlay, hideOverlay, withOverlay, enterFullscreen, exitFullscreen, toggleFullscreen, isFullscreen, overlayRoot, setBreadcrumbVisible}` | UI chrome. |
| `editor.chrome.{showProposals, hideProposals, isProposalsVisible}` | Proposal review panel (F1): the built-in face of `editor.mcpProposals` — a badge while entries wait, a panel with Approve all / Reject all / per-entry reject. `showProposals()` returns false when no propose-mode session ever connected. React/Vue: `<XenolithProposalQueue>` declarative wrappers. |
| **Registries:** | |
| `editor.registry` — `NodeRegistry` | Register / unregister node types. |
| `editor.types` — `TypeRegistry` | Pin types + conversions. |
| `editor.commands` — `CommandRegistry` | Named commands + hotkeys. |
| `editor.icons` — `IconRegistry` | Header glyphs. |
| `editor.contextMenu` — `ContextMenuRegistry` | Plugin context-menu items. |
| `editor.selection` — `Selection` | |
| `editor.definitions` — template definitions | |
| **25 public events** | Bus is `editor.on(name, handler)`. See [Events](#events) below. |
| `editor.use(plugin)` — `PluginHost.use` | Mount a plugin. |
| `parseXenolithGraph`, `serializeXenolithGraph`, `XENOLITH_GRAPH_VERSION` + `XenolithGraphV1` / `XenolithNodeV1` / `XenolithEdgeV1` / `XenolithPinV1` types | |
| `Commands` const namespace + `CommandSpec` | |
| `ContextMenuRegistry`, `ContextMenuItemSpec`, `ContextMenuTarget` | |
| `EditorEvents`, `PreventablePayload` | |
| `BUILTIN_RECIPES`, `createRecipeRegistry`, `instantiateRecipe`, `RecipeDef`, `RecipeNodeDef`, `RecipeEdgeDef`, `RecipeRegistry` | |
| `diffGraphs`, `GraphDiff` | |

### `@xenolithengine/graph-adapter-core`

| Symbol | Notes |
|---|---|
| `createEditorBinding(target, props)` | Primitive every framework adapter builds on. |
| `EditorBinding`: `editor`, `on`, `setProps`, `destroy` | |
| `EDITOR_EVENT_NAMES` const | 25 entries — drives every adapter's event-prop derivation. Compile-time exhaustiveness checked against `EditorEvents`. |
| `XenolithProps`, `applyProps`, `EditorLike` | |

### `@xenolithengine/graph-render-pixi`

| Symbol | Notes |
|---|---|
| `Viewport` | |
| `InteractionManager` + the `intent:*` events | |
| `Vec2`, `Rect`, `ViewportState`, `ZoomBounds`, `PathStyle` | |
| `xenTheme`, `XenolithTheme`, `PaletteStyle` | |
| Layout helpers: `computeNodeLayout`, `computeRerouteSize`, `computeMacroLayout`, etc. | Stateless. |
| Rendering helpers: `renderNode`, `renderEdge`, `renderComment`, `renderRerouteNode`, `renderMacroFrame` | Stateless. |
| `createPixiTextMeasurer`, `cssVarsForTheme` | |
| `IconRegistry`, `BUILTIN_ICONS` | |

Peer dep: `pixi.js@^8.6.0`.

### Framework adapters

| Package | Exports |
|---|---|
| `@xenolithengine/graph-react` | `<XenolithGraph>`, `<XenolithPanel>`, `<XenolithButton>`, `<XenolithControls>`, `<XenolithMiniMap>`, `<XenolithProposalQueue>`; hooks `useEditor` / `useXenolithEditor` / `useNodes` / `useEdges` / `useSelection` / `useViewport` / `useGraphJSON` / `useUndoRedo` / `useEditorEvent` / `useXenolith` / `useNodesState` (`{ nodes, edges, applyChanges, setNodes, setEdges }`, ADR 0006); `reactWidget`; `WidgetProps`, `XenolithContext`, `EVENT_PROP`. |
| `@xenolithengine/graph-vue` | `<XenolithGraph>` (typed object-form emits + `@ready`); composables `useEditor` / `useEditorOrNull` / `useEditorReady` / `useEditorEvent` / `useXenolithGraph` / `useNodes` / `useEdges` / `useSelection` / `useViewport` / `useGraphJSON` / `useUndoRedo` / `useNodesState` (`setNodes` + `setEdges`); in-editor components `XenolithPanel` / `XenolithButton` / `XenolithControls` / `XenolithMiniMap` / `XenolithProposalQueue`; `vueWidget`, `WidgetProps`, `XenolithEditorKey`, `emitName`, `XenolithGraphEmits`. |
| `@xenolithengine/graph-svelte` | `xenolith` action (`on:ready` + typed kebab `on:*` events), `createXenolithStores` (store bag: `editor`/`nodes`/`edges`/`selection`/`viewport`/`graphJSON`/`undoRedo`/`nodesState()` including `setEdges`/`dispose`), `createXenolithGraph`, `XenolithActionReturn`, `XenolithActionAttributes`, `svelteEventName`. |
| `@xenolithengine/graph-solid` | `xenolith` directive (`use:xenolith`, typed via `JSX.Directives`; `on:ready` + kebab CustomEvents `on:node-click` — one colon, so Vite's dep scan can parse the JSX), `solidEventName`, `createXenolithStores` (signal bag: `setEditor`/`editor`/`nodes`/`edges`/`selection`/`viewport`/`graphJSON`/`undoRedo`/`nodesState()` including `setEdges`), `createXenolithGraph`. |
| `@xenolithengine/graph-angular` | `XenolithGraphService` (decorator-free DI service: `mount`/`destroy`/`editor`/`editor$`, store observables `nodes$`…`graphJSON$`, `canUndo$`/`canRedo$` + `undo`/`redo`, typed `on$('node:click')`, `nodesState()` with `setNodes` + `setEdges`), `XenolithNodesState`. No shipped component — bring-your-own host (Learn page recipe). |
| `@xenolithengine/graph-wc` | `XenolithGraphElement` (`<xenolith-graph>`: attributes `minimap`/`fit-on-load`/`disable-grid`/`resize-to-window`/`snap`; JS props `theme`/`graph`/`zoomBounds`/`isValidConnection`; `ready` event with the editor; all 25 events forwarded), `register(tag?)`, `FORWARDED_EVENTS` (= `EDITOR_EVENT_NAMES`), `readAttributes`. |

Adapter tiers, frozen as shipped. **Full** (mount, hooks, panels, widget bridge): React and Vue. **Svelte** matches that on the `./components` subpath, which needs Svelte 5; the runtime entry stays Svelte 4. **Mount + stores + controlled state** (panels via `editor.chrome`, no widget bridge): Solid and Angular. **Custom element** (events + `el.editor`, no hooks): the Web Component. Widget bridges are `reactWidget`, `vueWidget`, and `svelteWidget` only.

### Themes

| Package | Export |
|---|---|
| `@xenolithengine/graph-theme-xen` | `xenTheme` (default), `xenTokens`, `mergeTheme`. Fonts are declared on each theme (`theme.fonts: FontSpec[]`) and auto-loaded by the editor — Google Fonts CDN by default, opt-in self-host via `editor.fonts.selfHost({ 'Inter|400': '/url.woff2', ... })` or `XenolithEditor.init(host, { fontUrls: {...} })`. |
| `@xenolithengine/graph-theme-liquid-glass` | `liquidGlassTheme`. |

### Plugins

| Package | Stable surface |
|---|---|
| `@xenolithengine/graph-plugin-autolayout` | `autoLayoutPlugin(opts)` factory + sub-entries `@xenolithengine/graph-plugin-autolayout/dagre` and `/elk`. |

---

## Events (`editor.on(name, …)`)

All 25 events — every one available in every framework adapter (the `EDITOR_EVENT_NAMES`
list is exhaustiveness-checked against this set at build time):

| Event | Payload | Preventable |
|---|---|---|
| `node:added` | `{ node }` | — |
| `node:removed` | `{ nodeId }` | — |
| `node:removing` | `{ nodeId, cancel }` | ✓ |
| `node:moved` | `{ nodeId, position }` | — |
| `node:click` | `{ nodeId }` | — |
| `node:clicking` | `{ nodeId, cancel }` | ✓ |
| `node:drop` | `{ nodeId, files, text, items, position }` | — |
| `edge:connected` | `{ edge }` | — |
| `edge:disconnected` | `{ edgeId }` | — |
| `edge:connecting` | `{ edge, cancel }` | ✓ |
| `edge:disconnecting` | `{ edgeId, cancel }` | ✓ |
| `selection:changed` | `{ nodeIds }` | — |
| `viewport:changed` | `{ x, y, zoom }` | — |
| `widget:changed` | `{ nodeId, widgetId, value }` | — |
| `widget:action` | `{ nodeId, widgetId, action }` | — |
| `graph:loaded` | `{ nodeCount, edgeCount }` | — |
| `graph:changed` | `{ changes: GraphChanges }` | **Commit-time controlled protocol (ADR 0006)**: one coalesced change-array per transaction / undo-group commit / top-level command / undo-redo step; never per drag frame. Pair with `editor.applyChanges` / `reduceGraphChanges`. |
| `history:changed` | `{ canUndo, canRedo }` | — |
| `dive:changed` | `{ depth, definitionId }` | — |
| `sidebar:opened` | `{ nodeId }` | — |
| `sidebar:closed` | `{}` | — |
| `livemode:changed` | `{ live }` | — |
| `node:contextmenu` | `{ nodeId, screen, cancel }` | ✓ |
| `edge:contextmenu` | `{ edgeId, screen, cancel }` | ✓ |
| `canvas:contextmenu` | `{ screen, worldPosition, cancel }` | ✓ |

Preventable events accept `payload.cancel()` from a listener to abort the mutation **before** it
hits the command bus. Cancelling fires no follow-up event (no `node:removed` after a cancelled
`node:removing`).

---

## `@internal` — DO NOT depend on

The following exist at runtime today but are NOT part of the public contract. They are
**already stripped from the shipped `.d.ts`** (`stripInternal` is on in EVERY package, core
included since ADR 0008 — the editor bus reaches `Graph`'s stripped mutators through the
documented friend surface `Graph.internals()`, see the core section above). If you reach for
one, file an issue describing what you need — we'll likely promote the underlying capability
through a proper public method.

- `editor.app` — raw PIXI `Application`. Couples hosts to PIXI's major-version cadence. Use
  `editor.exportImage()` / `editor.chrome.overlayRoot` / `editor.setTheme(...)` instead.
- `editor.commandBus` — raw `CommandBus`. Dispatching commands directly bypasses preventable
  events (`node:removing`, `edge:connecting`, …). Use the public mutation API.
- `editor.graph` — raw `Graph`. Mutating through this skips the bus and breaks undo. Use
  `editor.getGraphReadonly()` for snapshots, `editor.graphNodes()`/`graphEdges()` for live
  iteration, and the command API for mutations.
- `editor.requestRender`, `editor.renderedNodePosition`, `editor.isNodeRendered`,
  `editor.renderedNodeCount` — renderer internals.
- `markPinInteractive`, `readPinHandle`, `clearGlowTextureCache`, `clearGradientCache` in
  `@xenolithengine/graph-render-pixi` — PIXI-internal helpers.

---

## Experimental

These surfaces exist publicly but may change shape before v1.0. Use them, but pin your version.

| Symbol | What's experimental |
|---|---|
| `@xenolithengine/graph-plugin-runtime` — `Runtime`, `attachRuntimeBridge`, `BUILTIN_PRIMITIVES` | Blueprint VM is in active development; backend swap (baked JS / JS codegen / AS-WASM) may rearrange exports. |
| `@xenolithengine/graph-runtime-as` | AssemblyScript-WASM codegen runtime — entire package experimental. |
| `@xenolithengine/graph-mcp-server` — tool catalog | The 26-tool surface (`TOOL_NAMES` in `packages/mcp-server/src/tools.ts`) is the catalog, but tool argument shapes may add fields under semver-minor. |
| `editor.connectMCP(url)` | The WS bridge protocol may add frames; existing frames stay backward-compatible. |
| `StepDebugger`, `StepExecutor`, `StepRecord`, `StepDebuggerStatus` | Step debugger primitive — used by showcases; the events array shape is still settling. |
| Touch / mobile interactions (`intent:long-press*`, `intent:gesture-*`) | The 5 gesture events on `InteractionManager` are public but may grow new ones (3-finger, pinch with rotation). |

---

## Version policy

- `v0.7.x` minor releases: bug fixes, new public methods, additive event types. No removals,
  no signature changes in the [Stable](#stable) section.
- `v0.8.x` and onward: additive only inside Stable; experimental sections may evolve freely.
- `v1.0`: the [`@internal`](#internal--do-not-depend-on) symbols above are removed from the public
  `.d.ts`. Experimental promotions become stable. Migration guide ships with the release.

If you depend on something not listed here and need it stable, open a discussion — we want the
real public surface and the documented one to match.
