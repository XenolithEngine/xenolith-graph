# XenolithGraph

[![License: MIT](https://img.shields.io/badge/license-MIT-FCB400?style=flat-square)](LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/XenolithEngine/xenolith-graph/ci.yml?branch=main&style=flat-square)](https://github.com/XenolithEngine/xenolith-graph/actions)
[![Tests](https://img.shields.io/badge/tests-1012%20unit%20%C2%B7%20142%20e2e-39d98a?style=flat-square)](#tests)
[![Bundle: core](https://img.shields.io/badge/@xenolith%2Fcore-8.4KB%20gzip-39d98a?style=flat-square)](.size-limit.json)
[![Bundle: render-pixi](https://img.shields.io/badge/@xenolith%2Frender--pixi-17.4KB%20gzip-39d98a?style=flat-square)](.size-limit.json)
[![Bundle: editor](https://img.shields.io/badge/@xenolith%2Feditor-74.3KB%20gzip-39d98a?style=flat-square)](.size-limit.json)
[![Bundle: react](https://img.shields.io/badge/@xenolith%2Freact-2.3KB%20gzip-39d98a?style=flat-square)](.size-limit.json)
[![MCP Server](https://img.shields.io/badge/MCP-24%20tools%20%C2%B7%202%20resources-a855f7?style=flat-square)](packages/mcp-server/TESTING.md)
[![Discussions](https://img.shields.io/badge/community-Discussions-181717?style=flat-square&logo=github)](https://github.com/XenolithEngine/xenolith-graph/discussions)
[![Discord](https://img.shields.io/badge/Discord-coming%20after%20v0.1-5865F2?style=flat-square&logo=discord&logoColor=white)](#)

An embeddable, drop-in node-graph editor for the web with a polished design system inside the package — typed Blueprint pins, live templates, macros, in-node widgets, a plugin host — and a swappable theme architecture that replaces the renderer's material entirely, not just its palette.

> **Status:** approaching v1.0. Public API stable; touch/mobile, Vue/Svelte/Solid adapters, and the Blueprint VM runtime (`@xenolith/plugin-runtime`) land before the freeze.

<p>
  <img src="docs/screenshots/xen.png" alt="Xen — default dark/gold theme" width="49%" />
  <img src="docs/screenshots/liquid-glass.png" alt="Liquid Glass — shader-based frosted theme" width="49%" />
</p>

## What it does

```ts
import { XenolithEditor } from '@xenolith/editor'

const editor = await XenolithEditor.init('#app')
editor.loadJSON(graphDoc)
editor.fitView()
```

One async call boots: fonts, PIXI v8 renderer, viewport, grid, pan/zoom, marquee, multi-drag with snap, connect-pins-by-drag, `Alt`+drag rewire, two reroute kinds, comments, collapsed macros, live templates with dive-in editing, in-node widgets, K2-style Tab palette, properties sidebar, undo/redo, JSON serialize with schema migrations, minimap, drag-and-drop palette sidebar. Headless `@xenolith/core` is zero-dependency.

## Highlights

- **Blueprint-first.** Typed pins (`exec` vs `data`), per-type colour and shape (`circle` / `arrow` / `diamond`), registerable type **conversions** (`editor.types.registerConversion('number', 'text', String)`). Exec pins hoist onto the node header line (UE-Blueprint layout). Header glyphs from a Feather icon set or your own SVG.
- **Live templates + macros.** Reusable subgraphs with one shared definition + many instances; double-click to dive in, a breadcrumb tracks the path (`Root › Pipeline › Stage`). One-off inline grouping via macros — convert macro ↔ template either direction. `unpackTemplateInstance()` inlines a copy.
- **Comments.** Drag a coloured rectangle behind nodes; spatial group-drag moves everything inside it. Tab → "Comment" or context menu.
- **In-node widgets.** Declarative `number` / `slider` / `combo` / `text` / `toggle` / `color` / `button`, plus custom canvas-draw or DOM-mount widgets (React/Vue/Svelte via `registerWidget(name, controller)`). Conditional visibility on widget state (`displayOptions.show`), free-floating widgets (`freeFloating: true`), live values on display widgets, properties sidebar.
- **Named commands + hotkeys.** Register actions through `editor.commands` with typed `Commands.Undo`/`Commands.Redo`/… constants; cross-platform hotkey grammar (`Mod+Z` resolves to Cmd on macOS, Ctrl elsewhere). Built-in shortcuts are overridable.
- **Events + history.** Listen with `editor.on(event, fn)` — including **cancellable** variants (`edge:connecting`, `edge:disconnecting`, `node:removing`, `node:clicking` with a `cancel()` closure). Group many mutations into one undo entry via `commandBus.beginGroup()` / `endGroup()` or `transaction(fn)`.
- **Save · restore · migrate · export.** Versioned `xenolith.v1` JSON (ID-sorted for clean git diffs) with per-schema `migrate(oldNode, fromVersion)` hooks — old graphs upgrade automatically. ComfyUI workflow importer. Export the **whole graph** (not the viewport) to PNG or JPEG at any resolution.
- **Auto-layout plugin.** `@xenolith/plugin-autolayout` with Dagre and ELK adapters. One call arranges any graph; animated tweens included; bypasses the command bus per-frame and commits the final positions as one undo entry.
- **Pluggable edge paths.** Per-edge style: `bezier` (default), `smoothstep`, `step`, `linear`. Labels, arrowheads, animated marching dashes.
- **Plugin host.** `editor.use(plugin)` with a `PluginContext` that exposes schema/types/icons/widgets, an event bus, and runtime-delegation surfaces (`onTick`, `startLoop`/`stopLoop`/`step`, `setNodePins`, `setWidgetValue({ephemeral})`, `setNodePositionEphemeral`, `expandTemplateInstance`, `graphSnapshot`, `setEdgeAnimated`).
- **Two themes shipped.** Xen (dark/gold, original design system) and Liquid Glass (shader-based refraction + rim lighting via PIXI Mesh+Shader). Swap at runtime with `editor.setTheme(theme)`.
- **Live Mode.** `editor.setLiveMode(true)` hides editor chrome (palette, breadcrumb, controls) — perfect for read-only previews and demos.
- **Perf for real graphs.** Viewport virtualization + 3-tier LOD (full → sprite-baked → flat-batch). Render-on-demand (static graphs idle at 0 fps cost). BitmapText glyph atlas for node/widget text. Shared GPU texture caches. Tested at 58k nodes; ~4–7 ms/frame at 40k+ on M1.
- **Six framework adapters.** First-party `@xenolith/react`, `@xenolith/vue`, `@xenolith/svelte`, `@xenolith/solid`, `@xenolith/angular`, and `@xenolith/wc` (Web Components). React ships `<XenolithPanel>`/`<XenolithControls>`/`<XenolithMiniMap>`/`<XenolithButton>` + reactive selector hooks; other adapters mirror the surface.
- **AI-native via MCP.** Ships its own [Model Context Protocol](https://modelcontextprotocol.io) server (`@xenolith/mcp-server`). Start the CLI, click Connect in the editor, and Claude Desktop / Cursor can build graphs directly — `list_node_types` → `add_node` → `connect_pins` → `auto_layout`. Twelve tools + two resources (`graph://current`, `schema://types`). Every mutation flows through the command bus so undo and the live event stream just work. Token-auth + read-only mode supported.
- **Visual stepping debugger.** `StepDebugger` is part of `@xenolith/editor` — wrap any executor (`StepExecutor`), and you get pause/step/continue, breakpoints, per-node timing, and a live trace. The Step debugger / Time-travel scrubber / Per-node cost heatmap / Graph diff for PR-review showcases all ride this primitive — drop-in observability for any graph runtime.

## Bundle size

Honest numbers, measured by [size-limit](https://github.com/ai/size-limit) on the latest build. Tree-shaken, minified, gzipped. Run `pnpm size` to reproduce.

| Package | Gzip | Notes |
|---|---|---|
| `@xenolith/core` | **8.4 KB** | Headless graph model — zero deps |
| `@xenolith/render-pixi` | **17.4 KB** | (excl. PIXI peer dep) |
| `@xenolith/editor` | **74.3 KB** | Everything: core + renderer + interaction + macros/templates + step debugger + MCP client (excl. PIXI) |
| `@xenolith/react` | **2.3 KB** | Adapter on top of `@xenolith/editor` |
| `@xenolith/theme-xen` | **2.3 KB** | Default theme tokens + bundled Inter |
| `@xenolith/theme-liquid-glass` | **7.9 KB** | Shader-based frosted-glass theme |
| `@xenolith/plugin-autolayout` (dagre adapter) | **0.8 KB** | (excl. `dagre` peer dep — ~30 KB if you opt in) |
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

We are the heaviest. PIXI accounts for ~75% of the weight — and it's also what lets us render 10k nodes at 60fps in our own benchmarks. Without PIXI we ship ~80 KB, in line with the alternatives.

**Pick something lighter** if mobile-first SaaS where every kB matters (Drawflow / Rete), or Vue-only projects where the editor is one feature (Baklava). **Pick us** when the editor IS the product (AI workflow builders, ComfyUI-class tools, visual debuggers) and you'd rather ship 330 KB once than refactor renderers later.

## Theming

A `XenolithTheme` bundles design tokens, an optional custom `renderNode`, and an optional `createGrid` for the canvas backdrop. Themes swap at runtime through `editor.setTheme(theme)` and re-render every node in place; selection, hover, collapse state, positions are preserved.

```ts
import { xenTheme } from '@xenolith/render-pixi'
import { liquidGlassTheme } from '@xenolith/theme-liquid-glass'

editor.setTheme(liquidGlassTheme)   // instant — every node re-rendered, state preserved
editor.setTheme(xenTheme)
```

The shader-heavy backdrop pass is **opt-in per theme** (`theme.needsBackdrop`) — Xen pays zero extra render cost; Liquid Glass turns it on automatically.

## Roadmap

| Milestone | What |
|---|---|
| **shipped** | Core + renderer + editor, Xen + Liquid Glass themes, typed pins + conversions, K2 palette, named commands + hotkeys, undo/redo + history grouping, `xenolith.v1` JSON with schema `migrate` hooks, ComfyUI importer, full-graph PNG/JPEG export, comments, two reroute kinds, edge-midpoint context menu, copy/paste, minimap, in-node widgets (built-in + custom canvas/DOM), conditional widgets (`displayOptions.show`), properties sidebar, macros, live templates with dive-in editing + breadcrumb, palette sidebar (drag-and-drop), per-node file drop, Live mode, cancellable events, plugin host, header glyphs, UE-Blueprint exec-on-header, viewport virtualization + LOD, BitmapText, auto-layout plugin (Dagre + ELK), pluggable edge path styles, framework adapters (React/Vue/Svelte/Solid/Angular/WC), **MCP server** (`@xenolith/mcp-server` — 12 tools + 2 resources), **`StepDebugger`** core primitive (powers Step debugger / Time-travel / Heatmap / Graph diff showcases). |
| **v0.6 → v1.0** | `@xenolith/plugin-runtime` (Blueprint VM with exec-push + pure-pull), touch / mobile (pinch-zoom + long-press), accessibility (ARIA + keyboard nav), SSR & bundle-size guidance docs, public API + format freeze. |
| **v1.x — perf** | Edge rendering on a GPU shader (one draw call for thousands of bezier wires + animated dashes via uniform time). Layout plugins ported to WASM (`dagre-rust` / `elk-rust` in a worker — 3–8× faster, no UI block). Instanced LOD batch (single quad mesh instead of per-node `Graphics` — lifts the ceiling past 100k nodes). |
| **v1.x — runtime** | `@xenolith/plugin-runtime` v2 — 3 execution backends (baked JS, JS codegen ~215×, AssemblyScript-WASM ~4 200× on Mandelbrot-class benchmarks). `topoOrder` / `reachableFrom` ported to WASM for huge graphs. |
| **v1.x — collab** | Yjs adapter on the command bus, `Y.Text` for comments / text widgets, awareness markers in the overlay DOM. Shipped on a concrete partner request, not speculatively. |
| **opt-in / on-demand** | Orthogonal edge routing (collision-avoidance). Custom WebGL renderer (PIXI replacement) — only if PIXI v8 churn forces it. WASM fuzzy-matcher for the palette when registries grow past ~10k schemas. |

## Packages

| Package | Role |
|---|---|
| `@xenolith/core` | Headless graph model, types, command bus, events, plan-* helpers for macros/templates/reroutes. Zero deps. |
| `@xenolith/render-pixi` | PIXI v8 renderer (nodes, edges, comments, macros, widgets, glyphs, LOD). PIXI is a peer dependency. |
| `@xenolith/editor` | Composes renderer + interaction + commands + plugin host. The public entry point. |
| `@xenolith/theme-xen` | Default Xen design tokens, bundled Inter fonts. |
| `@xenolith/theme-liquid-glass` | Liquid Glass theme — radial backdrop + GLSL Mesh material. |
| `@xenolith/demo` | One `xenolith.v1` data graph + ComfyUI importer + topology-reactive runners. Consumed by every demo host. |
| `@xenolith/adapter-core`, `@xenolith/wc` | Framework-agnostic editor wrapper + universal web component. |
| `@xenolith/react` | React adapter (`<XenolithPanel>` / `<XenolithControls>` / `<XenolithMiniMap>` / `<XenolithButton>`, reactive selector hooks). |
| `@xenolith/mcp-server` | MCP server (stdio MCP ↔ WS bridge → browser editor via `editor.connectMCP(url)`). 12 tools + 2 resources, token-auth, read-only mode. |
| `@xenolith/plugin-runtime` *(in progress)* | Blueprint VM (exec-push + pure-pull, `Allocate` verb). Installs via `editor.use()`. |

## Develop

```sh
pnpm install
pnpm --filter @xenolith/playground dev      # localhost:5173, includes a theme switcher
pnpm --filter @xenolith/site dev            # the docs + landing site (Astro Starlight)
pnpm test                                    # vitest across all packages
pnpm -w test:e2e                             # playwright (chromium + firefox)
pnpm build                                   # tsc -b across all packages
```

Architecture: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). ADRs: [`docs/adr/`](docs/adr/). Public API guide: [docs site](apps/site).

## Tests

`pnpm test` runs the full suite.

- **1012 unit tests** across `@xenolith/*` packages (Vitest)
- **142 interaction tests** across `apps/playground/tests` (Playwright — chromium + firefox)
- Visual snapshot tests for the renderer (PIXI render → PNG → image-diff)
- `pnpm size` enforces per-package bundle budgets in CI

Coverage report and visual baselines live in `coverage/` and `apps/playground/tests/__snapshots__/`.

## Star history

[![Star History](https://api.star-history.com/svg?repos=XenolithEngine/xenolith-graph&type=Date)](https://star-history.com/#XenolithEngine/xenolith-graph&Date)

## License

MIT.
