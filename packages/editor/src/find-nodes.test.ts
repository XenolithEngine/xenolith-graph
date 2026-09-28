import { describe, it, expect } from 'vitest'
import { findNodesIn } from './find-nodes.js'

function source() {
  const schemas = [
    { type: 'Smooth', title: 'Smooth', category: 'filter' },
    { type: 'Clock', title: 'Clock', category: 'source' },
    { type: 'DebugTap', title: 'Debug Tap', category: 'debug' },
  ]
  const nodes = [
    { id: 'a', type: 'Smooth', state: { title: 'Smoothing · temp' } },
    { id: 'b', type: 'Smooth', state: {} },
    { id: 'c', type: 'Clock', state: { title: 'clock a' } },
    { id: 'd', type: 'DebugTap', state: {} },
  ]
  return { registry: { all: () => schemas }, nodes: nodes[Symbol.iterator]() }
}

describe('findNodesIn (H1 — the human-facing reuse of the MCP find_nodes semantics)', () => {
  it('matches by title substring, case-insensitive (renamed OR schema title)', () => {
    const hits = findNodesIn(source(), { titleContains: 'SMOOTH' })
    expect(hits.map((h) => h.id)).toEqual(['a', 'b']) // a renamed, b via its schema title
    expect(hits[0]).toMatchObject({ type: 'Smooth', title: 'Smoothing · temp', category: 'filter' })
  })

  it('falls back to the SCHEMA title when the node was never renamed', () => {
    expect(findNodesIn(source(), { titleContains: 'debug tap' }).map((h) => h.id)).toEqual(['d'])
    expect(findNodesIn(source(), { titleContains: 'tap' })[0]!.title).toBe('Debug Tap')
  })

  it('type is an EXACT match, case-insensitive; category filters; unknown types return nothing', () => {
    expect(findNodesIn(source(), { type: 'clock' }).map((h) => h.id)).toEqual(['c'])
    expect(findNodesIn(source(), { type: 'cloc' })).toEqual([])
    expect(findNodesIn(source(), { category: 'filter' }).map((h) => h.id)).toEqual(['a', 'b'])
  })

  it('empty query returns everything; filters combine with AND semantics', () => {
    expect(findNodesIn(source(), {}).length).toBe(4)
    expect(findNodesIn(source(), { type: 'smooth', titleContains: 'temp' }).map((h) => h.id)).toEqual(['a'])
  })
})
