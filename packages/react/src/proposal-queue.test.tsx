import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, cleanup, act } from '@testing-library/react'

const overlayRoot = document.createElement('div')
const editor = {
  overlayRoot,
  chrome: {
    showProposals: vi.fn(() => true),
    hideProposals: vi.fn(),
  },
} as any
const binding = { editor, on: vi.fn(() => vi.fn()), setProps: vi.fn(), destroy: vi.fn() }
const createEditorBinding = vi.fn(async () => binding)
vi.mock('@xenolithengine/graph-adapter-core', () => ({ createEditorBinding }))

const { XenolithGraph, XenolithProposalQueue } = await import('./index.js')
const flush = async (): Promise<void> => { await act(async () => { await Promise.resolve(); await Promise.resolve() }) }

describe('<XenolithProposalQueue> (declarative wrapper over the core review panel)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('opens the core proposal panel on mount and hides it on unmount', async () => {
    const { unmount } = render(<XenolithGraph><XenolithProposalQueue /></XenolithGraph>)
    await flush()
    expect(editor.chrome.showProposals).toHaveBeenCalledTimes(1)
    act(() => unmount())
    expect(editor.chrome.hideProposals).toHaveBeenCalledTimes(1)
  })

  it('renders no DOM of its own (the review panel is core, in overlayRoot)', async () => {
    render(<XenolithGraph><XenolithProposalQueue /></XenolithGraph>)
    await flush()
    expect(overlayRoot.querySelector('[data-xeno-proposals-panel]')).toBeNull()
    cleanup()
  })
})
