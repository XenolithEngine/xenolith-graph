# @xenolithengine/graph-vue

[![BETA](https://img.shields.io/badge/status-BETA-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph#status)
[![MIT](https://img.shields.io/badge/license-MIT-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph/blob/main/LICENSE)

Vue 3 adapter for XenolithGraph — `<XenolithGraph>` component + composables.

> **Beta** — public API in `STABLE-API.md` is the surface we plan to freeze, but it is **NOT frozen yet** — breaking changes can land at any point before v1.0. If you adopt now, pin an exact version.

Part of [XenolithGraph](https://github.com/XenolithEngine/xenolith-graph) — an AI-native, embeddable node-graph editor for the web with its own visual design language (Xen).

## Install

```bash
pnpm add @xenolithengine/graph-vue pixi.js
```

Peer deps: `vue@^3.4.0`, `pixi.js@^8.6.0`. WebGL/client-only.

## Usage

```vue
<script setup lang="ts">
import { XenolithGraph, XenolithControls, XenolithMiniMap } from '@xenolithengine/graph-vue'
import savedGraph from './graph.json'

const onReady = (editor) => editor.fitView()
</script>

<template>
  <XenolithGraph
    :graph="savedGraph"
    :minimap="true"
    @ready="onReady"
    @node-click="({ nodeId }) => console.log(nodeId)"
  >
    <XenolithControls position="bottom-left" />
    <XenolithMiniMap position="bottom-right" />
  </XenolithGraph>
</template>
```

## What's exported

- `<XenolithGraph>` — Vue 3 component (props: `theme`, `graph`, `zoomBounds`, `minimap`, `disableGrid`, `snap`, `resizeToWindow`, `fitOnLoad`, `isValidConnection`; typed object-form emits — camelCase versions of every editor event plus `ready`, payloads visible to vue-tsc/Volar)
- In-editor panels: `<XenolithPanel>`, `<XenolithButton>`, `<XenolithControls>`, `<XenolithMiniMap>`
- Composables: `useEditor`, `useEditorOrNull`, `useEditorReady`, `useEditorEvent`, `useXenolithGraph` (headless mount), `useNodes`, `useEdges`, `useSelection`, `useViewport`, `useGraphJSON`, `useUndoRedo`, `useNodesState` (controlled state — commit-time mirror + one-undo-step `setNodes` / `setEdges`)
- `XenolithEditorKey` — Vue injection key (for hand-rolled `provide`/`inject`)
- Custom widgets: `vueWidget`, `WidgetProps`

## Docs

- [Vue guide](https://graph.xenolith.studio/guides/vue/)
- [API reference](https://graph.xenolith.studio/guides/api/) — every method exposed by `XenolithEditor`
- [GitHub](https://github.com/XenolithEngine/xenolith-graph)

MIT © XenolithEngine
