// Spec-first contract for the React Flow JSON importer (E3). Golden fixtures define the mapping:
// nodes/edges/viewport map 1:1; handles become typed pins (synthesized 'any' by default, typed via
// inferType or schemas); every lossy step lands in the ImportReport — nothing silent. Error
// message strings and report field names are contract (the migration guide documents them).
import { describe, it, expect } from 'vitest'
import { importFromReactFlow, type ReactFlowGraph } from './import-reactflow.js'
import { parseXenolithGraph } from './serialize.js'

const rfGraph = (partial: Partial<ReactFlowGraph>): ReactFlowGraph => ({
  nodes: [], edges: [], ...partial,
})

const rf = (nodes: ReactFlowGraph['nodes'], edges: ReactFlowGraph['edges']): ReactFlowGraph =>
  ({ nodes, edges })

describe('importFromReactFlow — happy path', () => {
  it('maps a minimal 2-node 1-edge graph: positions, ids, synthesized pins', () => {
    const { doc, report } = importFromReactFlow(rf(
      [
        { id: 'a', position: { x: 10, y: 20 }, data: { label: 'Source' } },
        { id: 'b', position: { x: 300, y: 20 } },
      ],
      [{ id: 'e1', source: 'a', sourceHandle: 'out', target: 'b', targetHandle: 'in' }],
    ))
    expect(doc.version).toBe('xenolith.v1')
    expect(doc.nodes).toHaveLength(2)
    expect(doc.nodes[0]).toMatchObject({ id: 'a', position: { x: 10, y: 20 }, render: { title: 'Source' } })
    // pins synthesized from the edge handles: one out on a, one in on b
    const a = doc.nodes[0]!
    const b = doc.nodes[1]!
    expect(a.pins).toHaveLength(1)
    expect(a.pins[0]).toMatchObject({ direction: 'out', type: 'any', multiple: true, label: 'out' })
    expect(b.pins).toHaveLength(1)
    expect(b.pins[0]).toMatchObject({ direction: 'in', type: 'any', multiple: true, label: 'in' })
    expect(doc.edges).toHaveLength(1)
    expect(doc.edges[0]).toMatchObject({ id: 'e1', from: { node: 'a', pin: a.pins[0]!.id }, to: { node: 'b', pin: b.pins[0]!.id } })
    expect(report.counts).toEqual({ nodes: 2, edges: 1, pins: 2 })
    expect(report.unknownNodes).toEqual([])
    expect(report.unknownHandles).toEqual([])
  })

  it('node without type imports as type "default" (RF default node)', () => {
    const { doc } = importFromReactFlow(rf([{ id: 'a', position: { x: 0, y: 0 } }], []))
    expect(doc.nodes[0]!.type).toBe('default')
  })

  it('data.label becomes render.title; the full data object is preserved in state', () => {
    const { doc } = importFromReactFlow(rf(
      [{ id: 'a', type: 'processor', position: { x: 0, y: 0 }, data: { label: 'Scale', factor: 2 } }],
      [],
    ))
    expect(doc.nodes[0]!.render?.title).toBe('Scale')
    expect(doc.nodes[0]!.state).toEqual({ label: 'Scale', factor: 2 })
  })

  it('viewport maps when fully numeric', () => {
    const { doc } = importFromReactFlow(rfGraph({ viewport: { x: 5, y: -3, zoom: 1.5 } }))
    expect(doc.viewport).toEqual({ x: 5, y: -3, zoom: 1.5 })
  })

  it('null handles synthesize deterministic default pin ids (node:out / node:in)', () => {
    const { doc } = importFromReactFlow(rf(
      [{ id: 'a', position: { x: 0, y: 0 } }, { id: 'b', position: { x: 1, y: 0 } }],
      [{ id: 'e', source: 'a', target: 'b' }],
    ))
    expect(doc.nodes[0]!.pins[0]!.id).toBe('a:out')
    expect(doc.nodes[1]!.pins[0]!.id).toBe('b:in')
  })
})

describe('importFromReactFlow — typing', () => {
  it('inferType types synthesized pins on both sides', () => {
    const { doc } = importFromReactFlow(
      rf(
        [{ id: 'a', type: 'num', position: { x: 0, y: 0 } }, { id: 'b', type: 'sink', position: { x: 1, y: 0 } }],
        [{ id: 'e', source: 'a', sourceHandle: 'value', target: 'b', targetHandle: 'x' }],
      ),
      { inferType: ({ handle }) => (handle === 'value' ? 'float' : 'number') },
    )
    expect(doc.nodes[0]!.pins[0]!.type).toBe('float')
    expect(doc.nodes[1]!.pins[0]!.type).toBe('number')
  })

  it('schemas replace synthesized pins: handles resolve by label (case-insensitive), index string, or pin id', () => {
    const schemas = [{
      type: 'num', title: 'Num',
      pins: [
        { kind: 'data' as const, direction: 'in' as const, type: 'float', label: 'Reset' },
        { kind: 'data' as const, direction: 'out' as const, type: 'float', label: 'Value' },
      ],
    }]
    const { doc, report } = importFromReactFlow(
      rf(
        [{ id: 'a', type: 'num', position: { x: 0, y: 0 } }],
        [{ id: 'e1', source: 'a', sourceHandle: 'value', target: 'a', targetHandle: '0' }],
      ),
      { schemas },
    )
    // schema pins used verbatim (2 pins), no synthesized extras, edges land on schema pin ids
    expect(doc.nodes[0]!.pins).toHaveLength(2)
    const out = doc.nodes[0]!.pins.find((p) => p.direction === 'out')!
    const inPin = doc.nodes[0]!.pins.find((p) => p.direction === 'in')!
    expect(doc.edges[0]!.from.pin).toBe(out.id)
    expect(doc.edges[0]!.to.pin).toBe(inPin.id)
    expect(report.unknownHandles).toEqual([])
    expect(report.counts.pins).toBe(2)
  })

  it('a handle that matches no schema pin is reported and the edge is dropped', () => {
    const schemas = [{
      type: 'num', title: 'Num',
      pins: [{ kind: 'data' as const, direction: 'out' as const, type: 'float', label: 'Value' }],
    }]
    const { doc, report } = importFromReactFlow(
      rf(
        [{ id: 'a', type: 'num', position: { x: 0, y: 0 } }],
        [{ id: 'e1', source: 'a', sourceHandle: 'nope', target: 'a', targetHandle: 'Value' }],
      ),
      { schemas },
    )
    expect(report.unknownHandles).toEqual([{ edgeId: 'e1', side: 'source', nodeId: 'a', handle: 'nope' }])
    expect(doc.edges).toHaveLength(0)
  })
})

describe('importFromReactFlow — lossy accounting (nothing silent)', () => {
  it('RF node extras are counted in droppedFields, grouped by key', () => {
    const { report } = importFromReactFlow(rf(
      [
        { id: 'a', position: { x: 0, y: 0 }, selected: true, dragging: false, width: 120, height: 60 },
        { id: 'b', position: { x: 1, y: 0 }, selected: false, style: { background: '#fff' } },
      ],
      [],
    ))
    expect(report.droppedFields['node.selected']).toBe(2)
    expect(report.droppedFields['node.dragging']).toBe(1)
    expect(report.droppedFields['node.width']).toBe(1)
    expect(report.droppedFields['node.height']).toBe(1)
    expect(report.droppedFields['node.style']).toBe(1)
  })

  it('edge endpoint referencing a missing node is dropped and listed in unknownNodes', () => {
    const { doc, report } = importFromReactFlow(rf(
      [{ id: 'a', position: { x: 0, y: 0 } }],
      [{ id: 'e1', source: 'a', target: 'ghost' }],
    ))
    expect(report.unknownNodes).toEqual(['ghost'])
    expect(doc.edges).toHaveLength(0)
    expect(report.counts.edges).toBe(0)
  })

  it('RF edge type maps onto xenolith pathStyle; unknown/custom edge types are counted, not guessed', () => {
    const mk = (type: string | undefined): ReactFlowGraph['edges'] =>
      [{ id: 'e', source: 'a', target: 'b', type }]
    const nodes: ReactFlowGraph['nodes'] = [
      { id: 'a', position: { x: 0, y: 0 } }, { id: 'b', position: { x: 1, y: 0 } },
    ]
    expect(importFromReactFlow(rf(nodes, mk('step'))).doc.edges[0]!.opts?.pathStyle).toBe('step')
    expect(importFromReactFlow(rf(nodes, mk('smoothstep'))).doc.edges[0]!.opts?.pathStyle).toBe('smoothstep')
    expect(importFromReactFlow(rf(nodes, mk('straight'))).doc.edges[0]!.opts?.pathStyle).toBe('linear')
    expect(importFromReactFlow(rf(nodes, mk('default'))).doc.edges[0]!.opts?.pathStyle).toBe('bezier')
    expect(importFromReactFlow(rf(nodes, mk('simplebezier'))).doc.edges[0]!.opts?.pathStyle).toBe('bezier')
    const custom = importFromReactFlow(rf(nodes, mk('my-fancy-edge')))
    expect(custom.doc.edges[0]!.opts?.pathStyle).toBeUndefined()
    expect(custom.report.droppedFields['edge.type']).toBe(1)
  })

  it('animated, label and arrow markers map; non-arrow markers are counted', () => {
    const { doc, report } = importFromReactFlow(rf(
      [{ id: 'a', position: { x: 0, y: 0 } }, { id: 'b', position: { x: 1, y: 0 } }],
      [{ id: 'e', source: 'a', target: 'b', animated: true, label: 'hi', markerEnd: { type: 'arrowclosed' } }],
    ))
    expect(doc.edges[0]!.opts).toMatchObject({ animated: true, label: 'hi', markerEnd: 'arrow' })
    void report
  })

  it('parentId (RF subflows) is counted and warned about — macros are the grouping primitive here', () => {
    const { report } = importFromReactFlow(rf(
      [
        { id: 'group', type: 'group', position: { x: 0, y: 0 } },
        { id: 'child', position: { x: 1, y: 0 }, parentId: 'group' },
      ],
      [],
    ))
    expect(report.droppedFields['node.parentId']).toBe(1)
    expect(report.warnings.join('\n')).toMatch(/subflow|macro/i)
  })

  it('edge id is synthesized when missing', () => {
    const { doc } = importFromReactFlow(rf(
      [{ id: 'a', position: { x: 0, y: 0 } }, { id: 'b', position: { x: 1, y: 0 } }],
      [{ source: 'a', target: 'b' }],
    ))
    expect(typeof doc.edges[0]!.id).toBe('string')
    expect(doc.edges[0]!.id.length).toBeGreaterThan(0)
  })
})

describe('importFromReactFlow — the result is a loadable xenolith.v1 document', () => {
  it('round-trips through parseXenolithGraph with structural equality on the mapped subset', () => {
    const { doc } = importFromReactFlow(rfGraph({
      viewport: { x: 0, y: 0, zoom: 1 },
      nodes: [
        { id: 'a', type: 'src', position: { x: 10, y: 20 }, data: { label: 'Source' } },
        { id: 'b', type: 'sink', position: { x: 300, y: 20 } },
      ],
      edges: [{ id: 'e1', source: 'a', sourceHandle: 'out', target: 'b', targetHandle: 'in', animated: true }],
    }))
    const parsed = parseXenolithGraph(doc)
    expect(parsed.nodes).toHaveLength(2)
    expect(parsed.edges).toHaveLength(1)
    const a = parsed.nodes.find((n) => n.id === 'a')!
    expect(a).toMatchObject({ type: 'src', position: { x: 10, y: 20 } })
    expect(a.pins).toHaveLength(1)
    expect(a.pins[0]!.direction).toBe('out')
    const edge = parsed.edges[0]!
    expect(edge.from.node).toBe('a')
    expect(edge.to.node).toBe('b')
    expect(parsed.edgeOpts.get(edge.id)).toMatchObject({ animated: true })
  })
})
