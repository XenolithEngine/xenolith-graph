import { describe, it, expect } from 'vitest'
import { Graph } from './graph.js'
import type { Node, Edge, Pin } from './graph.js'
import { createNodeId, createEdgeId, createPinId } from './ids.js'
import { evaluateGraph } from './evaluate.js'

function pin(direction: 'in' | 'out', label: string): Pin {
  return { id: createPinId(), kind: 'data', direction, type: 'number', multiple: false, label }
}

function addNode(g: Graph, type: string, labels: { inn: string[]; out: string[] }, state: Record<string, unknown> = {}): Node {
  const n: Node = {
    id: createNodeId(), type, position: { x: 0, y: 0 }, state,
    pins: [...labels.inn.map((l) => pin('in', l)), ...labels.out.map((l) => pin('out', l))],
  }
  g._addNode(n)
  return n
}

function wire(g: Graph, from: Node, fromLabel: string, to: Node, toLabel: string): void {
  const fp = from.pins.find((p) => p.label === fromLabel)!
  const tp = to.pins.find((p) => p.label === toLabel)!
  const e: Edge = { id: createEdgeId(), from: { node: from.id, pin: fp.id }, to: { node: to.id, pin: tp.id } }
  g._addEdge(e)
}

describe('evaluateGraph', () => {
  it('runs a host compute in dependency order and feeds outputs into the next inputs', () => {
    const g = new Graph()
    const a = addNode(g, 'Const', { inn: [], out: ['Out'] }, { value: 5 })
    const b = addNode(g, 'Const', { inn: [], out: ['Out'] }, { value: 3 })
    const sum = addNode(g, 'Add', { inn: ['A', 'B'], out: ['Sum'] })
    wire(g, a, 'Out', sum, 'A')
    wire(g, b, 'Out', sum, 'B')

    const seen: string[] = []
    const result = evaluateGraph(g, (node, inputs) => {
      seen.push(node.type)
      if (node.type === 'Const') return { Out: Number(node.state['value'] ?? 0) }
      if (node.type === 'Add') return { Sum: Number(inputs['A'] ?? 0) + Number(inputs['B'] ?? 0) }
    })

    expect(result.cyclic).toEqual([])
    expect(seen.indexOf('Add')).toBeGreaterThan(seen.indexOf('Const'))
    expect(result.outputs.get(`${sum.id}:Sum`)).toBe(8)
  })

  it('omits an input pin that has no incoming edge', () => {
    const g = new Graph()
    const sum = addNode(g, 'Add', { inn: ['A', 'B'], out: ['Sum'] })
    let inputs: Record<string, unknown> = {}
    evaluateGraph(g, (node, i) => { inputs = { ...i }; return { Sum: 0 } })
    expect(inputs).toEqual({})
    expect(sum.type).toBe('Add')
  })

  it('does not compute nodes that sit in a cycle and reports them', () => {
    const g = new Graph()
    const a = addNode(g, 'A', { inn: ['In'], out: ['Out'] })
    const b = addNode(g, 'B', { inn: ['In'], out: ['Out'] })
    wire(g, a, 'Out', b, 'In')
    wire(g, b, 'Out', a, 'In')
    const ran: string[] = []
    const result = evaluateGraph(g, (node) => { ran.push(node.type); return { Out: 1 } })
    expect(ran).toEqual([])
    expect(result.order).toEqual([])
    expect(result.cyclic.sort()).toEqual([a.id, b.id].sort())
    expect(result.outputs.size).toBe(0)
  })
})

