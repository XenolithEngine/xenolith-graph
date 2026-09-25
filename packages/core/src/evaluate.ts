// Host-side dataflow pass. The editor does not execute graphs. A host supplies one function
// per node; this walks `topoOrder` and threads output-pin values into the next node's inputs.
import type { Graph, Node, Pin } from './graph.js'
import type { NodeId } from './ids.js'
import { topoOrder } from './traversal.js'

/** Read `node.state` and `inputs` (keyed by incoming pin label). Return a map keyed by
 *  outgoing pin label. Pins with no label use their id. Exec pins carry no value. */
export type NodeCompute = (
  node: Node,
  inputs: Readonly<Record<string, unknown>>,
) => Record<string, unknown> | void

export interface EvaluateGraphResult {
  /** Acyclic nodes, sources first. */
  order: NodeId[]
  /** Nodes left unordered because they sit in a cycle. They are not computed. */
  cyclic: NodeId[]
  /** Produced values, keyed `${nodeId}:${pinLabel}`. */
  outputs: Map<string, unknown>
}

function pinKey(pin: Pin): string {
  return pin.label && pin.label.length > 0 ? pin.label : String(pin.id)
}

export function evaluateGraph(graph: Graph, compute: NodeCompute): EvaluateGraphResult {
  const { order, cyclic } = topoOrder(graph)
  const outputs = new Map<string, unknown>()
  const byId = new Map<NodeId, Node>()
  for (const n of graph.nodes()) byId.set(n.id, n as Node)

  for (const id of order) {
    const node = byId.get(id)
    if (!node) continue
    const inputs: Record<string, unknown> = {}
    for (const e of graph.edges()) {
      if (e.to.node !== id) continue
      const inPin = node.pins.find((p) => String(p.id) === String(e.to.pin))
      if (!inPin || inPin.kind === 'exec') continue
      const from = byId.get(e.from.node)
      const outPin = from?.pins.find((p) => String(p.id) === String(e.from.pin))
      if (!outPin || outPin.kind === 'exec') continue
      const value = outputs.get(`${e.from.node}:${pinKey(outPin)}`)
      if (value !== undefined) inputs[pinKey(inPin)] = value
    }
    const produced = compute(node, inputs) ?? {}
    for (const pin of node.pins) {
      if (pin.direction !== 'out' || pin.kind === 'exec') continue
      const key = pinKey(pin)
      if (Object.prototype.hasOwnProperty.call(produced, key)) outputs.set(`${id}:${key}`, produced[key])
    }
  }
  return { order, cyclic, outputs }
}
