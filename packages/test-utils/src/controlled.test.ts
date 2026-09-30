// @vitest-environment jsdom
// E5 adversarial contract: commit-time controlled protocol (ADR 0006). Runs against the REAL
// editor because the invariants are lifecycle-level: coalescing at command-bus commit, undo
// bracketing, echo idempotence, replay round-trip. The pure reducer has its own unit suite in
// packages/editor. Adversarial review recommended — controlled-state protocols are where
// agent-written tests and agent-written impls share the most blind spots.
import { describe, it, expect, afterEach } from 'vitest'
import { renderEditorToDOM, type EditorToDOMHandle } from './index.js'
import type { GraphChanges } from '@xenolithengine/graph-editor'

let mounted: EditorToDOMHandle | null = null
const emitted: GraphChanges[] = []
afterEach(() => {
  mounted?.unmount()
  mounted = null
  emitted.length = 0
})

const SCHEMA = {
  type: 'Box', title: 'Box', category: 'data',
  pins: [
    { kind: 'data' as const, direction: 'in' as const, type: 'float', label: 'In' },
    { kind: 'data' as const, direction: 'out' as const, type: 'float', label: 'Out' },
  ],
}

async function boot() {
  const h = await renderEditorToDOM()
  mounted = h
  h.editor.registry.register(SCHEMA)
  h.editor.on('graph:changed', ({ changes }) => emitted.push(changes))
  return h
}

const kinds = (c: GraphChanges) => ({
  nodes: c.nodes.map((n) => `${n.type}:${n.id}`),
  edges: c.edges.map((e) => `${e.type}:${e.id}`),
})

describe('graph:changed — coalescing at commit (ADR 0006)', () => {
  it('a transaction of N commands emits EXACTLY ONE array', async () => {
    const { editor } = await boot()
    editor.commandBus.transaction(() => {
      editor.insertNode('Box', { x: 0, y: 0 })
      editor.insertNode('Box', { x: 1, y: 0 })
      editor.insertNode('Box', { x: 2, y: 0 })
    })
    expect(emitted).toHaveLength(1)
    expect(emitted[0]!.nodes).toHaveLength(3)
    expect(emitted[0]!.nodes.every((n) => n.type === 'add')).toBe(true)
  })

  it('a top-level single command emits its own array immediately', async () => {
    const { editor } = await boot()
    editor.insertNode('Box', { x: 0, y: 0 })
    expect(emitted).toHaveLength(1)
    expect(emitted[0]!.nodes).toHaveLength(1)
  })

  it('drag-shaped group: ZERO emissions per tick, ONE coalesced array with final positions only', async () => {
    const { editor } = await boot()
    const n = editor.insertNode('Box', { x: 0, y: 0 })!
    emitted.length = 0 // ignore the insert
    editor.commandBus.beginGroup({ label: 'drag' })
    editor.moveNode(n.id, { x: 10, y: 0 })
    editor.moveNode(n.id, { x: 20, y: 0 })
    editor.moveNode(n.id, { x: 30, y: 0 })
    expect(emitted).toHaveLength(0) // per-frame silence — THE anti-React-Flow invariant
    editor.commandBus.endGroup()
    expect(emitted).toHaveLength(1)
    expect(emitted[0]!.nodes).toHaveLength(1)
    expect(emitted[0]!.nodes[0]).toMatchObject({ type: 'position', position: { x: 30, y: 0 } })
  })

  it('loadJSON emits ONE array carrying every node add', async () => {
    const { editor } = await boot()
    editor.loadJSON({
      version: 'xenolith.v1',
      nodes: [1, 2, 3, 4, 5].map((i) => ({
        id: `ln${i}`, type: 'Box', position: { x: i * 100, y: 0 },
        pins: [
          { id: `ln${i}:in`, kind: 'data', direction: 'in', type: 'float', multiple: false },
          { id: `ln${i}:out`, kind: 'data', direction: 'out', type: 'float', multiple: false },
        ],
      })),
      edges: [],
    })
    expect(emitted).toHaveLength(1)
    expect(emitted[0]!.nodes.filter((n) => n.type === 'add')).toHaveLength(5)
  })

  it('undo of a multi-command transaction emits ONE array of inverses; redo restores', async () => {
    const { editor } = await boot()
    editor.commandBus.transaction(() => {
      editor.insertNode('Box', { x: 0, y: 0 })
      editor.insertNode('Box', { x: 1, y: 0 })
    })
    emitted.length = 0
    editor.history.undo()
    expect(emitted).toHaveLength(1)
    expect(emitted[0]!.nodes.every((n) => n.type === 'remove')).toBe(true)
    expect(emitted[0]!.nodes).toHaveLength(2)
    emitted.length = 0
    editor.history.redo()
    expect(emitted).toHaveLength(1)
    expect(emitted[0]!.nodes.every((n) => n.type === 'add')).toBe(true)
  })

  it('a vetoed mutation emits NOTHING', async () => {
    const { editor } = await boot()
    const off = editor.on('node:removing', (p) => p.cancel())
    const n = editor.insertNode('Box', { x: 0, y: 0 })!
    emitted.length = 0
    expect(editor.removeNode(n.id)).toBe(false)
    expect(emitted).toHaveLength(0)
    off()
  })

  it('removing a connected node accounts the cascaded edge', async () => {
    const { editor } = await boot()
    const a = editor.insertNode('Box', { x: 0, y: 0 })!
    const b = editor.insertNode('Box', { x: 1, y: 0 })!
    const edgeId = editor.connect(a, 'Out', b, 'In')
    emitted.length = 0
    editor.removeNode(b.id)
    expect(emitted).toHaveLength(1)
    expect(kinds(emitted[0]!)).toEqual({
      nodes: [`remove:${b.id}`],
      edges: [`remove:${edgeId}`],
    })
  })

  it('unmapped commands surface in `unsupported` instead of vanishing', async () => {
    const { editor } = await boot()
    editor.addComment({ position: { x: 0, y: 0 }, size: { x: 200, y: 120 }, text: 'note' })
    expect(emitted.length).toBeGreaterThanOrEqual(1)
    expect(emitted[0]!.unsupported).toContain('AddComment')
  })
})

describe('applyChanges — the write side (ADR 0006)', () => {
  it('add + position + remove in one call is ONE undo step', async () => {
    const { editor } = await boot()
    const a = editor.insertNode('Box', { x: 0, y: 0 })!
    const keep = editor.insertNode('Box', { x: 100, y: 0 })!
    emitted.length = 0
    editor.applyChanges({
      nodes: [
        { type: 'add', node: { ...a, id: 'fresh', position: { x: 500, y: 500 } } },
        { type: 'position', id: keep.id, position: { x: 42, y: 42 } },
        { type: 'remove', id: a.id },
      ],
      edges: [],
      unsupported: [],
    })
    const json = editor.toJSON()
    expect(json.nodes.some((n) => n.id === 'fresh')).toBe(true)
    expect(json.nodes.some((n) => n.id === a.id)).toBe(false)
    expect(editor.graph.getNode(keep.id)!.position).toEqual({ x: 42, y: 42 })
    editor.history.undo() // ONE step unwinds all three
    const undone = editor.toJSON()
    expect(undone.nodes.some((n) => n.id === 'fresh')).toBe(false)
    expect(undone.nodes.some((n) => n.id === a.id)).toBe(true)
    expect(editor.graph.getNode(keep.id)!.position).toEqual({ x: 100, y: 0 })
  })

  it('echo-idempotence: replaying the same array is a no-op (no dupes, no throws)', async () => {
    const { editor } = await boot()
    const a = editor.insertNode('Box', { x: 0, y: 0 })!
    const b = editor.insertNode('Box', { x: 1, y: 0 })!
    const edgeId = editor.connect(a, 'Out', b, 'In')
    const captured = emitted.slice()
    emitted.length = 0
    editor.applyChanges(captured[0]!) // the classic echo: host pipes the array straight back
    const json = editor.toJSON()
    expect(json.nodes).toHaveLength(2)
    expect(json.edges).toHaveLength(1)
    expect(editor.graph.getNode(a.id)).toBeTruthy()
    void edgeId
  })

  it('round-trip: a recorded session replays onto a cleared editor to structural equality', async () => {
    const h = await boot()
    const { editor } = h
    const a = editor.insertNode('Box', { x: 0, y: 0 })!
    const b = editor.insertNode('Box', { x: 200, y: 0 })!
    editor.connect(a, 'Out', b, 'In')
    editor.commandBus.beginGroup({ label: 'drag' })
    editor.moveNode(a.id, { x: 40, y: 90 })
    editor.commandBus.endGroup()
    const before = editor.toJSON()
    const tape = emitted.slice()

    editor.clear()
    emitted.length = 0
    for (const changes of tape) editor.applyChanges(changes)
    const after = editor.toJSON()
    expect(after.nodes.map((n) => n.id).sort()).toEqual(before.nodes.map((n) => n.id).sort())
    for (const n of after.nodes) {
      const orig = before.nodes.find((x) => x.id === n.id)!
      expect(n.position).toEqual(orig.position)
    }
    expect(after.edges).toHaveLength(before.edges.length)
  })

  it('wiring data: setWidgetValue lands as a nodes.data change and replays', async () => {
    const { editor } = await boot()
    editor.registry.register({
      type: 'Dial', title: 'Dial', category: 'data',
      pins: [{ kind: 'data', direction: 'out', type: 'float', label: 'Out' }],
      widgets: [{ id: 'level', type: 'slider', key: 'level', label: 'Level', min: 0, max: 1 }],
    })
    const d = editor.insertNode('Dial', { x: 0, y: 0 })!
    emitted.length = 0
    editor.setWidgetValue(d.id, 'level', 0.75)
    expect(emitted).toHaveLength(1)
    const change = emitted[0]!.nodes[0]!
    expect(change.type).toBe('data')
    if (change.type === 'data') expect(change.state).toMatchObject({ level: 0.75 })
  })
})

describe('editor.connect connection object', () => {
  it('wires by node id and pin label, the React Flow onConnect shape', async () => {
    const { editor } = await boot()
    const a = editor.insertNode('Box', { x: 0, y: 0 })!
    const b = editor.insertNode('Box', { x: 100, y: 0 })!
    const id = editor.connect({
      source: a.id,
      sourceHandle: 'Out',
      target: b.id,
      targetHandle: 'In',
    })
    const edge = [...editor.graphEdges()].find((e) => e.id === id)
    expect(edge?.from).toEqual({ node: a.id, pin: a.pins.find((p) => p.label === 'Out')!.id })
    expect(edge?.to).toEqual({ node: b.id, pin: b.pins.find((p) => p.label === 'In')!.id })
  })

  it('treats null handles as the single pin of that direction', async () => {
    const { editor } = await boot()
    const a = editor.insertNode('Box', { x: 0, y: 0 })!
    const b = editor.insertNode('Box', { x: 100, y: 0 })!
    const id = editor.connect({ source: a, sourceHandle: null, target: b, targetHandle: null })
    expect([...editor.graphEdges()].some((e) => e.id === id)).toBe(true)
  })

  it('throws when the source id is not in the graph', async () => {
    const { editor } = await boot()
    const b = editor.insertNode('Box', { x: 0, y: 0 })!
    expect(() => editor.connect({
      source: 'missing',
      sourceHandle: 'Out',
      target: b.id,
      targetHandle: 'In',
    })).toThrow(/source node 'missing'/)
  })
})
