# @xenolithengine/graph-theme-synthwave

[![BETA](https://img.shields.io/badge/status-BETA-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph#status)
[![MIT](https://img.shields.io/badge/license-MIT-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph/blob/main/LICENSE)

Synthwave / retro-future neon theme for XenolithGraph — TRON / Blade Runner / 80s arcade marquee aesthetic. Hot magenta, electric cyan, laser violet on a midnight purple canvas.

> **Beta** — public API in `STABLE-API.md` is the surface we plan to freeze, but it is **NOT frozen yet** — breaking changes can land at any point before v1.0. If you adopt now, pin an exact version.

Part of [XenolithGraph](https://github.com/XenolithEngine/xenolith-graph) — an AI-native, embeddable node-graph editor for the web with its own visual design language (Xen).

## Install

```bash
pnpm add @xenolithengine/graph-theme-synthwave pixi.js
```

Peer dependency: `pixi.js@^8.6.0`.

## Usage

```ts
import { XenolithEditor } from '@xenolithengine/graph-editor'
import { synthwaveTheme } from '@xenolithengine/graph-theme-synthwave'

const editor = await XenolithEditor.init('#graph', { theme: synthwaveTheme })

// or swap at runtime
editor.setTheme(synthwaveTheme)
```

## What's exported

- `synthwaveTheme` — drop-in `XenolithTheme`
- `synthwaveTokens` — token map for further overrides via `mergeTheme`

## Docs

- [Theming guide](https://xenolithengine.github.io/xenolith-graph/guides/api/)
- [GitHub](https://github.com/XenolithEngine/xenolith-graph)

MIT © XenolithEngine
