/**
 * Headless logic-level editor double — REAL core objects (Graph, CommandBus, EventEmitter,
 * NodeRegistry), zero rendering. For graph-logic tests where booting the real editor is
 * overkill: schema registration, mutations through the command bus (undo/redo semantics
 * included), event assertions. Rendering/pointer behaviour belongs to the real-editor kit
 * (`mockPixi()` / `renderEditorToDOM()`) or e2e.
 *
 * Deliberately depends only on `@xenolithengine/graph-core` — logic tests stay light.
 */

import {
  AddNode, CommandBus, ConnectPins, DisconnectEdge, EventEmitter, Graph, MoveNode,
  NodeRegistry, RemoveNode,
  createEdgeId,
  type CoreEvents, type Edge, type EdgeId, type Node, type NodeId, type Pin,
} from '@xenolithengine/graph-core'

export type { CoreEvents, Edge, EdgeId, Node, NodeId, Pin }
export type { NodeSchema, PinSchema } from '@xenolithengine/graph-core'

/** Snapshot returned by {@link FakeEditor.toJSON} — a test-assertion shape, not `xenolith.v1`. */
export interface FakeEditorSnapshot {
  nodes: Array<Pick<Node, 'id' | 'type' | 'position'>>
  edges: Array<Pick<Edge, 'id' | 'from' | 'to'>>
}

/**
 * The editor surface hosts most often need in logic tests. Mutations go through the command
 * bus, so `undo()`/`redo()` behave like the real editor's. Events are the bus's core events
 * (`command:applied`, `transaction:committed`, …) — assert on those, or read `graph` directly.
 */
export class FakeEditor {
  readonly graph = new Graph()
  readonly events = new EventEmitter<CoreEvents>()
  readonly commandBus: CommandBus
  readonly registry = new NodeRegistry()

  constructor() {
    this.commandBus = new CommandBus({ graph: this.graph, events: this.events })
  }

  /** Register a node schema, same shape the real editor's `editor.registry.register` takes. */
  register(schema: Parameters<NodeRegistry['register']>[0]): this {
    this.registry.register(schema)
    return this
  }

  /** Create a node from its registered schema and add it (undoable). Returns null for unknown types. */
  insertNode(type: string, worldPos: { x: number; y: number }): Node | null {
    if (!this.registry.has(type)) return null
    const node = this.registry.instantiate(type, worldPos)
    this.commandBus.apply(new AddNode(node))
    return node
  }

  /** Connect two nodes by pin INDEX (undoable, via the command bus — unlike the real editor's
   *  legacy direct `connect`, this one participates in undo). Throws on bad indices. */
  connect(fromNode: Node, fromPinIndex: number, toNode: Node, toPinIndex: number): EdgeId {
    const fromPin = fromNode.pins[fromPinIndex]
    const toPin = toNode.pins[toPinIndex]
    if (!fromPin || fromPin.direction !== 'out') {
      throw new Error(`FakeEditor.connect: node ${fromNode.id} has no output pin at index ${fromPinIndex}`)
    }
    if (!toPin || toPin.direction !== 'in') {
      throw new Error(`FakeEditor.connect: node ${toNode.id} has no input pin at index ${toPinIndex}`)
    }
    const edge: Edge = {
      id: createEdgeId(),
      from: { node: fromNode.id, pin: fromPin.id },
      to: { node: toNode.id, pin: toPin.id },
    }
    this.commandBus.apply(new ConnectPins(edge))
    return edge.id
  }

  /** Move a node (undoable). Returns false when the node does not exist. */
  moveNode(nodeId: NodeId, position: { x: number; y: number }): boolean {
    if (!this.graph.getNode(nodeId)) return false
    this.commandBus.apply(new MoveNode(nodeId, position))
    return true
  }

  /** Remove a node and its incident edges (undoable, edges restored on undo). Returns false when missing. */
  removeNode(nodeId: NodeId): boolean {
    if (!this.graph.getNode(nodeId)) return false
    this.commandBus.apply(new RemoveNode(nodeId))
    return true
  }

  /** Remove one edge (undoable). Returns false when missing. */
  disconnectEdge(edgeId: EdgeId): boolean {
    try {
      this.commandBus.apply(new DisconnectEdge(edgeId))
      return true
    } catch {
      return false
    }
  }

  /** Plain snapshot for assertions. NOT the `xenolith.v1` interchange format — do not feed to
   *  `editor.loadJSON`. */
  toJSON(): FakeEditorSnapshot {
    return {
      nodes: [...this.graph.nodes()].map((n) => ({ id: n.id, type: n.type, position: { ...n.position } })),
      edges: [...this.graph.edges()].map((e) => ({ id: e.id, from: { ...e.from }, to: { ...e.to } })),
    }
  }
}
