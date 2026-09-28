/**
 * Commit-time controlled protocol (E5 / ADR 0006).
 *
 * `editor.on('graph:changed', ({ changes }) => …)` receives coalesced change-arrays at
 * COMMAND-BUS COMMIT time — one array per transaction / undo-group commit, one per top-level
 * command, one per undo/redo history step. Nothing fires per drag frame: positions are
 * renderer-owned until commit, and the host store sees the COMMIT (the deliberate refusal of
 * React Flow's re-render-per-drag model).
 *
 * `editor.applyChanges(changes)` maps arrays back onto the same core commands inside one
 * transaction (one undo step), and is IDEMPOTENT for echoes — re-applying an array the editor
 * just emitted converges instead of looping. `reduceGraphChanges` is the pure reducer for
 * external stores (Zustand/Redux) and the React `useNodesState` hook.
 *
 * Unmapped command types (comments, macros, templates in v1) surface in `unsupported` — the
 * array is never silently incomplete.
 */

import {
  AddNode, CommandBus, ConnectPins, DisconnectEdge, MoveNode, RemoveNode,
  SetNodePins, SetNodeState, SetNodeWidgets,
  type Command, type CoreEvents, type Edge, type EventEmitter, type Graph, type Node, type NodeId, type EdgeId, type Pin,
  type WidgetSpec, type HistoryAppliedCommand, type Vec2,
} from '@xenolithengine/graph-core'

// ---- payload (public contract — freeze-shape at v1.0) -------------------------------------------

export type NodeChange =
  | { type: 'add'; node: Node }
  | { type: 'remove'; id: NodeId }
  | { type: 'position'; id: NodeId; position: Vec2 }
  | { type: 'data'; id: NodeId; state?: Record<string, unknown>; widgets?: WidgetSpec[]; pins?: Pin[] }

export type EdgeChange =
  | { type: 'add'; edge: Edge }
  | { type: 'remove'; id: EdgeId }

export interface GraphChanges {
  nodes: NodeChange[]
  edges: EdgeChange[]
  /** Command types seen in the committed batch but not translated (v1: comments, macros,
   *  templates). Present-and-empty means the array is complete. */
  unsupported: string[]
}

/** Plain mirror of the graph the reducer folds arrays into — the external-store shape. */
export interface GraphMirror {
  nodes: Node[]
  edges: Edge[]
}

// ---- pure reducer (store integration point) ------------------------------------------------------

function cloneNode(n: Node): Node {
  return {
    ...n,
    position: { ...n.position },
    state: { ...n.state },
    pins: n.pins.map((p) => ({ ...p })),
    ...(n.widgets ? { widgets: n.widgets.map((w) => ({ ...w })) } : {}),
  } as Node
}

function cloneEdge(e: Edge): Edge {
  return { ...e, from: { ...e.from }, to: { ...e.to } } as Edge
}

/** Fold a change-array into a snapshot. Pure — safe as a store reducer. */
export function reduceGraphChanges(snapshot: GraphMirror, changes: GraphChanges): GraphMirror {
  const nodes = snapshot.nodes.slice()
  const edges = snapshot.edges.slice()
  const nodeIndex = (id: NodeId): number => nodes.findIndex((n) => n.id === id)
  const edgeIndex = (id: EdgeId): number => edges.findIndex((e) => e.id === id)

  for (const c of changes.nodes) {
    if (c.type === 'add') {
      const i = nodeIndex(c.node.id)
      if (i >= 0) nodes[i] = cloneNode(c.node)
      else nodes.push(cloneNode(c.node))
    } else if (c.type === 'remove') {
      const i = nodeIndex(c.id)
      if (i >= 0) nodes.splice(i, 1)
    } else if (c.type === 'position') {
      const i = nodeIndex(c.id)
      if (i >= 0) nodes[i] = { ...nodes[i]!, position: { ...c.position } } as Node
    } else {
      const i = nodeIndex(c.id)
      if (i < 0) continue
      // Replace with a patched clone — the reducer must not mutate shared node records.
      const n = { ...nodes[i]! } as Node
      if (c.state !== undefined) n.state = { ...c.state }
      if (c.widgets !== undefined) n.widgets = c.widgets.map((w) => ({ ...w })) as NonNullable<Node['widgets']>
      if (c.pins !== undefined) n.pins = c.pins.map((p) => ({ ...p })) as Pin[]
      nodes[i] = n
    }
  }
  for (const c of changes.edges) {
    if (c.type === 'add') {
      if (edgeIndex(c.edge.id) < 0) edges.push(cloneEdge(c.edge))
    } else {
      const i = edgeIndex(c.id)
      if (i >= 0) edges.splice(i, 1)
    }
  }
  return { nodes, edges }
}

/** Read the editor's graph as a reducer-compatible snapshot. */
export function snapshotGraph(nodes: Iterable<Node>, edges: Iterable<Edge>): GraphMirror {
  return {
    nodes: [...nodes].map(cloneNode),
    edges: [...edges].map(cloneEdge),
  }
}

// ---- bridge: command bus → coalesced arrays ------------------------------------------------------

export interface ControlledBridgeOptions {
  coreEvents: EventEmitter<CoreEvents>
  /** The bus whose commits define the coalesing granularity. */
  bus: CommandBus
  /** Live graph (a getter — the editor's display graph swaps while dived). */
  graph: Graph | (() => Graph)
  /** Where coalesed arrays land (the editor re-emits them as the public `graph:changed`). */
  emit: (changes: GraphChanges) => void
}

interface Known {
  node?: { nodeId: NodeId }
  edge?: { edge: Edge }
  pins?: unknown
}

/** Translate one applied command (either direction) into change entries appended to `out`. */
function translate(entry: HistoryAppliedCommand, forward: boolean, graphOf: () => Graph, out: GraphChanges): void {
  const command = entry.command as Command<unknown> & Known
  const result = entry.result
  switch (command.type) {
    case 'AddNode': {
      if (forward) out.nodes.push({ type: 'add', node: cloneNode((command as unknown as { node: Node }).node) })
      else out.nodes.push({ type: 'remove', id: (command as unknown as { node: Node }).node.id })
      break
    }
    case 'RemoveNode': {
      const r = result as { node: Node; cascadedEdges: Edge[] } | undefined
      if (forward) {
        out.nodes.push({ type: 'remove', id: (command as unknown as { nodeId: NodeId }).nodeId })
        for (const e of r?.cascadedEdges ?? []) out.edges.push({ type: 'remove', id: e.id })
      } else if (r) {
        out.nodes.push({ type: 'add', node: cloneNode(r.node) })
        for (const e of r.cascadedEdges) out.edges.push({ type: 'add', edge: cloneEdge(e) })
      }
      break
    }
    case 'ConnectPins': {
      const edge = (command as unknown as { edge: Edge }).edge
      if (forward) out.edges.push({ type: 'add', edge: cloneEdge(edge) })
      else out.edges.push({ type: 'remove', id: edge.id })
      break
    }
    case 'DisconnectEdge': {
      const edgeId = (command as unknown as { edgeId: EdgeId }).edgeId
      if (forward) out.edges.push({ type: 'remove', id: edgeId })
      else if (result) out.edges.push({ type: 'add', edge: cloneEdge(result as Edge) })
      break
    }
    case 'MoveNode': {
      const nodeId = (command as unknown as { nodeId: NodeId }).nodeId
      const n = graphOf().getNode(nodeId)
      if (n) out.nodes.push({ type: 'position', id: nodeId, position: { ...n.position } })
      break
    }
    case 'SetNodeState': {
      const nodeId = (command as unknown as { nodeId: NodeId }).nodeId
      const n = graphOf().getNode(nodeId)
      if (n) out.nodes.push({ type: 'data', id: nodeId, state: { ...n.state } })
      break
    }
    case 'SetNodeWidgets': {
      const nodeId = (command as unknown as { nodeId: NodeId }).nodeId
      const n = graphOf().getNode(nodeId)
      if (n) {
        const change: NodeChange = { type: 'data', id: nodeId }
        if (n.widgets) change.widgets = n.widgets.map((w) => ({ ...w }))
        out.nodes.push(change)
      }
      break
    }
    case 'SetNodePins': {
      const nodeId = (command as unknown as { nodeId: NodeId }).nodeId
      const n = graphOf().getNode(nodeId)
      if (n) out.nodes.push({ type: 'data', id: nodeId, pins: n.pins.map((p) => ({ ...p })) })
      const pruned = (result as { prunedEdges: Edge[] } | undefined)?.prunedEdges ?? []
      for (const e of pruned) {
        if (forward) out.edges.push({ type: 'remove', id: e.id })
        else out.edges.push({ type: 'add', edge: cloneEdge(e) })
      }
      break
    }
    default:
      if (!out.unsupported.includes(command.type)) out.unsupported.push(command.type)
  }
}

/** Within one committed batch, collapse per-frame position ticks: keep only the LAST
 *  position per node, and fold it into an `add` of the same node from the same batch (the add
 *  already carries a full record — it should carry the FINAL one). Order of everything else is
 *  preserved; add/remove sequences for one id are NOT collapsed (stores replay in order). */
function compressPositions(out: GraphChanges): GraphChanges {
  let lastPos = new Map<NodeId, number>()
  for (let i = out.nodes.length - 1; i >= 0; i--) {
    const c = out.nodes[i]!
    if (c.type === 'position' && !lastPos.has(c.id)) lastPos.set(c.id, i)
  }
  const nodes: NodeChange[] = []
  const folded = new Set<NodeId>()
  for (let i = 0; i < out.nodes.length; i++) {
    const c = out.nodes[i]!
    if (c.type === 'position') {
      if (i !== lastPos.get(c.id)) continue // superseded by a later tick in the same batch
      if (folded.has(c.id)) continue        // merged into this batch's add
    } else if (c.type === 'add') {
      const posIdx = lastPos.get(c.node.id)
      const pos = posIdx !== undefined && posIdx > i ? out.nodes[posIdx] : undefined
      if (pos && pos.type === 'position') {
        nodes.push({ type: 'add', node: { ...c.node, position: { ...pos.position } } })
        folded.add(c.node.id)
        continue
      }
    }
    nodes.push(c)
  }
  return { nodes, edges: out.edges, unsupported: out.unsupported }
}

/** Synthetic full-replace array for document-level swaps (loadJSON / clear) that bypass the
 *  command bus for scale. Emits removes for everything that was there, adds for everything
 *  that now is — a store folding this array converges to the new document exactly. */
export function documentReplacedChanges(before: GraphMirror, after: GraphMirror): GraphChanges {
  const changes: GraphChanges = { nodes: [], edges: [], unsupported: [] }
  const afterNodeIds = new Set(after.nodes.map((n) => n.id))
  const afterEdgeIds = new Set(after.edges.map((e) => e.id))
  for (const n of before.nodes) if (!afterNodeIds.has(n.id)) changes.nodes.push({ type: 'remove', id: n.id })
  for (const e of before.edges) if (!afterEdgeIds.has(e.id)) changes.edges.push({ type: 'remove', id: e.id })
  for (const n of after.nodes) changes.nodes.push({ type: 'add', node: cloneNode(n) })
  for (const e of after.edges) changes.edges.push({ type: 'add', edge: cloneEdge(e) })
  return changes
}

export function createControlledBridge(opts: ControlledBridgeOptions): () => void {
  const { coreEvents, bus, emit } = opts
  const graphOf = typeof opts.graph === 'function' ? opts.graph : () => opts.graph as Graph
  let buffer: GraphChanges | null = null

  const empty = (): GraphChanges => ({ nodes: [], edges: [], unsupported: [] })
  const flush = (): void => {
    if (!buffer) return
    const out = buffer
    buffer = null
    // An all-empty array (e.g. every command unmapped-and-filtered) still reports unsupported.
    if (out.nodes.length === 0 && out.edges.length === 0 && out.unsupported.length === 0) return
    emit(compressPositions(out))
  }

  const offApplied = coreEvents.on('command:applied', ({ command, result }) => {
    if (bus.collecting) {
      buffer ??= empty()
      translate({ command, result }, true, graphOf, buffer)
    } else {
      const out = empty()
      translate({ command, result }, true, graphOf, out)
      if (out.nodes.length > 0 || out.edges.length > 0 || out.unsupported.length > 0) emit(out)
    }
  })
  const offCommitted = coreEvents.on('transaction:committed', () => flush())
  const offReverted = coreEvents.on('transaction:reverted', () => { buffer = null }) // rolled back → never happened
  const offUndone = coreEvents.on('history:undone', ({ entries }) => {
    const out = empty()
    for (const e of entries) translate(e, false, graphOf, out)
    if (out.nodes.length > 0 || out.edges.length > 0 || out.unsupported.length > 0) emit(out)
  })
  const offRedone = coreEvents.on('history:redone', ({ entries }) => {
    const out = empty()
    for (const e of entries) translate(e, true, graphOf, out)
    if (out.nodes.length > 0 || out.edges.length > 0 || out.unsupported.length > 0) emit(out)
  })

  return () => {
    offApplied(); offCommitted(); offReverted(); offUndone(); offRedone()
  }
}

// ---- applyChanges command mapping -----------------------------------------------------------------

export interface ApplyChangesDeps {
  bus: CommandBus
  graph: Graph | (() => Graph)
}

/** Map a change-array back onto core commands inside ONE transaction. Echo-idempotent:
 *  adds of existing ids, removes of missing ids and no-op positions are skipped. */
export function applyChangesToBus(deps: ApplyChangesDeps, changes: GraphChanges): void {
  const { bus } = deps
  const graphOf = typeof deps.graph === 'function' ? deps.graph : () => deps.graph as Graph
  bus.transaction(() => {
    for (const c of changes.nodes) {
      const graph = graphOf()
      if (c.type === 'add') {
        if (!graph.getNode(c.node.id)) bus.apply(new AddNode(cloneNode(c.node)))
      } else if (c.type === 'remove') {
        if (graph.getNode(c.id)) bus.apply(new RemoveNode(c.id))
      } else if (c.type === 'position') {
        const n = graph.getNode(c.id)
        if (n && (n.position.x !== c.position.x || n.position.y !== c.position.y)) {
          bus.apply(new MoveNode(c.id, { ...c.position }))
        }
      } else {
        if (!graph.getNode(c.id)) continue
        if (c.state !== undefined) bus.apply(new SetNodeState(c.id, { ...c.state }))
        if (c.widgets !== undefined) bus.apply(new SetNodeWidgets(c.id, c.widgets))
        if (c.pins !== undefined) bus.apply(new SetNodePins(c.id, c.pins))
      }
    }
    for (const e of changes.edges) {
      const graph = graphOf()
      if (e.type === 'add') {
        if (!graph.getEdge(e.edge.id)) bus.apply(new ConnectPins(cloneEdge(e.edge)))
      } else {
        if (graph.getEdge(e.id)) bus.apply(new DisconnectEdge(e.id))
      }
    }
  })
}
