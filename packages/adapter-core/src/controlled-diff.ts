import type { GraphChanges, GraphMirror, Node } from '@xenolithengine/graph-editor'

/** Incremental node diff for the write side of the controlled triple (E5 / ADR 0006) — shared
 *  by every adapter's `setNodes`: builds ONE `GraphChanges` batch from a live mirror and the
 *  next nodes array, so the whole update lands on the editor as a single undo step.
 *
 *  Diffing is deliberately shallow, matching React Flow migrant expectations: position by
 *  coordinates (a fresh object with identical x/y is NOT a change), state by reference. Not to
 *  be confused with `documentReplacedChanges` (editor) — that one is the full remove-all +
 *  add-all burst for document swaps and would balloon the undo payload of an incremental edit. */
export function diffNodesToChanges(live: GraphMirror, nextNodes: readonly Node[]): GraphChanges {
  const changes: GraphChanges = { nodes: [], edges: [], unsupported: [] }
  const byId = new Map(live.nodes.map((n) => [n.id as string, n]))
  const seen = new Set<string>()
  for (const n of nextNodes) {
    const id = n.id as string
    seen.add(id)
    const prev = byId.get(id)
    if (!prev) {
      changes.nodes.push({ type: 'add', node: n })
    } else {
      if (prev.position.x !== n.position.x || prev.position.y !== n.position.y) {
        changes.nodes.push({ type: 'position', id: n.id, position: { ...n.position } })
      }
      if (prev.state !== n.state) {
        changes.nodes.push({ type: 'data', id: n.id, state: { ...n.state } })
      }
    }
  }
  for (const prev of live.nodes) {
    if (!seen.has(prev.id as string)) changes.nodes.push({ type: 'remove', id: prev.id })
  }
  return changes
}
