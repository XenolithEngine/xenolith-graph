# @xenolith/plugin-autolayout

[![BETA](https://img.shields.io/badge/status-BETA-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph#status)
[![MIT](https://img.shields.io/badge/license-MIT-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph/blob/main/LICENSE)

Auto-layout plugin for XenolithGraph. Engine-agnostic: bring your own layout backend (dagre / elkjs / custom) via the `LayoutEngine` interface.

> **Beta** — public API in `STABLE-API.md` is frozen for v0.7; some corners may still change before v1.0.

Part of [XenolithGraph](https://github.com/XenolithEngine/xenolith-graph) — an AI-native, embeddable node-graph editor for the web with its own visual design language (Xen).

## Install

```bash
pnpm add @xenolith/plugin-autolayout dagre
# or
pnpm add @xenolith/plugin-autolayout elkjs
```

Optional peer deps: `dagre@^0.8.5` (lighter, layered DAGs) **or** `elkjs@^0.9 || ^0.10 || ^0.11` (nested layouts, orthogonal routing, 9 algorithms). Install whichever backend you reach for; both engines lazy-load.

## Usage

```ts
import { autoLayoutPlugin } from '@xenolith/plugin-autolayout'
import { dagreEngine } from '@xenolith/plugin-autolayout/dagre'

const layout = autoLayoutPlugin({ engine: dagreEngine({ rankdir: 'LR' }) })
editor.use(layout)

await layout.arrange({ direction: 'LR', animate: { durationMs: 280 } })
```

ELK variant — same shape:

```ts
import { elkEngine } from '@xenolith/plugin-autolayout/elk'

const layout = autoLayoutPlugin({ engine: elkEngine({ algorithm: 'layered' }) })
editor.use(layout)
await layout.arrange()
```

`arrange()` commits all moves in a single undo step. Optional animated tween bypasses the command bus per frame and commits the final positions once.

## What's exported

- `autoLayoutPlugin(config)` → `AutoLayoutPlugin` with `arrange(opts?)`
- `AutoLayoutConfig`, `AutoLayoutPlugin`
- `LayoutEngine`, `LayoutGraph`, `LayoutNode`, `LayoutEdge`, `LayoutOpts`, `LayoutResult`
- Subpath `@xenolith/plugin-autolayout/dagre` → `dagreEngine`, `DagreEngineOpts`
- Subpath `@xenolith/plugin-autolayout/elk` → `elkEngine`, `ElkEngineOpts`

## Docs

- [API reference](https://xenolithengine.github.io/xenolith-graph/guides/api/) — every method exposed by `XenolithEditor`
- [GitHub](https://github.com/XenolithEngine/xenolith-graph)

MIT © XenolithEngine
