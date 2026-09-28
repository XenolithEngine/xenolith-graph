// @vitest-environment jsdom
// Spec-first contract for the CANONICAL editor.connect() (E2). Runs against the REAL editor
// (booted via this kit) because the semantics under test are editor-level: command-bus routing,
// undoability, event bridging, type gating, veto. The pure resolution table lives in
// packages/editor/src/pin-resolve.test.ts.
import { describe, it, expect, afterEach } from 'vitest'
import { renderEditorToDOM, type EditorToDOMHandle } from './index.js'
import type { Node } from '@xenolithengine/graph-core'

let mounted: EditorToDOMHandle | null = null
afterEach(() => {
  mounted?.unmount()
  mounted = null
})

const SCHEMAS = [
  {
    type: 'Emitter', title: 'Emitter', category: 'data',
    pins: [{ kind: 'data' as const, direction: 'out' as const, type: 'float', label: 'Value' }],
  },
  {
    type: 'Tap', title: 'Tap', category: 'data',
    pins: [{ kind: 'data' as const, direction: 'in' as const, type: 'float', label: 'In' }],
  },
  {
    type: 'Text', title: 'Text', category: 'data',
    pins: [
      { kind: 'data' as const, direction: 'in' as const, type: 'string', label: 'Text' },
      { kind: 'data' as const, direction: 'out' as const, type: 'string', label: 'Out' },
    ],
  },
  {
    type: 'Hub', title: 'Hub', category: 'data',
    pins: [
      { kind: 'data' as const, direction: 'out' as const, type: 'float', label: 'A' },
      { kind: 'data' as const, direction: 'out' as const, type: 'float', label: 'B' },
    ],
  },
]

async function boot() {
  const h = await renderEditorToDOM()
  mounted = h
  for (const s of SCHEMAS) h.editor.registry.register(s)
  return h
}

describe('canonical editor.connect(from, ref, to, ref) — real editor', () => {
  it('connects by pin LABEL', async () => {
    const { editor } = await boot()
    const e = editor.insertNode('Emitter', { x: 0, y: 0 })!
    const t = editor.insertNode('Tap', { x: 1, y: 0 })!
    const id = editor.connect(e, 'Value', t, 'In')
    expect(editor.toJSON().edges).toHaveLength(1)
    expect(editor.toJSON().edges[0]!.id).toBe(id)
  })

  it('connects by numeric index (legacy call shape still works)', async () => {
    const { editor } = await boot()
    const e = editor.insertNode('Emitter', { x: 0, y: 0 })!
    const t = editor.insertNode('Tap', { x: 1, y: 0 })!
    editor.connect(e, 0, t, 0)
    expect(editor.toJSON().edges).toHaveLength(1)
  })

  it('connects with undefined refs via the single-pin default', async () => {
    const { editor } = await boot()
    const e = editor.insertNode('Emitter', { x: 0, y: 0 })!
    const t = editor.insertNode('Tap', { x: 1, y: 0 })!
    editor.connect(e, undefined, t, undefined)
    expect(editor.toJSON().edges).toHaveLength(1)
  })

  it('is UNDOABLE: one history.undo() removes the edge, redo restores it', async () => {
    const { editor } = await boot()
    const e = editor.insertNode('Emitter', { x: 0, y: 0 })!
    const t = editor.insertNode('Tap', { x: 1, y: 0 })!
    const id = editor.connect(e, 'Value', t, 'In')
    expect(editor.history.canUndo).toBe(true)
    editor.history.undo()
    expect(editor.toJSON().edges).toHaveLength(0)
    editor.history.redo()
    expect(editor.toJSON().edges).toHaveLength(1)
    expect(editor.toJSON().edges[0]!.id).toBe(id)
  })

  it('fires edge:connected through the command-bus event bridge', async () => {
    const { editor } = await boot()
    const seen: string[] = []
    editor.on('edge:connected', ({ edge }) => seen.push(edge.id))
    const e = editor.insertNode('Emitter', { x: 0, y: 0 })!
    const t = editor.insertNode('Tap', { x: 1, y: 0 })!
    const id = editor.connect(e, 'Value', t, 'In')
    expect(seen).toEqual([id])
  })

  it('undo fires edge:disconnected', async () => {
    const { editor } = await boot()
    const gone: string[] = []
    editor.on('edge:disconnected', ({ edgeId }) => gone.push(edgeId))
    const e = editor.insertNode('Emitter', { x: 0, y: 0 })!
    const t = editor.insertNode('Tap', { x: 1, y: 0 })!
    const id = editor.connect(e, 'Value', t, 'In')
    editor.history.undo()
    expect(gone).toEqual([id])
  })

  it('throws on incompatible pin types (float → string) without pushing a command', async () => {
    const { editor } = await boot()
    const e = editor.insertNode('Emitter', { x: 0, y: 0 })!
    const t = editor.insertNode('Text', { x: 1, y: 0 })!
    expect(() => editor.connect(e, 'Value', t, 'Text')).toThrow(/incompatible/i)
    expect(editor.toJSON().edges).toHaveLength(0)
    // no edge command was pushed: undo unwinds exactly the two inserts and then bottoms out
    editor.history.undo()
    editor.history.undo()
    expect(editor.toJSON().nodes).toHaveLength(0)
    expect(editor.history.canUndo).toBe(false)
  })

  it('throws when an edge:connecting listener cancels', async () => {
    const { editor } = await boot()
    const off = editor.on('edge:connecting', (p) => p.cancel())
    const e = editor.insertNode('Emitter', { x: 0, y: 0 })!
    const t = editor.insertNode('Tap', { x: 1, y: 0 })!
    expect(() => editor.connect(e, 'Value', t, 'In')).toThrow(/veto/i)
    expect(editor.toJSON().edges).toHaveLength(0)
    off()
  })

  it('unknown label throws with the available-pins context and leaves the graph clean', async () => {
    const { editor } = await boot()
    const e = editor.insertNode('Emitter', { x: 0, y: 0 })!
    const t = editor.insertNode('Tap', { x: 1, y: 0 })!
    expect(() => editor.connect(e, 'Nope', t, 'In')).toThrow(/not found on node 'Emitter'/)
    expect(editor.toJSON().edges).toHaveLength(0)
  })

  it('undefined ref with multiple candidate pins throws (no silent first-pin pick)', async () => {
    const { editor } = await boot()
    const h = editor.insertNode('Hub', { x: 0, y: 0 })!
    const t = editor.insertNode('Tap', { x: 1, y: 0 })!
    expect(() => editor.connect(h, undefined, t, undefined)).toThrow(/ambiguous|available out pins/)
  })

  it('default edge opts carry the source pin type (drag-path parity)', async () => {
    const { editor } = await boot()
    const e = editor.insertNode('Emitter', { x: 0, y: 0 })!
    const t = editor.insertNode('Tap', { x: 1, y: 0 })!
    const id = editor.connect(e, 'Value', t, 'In')
    expect(editor.getEdgeOptions(id)?.sourceType).toBe('float')
  })

  it('explicit opts are preserved and merged over defaults', async () => {
    const { editor } = await boot()
    const e = editor.insertNode('Emitter', { x: 0, y: 0 })!
    const t = editor.insertNode('Tap', { x: 1, y: 0 })!
    const id = editor.connect(e, 'Value', t, 'In', { animated: true })
    expect(editor.getEdgeOptions(id)?.animated).toBe(true)
    expect(editor.getEdgeOptions(id)?.sourceType).toBe('float')
  })

  it('accepts Node objects (typed passthrough, same as legacy)', async () => {
    const { editor } = await boot()
    const e: Node = editor.insertNode('Emitter', { x: 0, y: 0 })!
    const t: Node = editor.insertNode('Tap', { x: 1, y: 0 })!
    expect(() => editor.connect(e, 'Value', t, 'In')).not.toThrow()
  })
})
