# @xenolith/editor

[![BETA](https://img.shields.io/badge/status-BETA-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph#status)
[![MIT](https://img.shields.io/badge/license-MIT-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph/blob/main/LICENSE)

XenolithGraph editor — composes the headless core, the PIXI renderer, interaction, and plugins into a usable editor. This is the package vanilla hosts always reach for.

> **Beta** — public API in `STABLE-API.md` is frozen for v0.7; some corners may still change before v1.0.

Part of [XenolithGraph](https://github.com/XenolithEngine/xenolith-graph) — an AI-native, embeddable node-graph editor for the web with its own visual design language (Xen).

## Install

```bash
pnpm add @xenolith/editor pixi.js
```

`pixi.js@^8.6.0` is a peer dependency.

## Usage

```ts
import { XenolithEditor } from '@xenolith/editor'

const editor = await XenolithEditor.init('#graph', {
  minimap: true,
  controls: true,
  snap: 8,
})

editor.loadJSON(savedGraph)        // xenolith.v1 format
editor.fitView()

editor.on('node:click', ({ nodeId }) => console.log(nodeId))
editor.on('edge:connecting', (p)  => { if (forbidden(p)) p.cancel() })

// namespaced API (v0.7 BETA)
editor.history.undo()
editor.view.fitView({ padding: 80 })
editor.clipboard.copy()
```

## What's exported

- `XenolithEditor` — `init(target, opts)`, `loadJSON`, `toJSON`/`getGraphReadonly`, `on/off`, `setTheme`, `destroy`, plus the namespaces `view`, `history`, `clipboard`, `chrome`
- `XenolithEditorOptions`, `ConnectionRequest`, `NodeStatus`, `GraphSnapshot`
- `parseXenolithGraph`, `serializeXenolithGraph`, `XENOLITH_GRAPH_VERSION` + `xenolith.v1` types (`XenolithGraphV1`, `XenolithNodeV1`, …)
- `CommandRegistry`, `Commands`, `ContextMenuRegistry`, `SidebarManager`
- `StepDebugger`, `diffGraphs` + `GraphDiff` types
- `PluginHost`, `XenolithPlugin`, `PluginContext`
- Recipes: `BUILTIN_RECIPES`, `createRecipeRegistry`, `instantiateRecipe`
- Event types: `EditorEvents`, `PreventablePayload`

## Docs

- [Quickstart guide](https://xenolithengine.github.io/xenolith-graph/guides/quickstart/)
- [API reference](https://xenolithengine.github.io/xenolith-graph/guides/api/) — every method exposed by `XenolithEditor`
- [GitHub](https://github.com/XenolithEngine/xenolith-graph)

MIT © XenolithEngine
