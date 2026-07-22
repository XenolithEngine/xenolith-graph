# @xenolithengine/graph-render-pixi

[![BETA](https://img.shields.io/badge/status-BETA-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph#status)
[![MIT](https://img.shields.io/badge/license-MIT-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph/blob/main/LICENSE)

PIXI v8 renderer for XenolithGraph — node/edge/widget rendering, viewport math, interaction, virtualization. PIXI is a peer dependency.

> **Beta** — public API in `STABLE-API.md` is the surface we plan to freeze, but it is **NOT frozen yet** — breaking changes can land at any point before v1.0. If you adopt now, pin an exact version.

Part of [XenolithGraph](https://github.com/XenolithEngine/xenolith-graph) — an AI-native, embeddable node-graph editor for the web with its own visual design language (Xen).

Most hosts don't import this directly — `@xenolithengine/graph-editor` wires it in. Reach for this package if you're writing a theme or a custom renderer pipeline.

## Install

```bash
pnpm add @xenolithengine/graph-render-pixi pixi.js
```

Peer dependency: `pixi.js@^8.6.0`. Themes pair with `@xenolithengine/graph-theme-xen` (also a peer).

## Usage

```ts
import { renderNode, computeNodeLayout, createPixiTextMeasurer } from '@xenolithengine/graph-render-pixi'
import { xenTheme } from '@xenolithengine/graph-render-pixi'

const measurer = createPixiTextMeasurer()
const layout = computeNodeLayout(node, xenTheme.tokens, measurer)
const view   = renderNode(node, { layout, theme: xenTheme, /* ... */ })
```

## What's exported

- `renderNode`, `renderRerouteNode`, `renderWidgets`, `renderEdge`, `drawEdge`, `renderComment`, `renderMacroFrame`
- Layout: `computeNodeLayout`, `measureNodeSize`, `computeEdgePath`, `sampleBezier`, `bezierMidpoint`
- Viewport: `Viewport`, `InteractionManager`, `screenToWorld`, `worldToScreen`, `zoomAt`, `clampZoom`, `snapToGrid`, `fitView`
- Themes: `xenTheme`, `XenolithTheme`, `ThemeRenderContext`, `PaletteStyle`
- Virtualization / LOD: `shouldVirtualize`, `visibleWorldRect`, `reconcileVisibleNodes`, `useLOD`, `lodLevel`, `cellsForRect`
- Icons: `IconRegistry`, `BUILTIN_ICONS`
- Helpers: `createPixiTextMeasurer`, `createGridSprite`, `hexToRgba`, `resolveCategoryAccent`, `resolveEdgeColor`

## Docs

- [Theme authoring guide](https://graph.xenolith.studio/guides/api/)
- [API reference](https://graph.xenolith.studio/guides/api/) — every method exposed by `XenolithEditor`
- [GitHub](https://github.com/XenolithEngine/xenolith-graph)

MIT © XenolithEngine
