# @xenolith/wc

[![BETA](https://img.shields.io/badge/status-BETA-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph#status)
[![MIT](https://img.shields.io/badge/license-MIT-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph/blob/main/LICENSE)

`<xenolith-graph>` Web Component — the universal adapter. Works in Angular, Vue, Svelte, Solid, Lit, Astro, and vanilla.

> **Beta** — public API in `STABLE-API.md` is frozen for v0.7; some corners may still change before v1.0.

Part of [XenolithGraph](https://github.com/XenolithEngine/xenolith-graph) — an AI-native, embeddable node-graph editor for the web with its own visual design language (Xen).

## Install

```bash
pnpm add @xenolith/wc pixi.js
```

Peer dependency: `pixi.js@^8.6.0`. WebGL/client-only.

## Usage

```ts
import { register } from '@xenolith/wc'
register()                       // default tag <xenolith-graph>
// register('my-graph')          // or with a custom tag
```

```html
<xenolith-graph style="width:100%;height:100vh" minimap></xenolith-graph>

<script type="module">
  import { register } from '@xenolith/wc'
  register()

  const el = document.querySelector('xenolith-graph')
  el.addEventListener('node:click', (e) => console.log(e.detail.nodeId))
</script>
```

Registration is **explicit** (the import is side-effect-free); call `register()` once at startup.

## What's exported

- `register(tag?)` — define the custom element (idempotent; default tag `xenolith-graph`)
- `XenolithGraphElement` — the `HTMLElement` class (if you want to register it yourself)
- `readAttributes`, `FORWARDED_EVENTS` — used internally; exported for advanced hosts

## Docs

- [API reference](https://xenolithengine.github.io/xenolith-graph/guides/api/) — every method exposed by `XenolithEditor`
- [GitHub](https://github.com/XenolithEngine/xenolith-graph)

MIT © XenolithEngine
