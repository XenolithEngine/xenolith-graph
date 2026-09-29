# @xenolithengine/graph-wc

[![BETA](https://img.shields.io/badge/status-BETA-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph#status)
[![MIT](https://img.shields.io/badge/license-MIT-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph/blob/main/LICENSE)

`<xenolith-graph>` Web Component — the universal adapter. Works in Angular, Vue, Svelte, Solid, Lit, Astro, and vanilla.

> **Beta** — public API in `STABLE-API.md` is the surface we plan to freeze, but it is **NOT frozen yet** — breaking changes can land at any point before v1.0. If you adopt now, pin an exact version.

Part of [XenolithGraph](https://github.com/XenolithEngine/xenolith-graph) — an AI-native, embeddable node-graph editor for the web with its own visual design language (Xen).

## Install

```bash
pnpm add @xenolithengine/graph-wc pixi.js
```

Peer dependency: `pixi.js@^8.6.0`. WebGL/client-only.

## Usage

```ts
import { register } from '@xenolithengine/graph-wc'
register()                       // default tag <xenolith-graph>
// register('my-graph')          // or with a custom tag
```

```html
<xenolith-graph style="width:100%;height:100vh" minimap></xenolith-graph>

<script type="module">
  import { register } from '@xenolithengine/graph-wc'
  register()

  const el = document.querySelector('xenolith-graph')
  el.addEventListener('node:click', (e) => console.log(e.detail.nodeId))
</script>
```

Registration is **explicit** (the import is side-effect-free); call `register()` once at startup.

## What's exported

- `register(tag?)` — define the custom element (idempotent; default tag `xenolith-graph`)
- `XenolithGraphElement` — the `HTMLElement` class (if you want to register it yourself)
- Attributes (declarative slice): `minimap`, `fit-on-load`, `disable-grid`, `resize-to-window` (booleans), `snap` (number); JS properties: `theme`, `graph`, `zoomBounds`, `isValidConnection`. Attribute and property sources re-merge on every change — removing an attribute clears the prop.
- Events: `ready` (detail: the `XenolithEditor`, fires once after mount) + every public editor event (all 25, derived from `EDITOR_EVENT_NAMES`) as a same-named CustomEvent with the payload in `event.detail` — including the preventable `-ing` events with `cancel()`.
- `el.editor` — the live editor, or null before mount (no polling — listen for `ready`)
- `readAttributes`, `FORWARDED_EVENTS` — used internally; exported for advanced hosts

## Docs

- [Web Component guide](https://graph.xenolith.studio/guides/wc/) — attribute/property dictionaries, events, lifecycle
- [API reference](https://graph.xenolith.studio/guides/api/) — every method exposed by `XenolithEditor`
- [GitHub](https://github.com/XenolithEngine/xenolith-graph)

MIT © XenolithEngine
