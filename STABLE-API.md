# STABLE-API.md — v0.7 BETA

This document lists the public API surface that is **frozen for v0.7 BETA**. Anything in the
[Stable](#stable) section will not break in a minor release of v0.7.x; breaking changes to it
ship in a major (v1.0 onward) with a clear migration note.

Everything outside [Stable](#stable) is one of:

- **`@internal`** — exists at runtime, but lock-in we don't promise. Will be hidden from `.d.ts`
  before v1.0. Don't depend on it.
- **Experimental** — early surface that may change shape. Annotated below.

If you find a public method that isn't listed here, treat it as `@internal` until proven
otherwise. File an issue and we'll classify it.

---

## Stable

### `@xenolith/core`

| Symbol | Notes |
|---|---|
| `Graph` class | Read-only — host shouldn't mutate directly. |
| `Selection` class | |
| `NodeRegistry`, `TypeRegistry` | Register / unregister / list. |
| `EventEmitter`, `Unsubscribe` | |
| Commands: `AddNode`, `RemoveNode`, `ConnectPins`, `DisconnectEdge`, `MoveNode`, `SetNodeState`, `SetNodePins`, `SetNodeWidgets` | The atomic mutation set. Other commands exist (macros, templates) — those are stable too but listed in their respective module sections below. |
| `CommandBus` (read interface) | `apply`, `undo`, `redo`, `canUndo`, `canRedo`, `transaction`, `clearHistory`. |
| Types: `Node`, `Edge`, `Pin`, `NodeId`, `EdgeId`, `PinId`, `NodeGlyph`, `Vec2`, `Unsubscribe` | |
| Traversal: `topoOrder`, `reachableFrom`, `descendantsOf`, `ancestorsOf` | |
| ID minters: `createNodeId`, `createEdgeId`, `createPinId`, `pinId`, `createCommentId` | |
| `defaultWidgetValue`, `comboOptions`, `clampWidgetValue` | |
| Template helpers: `isTemplateInstance`, `isTemplateBoundary`, `getTemplateBoundary` | |
| Macro helpers: `isMacro`, `createMacro`, `macroMembers`, `flattenMacroProxies` | |
| Reroute: `isReroute`, `createReroute`, `REROUTE_NODE_TYPE` | |

### `@xenolith/editor`

The `XenolithEditor` class is the main entry point. The **namespaces** below are the canonical
v0.7 surface — flat methods on the class root (`editor.fitView`, `editor.undo`, …) still work
but are deprecated and will be removed in v1.0.

| Stable | Notes |
|---|---|
| `XenolithEditor.init(target, opts)` → `Promise<XenolithEditor>` | Mount the editor. |
| `editor.destroy()`, `editor.isDestroyed` | |
| `editor.on(event, handler)` → `Unsubscribe` | The 24 public events listed below. |
| `editor.loadJSON(data: unknown)`, `editor.toJSON()`, `editor.getGraphReadonly()` | Same data — `getGraphReadonly` is the new name. |
| `editor.addNode`, `editor.removeNode`, `editor.moveNode`, `editor.connect`, `editor.disconnect`, `editor.addEdge`, `editor.disconnectEdge`, `editor.deleteEdge`, `editor.setSelection`, `editor.clear` | Mutation API — every call goes through the bus, fires events, undoable. |
| `editor.setNodeStatus`, `editor.clearNodeStatuses` | |
| `editor.addComment`, `editor.removeComment`, `editor.setCommentText`, `editor.setCommentColor` | |
| `editor.createMacroFromSelection`, `editor.ungroupMacro`, `editor.expandMacro`, `editor.collapseMacro` | |
| `editor.createTemplateFromSelection`, `editor.renameTemplate`, `editor.unpackTemplateInstance`, `editor.convertTemplateInstanceToMacro`, `editor.convertMacroToTemplate`, `editor.diveInto`, `editor.diveOut`, `editor.diveDepth`, `editor.definitions` | |
| `editor.registerWidget(name, controller)`, `editor.setWidgetValue`, `editor.getWidgetValue`, `editor.setPinLiveValueProvider`, `editor.setNodeGlyph` | |
| `editor.exportJSON()`, `editor.exportImage(opts)`, `editor.exportNodeImage(id, opts)` | |
| `editor.setTheme(theme)`, `editor.theme`, `editor.tokens`, `editor.setCategoryPalette`, `editor.setEdgeOptions`, `editor.setEdgeAnimated` | |
| `editor.openPalette(screen?)`, `editor.closePalette`, `editor.isPaletteOpen`, `editor.insertNode`, `editor.insertRerouteOnEdge`, `editor.setPaletteSidebar` | |
| `editor.openSidebar(nodeId)`, `editor.closeSidebar`, `editor.isSidebarOpen`, `editor.refreshSidebar` | |
| `editor.setBreadcrumbVisible(v)` | |
| `editor.setInteractive(v)`, `editor.interactive`, `editor.setLiveMode(v)`, `editor.liveMode` | |
| `editor.setIsValidConnection(predicate)` | |
| `editor.connectMCP(url)` | |
| **Namespaces:** | |
| `editor.view.{pan, zoomAt, resetView, fitView, setViewport, state, screenToWorld, worldToScreen, lastPointerWorld}` | Viewport. |
| `editor.history.{undo, redo, canUndo, canRedo, clear}` | Undo/redo + history. |
| `editor.clipboard.{copy, paste, duplicate, selectAll, deleteSelection}` | Clipboard ops. |
| `editor.chrome.{setControls, setMinimapVisible, setMinimapPosition, setStatsVisible, toggleStats, showOverlay, hideOverlay, withOverlay, enterFullscreen, exitFullscreen, toggleFullscreen, isFullscreen, overlayRoot, setBreadcrumbVisible}` | UI chrome. |
| **Registries:** | |
| `editor.registry` — `NodeRegistry` | Register / unregister node types. |
| `editor.types` — `TypeRegistry` | Pin types + conversions. |
| `editor.commands` — `CommandRegistry` | Named commands + hotkeys. |
| `editor.icons` — `IconRegistry` | Header glyphs. |
| `editor.contextMenu` — `ContextMenuRegistry` | Plugin context-menu items. |
| `editor.selection` — `Selection` | |
| `editor.definitions` — template definitions | |
| **24 public events** | Bus is `editor.on(name, handler)`. See [Events](#events) below. |
| `editor.use(plugin)` — `PluginHost.use` | Mount a plugin. |
| `parseXenolithGraph`, `serializeXenolithGraph`, `XENOLITH_GRAPH_VERSION` + `XenolithGraphV1` / `XenolithNodeV1` / `XenolithEdgeV1` / `XenolithPinV1` types | |
| `Commands` const namespace + `CommandSpec` | |
| `ContextMenuRegistry`, `ContextMenuItemSpec`, `ContextMenuTarget` | |
| `EditorEvents`, `PreventablePayload` | |
| `BUILTIN_RECIPES`, `createRecipeRegistry`, `instantiateRecipe`, `RecipeDef`, `RecipeNodeDef`, `RecipeEdgeDef`, `RecipeRegistry` | |
| `diffGraphs`, `GraphDiff` | |

### `@xenolith/adapter-core`

| Symbol | Notes |
|---|---|
| `createEditorBinding(target, props)` | Primitive every framework adapter builds on. |
| `EditorBinding`: `editor`, `on`, `setProps`, `destroy` | |
| `EDITOR_EVENT_NAMES` const | 24 entries — drives every adapter's event-prop derivation. Compile-time exhaustiveness checked against `EditorEvents`. |
| `XenolithProps`, `applyProps`, `EditorLike` | |

### `@xenolith/render-pixi`

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
| `@xenolith/react` | `<XenolithGraph>`, `<XenolithPanel>`, `<XenolithButton>`, `<XenolithControls>`, `<XenolithMiniMap>`; hooks `useEditor` / `useXenolithEditor` / `useNodes` / `useEdges` / `useSelection` / `useViewport` / `useGraphJSON` / `useUndoRedo` / `useEditorEvent` / `useXenolith`; `reactWidget`; `WidgetProps`, `XenolithContext`, `EVENT_PROP`. |
| `@xenolith/vue` | `<XenolithGraph>` (with `@ready`); composables `useEditor` / `useEditorOrNull` / `useEditorReady` / `useEditorEvent` / `useNodes` / `useEdges` / `useSelection` / `useViewport` / `useGraphJSON` / `useUndoRedo`; in-editor components `XenolithPanel` / `XenolithButton` / `XenolithControls` / `XenolithMiniMap`; `vueWidget`, `WidgetProps`, `XenolithEditorKey`. |
| `@xenolith/svelte` | `xenolith` action, `createXenolithGraph`, `XenolithActionReturn`, `svelteEventName`. |
| `@xenolith/solid` | `xenolith` directive, `createXenolithGraph`. |
| `@xenolith/angular` | `XenolithGraphComponent`, standalone. |
| `@xenolith/wc` | `XenolithGraphElement`, `register(tag?)`, `FORWARDED_EVENTS`, `readAttributes`. |

### Themes

| Package | Export |
|---|---|
| `@xenolith/theme-xen` | `xenTheme` (default), `xenTokens`, `loadXenFonts`, `mergeTheme`. |
| `@xenolith/theme-liquid-glass` | `liquidGlassTheme`. |
| `@xenolith/theme-holographic` | `holographicTheme`. |
| `@xenolith/theme-synthwave` | `synthwaveTheme`. |

### Plugins

| Package | Stable surface |
|---|---|
| `@xenolith/plugin-autolayout` | `autoLayoutPlugin(opts)` factory + sub-entries `@xenolith/plugin-autolayout/dagre` and `/elk`. |

---

## Events (`editor.on(name, …)`)

All 24 events — every one available in every framework adapter (the `EDITOR_EVENT_NAMES`
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

The following exist at runtime today but are NOT part of the public contract. They will be
hidden from typings before v1.0. If you reach for one, file an issue describing what you need —
we'll likely promote the underlying capability through a proper public method.

- `editor.app` — raw PIXI `Application`. Couples hosts to PIXI's major-version cadence. Use
  `editor.exportImage()` / `editor.chrome.overlayRoot` / `editor.setTheme(...)` instead.
- `editor.commandBus` — raw `CommandBus`. Dispatching commands directly bypasses preventable
  events (`node:removing`, `edge:connecting`, …). Use the public mutation API.
- `editor.graph` — raw `Graph`. Mutating through this skips the bus and breaks undo. Use
  `editor.getGraphReadonly()` for snapshots and the command API for mutations.
- `editor.requestRender`, `editor.renderedNodePosition`, `editor.isNodeRendered`,
  `editor.renderedNodeCount`, `editor.setEdgeOptions` (mutator) — renderer internals.
- `markPinInteractive`, `readPinHandle`, `clearGlowTextureCache`, `clearGradientCache` in
  `@xenolith/render-pixi` — PIXI-internal helpers.

---

## Experimental

These surfaces exist publicly but may change shape before v1.0. Use them, but pin your version.

| Symbol | What's experimental |
|---|---|
| `@xenolith/plugin-runtime` — `Runtime`, `attachRuntimeBridge`, `BUILTIN_PRIMITIVES` | Blueprint VM is in active development; backend swap (baked JS / JS codegen / AS-WASM) may rearrange exports. |
| `@xenolith/runtime-as` | AssemblyScript-WASM codegen runtime — entire package experimental. |
| `@xenolith/mcp-server` — tool catalog | The 24-tool surface is stable, but tool argument shapes may add fields under semver-minor. |
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
