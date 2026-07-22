# @xenolithengine/graph-solid

[![BETA](https://img.shields.io/badge/status-BETA-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph#status)
[![MIT](https://img.shields.io/badge/license-MIT-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph/blob/main/LICENSE)

Solid adapter for XenolithGraph — the `use:xenolith` directive.

> **Beta** — public API in `STABLE-API.md` is the surface we plan to freeze, but it is **NOT frozen yet** — breaking changes can land at any point before v1.0. If you adopt now, pin an exact version.

Part of [XenolithGraph](https://github.com/XenolithEngine/xenolith-graph) — an AI-native, embeddable node-graph editor for the web with its own visual design language (Xen).

## Install

```bash
pnpm add @xenolithengine/graph-solid pixi.js
```

Peer deps: `solid-js >= 1.8`, `pixi.js@^8.6.0`. WebGL/client-only.

## Usage

```tsx
import { xenolith } from '@xenolithengine/graph-solid'
import savedGraph from './graph.json'

// Re-import is required for Solid to pick up the directive in JSX.
xenolith

export function Editor() {
  const props = () => ({ graph: savedGraph, minimap: true })
  return (
    <div
      use:xenolith={props()}
      on:node:click={(e) => console.log(e.detail.nodeId)}
      on:selection:changed={(e) => console.log(e.detail)}
      style="width: 100%; height: 100vh"
    />
  )
}
```

Editor events are re-dispatched as same-named `CustomEvent`s — Solid's `on:` binds colon names directly.

## What's exported

- `xenolith` — the Solid directive (`use:xenolith={props}`)
- `createXenolithGraph(el, props)` — imperative primitive returning an `EditorBinding`

## Docs

- [API reference](https://graph.xenolith.studio/guides/api/) — every method exposed by `XenolithEditor`
- [GitHub](https://github.com/XenolithEngine/xenolith-graph)

MIT © XenolithEngine
