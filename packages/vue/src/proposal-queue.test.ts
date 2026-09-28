import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { h } from 'vue'

const { binding, createEditorBinding } = vi.hoisted(() => {
  const binding = {
    editor: {
      chrome: {
        showProposals: vi.fn(() => true),
        hideProposals: vi.fn(),
      },
    } as any,
    on: vi.fn(() => vi.fn()),
    setProps: vi.fn(),
    destroy: vi.fn(),
  }
  const createEditorBinding = vi.fn(async (_t: unknown, _p?: unknown) => binding)
  return { binding, createEditorBinding }
})
vi.mock('@xenolithengine/graph-adapter-core', () => ({
  createEditorBinding,
  EDITOR_EVENT_NAMES: [
    'node:added', 'node:removed', 'node:moved', 'node:click',
    'edge:connected', 'edge:disconnected', 'selection:changed', 'viewport:changed',
    'widget:changed', 'widget:action', 'graph:loaded', 'history:changed',
  ],
}))

const { XenolithGraph, XenolithProposalQueue } = await import('./index.js')

describe('<XenolithProposalQueue> (declarative wrapper over the core review panel)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('opens the core proposal panel on mount and hides it on unmount', async () => {
    const w = mount(XenolithGraph, { slots: { default: () => h(XenolithProposalQueue) } })
    await flushPromises()
    expect(binding.editor.chrome.showProposals).toHaveBeenCalledTimes(1)
    w.unmount()
    expect(binding.editor.chrome.hideProposals).toHaveBeenCalledTimes(1)
  })
})
