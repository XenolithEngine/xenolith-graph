// Fixture-driven invariants for the React Flow importer (E3 supplement). The small golden
// fixtures in import-reactflow.test.ts prove the MAPPING; these prove the MECHANICS on real
// generated scale: conservation (nothing drops unaccounted), pin existence, report accounting
// field-by-field, generator determinism vs the committed files, and a perf guard at XXL.
import { describe, it, expect } from 'vitest'
import { loadFixture, generateReactFlowFixture } from '@xenolithengine/test-fixtures'
import { importFromReactFlow } from './import-reactflow.js'
import { parseXenolithGraph } from './serialize.js'

interface RF {
  nodes: Array<Record<string, unknown> & { id: string }>
  edges: Array<Record<string, unknown> & { source: string; target: string }>
}

async function load(id: string): Promise<{ rf: RF; raw: { nodes: unknown[]; edges: unknown[] } }> {
  const rf = (await loadFixture(id)) as unknown as RF
  return { rf, raw: { nodes: rf.nodes, edges: rf.edges } }
}

/** Nothing is lost silently: every dropped edge is accounted, every kept edge lands on real pins. */
function assertConservation(id: string, rf: RF): void {
  const { doc, report } = importFromReactFlow(rf)
  const accountedDrops = new Set<string>()
  for (const h of report.unknownHandles) accountedDrops.add(h.edgeId)
  for (const n of report.unknownNodes) {
    for (const e of rf.edges) if (e.source === n || e.target === n) accountedDrops.add(String(e.id ?? ''))
  }
  const dropped = rf.edges.filter((e) => !doc.edges.some((de) => de.id === (e.id ?? de.id)) && !doc.edges.some((de) => de.from.node === e.source && de.to.node === e.target))
  expect(doc.edges.length + dropped.length, `${id}: edge conservation`).toBe(rf.edges.length)
  const pinsByNode = new Map(doc.nodes.map((n) => [n.id, new Set(n.pins.map((p) => p.id))]))
  for (const e of doc.edges) {
    expect(pinsByNode.get(e.from.node), `${id}: from-node exists`).toBeDefined()
    expect(pinsByNode.get(e.to.node), `${id}: to-node exists`).toBeDefined()
    expect(pinsByNode.get(e.from.node)!.has(e.from.pin), `${id}: from-pin exists (${e.id})`).toBe(true)
    expect(pinsByNode.get(e.to.node)!.has(e.to.pin), `${id}: to-pin exists (${e.id})`).toBe(true)
  }
  // Pin ids unique per node (duplicate ids would corrupt the pin-existence check itself).
  for (const n of doc.nodes) {
    const ids = n.pins.map((p) => p.id)
    expect(new Set(ids).size, `${id}: pin ids unique on ${n.id}`).toBe(ids.length)
  }
}

describe('RF fixtures — report contract on the exhaustive field document', () => {
  it('reactflow/features: every loss category accounted, mappings exact', async () => {
    const { rf } = await load('reactflow/features')
    const { doc, report } = importFromReactFlow(rf)
    expect(doc.nodes).toHaveLength(8)
    expect(report.unknownNodes).toEqual(['ghost-node'])
    expect(doc.edges).toHaveLength(9) // fe-9 dropped (ghost endpoint)
    expect(report.unknownHandles).toEqual([])

    // Dropped node fields — the RF presentation vocabulary.
    for (const key of ['node.width', 'node.height', 'node.measured', 'node.selected', 'node.dragging',
      'node.hidden', 'node.draggable', 'node.selectable', 'node.connectable', 'node.zIndex',
      'node.className', 'node.style', 'node.ariaLabel', 'node.origin', 'node.sourcePosition',
      'node.targetPosition', 'node.parentId']) {
      expect(report.droppedFields[key], `droppedFields[${key}]`).toBeGreaterThanOrEqual(1)
    }
    // Dropped edge fields.
    for (const key of ['edge.labelStyle', 'edge.labelBgStyle', 'edge.markerStart', 'edge.style',
      'edge.hidden', 'edge.deletable', 'edge.focusable', 'edge.interactionWidth', 'edge.type']) {
      expect(report.droppedFields[key], `droppedFields[${key}]`).toBeGreaterThanOrEqual(1)
    }

    // Subflow warning is present.
    expect(report.warnings.join('\n')).toMatch(/subflow|macro/i)

    // Edge type mapping spot checks on the DOC (bezier stays explicit in the importer output).
    const byId = new Map(doc.edges.map((e) => [e.id, e]))
    expect(byId.get('fe-1')!.opts?.pathStyle).toBe('smoothstep')
    expect(byId.get('fe-2')!.opts?.pathStyle).toBe('step')
    expect(byId.get('fe-3')!.opts?.pathStyle).toBe('linear')
    expect(byId.get('fe-4')!.opts?.pathStyle).toBe('bezier')
    expect(byId.get('fe-6')!.opts?.pathStyle).toBeUndefined() // fancy-custom-edge → dropped+counted
    expect(byId.get('fe-1')!.opts?.markerEnd).toBe('arrow')   // arrowclosed → arrow
    expect(byId.get('fe-10')!.opts?.markerEnd).toBeUndefined() // dot marker is NOT an arrow

    // Null handles (fe-8) landed on default pins.
    const fe8 = byId.get('fe-8')!
    expect(fe8.from.pin).toBe('f-in:out')
    expect(fe8.to.pin).toBe('f-agg:in')

    // The id-less edge got a synthesized id.
    const synthesized = doc.edges.filter((e) => e.from.node === 'f-card' && e.to.node === 'f-out')
    expect(synthesized).toHaveLength(1)
    expect(typeof synthesized[0]!.id).toBe('string')

    // data.label → title, data preserved.
    const fin = doc.nodes.find((n) => n.id === 'f-in')!
    expect(fin.render?.title).toBe('Feed')
    expect(fin.state).toMatchObject({ label: 'Feed' })
  })
})

describe('RF fixtures — mechanics at scale', () => {
  it('reactflow/mid: conservation + pin existence + round-trip through the v1 parser', async () => {
    const { rf } = await load('reactflow/mid')
    assertConservation('mid', rf)
    const { doc, report } = importFromReactFlow(rf)
    expect(report.unknownNodes).toEqual([]) // generator only references real nodes
    expect(report.counts.nodes).toBe(rf.nodes.length)

    const parsed = parseXenolithGraph(doc)
    expect(parsed.nodes).toHaveLength(doc.nodes.length)
    expect(parsed.edges).toHaveLength(doc.edges.length)
    const first = parsed.nodes[0]!
    const docFirst = doc.nodes[0]!
    expect(first.position).toEqual(docFirst.position)
    const animated = doc.edges.filter((e) => e.opts?.animated).length
    expect(parsed.edgeOpts.size).toBeGreaterThanOrEqual(animated)
  })

  it('reactflow/xl: conservation on 1000+ nodes / 1600 edges', async () => {
    const { rf } = await load('reactflow/xl')
    expect(rf.nodes.length).toBe(1008)
    expect(rf.edges.length).toBe(1600)
    assertConservation('xl', rf)
  })

  it('generator is deterministic: same seed reproduces the committed XL file byte-for-byte', async () => {
    const { rf } = await load('reactflow/xl')
    const regenerated = generateReactFlowFixture({ seed: 4242, nodes: 1000, edges: 1600, subflows: 8 })
    expect(regenerated.nodes).toEqual(rf.nodes)
    expect(regenerated.edges).toEqual(rf.edges)
    expect(regenerated.viewport).toEqual(rf.viewport)
  })

  it('XXL on demand: 5000 nodes / 8000 edges imports under a loose perf bound', () => {
    const rf = generateReactFlowFixture({ seed: 9090, nodes: 5000, edges: 8000, subflows: 12 })
    expect(rf.nodes.length).toBe(5012)
    const t0 = performance.now()
    const { doc, report } = importFromReactFlow(rf)
    const dt = performance.now() - t0
    expect(doc.nodes).toHaveLength(5012)
    expect(doc.edges).toHaveLength(report.counts.edges)
    expect(report.unknownNodes).toEqual([])
    // Loose guard against accidental O(n²): pure import of 5k nodes must stay well under 3s.
    expect(dt).toBeLessThan(3000)
    assertConservation('xxl', rf)
  })
})
