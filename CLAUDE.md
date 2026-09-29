# XenolithGraph

Open-source embeddable node-graph editor for the web with **a polished, opinionated node-editor design system as first-class** — not a theme layered on top of a generic flowchart library. The default theme is **Xen**, an original dark/gold design language defined in Figma.

Working name: **XenolithGraph**. Current release: **v0.7.0-beta.7**.

---

## 🚨 TDD IS MANDATORY — NOT OPTIONAL

**Every feature in this repo is written test-first. No exceptions.**

The cycle is **red → green → refactor**:

1. Write a failing Vitest (unit) or Playwright (interaction) test that describes the behaviour you want. Run it. **It must fail for the right reason.**
2. Write the minimum implementation to make the test pass. Run the full test suite. **All tests must be green.**
3. Refactor with the test suite as a safety net. Tests stay green throughout.

Concrete rules:

- **No production code without a failing test first.** If you find yourself writing implementation before a test exists, stop and write the test.
- **Commit message convention:** test-only commits use `test:` prefix; the implementation commit that makes them pass uses `feat:` / `fix:`. The two are usually separate commits so the red→green transition is visible in history.
- **Public API change ⇒ Vitest test.** No exceptions.
- **Interaction change ⇒ Playwright test.** Drag, pan, zoom, pin connect, keyboard — all covered.
- **Visual change ⇒ renderer snapshot test.** PIXI render → PNG → image-diff against committed baseline.
- **Bug fix ⇒ regression test first.** Reproduce the bug as a failing test, then fix.
- **Refactor with zero test changes is the cleanest signal everything is fine.** If a refactor forces a test rewrite, the test was probably coupled to implementation, not behaviour — flag it in the PR.

CI (`.github/workflows/ci.yml`) runs the package build, unit tests, playground Playwright excluding `@visual`, and `pnpm size`. It does not measure coverage, and it does not fail when a test is skipped. Do not describe either of those gates as if they exist.

When Claude works in this repo: **read this section before writing any code in `packages/` or `apps/`.** If a task seems to require implementation without a test, push back and ask. This is the single most important rule in the project.

---

## Why this exists

The web node-graph space in 2026 is split between two camps:

- **Generic flowchart libraries** (xyflow / React Flow ~36k★, Rete.js ~12k★, Drawflow ~6k★) — framework or framework-agnostic, but visually neutral. Every LLM-workflow tool (LangFlow, Flowise, Dify) looks identical because they all sit on React Flow.
- **One semi-Blueprint library** — LiteGraph.js (~8k★, the engine behind ComfyUI). Declares "UDK Blueprint-like" but the aesthetic is mid-2010s, Canvas2D-only, no TypeScript, single maintainer, no framework adapters.

There is **no open-source library that ships a finished, distinctive node-editor design language out of the box** while being modern (TypeScript, ESM, WebGL, framework-agnostic, plugin-based). XenolithGraph aims to fill that gap with the Xen design system.

Primary target users: AI/LLM workflow builders, audio/DSP graph editors, shader/material editors, gameplay-logic editors, anyone who wants a node UI that looks like a tool rather than a diagram.

## Non-goals

- Not a generic flowchart library. Blueprint semantics (typed pins, exec vs data, type-color system, K2-style search palette) are first-class, not opt-in.
- Not a runtime. The library renders and edits graphs; executing them is a separate concern handled by the host application.
- Not coupled to any external engine, file format, or product. The Xen design system is original; references to blueprint-style editors are influence, not reproduction.
- Not React-only. React/Vue/Svelte get adapters; the core is framework-agnostic.

## Architecture

Shipped at v0.7.0-beta.7. The live package map is [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). The table below is the original sketch: minimap, palette, undo, serialize, and clipboard live inside `@xenolithengine/graph-editor`, not as separate plugins. `@xenolithengine/graph-core` does not import PIXI. `@xenolithengine/graph-editor` does — `XenolithEditor` owns the PIXI scene. See ADR-0001.

Layered, headless-first:

```
┌──────────────────────────────────────────────────────────────┐
│ Framework adapters (React / Vue / Svelte / vanilla)          │
├──────────────────────────────────────────────────────────────┤
│ Editor — composes Renderer + Interaction + Commands + Plugins│
├─────────────────────┬────────────────────┬───────────────────┤
│ Renderer (PIXI v8)  │ Interaction        │ Plugin host       │
├─────────────────────┴────────────────────┴───────────────────┤
│ Core (headless: model · types · commands · events · zero-dep)│
└──────────────────────────────────────────────────────────────┘
```

The strict rule: a layer may know about layers below it, never above. The core has zero runtime dependencies and zero references to DOM, Canvas, or PIXI.

### Packages (original sketch)

| Package | Role |
|---|---|
| `@xenolithengine/graph-core` | Headless graph model, type system, command bus, events. Zero deps. |
| `@xenolithengine/graph-render-pixi` | PIXI v8 renderer. PIXI is a peer dependency. |
| `@xenolithengine/graph-editor` | Wires core + renderer + interaction + plugins into a usable editor. |
| `@xenolithengine/graph-react`, `@xenolithengine/graph-svelte`, `@xenolithengine/graph-vue` | Thin adapters. |
| `@xenolithengine/graph-theme-xen` | Default theme (Xen — original design system from the Figma source). |
| `@xenolithengine/graph-plugin-*` | Third-party extensions via `editor.use`. Auto-layout ships as `@xenolithengine/graph-plugin-autolayout`. |

### Tooling baseline

- pnpm workspaces + Turbo for the monorepo.
- TypeScript-first, ESM-only, no CommonJS output.
- Vite for builds, Vitest for unit tests, Playwright for interaction E2E, snapshot tests for renderer output.
- Changesets for versioning and releases.
- MIT license.

### Performance

Product targets. They are not a CI job: `.github/workflows/ci.yml` has no frame-time or GC gate.

- 500 nodes / 1000 edges at 60fps on Apple Silicon / Ryzen 5.
- 0 GC pauses during a 5-second drag.
- Cold-start with 100 nodes under 100 ms.

Large graphs are a shipped property of the renderer (viewport virtualization and LOD). `docs/ARCHITECTURE.md` records a 58k-node pass. DOM editors fall over around a few hundred nodes.

CI does enforce the gzip ceilings in `.size-limit.json` via `pnpm size`:

- `@xenolithengine/graph-core` < 30 kB gzip.
- `@xenolithengine/graph-render-pixi` < 80 kB gzip, PIXI excluded.
- `@xenolithengine/graph-editor` < 120 kB gzip, PIXI excluded.

A PR that blows a size-limit ceiling fails CI.

## Core data model (sketch)

```ts
interface Graph {
  nodes: Map<NodeId, Node>
  edges: Map<EdgeId, Edge>
  comments: Map<CommentId, Comment>
}

interface Pin {
  id: PinId
  kind: 'exec' | 'data'         // first-class Blueprint distinction
  direction: 'in' | 'out'
  type: TypeId                  // 'float', 'string', 'object:User', 'exec', ...
  multiple: boolean
}

interface TypeDescriptor {
  id: TypeId
  color: string                 // Xen type-color palette
  shape: 'circle' | 'diamond' | 'arrow'
  cast?: (v: unknown) => unknown
  compatibleWith?: TypeId[]
}
```

All mutations flow through a `CommandBus` (every change is an `apply/undo` pair). This buys undo/redo, replay, deterministic tests, and a path to collaborative editing without rewriting later.

## Roadmap

v0.1 through the v0.7.0-beta.7 public beta are shipped: core, PIXI renderer, editor, themes (Xen, Daylight, Liquid Glass), React and Vue adapters, thin Svelte / Solid / Angular / web-component mounts, MCP, auto-layout. v1.0 is the API and `xenolith.v1` freeze. Detail lives in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) §12 and the README.

## Conventions for contributors (and Claude)

- **No comments unless the *why* is non-obvious.** Identifiers explain the *what*. Don't add JSDoc to functions whose name says it all.
- **No backwards-compat shims** until v1.0. Until then, breaking changes go in changesets with a clear migration note.
- **No new dependencies in `@xenolithengine/graph-core` ever.** Headless core stays zero-dep. Render and adapter layers may add deps but each addition needs justification in the PR.
- **Every public API change ships with a Vitest test.** Every interaction change ships with a Playwright test.
- **Bundle-size budgets in `.size-limit.json` are not advisory.** A PR that blows one fails CI. Frame-time targets are product targets until a CI job exists.
- **PIXI shaders / filters: read the docs and source, never guess.** Custom `GlProgram` / `GpuProgram` / `Shader` / `Filter` work must be verified against the actual PIXI v8 source (or live docs at https://pixijs.com/8.x/guides) before writing. GLSL preamble handling, uniform-block conventions, and version-directive prepending differ between APIs and have burned us already. Cheap validation: ship a 5-line dummy shader (`finalColor = vec4(1, 0, 0, 1)`) into the playground and confirm it compiles before scaling up.
- **The Figma source is the canonical visual reference.** When in doubt about a visual choice, the Xen Figma file is the source of truth — not Claude's interpretation, not other editors. Reference assets live in `packages/theme-xen/reference/`. For interaction patterns Figma doesn't cover (palette behaviour, drag-from-pin to empty space, pin hover halo), established blueprint-style editors are useful inspiration, but the visual outcome must match Xen.

## Status

v0.7.0-beta.7 public beta. The library is implemented. The public API in [`STABLE-API.md`](STABLE-API.md) is not frozen. Live architecture: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Decisions: [`docs/adr/`](docs/adr/).
