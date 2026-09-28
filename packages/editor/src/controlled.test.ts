// Unit contract for the E5 pure pieces: the store reducer, the replace-burst builder and the
// applyChanges echo rules (command mapping is covered end-to-end by test-utils' real-editor
// suite; this file keeps the pure invariants fast and headless).
import { describe, it, expect } from 'vitest'
import { reduceGraphChanges, documentReplacedChanges, type GraphMirror, type GraphChanges } from './controlled.js'
import type { Node, Edge } from '@xenolithengine/graph-core'

const node = (id: string, x = 0, y = 0): Node =>
  ({ id: id as never, type: 'T', position: { x, y }, state: {}, pins: [] }) as Node
const edge = (id: string, from: string, to: string): Edge =>
  ({ id: id as never, from: { node: from as never, pin: 'p' as never }, to: { node: to as never, pin: 'p' as never } })

const mirror = (nodes: Node[], edges: Edge[] = []): GraphMirror => ({ nodes, edges })

describe('reduceGraphChanges', () => {
  it('add/remove/position/data fold into the snapshot', () => {
    let m = mirror([node('a'), node('b')])
    m = reduceGraphChanges(m, { nodes: [{ type: 'add', node: node('c', 5, 5) }], edges: [], unsupported: [] })
    expect(m.nodes.map((n) => n.id)).toEqual(['a', 'b', 'c'])
    m = reduceGraphChanges(m, { nodes: [{ type: 'remove', id: 'a' as never }], edges: [], unsupported: [] })
    expect(m.nodes.map((n) => n.id)).toEqual(['b', 'c'])
    m = reduceGraphChanges(m, { nodes: [{ type: 'position', id: 'b' as never, position: { x: 9, y: 9 } }], edges: [], unsupported: [] })
    expect(m.nodes[0]!.position).toEqual({ x: 9, y: 9 })
    m = reduceGraphChanges(m, { nodes: [{ type: 'data', id: 'b' as never, state: { k: 1 } }], edges: [], unsupported: [] })
    expect(m.nodes[0]!.state).toEqual({ k: 1 })
  })

  it('is PURE — the input snapshot is not mutated', () => {
    const before = mirror([node('a', 1, 1)])
    const snapshotOfBefore = JSON.stringify(before)
    reduceGraphChanges(before, { nodes: [{ type: 'position', id: 'a' as never, position: { x: 2, y: 2 } }], edges: [], unsupported: [] })
    expect(JSON.stringify(before)).toBe(snapshotOfBefore)
  })

  it('re-adding an existing id replaces it in place; removing a missing id is a no-op', () => {
    let m = mirror([node('a', 0, 0)])
    m = reduceGraphChanges(m, { nodes: [{ type: 'add', node: node('a', 7, 7) }], edges: [], unsupported: [] })
    expect(m.nodes).toHaveLength(1)
    expect(m.nodes[0]!.position).toEqual({ x: 7, y: 7 })
    m = reduceGraphChanges(m, { nodes: [{ type: 'remove', id: 'ghost' as never }], edges: [], unsupported: [] })
    expect(m.nodes).toHaveLength(1)
  })

  it('edges add/remove mirror the node rules', () => {
    let m = mirror([node('a'), node('b')], [edge('e1', 'a', 'b')])
    m = reduceGraphChanges(m, { nodes: [], edges: [{ type: 'add', edge: edge('e2', 'b', 'a') }], unsupported: [] })
    expect(m.edges).toHaveLength(2)
    m = reduceGraphChanges(m, { nodes: [], edges: [{ type: 'remove', id: 'e1' as never }], unsupported: [] })
    expect(m.edges.map((e) => e.id)).toEqual(['e2'])
  })

  it('documentReplacedChanges converges an old mirror onto a new document', () => {
    const before = mirror([node('a'), node('b')], [edge('e1', 'a', 'b')])
    const after = mirror([node('b'), node('c')], [edge('e2', 'b', 'c')])
    const changes: GraphChanges = documentReplacedChanges(before, after)
    let m = before
    m = reduceGraphChanges(m, changes)
    expect(m.nodes.map((n) => n.id).sort()).toEqual(['b', 'c'])
    expect(m.edges.map((e) => e.id)).toEqual(['e2'])
  })
})
