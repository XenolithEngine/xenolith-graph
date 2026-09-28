---
title: Human-in-the-loop agent editing
description: Let the AI agent PROPOSE graph changes and the human APPROVE them — a review queue built on the MCP surface, one undo step per approved batch, full audit trail.
---

The product bet is "agents build, humans debug". Full-auto mutation is fine for drafts; for
production you want a trust boundary. Proposal mode ([ADR
0007](https://github.com/XenolithEngine/xenolith-graph/blob/main/docs/adr/0007-agent-proposal-mode.md))
gives you exactly that on the existing MCP surface — no second protocol.

## Turn it on

```ts
const disconnect = await editor.connectMCP('ws://localhost:6410/ws?token=…', {
  mode: 'propose',          // default is 'auto' — mutations apply immediately
  clientId: 'support-agent',
})
const queue = editor.mcpProposals!   // non-null once a propose-mode session connected
```

**Trust boundary, stated plainly:** the boundary binds sessions that opted in. An `auto`
session on the same editor mutates freely — if you want a hard wall, run propose-mode as the
only connection.

## What the agent sees

Mutating tool calls stop applying. Each returns an honest receipt:

```json
{ "proposed": true, "proposalId": 7, "provisionalNodeId": "01a0…", "queued": 3 }
```

…so agent prompts can explain the queue to the model. Node-minting tools (`add_node`,
`instantiate_recipe`) hand out **provisional ids** the agent can chain in later proposals
(`connect_pins`, `set_widget_value`, …) — approval translates them to the real ids. Read/view
tools (`get_graph`, `find_nodes`, …) still run LIVE against the pre-approval graph.

## The review queue

```ts
queue.entries()        // [{ id, ts, clientId, tool, summary, args }, …] oldest first
queue.onChange(size => renderBadge(size))

queue.approve()        // ONE command-bus transaction: one undo step, ATOMIC
queue.reject()         // discard everything (or pass ids)
```

## The built-in review panel

You don't have to build any UI: from the first propose-mode connection the editor shows a
**badge** while proposals wait, and clicking it opens the built-in review panel — each pending
op with its tool, args digest, predicted effect, and client identity (labelled
transport-provided, not authenticated), plus **Approve all** / **Reject all** and per-entry
discard. Approve all routes through `queue.approve()` — the whole batch is one atomic undo step.

```ts
editor.chrome.showProposals()          // open the panel (false if no propose session ever connected)
editor.chrome.hideProposals()
editor.chrome.isProposalsVisible       // boolean
```

Declarative wrappers — mount → open, unmount → hide (they render no DOM of their own):

```tsx
<XenolithGraph …>
  <XenolithProposalQueue />            {/* from @xenolithengine/graph-react */}
</XenolithGraph>
```

```vue
<XenolithGraph …>
  <XenolithProposalQueue />            <!-- from @xenolithengine/graph-vue -->
</XenolithGraph>
```

Hosts that want a fully custom review UI simply never open the built-in panel and use
`editor.mcpProposals` directly (below).

Semantics worth knowing (ADR 0007):

- **Atomic batches.** Approve replays the queue in order inside one transaction. Any failure
  rolls the WHOLE batch back — the queue survives for retry.
- **Re-resolution at approval.** Proposals replay against the CURRENT graph: pin labels and
  layout resolve as of approval time, not proposal time. A stale proposal fails safely.
- **Undo is per-transaction.** One Ctrl+Z reverts the last approved batch (or the last human
  action) — agent and human edits interleave legally through the serialized bus. No CRDT
  magic; concurrent editing merge semantics are explicitly out of scope.
- **Audit lands at approval.** Proposing changes nothing and audits nothing; when the batch
  applies, the audit ring records it with effect deltas and the proposing `clientId`
  ([audit log](/integrations/ai-agents/)).

## A minimal custom review UI

```tsx
function AgentInbox() {
  const editor = useEditor()
  const [size, setSize] = useState(0)
  useEffect(() => editor?.mcpProposals?.onChange(setSize) ?? undefined, [editor])
  if (!size) return null
  return (
    <XenolithPanel position="top-right">
      <b>{size} agent proposals</b>
      <XenolithButton onClick={() => editor!.mcpProposals!.approve()}>Approve all</XenolithButton>
      <XenolithButton onClick={() => editor!.mcpProposals!.reject()}>Reject</XenolithButton>
    </XenolithPanel>
  )
}
```

Render it inside `<XenolithGraph>`; the queue API is synchronous, so plain state + the
`onChange` hook is all the reactivity you need.
