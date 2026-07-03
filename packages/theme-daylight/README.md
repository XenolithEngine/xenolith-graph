# @xenolithengine/graph-theme-daylight

[![BETA](https://img.shields.io/badge/status-BETA-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph#status)
[![MIT](https://img.shields.io/badge/license-MIT-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph/blob/main/LICENSE)

Daylight theme for XenolithGraph — an original light-mode design language. Soft light-grey canvas (`#E2E2E2`), node bodies sharing the canvas fill and separated purely by drop-shadow, pin halos that protrude from the body while wires pass underneath, connected pins reading as a concentric "bullseye" target, Helvetica Neue typography with an Inter fallback.

> **Beta** — public API in `STABLE-API.md` is the surface we plan to freeze, but it is **NOT frozen yet** — breaking changes can land at any point before v1.0. If you adopt now, pin an exact version.

Part of [XenolithGraph](https://github.com/XenolithEngine/xenolith-graph) — an AI-native, embeddable node-graph editor for the web.

## Install

```bash
pnpm add @xenolithengine/graph-theme-daylight pixi.js
```

Peer dependency: `pixi.js@^8.6.0`.

## Usage

```ts
import { XenolithEditor } from '@xenolithengine/graph-editor'
import { daylightTheme } from '@xenolithengine/graph-theme-daylight'

const editor = await XenolithEditor.init('#graph', { theme: daylightTheme })

// or swap at runtime
editor.setTheme(daylightTheme)
```

## What's exported

- `daylightTheme` — drop-in `XenolithTheme`
- `daylightTokens` — token map for further overrides via `mergeTheme`

## Docs

- [Theming guide](https://xenolithengine.github.io/xenolith-graph/guides/api/)
- [GitHub](https://github.com/XenolithEngine/xenolith-graph)

MIT © XenolithEngine
