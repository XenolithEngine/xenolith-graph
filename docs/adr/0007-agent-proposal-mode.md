# ADR 0007 — Agent proposal mode ("agent proposes — human approves")

Date: 2026-09-28 · Status: accepted (implemented in Track C / Bet 1b)

## Context

The product bet: AI agents BUILD graphs, humans DEBUG them. Full-auto agent mutation is fine
for demos and drafts; production hosts want a trust boundary — the agent's changes wait in a
review queue until a human approves them. This must ride the EXISTING surfaces (MCP tools,
command bus, audit log) without a second mutation path.

## Decision

1. **Mode, not a second protocol.** `connectMCP(url, { mode: 'propose' })` (or
   `buildHandlers(surface, { mode: 'propose' })`). Default stays `'auto'` — mutations apply
   immediately. **Trust implication, stated plainly:** the boundary binds only sessions that
   opted in; an `auto` session on the same editor mutates freely. Hosts wanting a hard wall
   run propose-mode as the only connection.
2. **Mutating tools enqueue; reads stay live.** In propose mode every audited (mutating) tool
   returns `{ proposed: true, proposalId, … }` instead of applying. Read/view tools execute
   against the real (pre-approval) graph — the agent can inspect what it is proposing against.
3. **Approval = ONE command-bus transaction.** `editor.mcpProposals.approve()` replays the
   batch FIFO; the editor's `commandBus.transaction` makes it one undo step and ATOMIC — any
   failure rolls the whole batch back and the queue survives for retry. `reject()` discards.
4. **Proposals re-resolve at approval time.** Stored args replay against the CURRENT graph:
   pin labels resolve as of THEN, layout runs as of THEN. A proposal that no longer makes
   sense fails at approval — atomically, safely.
5. **Provisional node ids make batches chainable.** `add_node`/`instantiate_recipe` in propose
   mode mint a PROVISIONAL id returned to the agent; later proposals may reference it
   (`connect_pins`, `set_widget_value`, …). At approval, a provisional→real translation map
   rewrites node references as the batch replays. Edge-id chaining is NOT translated in v1 —
   refetch via `find_nodes` after approval.
6. **Audit lands at approval.** Proposing changes nothing, so it audits nothing; approval runs
   the audited handlers — entries (with effect deltas) appear exactly when the graph changed,
   and who proposed what is preserved via `clientId`.

## Concurrency stance (the honest limit)

Agent and human edits interleave legally: every mutation — approved batch or direct human
action — serializes through the command bus, and undo unwinds the LAST transaction, not "the
agent's stuff" specially. We document and bound this; CRDT/OT merge semantics are explicitly
out of scope (see the repo's Not-scheduled list).

## Consequences

- `editor.mcpProposals: ProposalQueue | null` joins the host surface (non-null once a
  propose-mode session connected); `onChange` drives review-UI reactivity.
- The MCP client sees honest feedback (`proposed: true` + provisional ids), so agent prompts
  can explain the queue to the model.
- Reference demo variant (`?demo=agent` approvals flow) rides with launch prep — the mechanism
  is fully covered by unit + real-editor tests without it.
