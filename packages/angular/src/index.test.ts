// Angular mirror of the React/Vue/Svelte store suites — same fake-editor event-bus harness,
// RxJS idiom (BehaviorSubject-backed observables). Parity is enforced by tests
// (ADAPTER-CONTRACT §5): each observable reflects its triggering events, on$() routes typed
// events, the controlled triple folds commit-time arrays and diffs setNodes onto the editor.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { expectTypeOf } from 'vitest'
import { firstValueFrom } from 'rxjs'

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

// The binding's `on` must route into the same event bus `emit()` drives — delegate to editor.on.
const binding = { editor, on: editor.on.bind(editor) as typeof editor.on, setProps: vi.fn(), destroy: vi.fn() }
vi.mock('@xenolithengine/graph-adapter-core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xenolithengine/graph-adapter-core')>()
  return { ...actual, createEditorBinding: vi.fn(async () => binding) }
})

const { XenolithGraphService } = await import('./index.js')
const flush = async (): Promise<void> => { await new Promise((r) => setTimeout(r, 0)) }

const N = (id: string, x = 0, y = 0): any => ({ id, type: 'Box', position: { x, y }, state: {}, pins: [] })

beforeEach(() => {
  listeners.clear()
  state.nodes = []; state.edges = []; state.sel = []; state.vp = { x: 0, y: 0, zoom: 1 }; state.json = { v: 1 }
  state.hist = { canUndo: false, canRedo: false }
  histCalls.undo.mockClear(); histCalls.redo.mockClear(); applyChanges.mockClear()
  binding.destroy.mockClear()
})

async function boot(): Promise<XenolithGraphService> {
  const svc = new XenolithGraphService()
  await svc.mount(document.createElement('div'))
  return svc
}

describe('reactive observables', () => {
  it('nodes$ reflects node lifecycle events', async () => {
    const svc = await boot()
    expect(await firstValueFrom(svc.nodes$)).toEqual([])
    state.nodes = [N('n1')]; emit('node:added', { nodeId: 'n1' })
    await flush()
    const nodes = await firstValueFrom(svc.nodes$)
    expect(nodes).toHaveLength(1)
    expect(nodes[0]).toMatchObject({ id: 'n1' })
    svc.destroy()
  })

  it('edges$ reflects connect/disconnect', async () => {
    const svc = await boot()
    state.edges = [{ id: 'e1' }]; emit('edge:connected', {})
    await flush()
    expect(await firstValueFrom(svc.edges$)).toEqual([{ id: 'e1' }])
    svc.destroy()
  })

  it('selection$ reflects selection:changed', async () => {
    const svc = await boot()
    state.sel = ['n1', 'n2']; emit('selection:changed', { nodeIds: ['n1', 'n2'] })
    await flush()
    expect(await firstValueFrom(svc.selection$)).toEqual(['n1', 'n2'])
    svc.destroy()
  })

  it('viewport$ reflects viewport:changed', async () => {
    const svc = await boot()
    state.vp = { x: 10, y: 20, zoom: 2 }; emit('viewport:changed', state.vp)
    await flush()
    expect(await firstValueFrom(svc.viewport$)).toEqual({ x: 10, y: 20, zoom: 2 })
    svc.destroy()
  })

  it('graphJSON$ recomputes on graph:loaded', async () => {
    const svc = await boot()
    state.json = { v: 2 }; emit('graph:loaded', {})
    await flush()
    expect(await firstValueFrom(svc.graphJSON$)).toEqual({ v: 2 })
    svc.destroy()
  })

  it('canUndo$ tracks history:changed and undo()/redo() call the editor', async () => {
    const svc = await boot()
    expect(await firstValueFrom(svc.canUndo$)).toBe(false)
    state.hist = { canUndo: true, canRedo: false }; emit('history:changed', {})
    await flush()
    expect(await firstValueFrom(svc.canUndo$)).toBe(true)
    svc.undo(); svc.redo()
    expect(histCalls.undo).toHaveBeenCalledTimes(1)
    expect(histCalls.redo).toHaveBeenCalledTimes(1)
    svc.destroy()
  })

  it('on$() routes typed editor events', async () => {
    const svc = await boot()
    const seen = firstValueFrom(svc.on$('node:click'))
    emit('node:click', { nodeId: 'n1' })
    await expect(seen).resolves.toEqual({ nodeId: 'n1' })
    svc.destroy()
  })
})

describe('lifecycle', () => {
  it('destroy tears the binding down and resets the reactive surface', async () => {
    const svc = await boot()
    expect(svc.editor).toBe(editor)
    svc.destroy()
    expect(binding.destroy).toHaveBeenCalledTimes(1)
    expect(svc.editor).toBeNull()
    expect(await firstValueFrom(svc.editor$)).toBeNull()
    expect(await firstValueFrom(svc.nodes$)).toEqual([])
  })

  it('remount after destroy rebinds onto the same service', async () => {
    const svc = await boot()
    state.nodes = [N('a')]; emit('node:added', {})
    await flush()
    svc.destroy()
    listeners.clear(); state.nodes = []
    await svc.mount(document.createElement('div'))
    expect(await firstValueFrom(svc.nodes$)).toEqual([])
    state.nodes = [N('b')]; emit('node:added', {})
    await flush()
    expect(await firstValueFrom(svc.nodes$)).toHaveLength(1)
    svc.destroy()
  })
})

describe('nodesState() (E5 / ADR 0006 — Angular edition)', () => {
  it('mirror folds commit-time graph:changed arrays', async () => {
    const svc = await boot()
    const ns = svc.nodesState()
    emit('graph:changed', { changes: { nodes: [{ type: 'add', node: N('n1', 3, 4) }], edges: [], unsupported: [] } })
    await flush()
    const nodes = await firstValueFrom(ns.nodes$)
    expect(nodes).toHaveLength(1)
    expect(nodes[0]).toMatchObject({ id: 'n1', position: { x: 3, y: 4 } })
    emit('graph:changed', { changes: { nodes: [{ type: 'position', id: 'n1', position: { x: 9, y: 9 } }], edges: [], unsupported: [] } })
    await flush()
    expect((await firstValueFrom(ns.nodes$))[0]!.position).toEqual({ x: 9, y: 9 })
    svc.destroy()
  })

  it('setNodes diffs onto the editor as ONE applyChanges batch', async () => {
    state.nodes = [N('a', 1, 2), N('b')]
    const svc = await boot()
    const ns = svc.nodesState()
    await flush()
    // Map over the triple's mirror records; a moved node may also carry a by-value-equal
    // `data` delta (independent clones — same contract nuance as React/Vue/Svelte).
    const a = (await firstValueFrom(ns.nodes$))[0]!
    ns.setNodes([{ ...a, position: { x: 8, y: 8 } }]) // move 'a', drop 'b'
    expect(applyChanges).toHaveBeenCalledTimes(1)
    const batch = applyChanges.mock.calls[0]![0] as { nodes: Array<{ type: string; id?: string }>; edges: unknown[]; unsupported: unknown[] }
    const kinds = batch.nodes.map((c) => (c.id ? `${c.type}:${c.id}` : c.type)).sort()
    expect(kinds).toContain('position:a')
    expect(kinds).toContain('remove:b')
    expect(kinds.filter((k) => k.startsWith('add'))).toEqual([])
    expect(batch.edges).toEqual([])
    expect(batch.unsupported).toEqual([])
    svc.destroy()
  })

  it('setNodes accepts an updater over the live mirror', async () => {
    state.nodes = [N('a', 0, 0)]
    const svc = await boot()
    const ns = svc.nodesState()
    await flush()
    ns.setNodes((prev) => [...prev, N('c', 5, 5)])
    expect(applyChanges).toHaveBeenCalledWith({
      nodes: [{ type: 'add', node: expect.objectContaining({ id: 'c' }) }],
      edges: [],
      unsupported: [],
    })
    svc.destroy()
  })

  it('applyChanges forwards to the editor verbatim', async () => {
    const svc = await boot()
    const ns = svc.nodesState()
    await flush()
    const changes = { nodes: [], edges: [], unsupported: [] } as any
    ns.applyChanges(changes)
    expect(applyChanges).toHaveBeenCalledWith(changes)
    svc.destroy()
  })

  it('setEdges diffs onto the editor as ONE applyChanges batch', async () => {
    state.edges = [{ id: 'e1', from: { node: 'a', pin: 'o' }, to: { node: 'b', pin: 'i' } }]
    const svc = await boot()
    const ns = svc.nodesState()
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
    svc.destroy()
  })
})

// Type-level: on$() payloads are typed from EditorEvents (enforced by `tsc -b`).
describe('on$() types', () => {
  it('carries the event payload', () => {
    const svc = new XenolithGraphService()
    svc.on$('node:click').subscribe((p) => {
      expectTypeOf(p).toEqualTypeOf<import('@xenolithengine/graph-editor').EditorEvents['node:click']>()
    })
    svc.destroy()
  })
})
