# @xenolithengine/vue

[![BETA](https://img.shields.io/badge/status-BETA-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph#status)
[![MIT](https://img.shields.io/badge/license-MIT-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph/blob/main/LICENSE)

Vue 3 adapter for XenolithGraph — `<XenolithGraph>` component + composables.

> **Beta** — public API in `STABLE-API.md` is the surface we plan to freeze, but it is **NOT frozen yet** — breaking changes can land at any point before v1.0. If you adopt now, pin an exact version.

Part of [XenolithGraph](https://github.com/XenolithEngine/xenolith-graph) — an AI-native, embeddable node-graph editor for the web with its own visual design language (Xen).

## Install

```bash
pnpm add @xenolithengine/vue pixi.js
```

Peer deps: `vue@^3.4.0`, `pixi.js@^8.6.0`. WebGL/client-only.

## Usage

```vue
<script setup lang="ts">
import { XenolithGraph, XenolithControls, XenolithMiniMap } from '@xenolithengine/vue'
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

- `<XenolithGraph>` — Vue 3 component (props: `theme`, `graph`, `zoomBounds`, `minimap`, `disableGrid`, `snap`, `resizeToWindow`, `fitOnLoad`; emits camelCase versions of every editor event plus `ready`)
- In-editor panels: `<XenolithPanel>`, `<XenolithButton>`, `<XenolithControls>`, `<XenolithMiniMap>`
- Composables: `useEditor`, `useEditorOrNull`, `useEditorReady`, `useEditorEvent`, `useNodes`, `useEdges`, `useSelection`, `useViewport`, `useGraphJSON`, `useUndoRedo`
- `XenolithEditorKey` — Vue injection key (for hand-rolled `provide`/`inject`)
- Custom widgets: `vueWidget`, `WidgetProps`

## Docs

- [Vue guide](https://xenolithengine.github.io/xenolith-graph/guides/vue/)
- [API reference](https://xenolithengine.github.io/xenolith-graph/guides/api/) — every method exposed by `XenolithEditor`
- [GitHub](https://github.com/XenolithEngine/xenolith-graph)

MIT © XenolithEngine
