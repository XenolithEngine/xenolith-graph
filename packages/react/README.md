# @xenolithengine/graph-react

[![BETA](https://img.shields.io/badge/status-BETA-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph#status)
[![MIT](https://img.shields.io/badge/license-MIT-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph/blob/main/LICENSE)

React adapter for XenolithGraph — `<XenolithGraph>` component, `useEditor` / `useNodes` / `useEdges` hooks, in-editor panels.

> **Beta** — public API in `STABLE-API.md` is the surface we plan to freeze, but it is **NOT frozen yet** — breaking changes can land at any point before v1.0. If you adopt now, pin an exact version.

Part of [XenolithGraph](https://github.com/XenolithEngine/xenolith-graph) — an AI-native, embeddable node-graph editor for the web with its own visual design language (Xen).

## Install

```bash
pnpm add @xenolithengine/graph-react pixi.js
```

Peer deps: `react >= 18`, `react-dom >= 18`, `pixi.js@^8.6.0`. WebGL/client-only — render the component only in the browser (the entry is marked `'use client'` for Next.js App Router).

## Usage

```tsx
import { XenolithGraph, XenolithControls, XenolithMiniMap } from '@xenolithengine/graph-react'

export function Editor() {
  return (
    <XenolithGraph
      style={{ width: '100%', height: '100vh' }}
      graph={savedGraph}
      minimap
      onNodeClick={({ nodeId }) => console.log(nodeId)}
      onSelectionChange={({ nodeIds }) => console.log(nodeIds)}
      onReady={(editor) => editor.fitView()}
    >
      <XenolithControls position="bottom-left" />
      <XenolithMiniMap position="bottom-right" />
    </XenolithGraph>
  )
}
```

## What's exported

- `<XenolithGraph>` — main component (props extend `XenolithProps` + `EventCallbacks`)
- In-editor panels: `<XenolithPanel>`, `<XenolithButton>`, `<XenolithControls>`, `<XenolithMiniMap>`
- Hooks: `useEditor`, `useXenolithEditor`, `useNodes`, `useEdges`, `useSelection`, `useViewport`, `useGraphJSON`, `useEditorEvent`, `useUndoRedo`
- Lower-level: `useXenolith(hostRef, props)`, `XenolithContext`, `EVENT_PROP`
- Custom widgets: `reactWidget`, `WidgetProps`

## Docs

- [React guide](https://xenolithengine.github.io/xenolith-graph/guides/react/)
- [API reference](https://xenolithengine.github.io/xenolith-graph/guides/api/) — every method exposed by `XenolithEditor`
- [GitHub](https://github.com/XenolithEngine/xenolith-graph)

MIT © XenolithEngine
