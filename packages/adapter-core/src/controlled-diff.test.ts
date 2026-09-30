import { describe, it, expect } from 'vitest'
import { diffEdgesToChanges, diffNodesToChanges } from './controlled-diff.js'
import type { Edge, GraphMirror, Node } from '@xenolithengine/graph-editor'

// Nodes are treated as immutable records: the same state REFERENCE means "unchanged". Tests that
// don't care about state share this frozen bag so they don't accidentally assert data deltas.
const SAME_STATE: Record<string, unknown> = {}
const n = (id: string, x = 0, y = 0, state: Record<string, unknown> = SAME_STATE): Node =>
  ({ id, type: 'Box', position: { x, y }, state, pins: [] }) as unknown as Node

const mirror = (nodes: readonly Node[]): GraphMirror => ({ nodes: [...nodes], edges: [] })

describe('diffNodesToChanges (write side of the controlled triple, ADR 0006)', () => {
  it('emits nothing for identical node arrays', () => {
    const live = mirror([n('a', 1, 2)])
    expect(diffNodesToChanges(live, live.nodes)).toEqual({ nodes: [], edges: [], unsupported: [] })
  })

  it('emits add for nodes not in the live mirror', () => {
    const added = n('b', 5, 5)
    const out = diffNodesToChanges(mirror([n('a')]), [n('a'), added])
    expect(out.nodes).toEqual([{ type: 'add', node: added }])
    expect(out.edges).toEqual([])
  })

  it('emits position by coordinate comparison (same values = no change)', () => {
    const out = diffNodesToChanges(
      mirror([n('a', 1, 2)]),
      [n('a', 1, 2)], // fresh object, identical coordinates → NOT a change
    )
    expect(out.nodes).toEqual([])
  })

  it('emits position delta when coordinates differ', () => {
    const out = diffNodesToChanges(mirror([n('a', 1, 2)]), [n('a', 3, 4)])
    expect(out.nodes).toEqual([{ type: 'position', id: 'a', position: { x: 3, y: 4 } }])
  })

  it('emits data delta when the state reference differs', () => {
    const out = diffNodesToChanges(mirror([n('a', 0, 0, { v: 1 })]), [n('a', 0, 0, { v: 1 })])
    expect(out.nodes).toEqual([{ type: 'data', id: 'a', state: { v: 1 } }])
  })

  it('emits remove for live nodes missing from next', () => {
    const out = diffNodesToChanges(mirror([n('a'), n('b')]), [n('b')])
    expect(out.nodes).toEqual([{ type: 'remove', id: 'a' }])
  })

  it('mixes add + position + data + remove into ONE batch', () => {
    const fresh = n('c', 9, 9)
    const out = diffNodesToChanges(
      mirror([n('a', 0, 0, { v: 1 }), n('b')]),
      [n('a', 7, 8, { v: 2 }), fresh],
    )
    expect(out.nodes).toEqual([
      { type: 'position', id: 'a', position: { x: 7, y: 8 } },
      { type: 'data', id: 'a', state: { v: 2 } },
      { type: 'add', node: fresh },
      { type: 'remove', id: 'b' },
    ])
    expect(out.unsupported).toEqual([])
  })
})

const edge = (
  id: string,
  fromNode = 'a',
  toNode = 'b',
  fromPin = 'out',
  toPin = 'in',
): Edge => ({ id, from: { node: fromNode, pin: fromPin }, to: { node: toNode, pin: toPin } }) as Edge

const withEdges = (edges: readonly Edge[]): GraphMirror => ({ nodes: [], edges: [...edges] })

describe('diffEdgesToChanges (edge half of the controlled triple)', () => {
  it('emits nothing when endpoints match, even if the edge objects are fresh', () => {
    const live = withEdges([edge('e1')])
    expect(diffEdgesToChanges(live, [edge('e1')])).toEqual({ nodes: [], edges: [], unsupported: [] })
  })

  it('emits add for edges not in the live mirror', () => {
    const added = edge('e2')
    const out = diffEdgesToChanges(withEdges([edge('e1')]), [edge('e1'), added])
    expect(out.edges).toEqual([{ type: 'add', edge: added }])
    expect(out.nodes).toEqual([])
  })

  it('emits remove for live edges missing from next', () => {
    const out = diffEdgesToChanges(withEdges([edge('e1'), edge('e2')]), [edge('e2')])
    expect(out.edges).toEqual([{ type: 'remove', id: 'e1' }])
  })

  it('rewrites a changed endpoint as remove then add of the same id', () => {
    const next = edge('e1', 'a', 'c')
    const out = diffEdgesToChanges(withEdges([edge('e1', 'a', 'b')]), [next])
    expect(out.edges).toEqual([
      { type: 'remove', id: 'e1' },
      { type: 'add', edge: next },
    ])
  })
})
