# ADR 0006 — Commit-time controlled protocol (`graph:changed` + `applyChanges`)

Date: 2026-09-28 · Status: accepted (implemented in Track E / E5)

## Context

React teams evaluating XenolithGraph ask for the React Flow controlled pattern: mirror the
graph in Redux/Zustand via `onNodesChange` + apply changes back. Our existing surface is
uncontrolled-only: read-side hooks (`useNodes`, …) plus imperative mutations.

React Flow's model re-renders the host component tree on **every drag frame** — a documented
anti-pattern at scale (their own mitigation flags exist). Our renderer owns positions until
commit; adopting per-frame prop sync would import the disease the WebGL renderer exists to cure.

## Decision

**Coalesced change-arrays at COMMAND-BUS COMMIT time. No per-frame emissions.**

1. **Payload.** `editor.on('graph:changed', changes)` fires with one `GraphChanges`
   (see `packages/editor/src/controlled.ts`):

   ```ts
   type NodeChange =
     | { type: 'add'; node: Node }                                  // full record
     | { type: 'remove'; id: NodeId }
     | { type: 'position'; id: NodeId; position: Vec2 }              // committed position
     | { type: 'data'; id: NodeId; state?; widgets?; pins? }         // post-change snapshot
   type EdgeChange =
     | { type: 'add'; edge: Edge }                                   // full record
     | { type: 'remove'; id: EdgeId }
   interface GraphChanges { nodes: NodeChange[]; edges: EdgeChange[]; unsupported: string[] }
   ```

   Kinds are deliberately React-Flow-legible (`add/remove/position/data`). Xenolith-specific
   structure (pins, widgets) rides `data` as partial post-snapshots. `unsupported` lists
   command types the translator does not map (comments, macros, templates in v1) — the array
   is never silently incomplete.

2. **Coalescing granularity = command-bus commit.**
   - Commands applied inside `transaction()` or an undo **group** (drag-move ticks,
     widget edits) buffer silently; **one** `graph:changed` fires on
     `transaction:committed` (groups reuse that event via `endGroup`).
   - A top-level single command emits its own array immediately.
   - `transaction:reverted` discards the buffer — rolled-back work never emits.
   - Undo/redo of a multi-command history entry emits **one** array (core fires
     `history:undone` / `history:redone` per history entry; the bridge translates with the
     inverse direction — undoing an add emits `remove`, restoring a pruned edge emits `add`).

3. **`editor.applyChanges(changes)`** maps arrays back onto the SAME core commands
   (`AddNode`/`RemoveNode`/`MoveNode`/`SetNodeState`/`SetNodeWidgets`/`SetNodePins`/
   `ConnectPins`/`DisconnectEdge`) inside one `transaction()` — one undo step per call, and
   (by rule 2) one `graph:changed` echo. **Idempotence is load-bearing**: `add` of an existing
   id, `remove` of a missing id, and `position` writes equal to current are skipped, so a host
   that pipes the echo straight back into `applyChanges` converges instead of looping.

4. **Pure reducer for stores.** `reduceGraphChanges(snapshot, changes)` folds an array into a
   plain snapshot (`{ nodes: Node[], edges: Edge[] }`) — the Zustand/Redux integration point.
   The React `useNodesState()` hook is a thin wrapper over editor + reducer; it does NOT
   re-render per drag frame (positions land via the commit-time array only).

## What we explicitly refuse

- Per-frame `onNodesChange` position spew (React Flow's model). Positions are renderer-owned
  until pointer-up; the host sees the COMMIT.
- Reconciliation host→editor via props diffing on every render (`nodes={…}`). `setNodes`
  exists as an explicit one-shot diff, not a controlled-prop mode.
- Silent drops: unmapped commands surface via `unsupported`.

## Consequences

- `graph:changed` becomes public contract (STABLE-API, event #25); its payload shape is
  frozen at v1.0 with the rest of the surface.
- Drag-time host stores lag by design (up to one drag session); selection/viewport stay
  read-side hooks (they are view state, not document state).
- Comments/macros/templates do not ride v1 arrays; when they do, it will be an additive
  change-kind, not a shape break.
