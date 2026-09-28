import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, cleanup, act } from '@testing-library/react'

// A fake editor with a tiny event bus + mutable graph state the tests can poke.
type Handler = (p: any) => void
const listeners = new Map<string, Set<Handler>>()
const state = {
  nodes: [] as any[], edges: [] as any[], sel: [] as string[], vp: { x: 0, y: 0, zoom: 1 },
  json: { v: 1 } as any, hist: { canUndo: false, canRedo: false },
}
const histCalls = { undo: vi.fn(() => true), redo: vi.fn(() => true) }
const emit = (ev: string, p?: any): void => { act(() => { listeners.get(ev)?.forEach((h) => h(p)) }) }
const editor = {
  overlayRoot: document.createElement('div'),
  graphNodes: () => state.nodes[Symbol.iterator]() as any, graphEdges: () => state.edges[Symbol.iterator]() as any,
  selection: { ids: () => state.sel },
  get viewport() { return state.vp },
  toJSON: () => state.json,
  get history() { return { ...state.hist, ...histCalls } },
  on: (ev: string, h: Handler) => {
    let s = listeners.get(ev); if (!s) listeners.set(ev, (s = new Set()))
    s.add(h); return () => s!.delete(h)
  },
} as any
const binding = { editor, on: vi.fn(() => vi.fn()), setProps: vi.fn(), destroy: vi.fn() }
vi.mock('@xenolithengine/graph-adapter-core', () => ({ createEditorBinding: vi.fn(async () => binding) }))

const { XenolithGraph, useNodes, useEdges, useSelection, useViewport, useGraphJSON, useUndoRedo } = await import('./index.js')
const flush = async (): Promise<void> => { await act(async () => { await Promise.resolve(); await Promise.resolve() }) }

function harness(useHook: () => unknown) {
  const seen: unknown[] = []
  function Probe(): null { seen.push(useHook()); return null }
  render(<XenolithGraph><Probe /></XenolithGraph>)
  return seen
}

beforeEach(() => {
  listeners.clear(); cleanup()
  state.nodes = []; state.edges = []; state.sel = []; state.vp = { x: 0, y: 0, zoom: 1 }; state.json = { v: 1 }
  state.hist = { canUndo: false, canRedo: false }; histCalls.undo.mockClear(); histCalls.redo.mockClear()
})

describe('reactive selector hooks', () => {
  it('useNodes reflects node lifecycle events', async () => {
    const seen = harness(useNodes)
    await flush()
    state.nodes = [{ id: 'n1' }]; emit('node:added', { nodeId: 'n1' })
    await flush()
    expect(seen.at(-1)).toEqual([{ id: 'n1' }])
  })

  it('useEdges reflects connect/disconnect', async () => {
    const seen = harness(useEdges)
    await flush()
    state.edges = [{ id: 'e1' }]; emit('edge:connected', {})
    await flush()
    expect(seen.at(-1)).toEqual([{ id: 'e1' }])
  })

  it('useSelection reflects selection:changed', async () => {
    const seen = harness(useSelection)
    await flush()
    state.sel = ['n1', 'n2']; emit('selection:changed', { nodeIds: ['n1', 'n2'] })
    await flush()
    expect(seen.at(-1)).toEqual(['n1', 'n2'])
  })

  it('useViewport reflects viewport:changed', async () => {
    const seen = harness(useViewport)
    await flush()
    state.vp = { x: 10, y: 20, zoom: 2 }; emit('viewport:changed', state.vp)
    await flush()
    expect(seen.at(-1)).toEqual({ x: 10, y: 20, zoom: 2 })
  })

  it('useGraphJSON recomputes on graph:loaded', async () => {
    const seen = harness(useGraphJSON)
    await flush()
    state.json = { v: 2 }; emit('graph:loaded', {})
    await flush()
    expect(seen.at(-1)).toEqual({ v: 2 })
  })

  it('useUndoRedo reflects history:changed and its handles call the editor', async () => {
    const seen = harness(useUndoRedo)
    await flush()
    expect(seen.at(-1)).toMatchObject({ canUndo: false, canRedo: false })
    state.hist = { canUndo: true, canRedo: false }; emit('history:changed', {})
    await flush()
    const api = seen.at(-1) as { canUndo: boolean; undo: () => boolean; redo: () => boolean }
    expect(api.canUndo).toBe(true)
    api.undo()
    api.redo()
    expect(histCalls.undo).toHaveBeenCalledTimes(1)
    expect(histCalls.redo).toHaveBeenCalledTimes(1)
  })
})
