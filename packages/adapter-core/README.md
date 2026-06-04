# @xenolith/adapter-core

[![BETA](https://img.shields.io/badge/status-BETA-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph#status)
[![MIT](https://img.shields.io/badge/license-MIT-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph/blob/main/LICENSE)

Framework-agnostic binding for XenolithGraph — mount, reactive props, events. Foundation for the Web Component and React / Vue / Svelte / Solid / Angular adapters.

> **Beta** — public API in `STABLE-API.md` is frozen for v0.7; some corners may still change before v1.0.

Part of [XenolithGraph](https://github.com/XenolithEngine/xenolith-graph) — an AI-native, embeddable node-graph editor for the web with its own visual design language (Xen).

Most application hosts should use `@xenolith/editor` (vanilla) or one of the framework adapters. This package is the primitive every adapter is built on; reach for it only if you're writing a new adapter.

## Install

```bash
pnpm add @xenolith/adapter-core
```

Peer dependency: `pixi.js@^8.6.0`.

## Usage

```ts
import { createEditorBinding } from '@xenolith/adapter-core'

const binding = await createEditorBinding('#graph', {
  theme: 'xen',
  graph: someGraphJson,
  fitOnLoad: true,
})

const off = binding.on('node:click', (p) => console.log('clicked', p))

binding.setProps({ theme: 'liquid-glass' })  // diffed; only changed refs touch the editor

// later
off()
binding.destroy()
```

## What's exported

- `createEditorBinding(target, props)` — async; resolves to an `EditorBinding`
- `EditorBinding` — `{ editor, on, setProps, destroy }`
- `XenolithProps` — the canonical props shape consumed by every adapter
- `applyProps`, `EditorLike` — for hand-rolled reconciliation
- `EDITOR_EVENT_NAMES` — the canonical event-name list every adapter derives its idiomatic surface from

## Docs

- [Full guide](https://xenolithengine.github.io/xenolith-graph/guides/api/)
- [API reference](https://xenolithengine.github.io/xenolith-graph/guides/api/) — every method exposed by `XenolithEditor`
- [GitHub](https://github.com/XenolithEngine/xenolith-graph)

MIT © XenolithEngine
