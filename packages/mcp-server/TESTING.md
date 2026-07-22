# Testing `@xenolithengine/graph-mcp-server` end-to-end

This walks through driving the editor from Claude Desktop / Cursor through MCP. The flow is:

```
Claude Desktop ─stdio MCP─→ xenolith-mcp CLI ─WS─→ browser editor (XenolithGraph)
```

## 1. Build + start the server

```sh
# From the repo root:
pnpm install
pnpm -r --filter '@xenolithengine/graph-mcp-server' build
node packages/mcp-server/dist/cli.js --port 7777 --token devtoken
```

The CLI prints a connection URL to **stderr** (stdout is reserved for the MCP protocol):

```
xenolith-mcp listening on ws://127.0.0.1:7777?token=devtoken
```

Leave it running.

## 2. Open the editor + connect

In another terminal, start the site:

```sh
pnpm --filter @xenolithengine/site dev
```

Open <http://localhost:4321/examples/mcp-live/>. The MCP panel is top-left:

1. The URL field should already be `ws://127.0.0.1:7777?token=devtoken`.
2. Click **Connect**. The dot turns green and the log says `status: open`.

The editor starts EMPTY — schemas (`Source`, `Sample`, `Filter`, `Cache`, `Transform`, `Validate`, `Enrich`, `Score`, `Resolve`, `Format`, `Display`, `Audit`, `Persist`, `Notify`, `Archive`) are registered but no nodes exist yet.

## 3. Wire Claude Desktop (optional but the real point)

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "xenolith": {
      "command": "node",
      "args": [
        "/absolute/path/to/xenolith-graph/packages/mcp-server/dist/cli.js",
        "--port", "7777",
        "--token", "devtoken"
      ]
    }
  }
}
```

Restart Claude Desktop. The `xenolith` server should appear in the MCP section. The editor's MCP panel will show `connected` when Claude connects.

If you prefer to test the protocol directly without Claude, use a minimal MCP client (any one of [the SDK examples](https://modelcontextprotocol.io)) pointed at `node packages/mcp-server/dist/cli.js`.

## 4. The omnibus test prompt

Paste this into Claude (or any MCP client) once both ends are connected. It exercises the AI-native bundle — recipes, schema registration, palette theming, screenshots — in one flow:

> Build me a small AI-style observability scaffold and theme it for a demo:
>
> 1. First call `list_recipes` so you know what's available, then `instantiate_recipe` with `branching-pipeline`. Call `auto_layout` after — the recipe stacks at the origin.
> 2. Define a new node type called `LLMCall` with `register_node_schema`: category `macro`, one input pin labelled `Prompt` of type `string`, one output pin labelled `Response` of type `string`, and a `model` combo widget. Then `add_node` one instance of it.
> 3. Use `find_nodes` to locate the `Resolve` node from the recipe, `describe_node` to see its pin labels, then `connect_pins` from `Resolve.Out` to `LLMCall.Prompt` (mind the pin labels). Call `auto_layout` again to re-tidy.
> 4. Apply a high-contrast demo palette with `set_category_palette`: `data` → `#3b82f6`, `logic` → `#ef4444`, `macro` → `#eab308`, `utility` → `#10b981`.
> 5. Take a `screenshot` and a `node_screenshot` of the LLMCall node so I can see how the new colour landed.
> 6. Report what you did in one sentence.

What you should see in the editor while Claude runs that:

- A 6-node fan-out pipeline appears (Source + Sample + Filter + Audit + Resolve + Display), wired with arrows.
- A new `LLMCall` node lands somewhere and joins the chain after `Resolve`.
- Every node pill recolours: blue / red / yellow / green by category.
- Two PNGs come back in Claude's chat: the whole graph + the single LLMCall node.

If any step fails, Claude gets a structured error back through MCP and usually self-corrects on the next turn. The most common failure is **pin labels** — the recipe uses `Output` / `In` / `Out` / `Hint`; the AI sometimes makes up other names. The error message lists the available pins so the retry lands.

## 5. Smaller drills (when the omnibus is overkill)

| Want to test | One-liner prompt |
|---|---|
| Recipes only | "Call `list_recipes` and instantiate `linear-float`. Then `auto_layout`." |
| Schema registration | "Register a `Logger` node type (category data, in pin labelled `In` of type `any`, out pin labelled `Out` of type `any`), then add one." |
| Palette only | "Set the category palette: data=#3b82f6, logic=#ef4444, macro=#eab308." |
| Screenshots | "Take a screenshot of the current graph at 1× scale." |
| Per-node screenshot | "Find the Resolve node, then `node_screenshot` it." |
| Theme tokens | "Set theme tokens: color.accent='#ff66aa'." |

## 6. Common gotchas

- **`connect_pins: pin not found`** — the AI made up a pin label. The error response lists what's available; the next attempt usually works.
- **`recipe needs these node types to be registered first: ...`** — instantiate failed because a recipe needs schemas the host didn't register. The MCP demo registers all `demoSchemas` up-front, so this only happens on a custom host. Solution: `register_node_schema` each missing type first.
- **Screenshot tools throw `editor.exportImage not available`** — the host you connected to isn't a real PIXI editor (test harness?). The MCP demo's editor supports both.
- **Connection silently drops** — the CLI logs WS state to stderr; check there. Token mismatch is the usual cause.
- **`set_widget_value: widget '...' not found`** — pass the widget `key` (e.g. `model`, `prompt`) not its full id; `describe_node` lists both.
