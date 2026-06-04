# @xenolith/core

[![BETA](https://img.shields.io/badge/status-BETA-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph#status)
[![MIT](https://img.shields.io/badge/license-MIT-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph/blob/main/LICENSE)

Headless graph model, type system, command bus, and event emitter for XenolithGraph. Zero runtime dependencies.

> **Beta** — public API in `STABLE-API.md` is frozen for v0.7; some corners may still change before v1.0.

Part of [XenolithGraph](https://github.com/XenolithEngine/xenolith-graph) — an AI-native, embeddable node-graph editor for the web with its own visual design language (Xen).

## Install

```bash
pnpm add @xenolith/core
```

Zero runtime dependencies. Pure ESM, TypeScript-first.

## Usage

```ts
import { Graph, CommandBus, AddNode, ConnectPins, createNodeId } from '@xenolith/core'

const graph = new Graph()
const bus = new CommandBus({ graph })

const a = createNodeId()
const b = createNodeId()

bus.apply(new AddNode({ id: a, type: 'math.add', position: { x: 0, y: 0 }, pins: [] }))
bus.apply(new AddNode({ id: b, type: 'math.mul', position: { x: 200, y: 0 }, pins: [] }))

bus.undo()  // removes b
bus.redo()  // re-adds b
```

## What's exported

- `Graph` — node/edge/comment store; `Node`, `Edge`, `Pin`, `Comment` types
- `CommandBus` + commands: `AddNode`, `RemoveNode`, `ConnectPins`, `DisconnectEdge`, `MoveNode`, `ResizeNode`, `SetNodeState`, `SetNodePins`, `SetNodeWidgets`, `AddComment`, `RemoveComment`, `MoveComment`, `ResizeComment`, `SetCommentText`
- `Selection` — selection model with `SelectionMode`
- `NodeRegistry`, `TypeRegistry` — schemas + type compatibility
- Traversal: `incomers`, `outgoers`, `topoOrder`, `wouldCreateCycle`, `reachableFrom`, `connectedEdges`, `roots`, `leaves`
- Templates & macros: `MACRO_TYPE`, `createMacro`, `planMacroCollapse`, `planMacroExpand`, `templateInterface`, `materializeInterface`, `planTemplateExtraction`, `planTemplateUnpack`, `flattenTemplateInstance`
- Widgets: `defaultWidgetValue`, `widgetValue`, `clampWidgetValue`, `widgetIsVisible`; `WidgetSpec`, `WidgetType`
- `EventEmitter`, `fuzzyMatch`, ID helpers (`createNodeId`, `createEdgeId`, `createPinId`, `createCommentId`, `createTypeId`, `isUuidV7`)

## Docs

- [Full guide](https://xenolithengine.github.io/xenolith-graph/guides/api/) — top-level architecture
- [API reference](https://xenolithengine.github.io/xenolith-graph/guides/api/) — every method exposed by `XenolithEditor`
- [GitHub](https://github.com/XenolithEngine/xenolith-graph)

MIT © XenolithEngine
