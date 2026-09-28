import { describe, it, expect } from 'vitest'
import { Graph } from '@xenolithengine/graph-core'
import { layeredLayout, nextFreeSpot } from './layout-ops.js'

// layout-ops powers both editor.autoLayout() and the MCP auto_layout tool — same numbers,
// two consumers. Invariants: ranks respect topology, same-rank stacking on the cross-axis,
// spacing math, macro members travel with their macro, cycles fall back to rank 0.
const node = (id: string, x = 0, y = 0, size?: { x: number; y: number }, type = 'T') =>
  ({ id, type, position: { x, y }, state: {}, pins: [], ...(size ? { size } : {}) }) as never
const edge = (id: string, from: string, to: string) =>
  ({ id, from: { node: from, pin: 'p' }, to: { node: to, pin: 'p' } }) as never

const view = (nodes: ReturnType<typeof node>[], edges: ReturnType<typeof edge>[] = []) => {
  const g = new Graph()
  for (const n of nodes) g._addNode(n)
  for (const e of edges) g._addEdge(e)
  return { graph: g }
}

describe('layeredLayout', () => {
  it('ranks by longest path from sources and stacks same-rank nodes on the cross-axis (LR)', () => {
    // a → b → d, a → c → d (c also fed by b: c's rank must be max(1, 2) = 2 via b→c)
    const v = view(
      [node('a'), node('b'), node('c'), node('d')],
      [edge('e1', 'a', 'b'), edge('e2', 'a', 'c'), edge('e3', 'b', 'c'), edge('e4', 'c', 'd')],
    )
    const pos = layeredLayout(v, 'LR', 80)
    expect(pos.get('a')!.x).toBeLessThan(pos.get('b')!.x) // rank 0 → 1
    expect(pos.get('b')!.x).toBeLessThan(pos.get('c')!.x) // rank 1 → 2 (longest path wins)
    expect(pos.get('c')!.x).toBeLessThan(pos.get('d')!.x) // rank 2 → 3
  })

  it('same-rank nodes occupy distinct cross-axis slots with spacing between', () => {
    const v = view([node('b'), node('a'), node('c')]) // three independent sources → all rank 0
    const pos = layeredLayout(v, 'LR', 80)
    const ys = ['a', 'b', 'c'].map((id) => pos.get(id as never)!.y).sort((p, q) => p - q)
    expect(ys[1]! - ys[0]!).toBeGreaterThanOrEqual(140 + 80) // default node h + spacing
    expect(pos.get('a')!.x).toBe(pos.get('b')!.x) // same column
  })

  it('TB direction swaps axes: ranks advance on Y', () => {
    const v = view([node('a'), node('b')], [edge('e1', 'a', 'b')])
    const pos = layeredLayout(v, 'TB', 80)
    expect(pos.get('b')!.y).toBeGreaterThan(pos.get('a')!.y)
    expect(pos.get('b')!.x).toBe(pos.get('a')!.x)
  })

  it('cycles and isolated nodes fall back to rank 0 instead of vanishing', () => {
    const v = view([node('x'), node('y')], [edge('e1', 'x', 'y'), edge('e2', 'y', 'x')])
    const pos = layeredLayout(v, 'LR', 80)
    expect(pos.size).toBe(2)
  })

  it('macro members translate by the macro\'s delta (travel with their group)', () => {
    const v = view(
      [
        node('src', 0, 0),
        node('m', 500, 0, { x: 200, y: 100 }, 'Macro'),
        node('mem', 510, 10), // member of m (hidden while collapsed)
      ],
      [edge('e1', 'src', 'm')],
    )
    ;(v.graph.getNode('m' as never) as { state: Record<string, unknown> }).state['members'] = ['mem']
    const pos = layeredLayout(v, 'LR', 80)
    // m lands at x=300 (src occupies rank 0: 220 default width + 80 spacing) → dx = -200,
    // member translates equally: 510 - 200 = 310
    expect(pos.get('m')!.x).toBe(300)
    expect(pos.get('mem')!.x).toBe(310)
  })
})

describe('nextFreeSpot', () => {
  it('returns the origin on an empty graph', () => {
    expect(nextFreeSpot(view([]))).toEqual({ x: 0, y: 0 })
  })

  it('lands right of the rightmost node, vertically centred', () => {
    const v = view([node('a', 0, 0, { x: 220, y: 100 }), node('b', 100, 200, { x: 220, y: 100 })])
    const spot = nextFreeSpot(v)
    expect(spot.x).toBe(100 + 220 + 60) // maxX + width + gutter
    expect(spot.y).toBe(100) // mean(0, 200)
  })
})
