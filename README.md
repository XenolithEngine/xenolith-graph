# XenolithGraph

[![BETA](https://img.shields.io/badge/status-BETA-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph#status)
[![License: MIT](https://img.shields.io/badge/license-MIT-FCB400?style=flat-square)](LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/XenolithEngine/xenolith-graph/ci.yml?branch=main&style=flat-square)](https://github.com/XenolithEngine/xenolith-graph/actions)
[![Tests](https://img.shields.io/badge/tests-1012%20unit%20%C2%B7%20142%20e2e-39d98a?style=flat-square)](#tests)
[![Bundle: core](https://img.shields.io/badge/@xenolithengine%2Fcore-8.4KB%20gzip-39d98a?style=flat-square)](.size-limit.json)
[![Bundle: render-pixi](https://img.shields.io/badge/@xenolithengine%2Frender--pixi-17.4KB%20gzip-39d98a?style=flat-square)](.size-limit.json)
[![Bundle: editor](https://img.shields.io/badge/@xenolithengine%2Feditor-74.3KB%20gzip-39d98a?style=flat-square)](.size-limit.json)
[![Bundle: react](https://img.shields.io/badge/@xenolithengine%2Freact-2.3KB%20gzip-39d98a?style=flat-square)](.size-limit.json)
[![MCP Server](https://img.shields.io/badge/MCP-24%20tools%20%C2%B7%202%20resources-a855f7?style=flat-square)](packages/mcp-server/TESTING.md)
[![Discussions](https://img.shields.io/badge/community-Discussions-181717?style=flat-square&logo=github)](https://github.com/XenolithEngine/xenolith-graph/discussions)
[![Discord](https://img.shields.io/badge/Discord-coming%20after%20v0.1-5865F2?style=flat-square&logo=discord&logoColor=white)](#)

An embeddable, drop-in node-graph editor for the web with a polished design system inside the package — typed Blueprint pins, live templates, macros, in-node widgets, a plugin host — and a swappable theme architecture that replaces the renderer's material entirely, not just its palette.

> **Status: v0.7 BETA.** The public API documented in [`STABLE-API.md`](STABLE-API.md) is the surface we plan to freeze, but it is **NOT frozen yet** — breaking changes can land at any point before v1.0. If you adopt now, pin an exact version. Initial touch / mobile support landed (pinch, two-finger pan, long-press menu, drawer chrome) but a few polish items remain. See [Roadmap](#roadmap) below.

<p>
  <img src="docs/screenshots/xen.png" alt="Xen — default dark/gold theme" width="49%" />
  <img src="docs/screenshots/liquid-glass.png" alt="Liquid Glass — shader-based frosted theme" width="49%" />
</p>

## What it does

**Vanilla / any framework:**

```ts
import { XenolithEditor } from '@xenolithengine/editor'

const editor = await XenolithEditor.init('#app')
editor.loadJSON(graphDoc)
editor.fitView()
```

**React:**

```tsx
import { XenolithGraph } from '@xenolithengine/react'

<XenolithGraph
  graph={graphDoc}
  fitOnLoad
  onReady={(editor) => editor.registry.register(MyNodeSchema)}
/>
```

**Vue 3:**

```vue
<script setup lang="ts">
import { XenolithGraph } from '@xenolithengine/vue'
function onReady(editor) { editor.registry.register(MyNodeSchema) }
</script>
<template>
  <XenolithGraph :graph="graphDoc" fit-on-load @ready="onReady" />
</template>
```

One call (or one component) boots: fonts, PIXI v8 renderer, viewport, grid, pan/zoom, marquee, multi-drag with snap, connect-pins-by-drag, `Alt`+drag rewire, two reroute kinds, comments, collapsed macros, live templates with dive-in editing, in-node widgets, K2-style Tab palette, properties sidebar, undo/redo, JSON serialize with schema migrations, minimap, drag-and-drop palette sidebar. Headless `@xenolithengine/core` is zero-dependency.

## Highlights

- **Blueprint-first.** Typed pins (`exec` vs `data`), per-type colour and shape (`circle` / `arrow` / `diamond`), registerable type **conversions** (`editor.types.registerConversion('number', 'text', String)`). Exec pins hoist onto the node header line (UE-Blueprint layout). Header glyphs from a Feather icon set or your own SVG.
- **Live templates + macros.** Reusable subgraphs with one shared definition + many instances; double-click to dive in, a breadcrumb tracks the path (`Root › Pipeline › Stage`). One-off inline grouping via macros — convert macro ↔ template either direction. `unpackTemplateInstance()` inlines a copy.
- **Comments.** Drag a coloured rectangle behind nodes; spatial group-drag moves everything inside it. Tab → "Comment" or context menu.
- **In-node widgets.** Declarative `number` / `slider` / `combo` / `text` / `toggle` / `color` / `button`, plus custom canvas-draw or DOM-mount widgets (React/Vue/Svelte via `registerWidget(name, controller)`). Conditional visibility on widget state (`displayOptions.show`), free-floating widgets (`freeFloating: true`), live values on display widgets, properties sidebar.
- **Named commands + hotkeys.** Register actions through `editor.commands` with typed `Commands.Undo`/`Commands.Redo`/… constants; cross-platform hotkey grammar (`Mod+Z` resolves to Cmd on macOS, Ctrl elsewhere). Built-in shortcuts are overridable.
- **Events + history.** Listen with `editor.on(event, fn)` — including **cancellable** variants (`edge:connecting`, `edge:disconnecting`, `node:removing`, `node:clicking` with a `cancel()` closure). Group many mutations into one undo entry via `commandBus.beginGroup()` / `endGroup()` or `transaction(fn)`.
- **Save · restore · migrate · export.** Versioned `xenolith.v1` JSON (ID-sorted for clean git diffs) with per-schema `migrate(oldNode, fromVersion)` hooks — old graphs upgrade automatically. ComfyUI workflow importer. Export the **whole graph** (not the viewport) to PNG or JPEG at any resolution.
- **Auto-layout plugin.** `@xenolithengine/plugin-autolayout` with Dagre and ELK adapters. One call arranges any graph; animated tweens included; bypasses the command bus per-frame and commits the final positions as one undo entry.
- **Pluggable edge paths.** Per-edge style: `bezier` (default), `smoothstep`, `step`, `linear`. Labels, arrowheads, animated marching dashes.
- **Plugin host.** `editor.use(plugin)` with a `PluginContext` that exposes schema/types/icons/widgets, an event bus, and runtime-delegation surfaces (`onTick`, `startLoop`/`stopLoop`/`step`, `setNodePins`, `setWidgetValue({ephemeral})`, `setNodePositionEphemeral`, `expandTemplateInstance`, `graphSnapshot`, `setEdgeAnimated`).
- **Two themes shipped.** Xen (dark/gold, original design system) and Liquid Glass (shader-based refraction + rim lighting via PIXI Mesh+Shader). Swap at runtime with `editor.setTheme(theme)`.
- **Live Mode.** `editor.setLiveMode(true)` hides editor chrome (palette, breadcrumb, controls) — perfect for read-only previews and demos.
- **Perf for real graphs.** Viewport virtualization + 3-tier LOD (full → sprite-baked → flat-batch). Render-on-demand (static graphs idle at 0 fps cost). BitmapText glyph atlas for node/widget text. Shared GPU texture caches.
- **Framework adapters.** First-class **React** (`@xenolithengine/react`) and **Vue 3** (`@xenolithengine/vue`) — both ship `<XenolithPanel>`/`<XenolithControls>`/`<XenolithMiniMap>`/`<XenolithButton>` with reactive selector hooks/composables, custom-widget wrappers (`reactWidget` / `vueWidget`), and full Learn pages. Thin starter packages also ship for **Svelte**, **Solid**, **Angular**, and **Web Components** (`@xenolithengine/wc`) — they mount the editor and expose a typed handle, but idiomatic hooks / panel components for those four are a v1.0 item, not BETA.
- **AI-native via MCP.** Ships its own [Model Context Protocol](https://modelcontextprotocol.io) server (`@xenolithengine/mcp-server`). Start the CLI, click Connect in the editor, and Claude Desktop / Cursor can build graphs directly — `list_node_types` → `add_node` → `connect_pins` → `auto_layout`. Twenty-four tools + two resources (`graph://current`, `schema://types`). Every mutation flows through the command bus so undo and the live event stream just work. Token-auth + read-only mode supported.
- **Visual stepping debugger.** `StepDebugger` is part of `@xenolithengine/editor` — wrap any executor (`StepExecutor`), and you get pause/step/continue, breakpoints, per-node timing, and a live trace. The Step debugger / Time-travel scrubber / Per-node cost heatmap / Graph diff for PR-review showcases all ride this primitive — drop-in observability for any graph runtime.

## Bundle size

Honest numbers, measured by [size-limit](https://github.com/ai/size-limit) on the latest build. Tree-shaken, minified, gzipped. Run `pnpm size` to reproduce.

| Package | Gzip | Notes |
|---|---|---|
| `@xenolithengine/core` | **8.4 KB** | Headless graph model — zero deps |
| `@xenolithengine/render-pixi` | **17.4 KB** | (excl. PIXI peer dep) |
| `@xenolithengine/editor` | **74.3 KB** | Everything: core + renderer + interaction + macros/templates + step debugger + MCP client (excl. PIXI) |
| `@xenolithengine/react` | **2.3 KB** | Adapter on top of `@xenolithengine/editor` |
| `@xenolithengine/theme-xen` | **2.3 KB** | Default theme tokens + bundled Inter |
| `@xenolithengine/theme-liquid-glass` | **7.9 KB** | Shader-based frosted-glass theme |
| `@xenolithengine/plugin-autolayout` (dagre adapter) | **0.8 KB** | (excl. `dagre` peer dep — ~30 KB if you opt in) |
| **`pixi.js` (peer dep)** | **~250 KB** | The WebGL renderer we ship on top of |
| **Realistic React app load** | **~330 KB** | Our code + PIXI |

### How we compare

Tested against the published bundles of competitors (2025 data via [bundlephobia](https://bundlephobia.com)):

| Library | App + peer gzip | Renderer |
|---|---|---|
| Drawflow | 25 KB | DOM |
| LiteGraph.js | 50 KB | Canvas2D |
| Rete.js (+ react plugin) | 55 KB | DOM |
| Baklava (Vue) | ~95 KB | DOM |
| **React Flow / @xyflow/react** | **130 KB** | SVG |
| **XenolithGraph (with PIXI)** | **~330 KB** | **WebGL via PIXI** |

We are the heaviest. PIXI accounts for ~75% of the weight — and it's also what makes the WebGL renderer + viewport virtualization possible. Without PIXI we ship ~80 KB, in line with the alternatives.

**Pick something lighter** if mobile-first SaaS where every kB matters (Drawflow / Rete), or Vue-only projects where the editor is one feature (Baklava). **Pick us** when the editor IS the product (AI workflow builders, ComfyUI-class tools, visual debuggers) and you'd rather ship 330 KB once than refactor renderers later.

## Theming

A `XenolithTheme` bundles design tokens, an optional custom `renderNode`, and an optional `createGrid` for the canvas backdrop. Themes swap at runtime through `editor.setTheme(theme)` and re-render every node in place; selection, hover, collapse state, positions are preserved.

```ts
import { xenTheme } from '@xenolithengine/render-pixi'
import { liquidGlassTheme } from '@xenolithengine/theme-liquid-glass'

editor.setTheme(liquidGlassTheme)   // instant — every node re-rendered, state preserved
editor.setTheme(xenTheme)
```

The shader-heavy backdrop pass is **opt-in per theme** (`theme.needsBackdrop`) — Xen pays zero extra render cost; Liquid Glass turns it on automatically.

## Roadmap

### ✅ Shipped in v0.7 BETA

- **Core** — `@xenolithengine/core` headless model, command bus, typed pins, type registry with conversions
- **Renderer** — `@xenolithengine/render-pixi` WebGL editor, viewport virtualization + LOD past 300 nodes
- **Editor** — `@xenolithengine/editor` namespaces (`view` / `history` / `chrome` / `clipboard`), 24 typed events (4 preventable), context-menu plugin API
- **Adapters** — React (`@xenolithengine/react`) and Vue 3 (`@xenolithengine/vue`) with full hook / composable parity, panel components, and `reactWidget` / `vueWidget` wrappers. Thin starter adapters for Svelte, Solid, Angular, and Web Components (`@xenolithengine/wc`) — idiomatic hooks for those four are post-BETA
- **Themes** — Xen (default, original design system) + Liquid Glass (refraction-based glass) + Holographic, runtime `setTheme()` swap
- **In-node widgets** — number / slider / combo / text / toggle / color / button + custom canvas + custom DOM (`reactWidget` / `vueWidget` ports)
- **Header icons** — 13 built-in Feather glyphs, `editor.icons.register(name, svgInner)` for custom
- **Macros & templates** — group selection inline, extract as reusable template, dive-in with breadcrumb, convert either direction
- **Save / export** — versioned `xenolith.v1` JSON with `migrate` hooks, ComfyUI workflow importer, full-graph PNG / JPEG export
- **Palette** — Tab fuzzy search, palette sidebar (drag-and-drop spawn), edge-midpoint insert
- **Initial touch / mobile** — pinch zoom, two-finger pan, long-press context menu, drawer chrome on narrow viewports, ⛶ pseudo-fullscreen
- **AI / MCP** — `@xenolithengine/mcp-server` (24 tools + 2 resources) + WebSocket bridge, `/llms.txt` + `/api/openapi.json` for AI agents
- **Auto-layout** — Dagre + ELK adapters, one-call animated re-layout
- **Step debugger** — `StepDebugger` core primitive (powers debugger / time-travel / heatmap / graph-diff showcases)

### 🚧 Polish before v1.0

- Touch / mobile: virtual keyboard handling, sidebar drawer-mode, orientation reflow, marquee gesture
- Vue / Svelte: idiomatic Learn pages (need lazy-mount infrastructure first — 4 PIXI editors per page break a singleton)
- STABLE-API.md — explicit freeze contract (what's stable vs unstable vs experimental)
- Accessibility — full ARIA + keyboard nav pass

### 🔬 Post-v1.0 — performance

- **Edges on GPU shader** — one draw call for thousands of bezier wires + animated dashes via uniform time
- **Layout in WASM** — `dagre-rust` / `elk-rust` in a worker (3–8× faster, no UI block)
- **Instanced LOD batch** — single quad mesh instead of per-node `Graphics` (ceiling past 100k nodes)

### 🔬 Post-v1.0 — runtime

- **`@xenolithengine/plugin-runtime` v2** — 3 execution backends: baked JS, JS codegen (~215×), AssemblyScript-WASM (~4200× on Mandelbrot-class benchmarks)
- **Topology in WASM** — `topoOrder` / `reachableFrom` ported for huge graphs

### 🔬 Post-v1.0 — collab

- Yjs adapter on the command bus, `Y.Text` for comments and text widgets, awareness markers in the overlay DOM. Shipped on a concrete partner request, not speculatively.

### Opt-in / on-demand

- Orthogonal edge routing (collision-avoidance)
- Custom WebGL renderer (PIXI replacement) — only if PIXI v8 churn forces it
- WASM fuzzy-matcher for the palette when registries grow past ~10k schemas

## Packages

| Package | Role |
|---|---|
| `@xenolithengine/core` | Headless graph model, types, command bus, events, plan-* helpers for macros/templates/reroutes. Zero deps. |
| `@xenolithengine/render-pixi` | PIXI v8 renderer (nodes, edges, comments, macros, widgets, glyphs, LOD). PIXI is a peer dependency. |
| `@xenolithengine/editor` | Composes renderer + interaction + commands + plugin host. The public entry point. |
| `@xenolithengine/theme-xen` | Default Xen design tokens, bundled Inter fonts. |
| `@xenolithengine/theme-liquid-glass` | Liquid Glass theme — radial backdrop + GLSL Mesh material. |
| `@xenolithengine/demo` | One `xenolith.v1` data graph + ComfyUI importer + topology-reactive runners. Consumed by every demo host. |
| `@xenolithengine/adapter-core`, `@xenolithengine/wc` | Framework-agnostic editor wrapper + universal web component. |
| `@xenolithengine/react` | React adapter (`<XenolithPanel>` / `<XenolithControls>` / `<XenolithMiniMap>` / `<XenolithButton>`, reactive selector hooks). |
| `@xenolithengine/mcp-server` | MCP server (stdio MCP ↔ WS bridge → browser editor via `editor.connectMCP(url)`). 24 tools + 2 resources, token-auth, read-only mode. |
| `@xenolithengine/plugin-runtime` *(in progress)* | Blueprint VM (exec-push + pure-pull, `Allocate` verb). Installs via `editor.use()`. |

## Develop

```sh
pnpm install
pnpm --filter @xenolithengine/playground dev      # localhost:5173, includes a theme switcher
pnpm --filter @xenolithengine/site dev            # the docs + landing site (Astro Starlight)
pnpm test                                    # vitest across all packages
pnpm -w test:e2e                             # playwright (chromium + firefox)
pnpm build                                   # tsc -b across all packages
```

Architecture: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). ADRs: [`docs/adr/`](docs/adr/). Public API guide: [docs site](apps/site).

## Tests

`pnpm test` runs the full suite.

- **1012 unit tests** across `@xenolithengine/*` packages (Vitest)
- **142 interaction tests** across `apps/playground/tests` (Playwright — chromium + firefox)
- Visual snapshot tests for the renderer (PIXI render → PNG → image-diff)
- `pnpm size` enforces per-package bundle budgets in CI

Coverage report and visual baselines live in `coverage/` and `apps/playground/tests/__snapshots__/`.

## Star history

[![Star History](https://api.star-history.com/svg?repos=XenolithEngine/xenolith-graph&type=Date)](https://star-history.com/#XenolithEngine/xenolith-graph&Date)

## License

MIT.
