# @xenolithengine/theme-holographic

[![BETA](https://img.shields.io/badge/status-BETA-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph#status)
[![MIT](https://img.shields.io/badge/license-MIT-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph/blob/main/LICENSE)

Holographic / Iridescent theme for XenolithGraph — translucent glass panels with rainbow iridescent borders, rainbow-gradient wires, on a matte-black noise backdrop. Apple Vision OS / Y2K aesthetic.

> **Beta** — public API in `STABLE-API.md` is frozen for v0.7; some corners may still change before v1.0.

Part of [XenolithGraph](https://github.com/XenolithEngine/xenolith-graph) — an AI-native, embeddable node-graph editor for the web with its own visual design language (Xen).

## Install

```bash
pnpm add @xenolithengine/theme-holographic pixi.js
```

Peer dependency: `pixi.js@^8.6.0`.

## Usage

```ts
import { XenolithEditor } from '@xenolithengine/editor'
import { holographicTheme } from '@xenolithengine/theme-holographic'

const editor = await XenolithEditor.init('#graph', { theme: holographicTheme })

// or swap at runtime
editor.setTheme(holographicTheme)
```

## What's exported

- `holographicTheme` — drop-in `XenolithTheme`
- `holographicTokens` — token map for further overrides via `mergeTheme`

## Docs

- [Theming guide](https://xenolithengine.github.io/xenolith-graph/guides/api/)
- [GitHub](https://github.com/XenolithEngine/xenolith-graph)

MIT © XenolithEngine
