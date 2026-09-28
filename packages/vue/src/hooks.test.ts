// Vue mirror of React's hooks.test.tsx — same fake-editor event-bus harness, Vue test idiom.
// Parity is enforced by tests, not hope (ADAPTER-CONTRACT §5): each store hook must reflect its
// triggering events, useUndoRedo must bind the editor's history, useNodesState must fold
// commit-time arrays and diff setNodes onto the editor.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

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
const binding = { editor, on: vi.fn(() => vi.fn()), setProps: vi.fn(), destroy: vi.fn() }
type AdapterCore = typeof import('@xenolithengine/graph-adapter-core')
vi.mock('@xenolithengine/graph-adapter-core', async (importOriginal) => {
  const actual = await importOriginal<AdapterCore>()
  return { ...actual, createEditorBinding: vi.fn(async () => binding) }
})

const { XenolithGraph, useNodes, useEdges, useSelection, useViewport, useGraphJSON, useUndoRedo, useNodesState } = await import('./index.js')
const flush = async (): Promise<void> => { await flushPromises(); await Promise.resolve() }

function harness<T>(useHook: () => T): { api: () => T; unmount: () => void } {
  let captured!: T
  const Probe = defineComponent({ setup() { captured = useHook(); return () => null } })
  const w = mount(XenolithGraph, { slots: { default: () => h(Probe) } })
  return { api: () => captured, unmount: () => w.unmount() }
}

const N = (id: string, x = 0, y = 0): any => ({ id, type: 'Box', position: { x, y }, state: {}, pins: [] })

beforeEach(() => {
  listeners.clear()
  state.nodes = []; state.edges = []; state.sel = []; state.vp = { x: 0, y: 0, zoom: 1 }; state.json = { v: 1 }
  state.hist = { canUndo: false, canRedo: false }
  histCalls.undo.mockClear(); histCalls.redo.mockClear(); applyChanges.mockClear()
})

describe('reactive store composables', () => {
  it('useNodes reflects node lifecycle events', async () => {
    const { api, unmount } = harness(useNodes)
    await flush()
    state.nodes = [N('n1')]; emit('node:added', { nodeId: 'n1' })
    await flush()
    expect(api().value).toHaveLength(1)
    expect(api().value[0]).toMatchObject({ id: 'n1' })
    unmount()
  })

  it('useEdges reflects connect/disconnect', async () => {
    const { api, unmount } = harness(useEdges)
    await flush()
    state.edges = [{ id: 'e1' }]; emit('edge:connected', {})
    await flush()
    expect(api().value).toEqual([{ id: 'e1' }])
    unmount()
  })

  it('useSelection reflects selection:changed', async () => {
    const { api, unmount } = harness(useSelection)
    await flush()
    state.sel = ['n1', 'n2']; emit('selection:changed', { nodeIds: ['n1', 'n2'] })
    await flush()
    expect(api().value).toEqual(['n1', 'n2'])
    unmount()
  })

  it('useViewport reflects viewport:changed', async () => {
    const { api, unmount } = harness(useViewport)
    await flush()
    state.vp = { x: 10, y: 20, zoom: 2 }; emit('viewport:changed', state.vp)
    await flush()
    expect(api().value).toEqual({ x: 10, y: 20, zoom: 2 })
    unmount()
  })

  it('useGraphJSON recomputes on graph:loaded', async () => {
    const { api, unmount } = harness(useGraphJSON)
    await flush()
    state.json = { v: 2 }; emit('graph:loaded', {})
    await flush()
    expect(api().value).toEqual({ v: 2 })
    unmount()
  })

  it('useUndoRedo reflects history:changed and its handles call the editor', async () => {
    const { api, unmount } = harness(useUndoRedo)
    await flush()
    expect(api().canUndo.value).toBe(false)
    state.hist = { canUndo: true, canRedo: false }; emit('history:changed', {})
    await flush()
    expect(api().canUndo.value).toBe(true)
    api().undo(); api().redo()
    expect(histCalls.undo).toHaveBeenCalledTimes(1)
    expect(histCalls.redo).toHaveBeenCalledTimes(1)
    unmount()
  })
})

describe('useNodesState (E5 / ADR 0006 — Vue edition)', () => {
  it('mirror folds commit-time graph:changed arrays', async () => {
    const { api, unmount } = harness(useNodesState)
    await flush()
    const n1 = N('n1', 3, 4)
    emit('graph:changed', { changes: { nodes: [{ type: 'add', node: n1 }], edges: [], unsupported: [] } })
    await flush()
    expect(api().nodes.value).toHaveLength(1)
    expect(api().nodes.value[0]).toMatchObject({ id: 'n1', position: { x: 3, y: 4 } })

    emit('graph:changed', { changes: { nodes: [{ type: 'position', id: 'n1', position: { x: 9, y: 9 } }], edges: [], unsupported: [] } })
    await flush()
    expect(api().nodes.value[0].position).toEqual({ x: 9, y: 9 })
    unmount()
  })

  it('setNodes diffs onto the editor as ONE applyChanges batch', async () => {
    state.nodes = [N('a', 1, 2), N('b')]
    const { api, unmount } = harness(useNodesState)
    await flush()
    // Map over the HOOK's mirror (the cloned records) — real consumers do exactly this. Note the
    // contract nuance: the mirror's state ref can never equal setNodes' internal live snapshot
    // (both are independent clones), so a moved node may carry a by-value-equal `data` delta on
    // top of its `position` delta — harmless (no visual change, still ONE undo step). React's
    // triple has the identical behavior.
    const a = api().nodes.value[0]!
    api().setNodes([{ ...a, position: { x: 8, y: 8 } }]) // move 'a', drop 'b'
    expect(applyChanges).toHaveBeenCalledTimes(1)
    const batch = applyChanges.mock.calls[0]![0] as { nodes: Array<{ type: string; id?: string }>; edges: unknown[]; unsupported: unknown[] }
    const kinds = batch.nodes.map((c) => (c.id ? `${c.type}:${c.id}` : c.type)).sort()
    expect(kinds).toContain('position:a')
    expect(kinds).toContain('remove:b')
    expect(kinds.filter((k) => k.startsWith('add'))).toEqual([])
    expect(batch.edges).toEqual([])
    expect(batch.unsupported).toEqual([])
    unmount()
  })

  it('setNodes accepts an updater over the live mirror', async () => {
    state.nodes = [N('a', 0, 0)]
    const { api, unmount } = harness(useNodesState)
    await flush()
    api().setNodes((prev) => [...prev, N('c', 5, 5)])
    expect(applyChanges).toHaveBeenCalledWith({
      nodes: [{ type: 'add', node: expect.objectContaining({ id: 'c' }) }],
      edges: [],
      unsupported: [],
    })
    unmount()
  })

  it('applyChanges forwards to the editor verbatim', async () => {
    const { api, unmount } = harness(useNodesState)
    await flush()
    const changes = { nodes: [], edges: [], unsupported: [] } as any
    api().applyChanges(changes)
    expect(applyChanges).toHaveBeenCalledWith(changes)
    unmount()
  })
})
