# @xenolith/svelte

[![BETA](https://img.shields.io/badge/status-BETA-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph#status)
[![MIT](https://img.shields.io/badge/license-MIT-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph/blob/main/LICENSE)

Svelte adapter for XenolithGraph — the `use:xenolith` action.

> **Beta** — public API in `STABLE-API.md` is frozen for v0.7; some corners may still change before v1.0.

Part of [XenolithGraph](https://github.com/XenolithEngine/xenolith-graph) — an AI-native, embeddable node-graph editor for the web with its own visual design language (Xen).

## Install

```bash
pnpm add @xenolith/svelte pixi.js
```

Peer deps: `svelte >= 4`, `pixi.js@^8.6.0`. WebGL/client-only.

## Usage

```svelte
<script lang="ts">
  import { xenolith } from '@xenolith/svelte'
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

- `xenolith` — the Svelte action: `use:xenolith={props}`
- `createXenolithGraph(el, props)` — imperative primitive returning an `EditorBinding`
- `svelteEventName(event)` — colon → kebab name translation
- `XenolithActionReturn` — action return shape (`{ update, destroy }`)

## Docs

- [SvelteKit integration](https://xenolithengine.github.io/xenolith-graph/integrations/sveltekit/)
- [API reference](https://xenolithengine.github.io/xenolith-graph/guides/api/) — every method exposed by `XenolithEditor`
- [GitHub](https://github.com/XenolithEngine/xenolith-graph)

MIT © XenolithEngine
