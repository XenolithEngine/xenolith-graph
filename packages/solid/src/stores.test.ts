// Solid mirror of the React/Vue/Svelte/Angular store suites — same fake-editor event-bus
// harness, signals idiom (createRoot + accessors). Parity is enforced by tests
// (ADAPTER-CONTRACT §5): each accessor reflects its triggering events, undoRedo binds the
// editor's history, the controlled triple folds commit-time arrays and diffs setNodes onto
// the editor.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRoot } from 'solid-js'

type Handler = (p: any) => void
const listeners = new Map<string, Set<Handler>>()
const state = {
  nodes: [] as any[], edges: [] as any[], sel: [] as string[],
  vp: { x: 0, y: 0, zoom: 1 }, json: { v: 1 } as any,
  hist: { canUndo: false, canRedo: false },
}
const histCalls = { undo: vi.fn(() => true), redo: vi.fn(() => true) }
const applyChanges = vi.fn()
const emit = (ev: string, p?: any): void => { listeners.get(ev)?.forEach((h) => h(p)) }
const editor = {
  overlayRoot: document.createElement('div'),
  graphNodes: () => state.nodes[Symbol.iterator]() as any, graphEdges: () => state.edges[Symbol.iterator]() as any,
  selection: { ids: () => state.sel },
  view: { get state() { return state.vp } },
  get viewport() { return state.vp },
  getGraphReadonly: () => state.json,
  get history() { return { ...state.hist, ...histCalls } },
  applyChanges,
  on: (ev: string, h: Handler) => {
    let s = listeners.get(ev); if (!s) listeners.set(ev, (s = new Set()))
    s.add(h); return () => s!.delete(h)
  },
} as any

const { createXenolithStores } = await import('./stores.js')
const flush = async (): Promise<void> => { await new Promise((r) => setTimeout(r, 0)) }

const N = (id: string, x = 0, y = 0): any => ({ id, type: 'Box', position: { x, y }, state: {}, pins: [] })

beforeEach(() => {
  listeners.clear()
  state.nodes = []; state.edges = []; state.sel = []; state.vp = { x: 0, y: 0, zoom: 1 }; state.json = { v: 1 }
  state.hist = { canUndo: false, canRedo: false }
  histCalls.undo.mockClear(); histCalls.redo.mockClear(); applyChanges.mockClear()
})

function boot(): { s: ReturnType<typeof createXenolithStores>; dispose: () => void } {
  let result!: { s: ReturnType<typeof createXenolithStores>; dispose: () => void }
  createRoot((dispose) => {
    const s = createXenolithStores()
    s.setEditor(editor) // what an on:ready handler does
    result = { s, dispose }
  })
  return result
}

describe('reactive stores', () => {
  it('nodes reflects node lifecycle events', async () => {
    const { s, dispose } = boot()
    await flush()
    expect(s.nodes()).toEqual([])
    state.nodes = [N('n1')]; emit('node:added', { nodeId: 'n1' })
    await flush()
    expect(s.nodes()).toHaveLength(1)
    expect(s.nodes()[0]).toMatchObject({ id: 'n1' })
    dispose()
  })

  it('edges reflects connect/disconnect', async () => {
    const { s, dispose } = boot()
    await flush()
    state.edges = [{ id: 'e1' }]; emit('edge:connected', {})
    await flush()
    expect(s.edges()).toEqual([{ id: 'e1' }])
    dispose()
  })

  it('selection reflects selection:changed', async () => {
    const { s, dispose } = boot()
    await flush()
    state.sel = ['n1', 'n2']; emit('selection:changed', { nodeIds: ['n1', 'n2'] })
    await flush()
    expect(s.selection()).toEqual(['n1', 'n2'])
    dispose()
  })

  it('viewport reflects viewport:changed', async () => {
    const { s, dispose } = boot()
    await flush()
    state.vp = { x: 10, y: 20, zoom: 2 }; emit('viewport:changed', state.vp)
    await flush()
    expect(s.viewport()).toEqual({ x: 10, y: 20, zoom: 2 })
    dispose()
  })

  it('graphJSON recomputes on graph:loaded', async () => {
    const { s, dispose } = boot()
    await flush()
    state.json = { v: 2 }; emit('graph:loaded', {})
    await flush()
    expect(s.graphJSON()).toEqual({ v: 2 })
    dispose()
  })

  it('undoRedo reflects history:changed and its handles call the editor', async () => {
    const { s, dispose } = boot()
    await flush()
    expect(s.undoRedo.canUndo()).toBe(false)
    state.hist = { canUndo: true, canRedo: false }; emit('history:changed', {})
    await flush()
    expect(s.undoRedo.canUndo()).toBe(true)
    s.undoRedo.undo(); s.undoRedo.redo()
    expect(histCalls.undo).toHaveBeenCalledTimes(1)
    expect(histCalls.redo).toHaveBeenCalledTimes(1)
    dispose()
  })

  it('rebinds when setEditor swaps to another instance', async () => {
    const { s, dispose } = boot()
    await flush()
    state.nodes = [N('a')]; emit('node:added', {})
    await flush()
    expect(s.nodes()).toHaveLength(1)
    // Swap to a SECOND editor instance (the signal is identity-compared — a real host always
    // mounts a fresh editor on remount); fresh state, fresh bus.
    listeners.clear(); state.nodes = []
    s.setEditor({ ...editor })
    await flush()
    expect(s.nodes()).toEqual([])
    state.nodes = [N('b')]; emit('node:added', {})
    await flush()
    expect(s.nodes()).toHaveLength(1)
    dispose()
  })
})

describe('nodesState (E5 / ADR 0006 — Solid edition)', () => {
  it('mirror folds commit-time graph:changed arrays', async () => {
    const { s, dispose } = boot()
    const ns = s.nodesState()
    await flush()
    emit('graph:changed', { changes: { nodes: [{ type: 'add', node: N('n1', 3, 4) }], edges: [], unsupported: [] } })
    await flush()
    expect(ns.nodes()).toHaveLength(1)
    expect(ns.nodes()[0]).toMatchObject({ id: 'n1', position: { x: 3, y: 4 } })
    emit('graph:changed', { changes: { nodes: [{ type: 'position', id: 'n1', position: { x: 9, y: 9 } }], edges: [], unsupported: [] } })
    await flush()
    expect(ns.nodes()[0].position).toEqual({ x: 9, y: 9 })
    dispose()
  })

  it('setNodes diffs onto the editor as ONE applyChanges batch', async () => {
    state.nodes = [N('a', 1, 2), N('b')]
    const { s, dispose } = boot()
    const ns = s.nodesState()
    await flush()
    // Map over the triple's mirror records; a moved node may also carry a by-value-equal
    // `data` delta (independent clones — same contract nuance as every adapter).
    const a = ns.nodes()[0]!
    ns.setNodes([{ ...a, position: { x: 8, y: 8 } }]) // move 'a', drop 'b'
    expect(applyChanges).toHaveBeenCalledTimes(1)
    const batch = applyChanges.mock.calls[0]![0] as { nodes: Array<{ type: string; id?: string }>; edges: unknown[]; unsupported: unknown[] }
    const kinds = batch.nodes.map((c) => (c.id ? `${c.type}:${c.id}` : c.type)).sort()
    expect(kinds).toContain('position:a')
    expect(kinds).toContain('remove:b')
    expect(kinds.filter((k) => k.startsWith('add'))).toEqual([])
    expect(batch.edges).toEqual([])
    expect(batch.unsupported).toEqual([])
    dispose()
  })

  it('setNodes accepts an updater over the live mirror', async () => {
    state.nodes = [N('a', 0, 0)]
    const { s, dispose } = boot()
    const ns = s.nodesState()
    await flush()
    ns.setNodes((prev: any) => [...prev, N('c', 5, 5)])
    expect(applyChanges).toHaveBeenCalledWith({
      nodes: [{ type: 'add', node: expect.objectContaining({ id: 'c' }) }],
      edges: [],
      unsupported: [],
    })
    dispose()
  })

  it('applyChanges forwards to the editor verbatim', async () => {
    const { s, dispose } = boot()
    const ns = s.nodesState()
    await flush()
    const changes = { nodes: [], edges: [], unsupported: [] } as any
    ns.applyChanges(changes)
    expect(applyChanges).toHaveBeenCalledWith(changes)
    dispose()
  })

  it('setEdges diffs onto the editor as ONE applyChanges batch', async () => {
    state.edges = [{ id: 'e1', from: { node: 'a', pin: 'o' }, to: { node: 'b', pin: 'i' } }]
    const { s, dispose } = boot()
    const ns = s.nodesState()
    await flush()
    const added = { id: 'e2', from: { node: 'a', pin: 'o' }, to: { node: 'c', pin: 'i' } }
    ns.setEdges([added])
    expect(applyChanges).toHaveBeenCalledTimes(1)
    expect(applyChanges).toHaveBeenCalledWith({
      nodes: [],
      edges: [
        { type: 'add', edge: added },
        { type: 'remove', id: 'e1' },
      ],
      unsupported: [],
    })
    dispose()
  })
})
