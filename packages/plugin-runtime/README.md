# @xenolithengine/plugin-runtime

[![BETA](https://img.shields.io/badge/status-BETA-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph#status)
[![MIT](https://img.shields.io/badge/license-MIT-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph/blob/main/LICENSE)

Blueprint-style node runtime for XenolithGraph: typed exec/data primitives + a headless interpreter that runs a graph as a simulation. Installs as an editor plugin.

> **Experimental** — runtime APIs (`Runtime`, `codegen`, `RtGraph`) may still evolve before v1.0. The editor-plugin surface (`runtimePlugin`, schemas) tracks the v0.7 BETA freeze.

Part of [XenolithGraph](https://github.com/XenolithEngine/xenolith-graph) — an AI-native, embeddable node-graph editor for the web with its own visual design language (Xen).

## Install

```bash
pnpm add @xenolithengine/plugin-runtime
```

## Usage

Register primitives + pin types into an editor:

```ts
import { XenolithEditor } from '@xenolithengine/editor'
import { runtimePlugin, attachRuntimeBridge } from '@xenolithengine/plugin-runtime'

const editor = await XenolithEditor.init('#graph')
editor.use(runtimePlugin)
attachRuntimeBridge(editor)        // drives the live graph + mirrors outputs into widgets
```

Headless VM (no editor):

```ts
import { Runtime, BUILTIN_PRIMITIVES, type RtGraph } from '@xenolithengine/plugin-runtime'

const rt = new Runtime(BUILTIN_PRIMITIVES)
rt.setVar('x', 3)
rt.tick(myRtGraph)
console.log(rt.getVar('result'))
```

## What's exported

- `runtimePlugin` — install into an editor with `editor.use(runtimePlugin)`
- `attachRuntimeBridge(editor)` — drives the live graph from the editor and mirrors Output values to widgets
- `Runtime` — headless interpreter (`tick`, `getVar`, `setVar`, `onAfterTick`)
- `codegen(graph, defs)` — emits a compiled JS evaluator from an `RtGraph`
- `Allocate`, `mandelbrotPixelGraph`, `mandelbrotPixelReference` — reference graphs / nodes for benchmarks
- `BUILTIN_PRIMITIVES`, `COLLECTION_PRIMITIVES`, `domainNodes`
- Schemas: `PIN_TYPES`, `PRIMITIVE_SCHEMAS`, `PRIMITIVE_CATEGORY_COLORS`, `PRIMITIVE_ICONS`
- Schema-sync helpers: `pinsFromSchemaFields`, `widgetsFromSchemaFields`, `schemaPinTypeFor`
- Value coercion: `asNumber`, `asBool`, `asArray`
- Types: `NodeDef`, `RtNode`, `RtPin`, `RtEdge`, `RtGraph`, `PureIO`, `ExecIO`, `VmValue`

## Docs

- [API reference](https://xenolithengine.github.io/xenolith-graph/guides/api/) — every method exposed by `XenolithEditor`
- [GitHub](https://github.com/XenolithEngine/xenolith-graph)

MIT © XenolithEngine
