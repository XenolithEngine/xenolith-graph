# @xenolithengine/theme-liquid-glass

[![BETA](https://img.shields.io/badge/status-BETA-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph#status)
[![MIT](https://img.shields.io/badge/license-MIT-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph/blob/main/LICENSE)

Liquid Glass theme for XenolithGraph — Apple WWDC25-inspired translucent material with per-node backdrop refraction, gaussian blur, and a vertical tint, sitting over a radial-gradient navy canvas.

> **Beta** — public API in `STABLE-API.md` is the surface we plan to freeze, but it is **NOT frozen yet** — breaking changes can land at any point before v1.0. If you adopt now, pin an exact version.

Part of [XenolithGraph](https://github.com/XenolithEngine/xenolith-graph) — an AI-native, embeddable node-graph editor for the web with its own visual design language (Xen).

## Install

```bash
pnpm add @xenolithengine/theme-liquid-glass pixi.js
```

Peer dependency: `pixi.js@^8.6.0`.

## Usage

```ts
import { XenolithEditor } from '@xenolithengine/editor'
import { liquidGlassTheme } from '@xenolithengine/theme-liquid-glass'

const editor = await XenolithEditor.init('#graph', { theme: liquidGlassTheme })

// or swap at runtime
editor.setTheme(liquidGlassTheme)
```

## What's exported

- `liquidGlassTheme` — drop-in `XenolithTheme`
- `liquidGlassTokens` — token map for further overrides via `mergeTheme`

## Docs

- [Theming guide](https://xenolithengine.github.io/xenolith-graph/guides/api/)
- [GitHub](https://github.com/XenolithEngine/xenolith-graph)

MIT © XenolithEngine
