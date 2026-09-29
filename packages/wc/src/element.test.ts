import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readAttributes, FORWARDED_EVENTS } from './attrs.js'
import { EDITOR_EVENT_NAMES } from '@xenolithengine/graph-adapter-core'
import type * as AdapterCoreNS from '@xenolithengine/graph-adapter-core'

// Mock the WebGL-bound binding so the element can be exercised headlessly in jsdom.
const { binding, handlers, createEditorBinding } = vi.hoisted(() => {
  const binding = {
    editor: { id: 'editor' },
    on: vi.fn((_name: string, _h: (d: unknown) => void) => vi.fn()),
    setProps: vi.fn(),
    destroy: vi.fn(),
  }
  const handlers = new Map<string, (d: unknown) => void>()
  const createEditorBinding = vi.fn(async (_target: unknown, _props: unknown) => {
    binding.on.mockImplementation((name: string, h: (d: unknown) => void) => {
      handlers.set(name, h)
      return vi.fn()
    })
    return binding
  })
  return { binding, handlers, createEditorBinding }
})
vi.mock('@xenolithengine/graph-adapter-core', async (importOriginal) => {
  const actual = await importOriginal<typeof AdapterCoreNS>()
  return { ...actual, createEditorBinding }
})

const { register } = await import('./index.js')
register()

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0))

describe('readAttributes', () => {
  it('parses boolean attributes (present = true, "false" = false, absent = undefined)', () => {
    const el = document.createElement('div')
    expect(readAttributes(el)).toEqual({})
    el.setAttribute('minimap', '')
    el.setAttribute('fit-on-load', 'false')
    expect(readAttributes(el)).toEqual({ minimap: true, fitOnLoad: false })
  })

  it('parses the full attribute dictionary: booleans + numeric snap', () => {
    const el = document.createElement('div')
    el.setAttribute('minimap', '')
    el.setAttribute('disable-grid', '')
    el.setAttribute('resize-to-window', 'false')
    el.setAttribute('fit-on-load', 'true')
    el.setAttribute('snap', '16')
    expect(readAttributes(el)).toEqual({
      minimap: true, disableGrid: true, resizeToWindow: false, fitOnLoad: true, snap: 16,
    })
  })
})

describe('FORWARDED_EVENTS (derived, never hand-listed)', () => {
  it('covers every public editor event from EDITOR_EVENT_NAMES', () => {
    expect([...FORWARDED_EVENTS]).toEqual([...EDITOR_EVENT_NAMES])
  })
})

describe('<xenolith-graph> element', () => {
  beforeEach(() => { createEditorBinding.mockClear(); binding.setProps.mockClear(); binding.destroy.mockClear(); handlers.clear() })

  it('mounts a binding with parsed attributes + JS properties on connect', async () => {
    const el = document.createElement('xenolith-graph') as any
    el.setAttribute('minimap', '')
    const graph = { version: 'xenolith.v1' }
    el.graph = graph
    document.body.appendChild(el)
    await flush()
    expect(createEditorBinding).toHaveBeenCalledTimes(1)
    expect(createEditorBinding.mock.calls[0]![1]).toMatchObject({ minimap: true, graph })
    expect(el.editor).toBe(binding.editor)
    el.remove()
  })

  it('observes the full attribute dictionary', () => {
    const el = document.createElement('xenolith-graph')
    expect(el.constructor.observedAttributes).toEqual(
      ['minimap', 'fit-on-load', 'disable-grid', 'resize-to-window', 'snap'])
  })

  it('dispatches ready with the editor instance once mounted', async () => {
    const el = document.createElement('xenolith-graph')
    const readies: unknown[] = []
    el.addEventListener('ready', (e) => readies.push((e as CustomEvent).detail))
    document.body.appendChild(el)
    await flush()
    expect(readies).toEqual([binding.editor])
    el.remove()
  })

  it('re-emits editor events off the element as same-named CustomEvents', async () => {
    const el = document.createElement('xenolith-graph') as any
    document.body.appendChild(el)
    await flush()
    const seen: unknown[] = []
    el.addEventListener('node:click', (e: CustomEvent) => seen.push(e.detail))
    handlers.get('node:click')!({ nodeId: 'n1' })
    expect(seen).toEqual([{ nodeId: 'n1' }])
    el.remove()
  })

  it('forwards the preventable -ing events too (edge:connecting veto channel)', async () => {
    const el = document.createElement('xenolith-graph') as any
    document.body.appendChild(el)
    await flush()
    const seen: unknown[] = []
    el.addEventListener('edge:connecting', (e: CustomEvent) => seen.push(e.detail))
    expect(handlers.get('edge:connecting')).toBeTruthy()
    handlers.get('edge:connecting')!({ from: 'a.out', to: 'b.in', cancel: () => {} })
    expect(seen).toHaveLength(1)
    el.remove()
  })

  it('applies setProps when a JS property changes after mount', async () => {
    const el = document.createElement('xenolith-graph') as any
    document.body.appendChild(el)
    await flush()
    const g2 = { version: 'xenolith.v1', nodes: [] }
    el.graph = g2
    expect(binding.setProps).toHaveBeenCalledWith(expect.objectContaining({ graph: g2 }))
    el.remove()
  })

  it('attribute changes after mount reach setProps; removal clears the prop (no stale merge)', async () => {
    const el = document.createElement('xenolith-graph') as any
    el.setAttribute('snap', '16')
    document.body.appendChild(el)
    await flush()
    expect(createEditorBinding.mock.calls[0]![1]).toMatchObject({ snap: 16 })

    el.setAttribute('snap', '32')
    expect(binding.setProps).toHaveBeenLastCalledWith(expect.objectContaining({ snap: 32 }))

    el.removeAttribute('snap')
    const last = binding.setProps.mock.lastCall![0] as Record<string, unknown>
    expect('snap' in last).toBe(false)
    el.remove()
  })

  it('destroys the binding on disconnect', async () => {
    const el = document.createElement('xenolith-graph') as any
    document.body.appendChild(el)
    await flush()
    el.remove()
    expect(binding.destroy).toHaveBeenCalledTimes(1)
  })
})
