// Logic-level contract for FakeEditor: real core objects, command-bus mutations, undo/redo.
// Node env — this suite must NOT need a DOM (that's the point of /fake).
import { describe, it, expect } from 'vitest'
import { FakeEditor } from './fake.js'

const SCHEMA = {
  type: 'Number',
  title: 'Number',
  category: 'data',
  pins: [
    { kind: 'data' as const, direction: 'in' as const, type: 'float', label: 'In' },
    { kind: 'data' as const, direction: 'out' as const, type: 'float', label: 'Out' },
  ],
}

describe('FakeEditor', () => {
  it('registers schemas and instantiates nodes with fresh pin ids', () => {
    const ed = new FakeEditor().register(SCHEMA)
    const a = ed.insertNode('Number', { x: 0, y: 0 })
    const b = ed.insertNode('Number', { x: 100, y: 0 })
    expect(a).toBeTruthy()
    expect(b).toBeTruthy()
    expect(a!.id).not.toBe(b!.id)
    expect(a!.pins).toHaveLength(2)
    expect(a!.pins[0]!.id).not.toBe(b!.pins[0]!.id)
    expect([...ed.graph.nodes()]).toHaveLength(2)
  })

  it('insertNode returns null for unknown types and leaves the graph untouched', () => {
    const ed = new FakeEditor()
    expect(ed.insertNode('Nope', { x: 0, y: 0 })).toBe(null)
    expect([...ed.graph.nodes()]).toHaveLength(0)
  })

  it('connect is undoable through the command bus', () => {
    const ed = new FakeEditor().register(SCHEMA)
    const a = ed.insertNode('Number', { x: 0, y: 0 })!
    const b = ed.insertNode('Number', { x: 1, y: 0 })!
    const edgeId = ed.connect(a, 1, b, 0)
    expect([...ed.graph.edges()]).toHaveLength(1)
    expect(ed.commandBus.undo()).toBe(true)
    expect([...ed.graph.edges()]).toHaveLength(0)
    expect(ed.commandBus.redo()).toBe(true)
    expect([...ed.graph.edges()]).toHaveLength(1)
    expect([...ed.graph.edges()][0]!.id).toBe(edgeId)
  })

  it('connect throws on wrong pin direction or index', () => {
    const ed = new FakeEditor().register(SCHEMA)
    const a = ed.insertNode('Number', { x: 0, y: 0 })!
    const b = ed.insertNode('Number', { x: 1, y: 0 })!
    expect(() => ed.connect(a, 0, b, 0)).toThrow(/output pin/)
    expect(() => ed.connect(a, 1, b, 1)).toThrow(/input pin/)
    expect(() => ed.connect(a, 9, b, 0)).toThrow(/output pin/)
  })

  it('removeNode cascades edges and undo restores both', () => {
    const ed = new FakeEditor().register(SCHEMA)
    const a = ed.insertNode('Number', { x: 0, y: 0 })!
    const b = ed.insertNode('Number', { x: 1, y: 0 })!
    ed.connect(a, 1, b, 0)
    expect(ed.removeNode(b!.id)).toBe(true)
    expect([...ed.graph.nodes()]).toHaveLength(1)
    expect([...ed.graph.edges()]).toHaveLength(0)
    ed.commandBus.undo()
    expect([...ed.graph.nodes()]).toHaveLength(2)
    expect([...ed.graph.edges()]).toHaveLength(1)
  })

  it('mutations emit command:applied with the command instance', () => {
    const ed = new FakeEditor().register(SCHEMA)
    const seen: string[] = []
    ed.events.on('command:applied', ({ command }) => seen.push(command.type))
    const a = ed.insertNode('Number', { x: 0, y: 0 })!
    ed.moveNode(a.id, { x: 5, y: 5 })
    expect(seen).toEqual(['AddNode', 'MoveNode'])
    expect(ed.graph.getNode(a.id)!.position).toEqual({ x: 5, y: 5 })
  })

  it('toJSON snapshots nodes and edges for assertions', () => {
    const ed = new FakeEditor().register(SCHEMA)
    const a = ed.insertNode('Number', { x: 0, y: 0 })!
    const b = ed.insertNode('Number', { x: 1, y: 0 })!
    ed.connect(a, 1, b, 0)
    const json = ed.toJSON()
    expect(json.nodes.map((n) => n.type)).toEqual(['Number', 'Number'])
    expect(json.edges).toHaveLength(1)
    expect(json.edges[0]!.from.node).toBe(a.id)
    expect(json.edges[0]!.to.node).toBe(b.id)
  })
})
