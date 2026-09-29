# @xenolithengine/graph-svelte

[![BETA](https://img.shields.io/badge/status-BETA-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph#status)
[![MIT](https://img.shields.io/badge/license-MIT-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph/blob/main/LICENSE)

Svelte adapter for XenolithGraph — the `use:xenolith` action.

> **Beta** — public API in `STABLE-API.md` is the surface we plan to freeze, but it is **NOT frozen yet** — breaking changes can land at any point before v1.0. If you adopt now, pin an exact version.

Part of [XenolithGraph](https://github.com/XenolithEngine/xenolith-graph) — an AI-native, embeddable node-graph editor for the web with its own visual design language (Xen).

## Install

```bash
pnpm add @xenolithengine/graph-svelte pixi.js
```

Peer deps: `svelte >= 4`, `pixi.js@^8.6.0`. WebGL/client-only.

## Usage

```svelte
<script lang="ts">
  import { xenolith } from '@xenolithengine/graph-svelte'
  import savedGraph from './graph.json'

  const props = { graph: savedGraph, minimap: true }

  function onNodeClick(e: CustomEvent) { console.log(e.detail.nodeId) }
</script>

<div
  use:xenolith={props}
  on:node-click={onNodeClick}
  on:selection-changed={(e) => console.log(e.detail)}
  style="width: 100%; height: 100vh;"
></div>
```

Editor events are re-dispatched as kebab-named `CustomEvent`s off the host node (`node:click` → `on:node-click`, `edge:connected` → `on:edge-connected`, …).

## What's exported

- `xenolith` — the Svelte action: `use:xenolith={props}`; dispatches `on:ready` (detail: the `XenolithEditor`) once mounted
- `createXenolithStores()` — per-editor bag of reactive stores: `editor` (writable), `nodes`, `edges`, `selection`, `viewport`, `graphJSON`, `undoRedo`, and the controlled triple `nodesState()` (commit-time mirror + one-undo-step `setNodes`); `dispose()` unsubscribes
- `createXenolithEditorContext()` / `getXenolithEditorContext()` / `XenolithEditorContextKey` — Svelte context wiring for the panel components
- `createXenolithGraph(el, props)` — imperative primitive returning an `EditorBinding`
- `svelteEventName(event)` — colon → kebab name translation
- `XenolithActionReturn` / `XenolithActionAttributes` — action typing; `on:*` handlers carry typed payloads (derived from `EditorEvents`, surfaced by svelte-check)

From `@xenolithengine/graph-svelte/components` (Svelte 5; compiled by your build — the package ships source):

- `XenolithPanel` (portal into `editor.chrome.overlayRoot`, six anchors, `bare`), `XenolithButton` (themed, `active`), `XenolithControls`, `XenolithMiniMap`, `XenolithProposalQueue` — declarative chrome toggles with cleanup on unmount
- `svelteWidget(Component)` + `WidgetProps` — bridge a Svelte component into a custom node widget (mounts once, updates stream via a props store)

## Docs

- [Svelte guide](https://graph.xenolith.studio/guides/svelte/) — action, stores, controlled state
- [SvelteKit integration](https://graph.xenolith.studio/integrations/sveltekit/)
- [API reference](https://graph.xenolith.studio/guides/api/) — every method exposed by `XenolithEditor`
- [GitHub](https://github.com/XenolithEngine/xenolith-graph)

MIT © XenolithEngine
