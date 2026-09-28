import { describe, it, expect, vi, beforeEach } from 'vitest'
import { expectTypeOf } from 'vitest'
import { svelteEventName } from './index.js'
import type { XenolithActionAttributes } from './index.js'
import type { EditorEvents, XenolithEditor } from '@xenolithengine/graph-editor'

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
  EDITOR_EVENT_NAMES: ['node:click', 'selection:changed', 'edge:connected'],
}))

const { xenolith } = await import('./index.js')
const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0))

describe('svelteEventName', () => {
  it('kebabs colon event names', () => {
    expect(svelteEventName('node:click')).toBe('node-click')
    expect(svelteEventName('selection:changed')).toBe('selection-changed')
  })
})

// Type-level: `on:*` attributes carry their payloads (what svelte-check surfaces in templates).
// Enforced by `tsc -b` — vitest itself doesn't typecheck.
describe('XenolithActionAttributes (types)', () => {
  it('types on:ready with the editor and on:<event> with its payload', () => {
    const ready = undefined as unknown as XenolithActionAttributes['on:ready']
    expectTypeOf(ready).toBeCallableWith({ detail: {} as XenolithEditor } as CustomEvent<XenolithEditor>)
    const click = undefined as unknown as XenolithActionAttributes['on:node-click']
    expectTypeOf(click).toBeCallableWith({ detail: {} as EditorEvents['node:click'] } as CustomEvent<EditorEvents['node:click']>)
  })
})

describe('xenolith action', () => {
  beforeEach(() => { createEditorBinding.mockClear(); binding.setProps.mockClear(); binding.destroy.mockClear(); handlers.clear() })

  it('mounts a binding on the node with props', async () => {
    const node = document.createElement('div')
    xenolith(node, { minimap: true })
    await flush()
    expect(createEditorBinding).toHaveBeenCalledWith(node, { minimap: true })
  })

  it('re-dispatches editor events as kebab CustomEvents on the node', async () => {
    const node = document.createElement('div')
    xenolith(node)
    await flush()
    const seen: unknown[] = []
    node.addEventListener('node-click', (e) => seen.push((e as CustomEvent).detail))
    handlers.get('node:click')!({ nodeId: 'n1' })
    expect(seen).toEqual([{ nodeId: 'n1' }])
  })

  it('dispatches ready with the editor instance once mounted', async () => {
    const node = document.createElement('div')
    const readies: unknown[] = []
    node.addEventListener('ready', (e) => readies.push((e as CustomEvent).detail))
    xenolith(node)
    await flush()
    expect(readies).toEqual([binding.editor])
  })

  it('update() forwards to setProps and destroy() tears down', async () => {
    const node = document.createElement('div')
    const action = xenolith(node)
    await flush()
    action.update({ minimap: false })
    expect(binding.setProps).toHaveBeenCalledWith({ minimap: false })
    action.destroy()
    expect(binding.destroy).toHaveBeenCalledTimes(1)
  })
})
