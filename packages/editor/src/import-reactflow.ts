/**
 * React Flow JSON importer (E3) — bring a `nodes`/`edges`/`viewport` document exported by
 * React Flow (xyflow) into xenolith.v1. Zero dependencies: the RF shapes live here as local
 * structural types, so no reactflow import is ever pulled.
 *
 * Mapping (near 1:1 where the models align):
 *   node.id/type/position → verbatim (missing type → 'default')
 *   node.data            → node.state verbatim; data.label (string) additionally becomes render.title
 *   edge id/source/target/handles → verbatim; missing edge ids are synthesized
 *   edge.type  → opts.pathStyle (default|simplebezier→bezier, straight→linear, step, smoothstep)
 *   edge.animated / label / arrow markers → opts.animated / label / markerEnd:'arrow'
 *   viewport   → viewport
 *   pins       → synthesized from the handles edges actually use (label = handle id, type from
 *                `inferType` or 'any', multiple:true — RF handles fan in/out freely); when a
 *                NodeSchema for the node's type is supplied, its pins are used instead and
 *                handles resolve against them by label (case-insensitive), numeric index, or id
 *
 * Everything that does NOT survive is counted in {@link ImportReport} — unknown edge endpoints,
 * handles that match no schema pin, dropped node/edge fields, and warnings for structural
 * mismatches (RF subflow parenting). Nothing is lost silently.
 */

import type { NodeSchema } from '@xenolithengine/graph-core'
import type { XenolithGraphV1, XenolithNodeV1, XenolithPinV1, XenolithEdgeV1 } from './serialize.js'
import type { EdgePathStyle } from '@xenolithengine/graph-render-pixi'

// ---- React Flow document shapes (structural subset; RF adds many optional fields we drop) ----

export interface ReactFlowNode {
  id: string
  type?: string | null
  position: { x: number; y: number }
  data?: unknown
  [key: string]: unknown
}

export interface ReactFlowEdge {
  id?: string | null
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
  type?: string | null
  animated?: boolean | null
  label?: string | null
  markerEnd?: { type?: string | null } | null
  [key: string]: unknown
}

export interface ReactFlowGraph {
  nodes: ReactFlowNode[]
  edges: ReactFlowEdge[]
  viewport?: { x: number; y: number; zoom: number } | null
}

export interface ImportReactFlowOptions {
  /** Type a synthesized pin. Called per (node, handle) actually referenced by an edge; the
   *  return value becomes the pin's `type`. Return nothing to keep the 'any' wildcard —
   *  xenolith treats `any` as connectable with everything, so untyped imports still wire up. */
  inferType?: (info: { nodeId: string; nodeType: string; handle: string; side: 'source' | 'target' }) => string | undefined
  /** Node schemas keyed by `type`. A node whose type matches a schema uses the SCHEMA's pins
   *  (typed, with your widgets/palette metadata) instead of synthesized ones; edge handles
   *  then resolve against schema pins by label (case-insensitive), numeric-string index into
   *  `schema.pins`, or pin id. Handles matching nothing are reported and their edge dropped. */
  schemas?: readonly NodeSchema[]
}

/** Full accounting of everything the import did NOT carry over. Field names and the
 *  droppedFields key scheme (`node.<field>` / `edge.<field>` → count) are contract — the
 *  migration guide documents them verbatim. */
export interface ImportReport {
  counts: { nodes: number; edges: number; pins: number }
  /** Edge endpoints referencing node ids that don't exist. The edge is dropped. */
  unknownNodes: string[]
  /** Handles that matched no schema pin. The edge is dropped. */
  unknownHandles: Array<{ edgeId: string; side: 'source' | 'target'; nodeId: string; handle: string }>
  /** Dropped React Flow fields, grouped by `node.<key>` / `edge.<key>` → occurrence count. */
  droppedFields: Record<string, number>
  /** Structural mismatches worth a human's attention (e.g. subflow parenting). */
  warnings: string[]
}

const RF_PATH_STYLE: Record<string, EdgePathStyle> = {
  default: 'bezier',
  simplebezier: 'bezier',
  straight: 'linear',
  step: 'step',
  smoothstep: 'smoothstep',
}

/** Node fields with a direct xenolith counterpart (everything else counts as dropped). */
const NODE_MAPPED_KEYS = new Set(['id', 'type', 'position', 'data'])
/** Edge fields with a direct xenolith counterpart (everything else counts as dropped). */
const EDGE_MAPPED_KEYS = new Set(['id', 'source', 'target', 'sourceHandle', 'targetHandle', 'type', 'animated', 'label', 'markerEnd'])

const drop = (report: ImportReport, key: string): void => {
  report.droppedFields[key] = (report.droppedFields[key] ?? 0) + 1
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** XenolithPinV1 view of a schema pin (id convention matches the v1 parser's compact form). */
function schemaPins(nodeId: string, schema: NodeSchema): XenolithPinV1[] {
  return schema.pins.map((p, i) => ({
    id: `${nodeId}:${p.label ?? i}`,
    kind: p.kind,
    direction: p.direction,
    type: p.type,
    multiple: p.multiple ?? false,
    ...(p.label !== undefined ? { label: p.label } : {}),
  }))
}

/** Resolve a handle against schema pins: label (case-insensitive) → numeric-string index → id. */
function resolveSchemaPin(pins: XenolithPinV1[], handle: string, direction: 'in' | 'out'): XenolithPinV1 | undefined {
  const byLabel = pins.find((p) => (p.label ?? '').toLowerCase() === handle.toLowerCase())
  if (byLabel && byLabel.direction === direction) return byLabel
  if (/^\d+$/.test(handle)) {
    const byIndex = pins[Number(handle)]
    if (byIndex && byIndex.direction === direction) return byIndex
  }
  const byId = pins.find((p) => p.id === handle)
  if (byId && byId.direction === direction) return byId
  return undefined
}

export function importFromReactFlow(
  json: unknown,
  options: ImportReactFlowOptions = {},
): { doc: XenolithGraphV1; report: ImportReport } {
  if (!isPlainObject(json) || !Array.isArray(json['nodes']) || !Array.isArray(json['edges'])) {
    throw new Error('importFromReactFlow: expected a React Flow graph object ({ nodes: [...], edges: [...] })')
  }
  const graph = json as unknown as ReactFlowGraph
  const report: ImportReport = {
    counts: { nodes: 0, edges: 0, pins: 0 },
    unknownNodes: [],
    unknownHandles: [],
    droppedFields: {},
    warnings: [],
  }
  const schemaByType = new Map<string, NodeSchema>()
  for (const s of options.schemas ?? []) schemaByType.set(s.type, s)

  // ---- nodes --------------------------------------------------------------------------------------
  const nodeById = new Map<string, XenolithNodeV1>()
  const schemaPinsByNode = new Map<string, XenolithPinV1[]>()
  let hadParentId = false
  for (const [i, raw] of graph.nodes.entries()) {
    if (!isPlainObject(raw)) throw new Error(`importFromReactFlow: nodes[${i}] must be an object`)
    const id = raw['id']
    const position = raw['position']
    if (typeof id !== 'string') throw new Error(`importFromReactFlow: nodes[${i}].id must be a string`)
    if (!isPlainObject(position) || typeof position['x'] !== 'number' || typeof position['y'] !== 'number') {
      throw new Error(`importFromReactFlow: nodes[${i}].position must be { x: number, y: number }`)
    }
    const type = typeof raw['type'] === 'string' && raw['type'] ? raw['type'] : 'default'
    for (const key of Object.keys(raw)) {
      if (!NODE_MAPPED_KEYS.has(key)) drop(report, `node.${key}`)
      if (key === 'parentId') hadParentId = true
    }
    const data = raw['data']
    const label = isPlainObject(data) && typeof data['label'] === 'string' ? data['label'] : undefined
    const node: XenolithNodeV1 = {
      id,
      type,
      position: { x: position['x'], y: position['y'] },
      pins: [], // filled below — from schema if we have one, else synthesized from edge handles
      ...(isPlainObject(data) ? { state: { ...data } as Record<string, unknown> } : {}),
      ...(label !== undefined ? { render: { title: label } } : {}),
    }
    nodeById.set(id, node)
    const schema = schemaByType.get(type)
    if (schema) {
      const pins = schemaPins(id, schema)
      node.pins = pins
      schemaPinsByNode.set(id, pins)
    }
  }
  if (hadParentId) {
    report.warnings.push(
      'React Flow subflows (parentId / group nodes) do not migrate: children import as top-level nodes. Group them with macros after import (editor.createMacroFromSelection).',
    )
  }

  // ---- edges + synthesized pins ---------------------------------------------------------------------
  const synthesized = new Map<string, XenolithPinV1>() // `${nodeId}\u0000${handle}` → pin
  const pinFor = (nodeId: string, handle: string | null | undefined, direction: 'in' | 'out'): XenolithPinV1 | undefined => {
    const key = `${handle ?? (direction === 'out' ? 'out' : 'in')}`
    const schemaPinsForNode = schemaPinsByNode.get(nodeId)
    if (schemaPinsForNode) return resolveSchemaPin(schemaPinsForNode, key, direction)
    const mapKey = `${nodeId}\u0000${key}`
    const existing = synthesized.get(mapKey)
    if (existing) return existing
    const node = nodeById.get(nodeId)!
    const nodeType = node.type
    const type = options.inferType?.({ nodeId, nodeType, handle: key, side: direction === 'out' ? 'source' : 'target' }) ?? 'any'
    const pin: XenolithPinV1 = {
      id: `${nodeId}:${key}`,
      kind: 'data',
      direction,
      type,
      multiple: true, // RF handles fan in/out freely; capacity limits would corrupt the import
      label: key,
    }
    synthesized.set(mapKey, pin)
    node.pins.push(pin)
    return pin
  }

  const edges: XenolithEdgeV1[] = []
  for (const [i, raw] of graph.edges.entries()) {
    if (!isPlainObject(raw)) throw new Error(`importFromReactFlow: edges[${i}] must be an object`)
    for (const key of Object.keys(raw)) {
      if (!EDGE_MAPPED_KEYS.has(key)) drop(report, `edge.${key}`)
    }
    const id = typeof raw['id'] === 'string' && raw['id'] ? raw['id'] : `e${i}`
    const source = raw['source'], target = raw['target']
    if (typeof source !== 'string' || typeof target !== 'string') {
      throw new Error(`importFromReactFlow: edges[${i}].source/target must be strings`)
    }
    let dropped = false
    for (const [nodeRef, side] of [[source, 'source'], [target, 'target']] as const) {
      if (!nodeById.has(nodeRef) && !report.unknownNodes.includes(nodeRef)) report.unknownNodes.push(nodeRef)
      if (!nodeById.has(nodeRef)) dropped = true
      void side
    }
    if (dropped) continue
    const sourceHandle = raw['sourceHandle']
    const targetHandle = raw['targetHandle']
    const fromPin = pinFor(source, typeof sourceHandle === 'string' ? sourceHandle : null, 'out')
    const toPin = pinFor(target, typeof targetHandle === 'string' ? targetHandle : null, 'in')
    const edgeId = String(id)
    if (!fromPin) {
      report.unknownHandles.push({ edgeId, side: 'source', nodeId: source, handle: String(sourceHandle ?? 'out') })
      continue
    }
    if (!toPin) {
      report.unknownHandles.push({ edgeId, side: 'target', nodeId: target, handle: String(targetHandle ?? 'in') })
      continue
    }

    const opts: NonNullable<XenolithEdgeV1['opts']> = {}
    if (raw['animated'] === true) opts.animated = true
    if (typeof raw['label'] === 'string') opts.label = raw['label']
    const markerType = isPlainObject(raw['markerEnd']) && typeof raw['markerEnd']['type'] === 'string'
      ? raw['markerEnd']['type']
      : undefined
    if (markerType && markerType.toLowerCase().includes('arrow')) opts.markerEnd = 'arrow'
    const rfType = raw['type']
    if (typeof rfType === 'string' && rfType) {
      const mapped = RF_PATH_STYLE[rfType]
      if (mapped) opts.pathStyle = mapped
      else drop(report, 'edge.type')
    }
    edges.push({
      id: edgeId,
      from: { node: source, pin: fromPin.id },
      to: { node: target, pin: toPin.id },
      ...(Object.keys(opts).length > 0 ? { opts } : {}),
    })
  }
  if (synthesized.size > 0) {
    report.warnings.push(
      `${synthesized.size} pin(s) synthesized from edge handles as type "any" — pass inferType (or schemas matching your node types) to give them real types.`,
    )
  }

  const viewport = graph.viewport
  const doc: XenolithGraphV1 = {
    version: 'xenolith.v1',
    nodes: [...nodeById.values()],
    edges,
    ...(viewport && typeof viewport.x === 'number' && typeof viewport.y === 'number' && typeof viewport.zoom === 'number'
      ? { viewport: { x: viewport.x, y: viewport.y, zoom: viewport.zoom } }
      : {}),
  }
  report.counts = {
    nodes: doc.nodes.length,
    edges: doc.edges.length,
    pins: doc.nodes.reduce((n, node) => n + node.pins.length, 0),
  }
  return { doc, report }
}
