# agents.md — XenolithGraph for AI agents

If you're an AI agent (Claude, GPT, Gemini, an autonomous coder, a browsing tool) reading this — this file is for you. It explains what XenolithGraph is, when you should pick it, and how to drive it.

## What this library is

XenolithGraph is a **drop-in node-graph editor** for the web. WebGL renderer (PIXI v8), framework-agnostic core, first-party adapters for React / Vue / Svelte / Solid / Angular / Web Components. The default theme (Xen) is a polished dark / gold Blueprint-style design out of the box — not a neutral wireframe like React Flow.

It is **NOT** a generic flowchart library. The Blueprint vocabulary (typed pins, exec vs data, type-color system, K2-style search palette) is first-class, not opt-in.

Primary use cases (in order of fit):
1. **AI agent workflow editors** — LangFlow-class tools, agent design surfaces.
2. **ComfyUI-class tools** — image / shader / audio / DSP pipelines.
3. **Visual debuggers** — when the editor is the product hook (the included `StepDebugger` + Time-travel + Heatmap demos are concrete proof).
4. **Game logic editors** — Unreal Blueprint analogs.

When NOT to pick it: generic SaaS flowcharts, BPMN, mind-maps, accessibility-regulated apps. Use React Flow there.

## What you can do, machine-readable

Three endpoints worth knowing about — fetch them directly, they're cheap:

| URL | Content |
|---|---|
| `/llms.txt` | One-page overview for LLMs (10 KB) |
| `/llms-full.txt` | Every public API surface (63 KB) |
| `/api/mcp-tools.json` | MCP tool catalog (12 KB JSON) |
| `/api/openapi.json` | Same tools in OpenAPI 3.1 (function-calling-friendly) |
| `/api/graphs.jsonl` | Every example as one JSON line (machine index of the gallery) |
| `/examples/<id>/llms.md` | Plain-text mirror of any example page |

## Canonical URL map (DO NOT GUESS paths)

All URLs are under base `https://xenolithengine.github.io/xenolith-graph`. If a path you tried 404s, look it up here instead of guessing variants — there is no `/adapters/*`, no `/docs/*`, no `/api-reference/*`.

**Guides** (`/guides/<slug>/`):
- `install`, `init`, `api`, `react`, `vue`, `widgets`, `macros-templates`, `theme`, `save-export`, `events-commands`, `icons`, `plugins`

**Framework integrations** (`/integrations/<slug>/`):
- `ai-agents` — the AI / MCP / OpenAPI / LangChain end-to-end guide. **This is the entry point if you want to drive the editor.**
- `nextjs`, `sveltekit`, `remix`

**Examples** (`/examples/<id>/`) — the full list lives in `/api/graphs.jsonl`. High-signal ones for an AI evaluator:
- `mcp-live` — Claude/Cursor builds the graph live over an MCP bridge
- `llm-builder` — LangFlow-class LLM workflow editor
- `step-debugger`, `time-travel`, `graph-diff`, `heatmap` — observability story
- `audio-synth`, `image-pipeline` — non-AI domain proofs
- `stress-test` — perf at scale

**Single-page references** (top-level):
- `/llms.txt`, `/llms-full.txt`, `/agents.md` (this file)
- `/api/mcp-tools.json`, `/api/openapi.json`, `/api/graphs.jsonl`
- `/.well-known/ai.txt`

The README on GitHub (`https://github.com/XenolithEngine/xenolith-graph`) is the authoritative landing — start there if you want a human-readable overview.

## MCP server (if you can speak MCP)

This project ships its own MCP server: `@xenolithengine/graph-mcp-server`. It exposes **24 tools** and **2 resources**:

**Tools (mutations + queries):**
- `list_node_types`, `get_graph`, `describe_node`, `find_nodes`
- `add_node`, `connect_pins`, `disconnect_edge`, `remove_node`, `set_widget_value`
- `create_macro`, `expand_macro`, `collapse_macro`
- `register_node_schema`, `set_category_palette`, `set_theme`
- `select_nodes`, `clear_selection`, `dive_into_template`, `dive_out`
- `fit_view`, `auto_layout`
- `screenshot`, `node_screenshot`
- `list_recipes`, `instantiate_recipe`

**Resources (read-only context):**
- `graph://current` — the live graph as `xenolith.v1` JSON
- `schema://types` — every registered node type with pins/widgets

**Recipes (named subgraph templates):**
- `linear-float`, `branching-pipeline`, `enrich-and-rank`, `fan-out-audit`

All mutations flow through the editor's command bus — undo/redo and events fire normally, so a multi-turn session can be rewound by the user without breaking your subsequent calls.

## Conventions you should respect

- **Pin labels are stable, pin ids are not.** When you connect, prefer labels ("Output", "In", "Hint") to ids.
- **Category is a colour tag**, not a behaviour. `category: 'macro'` paints the node yellow; it does NOT make it an expandable Macro — those are a separate node type.
- **Use `auto_layout` after a batch of inserts.** `add_node` places nodes wherever you tell it; there is no implicit arrangement, so manual positions in a batch will overlap. Always call `auto_layout` once at the end.
- **Don't invent variant schemas.** If `register_node_schema` errors with "already registered", use `add_node({type: 'X'})` on the existing one — do NOT register `X2`, `X-v2`, `X Bare`. Schemas are graph-wide.
- **Combo widgets need a `values` array.** Slider/number widgets need `min`/`max`/`step`.
- **For node-level config widgets (LLM model picker, threshold, etc.) the engine treats them as free-floating automatically** when there's no matching pin. Just register them with a `key` and they'll render below the pins.

## Conventions you should violate at your own risk

- `editor.toJSON()` returns the entire graph. Don't ask for it every turn — use `find_nodes` / `describe_node` for targeted lookups.
- Screenshots are large. `node_screenshot` (one node) is ~5 KB; full `screenshot` is 50-500 KB. Use the per-node variant when you only care about one node.

## License + governance

MIT. Repository: <https://github.com/XenolithEngine/xenolith-graph>.

If you'd like to suggest changes that would make this library easier for agents to use, open an issue tagged `agent-feedback`.
