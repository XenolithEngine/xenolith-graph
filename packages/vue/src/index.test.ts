import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { expectTypeOf } from 'vitest'
import { defineComponent, h, ref, type ShallowRef } from 'vue'
import { emitName, useXenolithGraph, XenolithGraph } from './index.js'
import type { EditorEvents, XenolithEditor } from '@xenolithengine/graph-editor'
import type { XenolithProps } from '@xenolithengine/graph-adapter-core'

const { handlers, binding, createEditorBinding } = vi.hoisted(() => {
  const handlers = new Map<string, (d: unknown) => void>()
  const binding = {
    editor: { id: 'editor' } as any,
    on: vi.fn((name: string, h: (d: unknown) => void) => { handlers.set(name, h); return vi.fn() }),
    setProps: vi.fn(),
    destroy: vi.fn(),
  }
  const createEditorBinding = vi.fn(async (_t: unknown, _p?: unknown) => binding)
  return { handlers, binding, createEditorBinding }
})
vi.mock('@xenolithengine/graph-adapter-core', () => ({
  createEditorBinding,
  EDITOR_EVENT_NAMES: [
    'node:added', 'node:removed', 'node:moved', 'node:click',
    'edge:connected', 'edge:disconnected', 'selection:changed', 'viewport:changed',
    'widget:changed', 'widget:action', 'graph:loaded', 'history:changed',
  ],
}))

const { XenolithGraph } = await import('./index.js')

describe('emitName', () => {
  it('camelCases colon event names', () => {
    expect(emitName('node:click')).toBe('nodeClick')
    expect(emitName('selection:changed')).toBe('selectionChanged')
  })
})

describe('typed emits (V3 / ADAPTER-CONTRACT §1)', () => {
  it('declares object-form emits — ready + a validator per editor event, never a string array', () => {
    const emits = (XenolithGraph as unknown as { emits: Record<string, unknown> }).emits
    expect(Array.isArray(emits)).toBe(false)
    expect(Object.keys(emits).sort()).toEqual([
      'ready',
      ...[
        'node:added', 'node:removed', 'node:moved', 'node:click',
        'edge:connected', 'edge:disconnected', 'selection:changed', 'viewport:changed',
        'widget:changed', 'widget:action', 'graph:loaded', 'history:changed',
      ].map(emitName),
    ].sort())
    for (const v of Object.values(emits)) expect(typeof v).toBe('function')
  })

  // Type-level: payload types reach template users through $emit overloads (vue-tsc/Volar).
  it('flows payload types into $emit signatures', () => {
    const emit = undefined as unknown as InstanceType<typeof XenolithGraph>['$emit']
    const editor = {} as XenolithEditor
    const click = {} as EditorEvents['node:click']
    expectTypeOf(emit).toBeCallableWith('ready', editor)
    expectTypeOf(emit).toBeCallableWith('nodeClick', click)
  })
})

describe('useXenolithGraph (V4 — headless mount composable)', () => {
  beforeEach(() => { createEditorBinding.mockClear(); binding.setProps.mockClear(); binding.destroy.mockClear() })

  it('mounts into a host ref, syncs props by reference, destroys on unmount', async () => {
    const host = ref<HTMLElement | null>(null)
    const props = ref<XenolithProps>({ snap: 8 })
    let editor: ShallowRef<XenolithEditor | null> | null = null
    const Host = defineComponent({
      setup() {
        editor = useXenolithGraph(host, props)
        return () => h('div', [h('div', { ref: host, 'data-host': '' })])
      },
    })
    const w = mount(Host)
    await flushPromises()
    expect(createEditorBinding).toHaveBeenCalledTimes(1)
    const [el, initProps] = createEditorBinding.mock.calls[0]! as [HTMLElement, XenolithProps]
    expect(el.hasAttribute('data-host')).toBe(true)
    expect(initProps).toMatchObject({ snap: 8 })
    expect(editor!.value).toBe(binding.editor)

    await new Promise((r) => setTimeout(r)) // let the mount microtasks settle before the prop sync
    props.value = { snap: 16 }
    await new Promise((r) => setTimeout(r))
    expect(binding.setProps).toHaveBeenCalledWith(expect.objectContaining({ snap: 16 }))

    w.unmount()
    expect(binding.destroy).toHaveBeenCalledTimes(1)
  })

  it('throws no editor injection requirement (works outside <XenolithGraph>)', async () => {
    const host = ref<HTMLElement | null>(null)
    const Host = defineComponent({
      setup() {
        const editor = useXenolithGraph(host)
        return () => h('div', [h('div', { ref: host }), String(editor.value !== null)])
      },
    })
    const w = mount(Host)
    await flushPromises()
    expect(w.text()).toContain('true')
    w.unmount()
  })
})

describe('<XenolithGraph> (Vue)', () => {
  beforeEach(() => { createEditorBinding.mockClear(); binding.setProps.mockClear(); binding.destroy.mockClear(); handlers.clear() })

  it('mounts a binding with props', async () => {
    const w = mount(XenolithGraph, { props: { minimap: true } })
    await flushPromises()
    expect(createEditorBinding).toHaveBeenCalledTimes(1)
    expect(createEditorBinding.mock.calls[0]![1]).toMatchObject({ minimap: true })
    w.unmount()
  })

  it('re-emits editor events as camelCased Vue events', async () => {
    const w = mount(XenolithGraph)
    await flushPromises()
    handlers.get('node:click')!({ nodeId: 'n1' })
    expect(w.emitted('nodeClick')).toEqual([[{ nodeId: 'n1' }]])
    w.unmount()
  })

  it('calls setProps when a prop changes', async () => {
    const w = mount(XenolithGraph, { props: { minimap: false } })
    await flushPromises()
    await w.setProps({ minimap: true })
    expect(binding.setProps).toHaveBeenCalledWith(expect.objectContaining({ minimap: true }))
    w.unmount()
  })

  it('forwards resizeToWindow changes to setProps (React-parity watch list)', async () => {
    const w = mount(XenolithGraph, { props: { resizeToWindow: true } })
    await flushPromises()
    binding.setProps.mockClear()
    await w.setProps({ resizeToWindow: false })
    expect(binding.setProps).toHaveBeenCalledWith(expect.objectContaining({ resizeToWindow: false }))
    w.unmount()
  })

  it('declares and forwards the isValidConnection prop (mount + change)', async () => {
    const guard1 = () => true
    const guard2 = () => false
    const w = mount(XenolithGraph, { props: { isValidConnection: guard1 } })
    await flushPromises()
    expect(createEditorBinding).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ isValidConnection: guard1 }))
    await w.setProps({ isValidConnection: guard2 })
    expect(binding.setProps).toHaveBeenCalledWith(expect.objectContaining({ isValidConnection: guard2 }))
    w.unmount()
  })

  it('destroys the binding on unmount', async () => {
    const w = mount(XenolithGraph)
    await flushPromises()
    w.unmount()
    expect(binding.destroy).toHaveBeenCalledTimes(1)
  })
})
