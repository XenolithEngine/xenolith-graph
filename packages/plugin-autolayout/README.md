# @xenolithengine/graph-plugin-autolayout

[![BETA](https://img.shields.io/badge/status-BETA-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph#status)
[![MIT](https://img.shields.io/badge/license-MIT-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph/blob/main/LICENSE)

Auto-layout plugin for XenolithGraph. Engine-agnostic: bring your own layout backend (dagre / elkjs / custom) via the `LayoutEngine` interface.

> **Beta** — public API in `STABLE-API.md` is the surface we plan to freeze, but it is **NOT frozen yet** — breaking changes can land at any point before v1.0. If you adopt now, pin an exact version.

Part of [XenolithGraph](https://github.com/XenolithEngine/xenolith-graph) — an AI-native, embeddable node-graph editor for the web with its own visual design language (Xen).

## Install

```bash
pnpm add @xenolithengine/graph-plugin-autolayout dagre
# or
pnpm add @xenolithengine/graph-plugin-autolayout elkjs
```

Optional peer deps: `dagre@^0.8.5` (lighter, layered DAGs) **or** `elkjs@^0.9 || ^0.10 || ^0.11` (nested layouts, orthogonal routing, 9 algorithms). Install whichever backend you reach for; both engines lazy-load.

## Usage

```ts
import { autoLayoutPlugin } from '@xenolithengine/graph-plugin-autolayout'
import { dagreEngine } from '@xenolithengine/graph-plugin-autolayout/dagre'

const layout = autoLayoutPlugin({ engine: dagreEngine({ rankdir: 'LR' }) })
editor.use(layout)

await layout.arrange({ direction: 'LR', animate: { durationMs: 280 } })
```

ELK variant — same shape:

```ts
import { elkEngine } from '@xenolithengine/graph-plugin-autolayout/elk'

const layout = autoLayoutPlugin({ engine: elkEngine({ algorithm: 'layered' }) })
editor.use(layout)
await layout.arrange()
```

`arrange()` commits all moves in a single undo step. Optional animated tween bypasses the command bus per frame and commits the final positions once.

## What's exported

- `autoLayoutPlugin(config)` → `AutoLayoutPlugin` with `arrange(opts?)`
- `AutoLayoutConfig`, `AutoLayoutPlugin`
- `LayoutEngine`, `LayoutGraph`, `LayoutNode`, `LayoutEdge`, `LayoutOpts`, `LayoutResult`
- Subpath `@xenolithengine/graph-plugin-autolayout/dagre` → `dagreEngine`, `DagreEngineOpts`
- Subpath `@xenolithengine/graph-plugin-autolayout/elk` → `elkEngine`, `ElkEngineOpts`

## Docs

- [API reference](https://xenolithengine.github.io/xenolith-graph/guides/api/) — every method exposed by `XenolithEditor`
- [GitHub](https://github.com/XenolithEngine/xenolith-graph)

MIT © XenolithEngine
