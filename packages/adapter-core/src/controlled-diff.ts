import type { Edge, GraphChanges, GraphMirror, Node } from '@xenolithengine/graph-editor'

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

function sameEndpoints(a: Edge, b: Edge): boolean {
  return a.from.node === b.from.node && a.from.pin === b.from.pin
    && a.to.node === b.to.node && a.to.pin === b.to.pin
}

/** Edge half of {@link diffNodesToChanges}. Endpoint equality is by node id and pin id, so a
 *  fresh edge object with the same ends is not a change. A changed endpoint is `remove` then
 *  `add` of the same id — `applyChanges` skips an add while that id still exists, so the
 *  remove has to land first. */
export function diffEdgesToChanges(live: GraphMirror, nextEdges: readonly Edge[]): GraphChanges {
  const changes: GraphChanges = { nodes: [], edges: [], unsupported: [] }
  const byId = new Map(live.edges.map((e) => [e.id as string, e]))
  const seen = new Set<string>()
  for (const e of nextEdges) {
    const id = e.id as string
    seen.add(id)
    const prev = byId.get(id)
    if (!prev) {
      changes.edges.push({ type: 'add', edge: e })
    } else if (!sameEndpoints(prev, e)) {
      changes.edges.push({ type: 'remove', id: e.id })
      changes.edges.push({ type: 'add', edge: e })
    }
  }
  for (const prev of live.edges) {
    if (!seen.has(prev.id as string)) changes.edges.push({ type: 'remove', id: prev.id })
  }
  return changes
}
