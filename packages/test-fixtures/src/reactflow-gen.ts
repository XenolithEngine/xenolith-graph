/**
 * Deterministic React Flow fixture generator (E3 supplement).
 *
 * The RF importer's unit tests use small hand-written golden fixtures; those prove the MAPPING
 * but not the mechanics at scale. This generator produces arbitrarily large, structurally
 * nasty-but-valid React Flow documents with a seeded PRNG, so tests can import an XXL graph
 * without committing a multi-megabyte blob, and regenerate the committed fixtures
 * byte-identically (`scripts/generate-reactflow.mjs`).
 *
 * Shape: a layered DAG (layer i → layer j > i, so no cycles) with hot-spot fan-in (a biased
 * minority of targets receives most wires — the realistic n8n/RF-app pattern that stresses pin
 * multiplicity), cross-layer skip edges, and optional subflow parenting (parentId chains two
 * levels deep). `richFields` sprinkles the full RF field vocabulary so droppedFields accounting
 * has something to count on every node/edge.
 */

// ---- seeded PRNG (mulberry32) -------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface GenerateOptions {
  seed: number
  /** Total non-group nodes. */
  nodes: number
  /** Approximate edge count (the DAG layer walk may land a few short). */
  edges: number
  /** Number of group nodes (RF subflows) at layer 0; members get parentId chains 2 deep. */
  subflows?: number
  /** Sprinkle the full RF field vocabulary onto nodes/edges (droppedFields fodder). */
  richFields?: boolean
}

/** Realistic node-type palette: distinct handle sets, data payloads, fan roles. */
const TYPES: Array<{
  type: string
  sources: string[]
  targets: string[]
  data: (rng: () => number, i: number) => Record<string, unknown>
}> = [
  { type: 'input', sources: ['out'], targets: [], data: (r, i) => ({ label: `Dataset ${i}`, path: `/data/batch-${i}.parquet`, rows: 1000 + Math.floor(r() * 90000) }) },
  { type: 'transform', sources: ['out', 'errors'], targets: ['in', 'control'], data: (r, i) => ({ label: `Map ${i}`, mode: ['strict', 'lenient'][Math.floor(r() * 2)]!, factor: +(r() * 2).toFixed(3) }) },
  { type: 'filterNode', sources: ['passed', 'rejected'], targets: ['in'], data: (r, i) => ({ label: `Where ${i}`, predicate: `value > ${(r() * 100).toFixed(1)}` }) },
  { type: 'join', sources: ['out'], targets: ['left', 'right', 'extra'], data: (r, i) => ({ label: `Join ${i}`, strategy: ['hash', 'merge', 'nested'][Math.floor(r() * 3)]! }) },
  { type: 'aggregate', sources: ['out'], targets: ['in'], data: (r, i) => ({ label: `GroupBy ${i}`, keys: Math.floor(r() * 5) + 1 }) },
  { type: 'output', sources: [], targets: ['in'], data: (r, i) => ({ label: `Sink ${i}`, format: ['parquet', 'csv', 'jsonl'][Math.floor(r() * 3)]! }) },
  { type: 'customCard', sources: ['result'], targets: ['request'], data: (r, i) => ({ label: `Card ${i}`, variant: Math.floor(r() * 4) }) },
]

const EDGE_TYPES = ['default', 'straight', 'step', 'smoothstep', 'simplebezier']
const POSITIONS = ['left', 'right', 'top', 'bottom'] as const

export interface GeneratedReactFlow {
  nodes: Array<Record<string, unknown> & { id: string; type?: string; position: { x: number; y: number }; data?: unknown }>
  edges: Array<Record<string, unknown> & { id?: string; source: string; target: string }>
  viewport: { x: number; y: number; zoom: number }
}

export function generateReactFlowFixture(opts: GenerateOptions): GeneratedReactFlow {
  const rng = mulberry32(opts.seed)
  const rich = opts.richFields ?? true
  const subflowCount = opts.subflows ?? 0

  // Layered layout: ~sqrt(n) layers of ~sqrt(n) nodes keeps the aspect ratio sane and gives
  // the DAG walk short hops + meaningful skip edges.
  const layers = Math.max(2, Math.round(Math.sqrt(opts.nodes)))
  const width = Math.ceil(opts.nodes / layers)
  const nodeCount = Math.min(opts.nodes, layers * width)

  const nodes: GeneratedReactFlow['nodes'] = []
  const typeOf: string[] = []
  for (let i = 0; i < nodeCount; i++) {
    const layer = Math.floor(i / width)
    // First and last layers are io-shaped; middle layers are processors.
    const t = layer === 0
      ? TYPES[0]!
      : layer === layers - 1
        ? TYPES[5]!
        : TYPES[1 + (i % (TYPES.length - 2))]!
    typeOf.push(t.type)
    const node: GeneratedReactFlow['nodes'][number] = {
      id: `n${i}`,
      type: t.type,
      position: { x: layer * 420 + Math.floor(rng() * 40), y: (i % width) * 160 + Math.floor(rng() * 30) },
      data: t.data(rng, i),
    }
    if (rich && rng() < 0.35) {
      Object.assign(node, {
        width: 180 + Math.floor(rng() * 120),
        height: 60 + Math.floor(rng() * 80),
        measured: { width: 180 + Math.floor(rng() * 120), height: 60 + Math.floor(rng() * 80) },
      })
    }
    if (rich && rng() < 0.25) node['selected'] = rng() < 0.3
    if (rich && rng() < 0.2) node['dragging'] = false
    if (rich && rng() < 0.15) node['hidden'] = false
    if (rich && rng() < 0.2) node['style'] = { background: `#${Math.floor(rng() * 0xffffff).toString(16).padStart(6, '0')}`, border: '1px solid #d9d9d9' }
    if (rich && rng() < 0.15) node['className'] = 'my-node'
    if (rich && rng() < 0.15) node['zIndex'] = Math.floor(rng() * 10)
    if (rich && rng() < 0.1) node['draggable'] = true
    if (rich && rng() < 0.1) node['selectable'] = true
    if (rich && rng() < 0.1) node['connectable'] = true
    if (rich && rng() < 0.2) node['sourcePosition'] = POSITIONS[Math.floor(rng() * 4)]!
    if (rich && rng() < 0.2) node['targetPosition'] = POSITIONS[Math.floor(rng() * 4)]!
    nodes.push(node)
  }

  // Subflow parenting: `subflowCount` group nodes at layer 0 (appended AFTER the numbered
  // ids so they never collide); ~30% of layer-1/2 nodes get a parentId, a third of those
  // nest under a subgroup node.
  const groupIds: string[] = []
  for (let g = 0; g < subflowCount; g++) {
    const id = `group-${g}`
    groupIds.push(id)
    nodes.push({ id, type: 'group', position: { x: -400, y: g * 300 }, data: { label: `Stage ${g}` }, style: { width: 360, height: 260 } })
  }
  if (subflowCount > 0) {
    const subgroup = subflowCount > 1 ? 'group-1' : groupIds[0]!
    for (let i = 0; i < nodeCount; i++) {
      const layer = Math.floor(i / width)
      if ((layer === 1 || layer === 2) && rng() < 0.3) {
        nodes[i]!['parentId'] = rng() < 0.33 && subflowCount > 1 ? subgroup : groupIds[Math.floor(rng() * subflowCount)]!
      }
    }
  }

  const sourcesOf = (i: number): string[] => TYPES.find((t) => t.type === typeOf[i])?.sources ?? ['out']
  const targetsOf = (i: number): string[] => TYPES.find((t) => t.type === typeOf[i])?.targets ?? ['in']

  // Hot-spot bias: 20% of nodes attract 70% of incoming edges — fan-in stress.
  const isHot = (i: number): boolean => (i * 2654435761) % 10 < 2
  const pickTarget = (): number => {
    if (rng() < 0.7) {
      for (let tries = 0; tries < 12; tries++) {
        const i = Math.floor(rng() * nodeCount)
        if (isHot(i) && targetsOf(i).length > 0 && Math.floor(i / width) > 0) return i
      }
    }
    for (let tries = 0; tries < 12; tries++) {
      const i = Math.floor(rng() * nodeCount)
      if (targetsOf(i).length > 0 && Math.floor(i / width) > 0) return i
    }
    return nodeCount - 1
  }

  const edges: GeneratedReactFlow['edges'] = []
  for (let e = 0; e < opts.edges; e++) {
    // Retry until a valid DAG edge materialises (no self loops, source with output pins) —
    // keeps the edge count close to the requested target instead of silently shorting it.
    for (let attempt = 0; attempt < 24; attempt++) {
      const targetLayerIdx = pickTarget()
      const targetLayer = Math.floor(targetLayerIdx / width)
      // Source strictly above the target's layer → acyclic. 15% are long skips.
      const span = rng() < 0.15 ? 1 + Math.floor(rng() * Math.max(1, targetLayer - 1)) : 1
      const sourceLayer = Math.max(0, targetLayer - span)
      const sourceIdx = sourceLayer * width + Math.floor(rng() * Math.min(width, nodeCount - sourceLayer * width))
      if (sourceIdx === targetLayerIdx || sourceIdx >= nodeCount) continue
      const srcs = sourcesOf(sourceIdx)
      if (srcs.length === 0) continue
      const tgts = targetsOf(targetLayerIdx)
      const edge: GeneratedReactFlow['edges'][number] = {
        source: `n${sourceIdx}`,
        target: `n${targetLayerIdx}`,
        sourceHandle: rng() < 0.05 ? null : srcs[Math.floor(rng() * srcs.length)]!,
        targetHandle: rng() < 0.05 ? null : tgts[Math.floor(rng() * tgts.length)]!,
      }
      if (rng() < 0.92) edge['id'] = `e${e}`
      if (rich && rng() < 0.6) edge['type'] = rng() < 0.08 ? 'fancy-custom-edge' : EDGE_TYPES[Math.floor(rng() * EDGE_TYPES.length)]!
      if (rich && rng() < 0.25) edge['animated'] = true
      if (rich && rng() < 0.15) edge['label'] = `wire ${e}`
      if (rich && rng() < 0.15) edge['labelStyle'] = { fill: '#556', fontWeight: 600 }
      if (rich && rng() < 0.15) edge['labelBgStyle'] = { fill: '#fff' }
      if (rich && rng() < 0.12) edge['markerEnd'] = { type: rng() < 0.5 ? 'arrow' : 'arrowclosed', width: 18, height: 18 }
      if (rich && rng() < 0.06) edge['markerStart'] = { type: 'arrow' }
      if (rich && rng() < 0.15) edge['style'] = { stroke: '#7aa2c4', strokeWidth: 2 }
      if (rich && rng() < 0.08) edge['hidden'] = false
      if (rich && rng() < 0.08) edge['deletable'] = true
      if (rich && rng() < 0.08) edge['focusable'] = true
      if (rich && rng() < 0.1) edge['interactionWidth'] = 16
      edges.push(edge)
      break
    }
  }

  return { nodes, edges, viewport: { x: 12, y: -40, zoom: 0.85 } }
}

/**
 * The exhaustive-field RF document: every node/edge field React Flow can emit, on ~30 nodes,
 * plus the adversarial cases (unknown-node edge refs, null handles, custom edge types,
 * non-arrow markers, two-level subflows). Small on purpose — this drives the ImportReport
 * accounting assertions field by field.
 */
export function reactFlowFeaturesFixture(): GeneratedReactFlow {
  const nodes: GeneratedReactFlow['nodes'] = [
    { id: 'f-in', type: 'input', position: { x: 0, y: 0 }, data: { label: 'Feed' }, width: 202, height: 88, measured: { width: 202, height: 88 }, selected: true, dragging: false, hidden: false, draggable: true, selectable: true, connectable: true, zIndex: 3, className: 'feed-node', style: { background: '#eef' }, ariaLabel: 'feed input', origin: [0.5, 0.5] as [number, number], sourcePosition: 'right', targetPosition: 'left' },
    { id: 'f-map', type: 'transform', position: { x: 300, y: 0 }, data: { label: 'Map', factor: 1.5 }, deletable: true, parentId: 'f-group-a' },
    { id: 'f-filter', type: 'filterNode', position: { x: 300, y: 180 }, data: { label: 'Where', predicate: 'x > 10' }, parentId: 'f-group-a' },
    { id: 'f-agg', type: 'aggregate', position: { x: 620, y: 90 }, data: { label: 'GroupBy', keys: 2 } },
    { id: 'f-out', type: 'output', position: { x: 940, y: 90 }, data: { label: 'Sink', format: 'parquet' } },
    { id: 'f-card', type: 'customCard', position: { x: 620, y: 280 }, data: { label: 'Card', variant: 2 } },
    { id: 'f-group-a', type: 'group', position: { x: 260, y: -40 }, data: { label: 'Stage A' }, style: { width: 380, height: 420 }, parentId: 'f-group-root' },
    { id: 'f-group-root', type: 'group', position: { x: 220, y: -80 }, data: { label: 'Pipeline' }, style: { width: 460, height: 520 } },
  ]
  const edges: GeneratedReactFlow['edges'] = [
    { id: 'fe-1', source: 'f-in', sourceHandle: 'out', target: 'f-map', targetHandle: 'in', type: 'smoothstep', animated: true, label: 'feed', labelStyle: { fill: '#345' }, labelBgStyle: { fill: '#fff' }, markerEnd: { type: 'arrowclosed', width: 20, height: 20 }, style: { stroke: '#789', strokeWidth: 2 }, deletable: true, focusable: true, interactionWidth: 18 },
    { id: 'fe-2', source: 'f-map', sourceHandle: 'out', target: 'f-filter', targetHandle: 'in', type: 'step' },
    { id: 'fe-3', source: 'f-map', sourceHandle: 'errors', target: 'f-card', targetHandle: 'request', type: 'straight', hidden: false, markerStart: { type: 'arrow' } },
    { id: 'fe-4', source: 'f-filter', sourceHandle: 'passed', target: 'f-agg', targetHandle: 'in', type: 'default' },
    { id: 'fe-5', source: 'f-filter', sourceHandle: 'rejected', target: 'f-out', targetHandle: 'in', type: 'simplebezier', markerEnd: { type: 'arrow' } },
    { id: 'fe-6', source: 'f-agg', sourceHandle: 'out', target: 'f-out', targetHandle: 'in', type: 'fancy-custom-edge' },
    { source: 'f-card', sourceHandle: 'result', target: 'f-out', targetHandle: 'in' }, // no id → synthesized
    { id: 'fe-8', source: 'f-in', target: 'f-agg' },                                    // null handles → default pins
    { id: 'fe-9', source: 'f-in', sourceHandle: 'out', target: 'ghost-node', targetHandle: 'in' }, // unknown endpoint
    { id: 'fe-10', source: 'f-agg', sourceHandle: 'out', target: 'f-card', targetHandle: 'request', markerEnd: { type: 'dot' } }, // non-arrow marker → dropped
  ]
  return { nodes, edges, viewport: { x: 0, y: 0, zoom: 1 } }
}
