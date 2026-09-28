# @xenolithengine/graph-mcp-server

[![BETA](https://img.shields.io/badge/status-BETA-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph#status)
[![MIT](https://img.shields.io/badge/license-MIT-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph/blob/main/LICENSE)

MCP (Model Context Protocol) server for XenolithGraph. Lets Claude Desktop, Cursor, or any MCP client drive a live editor in your browser over a localhost WebSocket bridge.

> **Beta** — public API in `STABLE-API.md` is the surface we plan to freeze, but it is **NOT frozen yet** — breaking changes can land at any point before v1.0. If you adopt now, pin an exact version.

## Architecture (Scenario A — desktop dev)

```
Claude Desktop ──stdio JSON-RPC──▶ xenolith-mcp (Node)
                                        │
                                        ▼
                              WebSocket bridge (127.0.0.1:7777)
                                        │
                                        ▼
                              Browser editor (editor.connectMCP)
```

- MCP client speaks stdio JSON-RPC to the CLI.
- The CLI hosts a localhost WS bridge.
- Your XenolithGraph editor opens a WS to the bridge and registers itself as the "current" world.
- Tool calls from Claude → CLI → WS → editor → result → back to Claude.

## Resources exposed

Read-only context the MCP client can **attach** to its prompt without spending a tool call. In Claude Desktop / Cursor, these show up in the attachment picker next to local files.

| URI | What |
|---|---|
| `graph://current` | The live graph as `xenolith.v1` JSON. Attach this to ask the AI to summarise / refactor / explain the current state. |
| `schema://types` | Every registered node type with pin & widget specs. Attach this so the AI doesn't have to call `list_node_types` every session — saves a roundtrip and 10× tokens against large registries (Comfy 60k+ types). |
| `audit://recent` | The bounded ring of agent mutations — one entry per mutating tool call: client id, tool, argument digest, effect deltas (nodes/edges ±), ok/error, monotonic seq, timestamp. Attach to review what the agent did. |

Resources route to the same WS bridge as tools; if no editor is connected they return an error blob instead of failing the MCP request.

## Tools exposed

26 tools. Every mutation routes through the editor's CommandBus, so undo/redo and events fire normally.

**Read / inspect** (not audited — cannot change the graph):

| Tool | What it does |
|---|---|
| `list_node_types` | Lists every registered node type with pins + widgets (so the LLM picks a real name). |
| `get_graph` | Returns the current graph as `xenolith.v1` JSON. |
| `find_nodes` | Search nodes by `type` / `category` / `titleContains`. |
| `describe_node` | One node in full: pins, widgets, values, incident edges. |
| `get_audit_log` | Reads the agent-mutation audit ring (same data as `audit://recent`). |
| `list_recipes` | Lists built-in + host recipes (pre-assembled subgraphs). |

**Mutate the document** (audited; enqueued in propose mode):

| Tool | What it does |
|---|---|
| `add_node` | Inserts a node by type at `(x, y)` (or the next free spot). Returns its id. |
| `connect_pins` | Connects two pins. Pin refs: id → label (case-insensitive) → numeric index → `'in'`/`'out'`. |
| `remove_node` / `disconnect_edge` | Delete a node / a wire (vetoable via the editor's preventable events). |
| `set_widget_value` | Writes an in-node widget value (undoable). Widget refs resolve id → key → label. |
| `create_macro` / `expand_macro` / `collapse_macro` | Group nodes into a collapsed macro, expand, collapse. |
| `instantiate_recipe` | Spawns a whole pre-assembled subgraph in one call; returns the id map. |
| `register_node_schema` | Registers a NEW node type (typed pins + widgets) so the agent can design, not just assemble. Re-registering an existing type is an error with guidance. |
| `auto_layout` | Layered DAG layout (`LR`/`TB`), then fits the view. |

**View / chrome** (state changes, not graph data):

| Tool | What it does |
|---|---|
| `fit_view` | Fits the whole graph into the viewport. |
| `select_nodes` / `clear_selection` | Drive the editor selection. |
| `dive_into_template` / `dive_out` | Navigate into/out of template definitions. |
| `set_category_palette` / `set_theme` | Recolour categories / swap the editor theme. |
| `screenshot` / `node_screenshot` | PNG/JPEG of the whole graph or one node — the agent can LOOK at what it built. |

## Proposal mode — "agent proposes, human approves" (ADR 0007)

```js
await editor.connectMCP('ws://127.0.0.1:7777?token=devtoken', { mode: 'propose' })
```

In propose mode every **mutating** tool call ENQUEUES instead of applying — the tool returns
`{ proposed: true, proposalId, provisionalNodeId?, queued }` so the agent knows its edit is
pending. Read tools stay live against the pre-approval graph. The built-in review UI (a badge +
panel in the editor) lets a human **Approve all** — the batch replays inside ONE command-bus
transaction (atomic: any failure rolls the whole batch back and the queue survives for retry;
one undo step) — or reject. Provisional node ids returned by `add_node` /
`instantiate_recipe` chain through later proposals in the same batch; approval re-resolves
everything against the CURRENT graph.

Honest limits, stated plainly:

- The boundary binds only sessions that opted in — an `auto` session on the same editor mutates freely. Run propose-mode as the only connection for a hard wall.
- Edge ids are NOT translated at approval (chained `disconnect_edge` by a proposed edge id needs a re-fetch via `find_nodes` after approval).
- `clientId` is transport-provided identity, NOT authentication.
- Audit entries land at APPROVAL (proposing changes nothing, so it audits nothing).

---

## How to test (full walkthrough)

### 1. Build the workspace

```bash
pnpm install
pnpm --filter @xenolithengine/graph-editor build
pnpm --filter @xenolithengine/graph-mcp-server build
chmod +x packages/mcp-server/dist/cli.js
```

### 2. Start the MCP server (separate terminal)

```bash
node packages/mcp-server/dist/cli.js --port 7777 --token devtoken
```

It prints to stderr:

```
[xenolith-mcp] bridge listening on ws://127.0.0.1:7777

  XenolithGraph MCP server ready.
  Editor URL  →  ws://127.0.0.1:7777?token=devtoken
  In the browser console of your XenolithGraph host, run:
      editor.connectMCP('ws://127.0.0.1:7777?token=devtoken')
```

stdout is reserved for the MCP JSON-RPC framing — never log there.

> The CLI is **always-on stdio**. When you run it manually like above without an MCP client attached, it just sits waiting. Ctrl+C to stop.

### 3. Wire the editor in the browser

Open the playground (`pnpm playground`) or any host that mounts a XenolithGraph editor. In DevTools console:

```js
await window.__xenoEditor.connectMCP('ws://127.0.0.1:7777?token=devtoken', {
  onStatus: (s) => console.log('[mcp]', s),
})
```

You should see `[mcp] connecting` → `[mcp] open` and the CLI stderr prints `editor connected (e1); 1 total`.

### 4. Drive it from a temporary local MCP client (no Claude Desktop needed)

Quick smoke without going through Claude — use the MCP SDK as a client:

```bash
cat > /tmp/mcp-smoke.mjs <<'EOF'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const transport = new StdioClientTransport({
  command: 'node',
  args: ['packages/mcp-server/dist/cli.js', '--port', '7777', '--token', 'devtoken'],
})
const client = new Client({ name: 'smoke', version: '0' })
await client.connect(transport)

console.log('tools:', (await client.listTools()).tools.map((t) => t.name))
console.log('add_node →', await client.callTool({ name: 'add_node', arguments: { type: 'Box', x: 100, y: 100 } }))
console.log('graph →', await client.callTool({ name: 'get_graph', arguments: {} }))

await client.close()
EOF
cd /Users/vitaliyry/PET_PROJECTS/xenolith-graph && node /tmp/mcp-smoke.mjs
```

> Note: this client spawns its OWN CLI process, so kill the manual one from step 2 first (or pass a different `--port`). The browser editor must already be connected to whichever bridge port the client uses.

If everything works you'll see a `Box` node appear in the browser playground and the tool result JSON in the terminal.

### 5. Hook into Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "xenolith": {
      "command": "npx",
      "args": ["-y", "@xenolithengine/graph-mcp-server", "--port", "7777", "--token", "devtoken"]
    }
  }
}
```

Developing against a local checkout instead? Point the config at your build:

```json
{
  "mcpServers": {
    "xenolith": {
      "command": "node",
      "args": [
        "/path/to/xenolith-graph/packages/mcp-server/dist/cli.js",
        "--port", "7777",
        "--token", "devtoken"
      ]
    }
  }
}
```

Also installable from the Smithery registry via [`smithery.yaml`](./smithery.yaml).

Restart Claude Desktop. In a new chat you'll see a tools icon (🔧). Ask:

> "Use the xenolith add_node tool to add a Box node at (200, 200)."

Claude will call the tool, the bridge forwards it, and the node pops into your browser editor.

### 6. Troubleshooting

- **`no editor connected`** — the browser tab didn't run `connectMCP` (or it disconnected). Re-run in console.
- **`bad token`** — the URL you pasted has a different token than the CLI was started with.
- **port already in use** — kill the previous process or pick `--port 7778`. Update the editor URL to match.
- **Claude doesn't see the tools** — Claude Desktop only re-reads the config on restart; quit it fully (Cmd+Q), not just close the window.
- **Tool times out** — defaults to 5s. The editor probably threw or you're paused in DevTools.

## Programmatic embedding

```ts
import { EditorBridge, createMcpServer, startStdio } from '@xenolithengine/graph-mcp-server'

const bridge = new EditorBridge({ port: 7777, token: 'mytoken' })
await bridge.start()
const mcp = createMcpServer(bridge)
await startStdio(mcp)
```
