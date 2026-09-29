// Panel-component suite (ADAPTER-CONTRACT §3/§5): panels portal into editor.chrome.overlayRoot,
// the button themes + forwards events, Controls/MiniMap/ProposalQueue toggle the chrome
// declaratively and clean up on unmount. Components are mounted with Svelte 5's mount() and a
// context map carrying a fake editor store — exactly what createXenolithEditorContext provides
// in a real host.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushSync, mount, unmount } from 'svelte'
import { writable } from 'svelte/store'
import type { Writable } from 'svelte/store'
import type { XenolithEditor } from '@xenolithengine/graph-editor'
import { XenolithEditorContextKey } from './context.js'

import XenolithPanel from './components/XenolithPanel.svelte'
import XenolithButton from './components/XenolithButton.svelte'
import XenolithControls from './components/XenolithControls.svelte'
import XenolithMiniMap from './components/XenolithMiniMap.svelte'
import XenolithProposalQueue from './components/XenolithProposalQueue.svelte'

function fakeEditor(): { editor: XenolithEditor; chrome: Record<string, ReturnType<typeof vi.fn>>; overlayRoot: HTMLDivElement } {
  const overlayRoot = document.createElement('div')
  const chrome = {
    setControls: vi.fn(),
    setMinimapVisible: vi.fn(),
    setMinimapPosition: vi.fn(),
    showProposals: vi.fn(),
    hideProposals: vi.fn(),
  }
  return { editor: { chrome: { ...chrome, overlayRoot } } as unknown as XenolithEditor, chrome, overlayRoot }
}

function mountWith<T>(component: new (o: never) => T, props: Record<string, unknown>, editor: XenolithEditor | null): { target: HTMLDivElement; unmount: () => void } {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const app = mount(component as never, {
    target,
    props,
    context: new Map<unknown, unknown>([[XenolithEditorContextKey, writable(editor)]]),
  })
  flushSync()
  return { target, unmount: () => { unmount(app); flushSync() } }
}

beforeEach(() => { document.body.innerHTML = '' })

describe('XenolithPanel', () => {
  it('portals into editor.chrome.overlayRoot with the position + card chrome', () => {
    const { editor: fake, overlayRoot } = fakeEditor()
    const { unmount } = mountWith(XenolithPanel, { position: 'bottom-right' }, fake)
    const panel = overlayRoot.querySelector<HTMLElement>('[data-xeno-panel]')
    expect(panel).toBeTruthy()
    expect(panel!.style.bottom).toBe('12px')
    expect(panel!.style.right).toBe('12px')
    expect(panel!.style.background).toContain('var(--xeno-panel)')
    unmount()
    expect(overlayRoot.querySelector('[data-xeno-panel]')).toBeNull()
  })

  it('bare drops the card chrome, keeps the anchor; children render inside', () => {
    const { editor: fake, overlayRoot } = fakeEditor()
    const { unmount } = mountWith(XenolithPanel, { bare: true }, fake)
    const panel = overlayRoot.querySelector<HTMLElement>('[data-xeno-panel]')
    expect(panel!.style.background).toBe('')
    unmount()
  })

  it('renders nothing without an editor in context (graceful tombstone)', () => {
    const target = document.createElement('div')
    const app = mount(XenolithPanel as never, { target })
    flushSync()
    expect(target.querySelector('[data-xeno-panel]')).toBeNull()
    unmount(app)
  })
})

describe('XenolithButton', () => {
  it('renders children, fires onclick, and blocks it when disabled', () => {
    const onClick = vi.fn()
    const { target, unmount } = mountWith(XenolithButton, { onclick: onClick, disabled: false }, null)
    const btn = target.querySelector<HTMLButtonElement>('[data-xeno-button]')!
    expect(btn.disabled).toBe(false)
    btn.click()
    expect(onClick).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('active paints with the accent var; disabled stays inert', () => {
    const onClick = vi.fn()
    const { target, unmount } = mountWith(XenolithButton, { active: true, disabled: true, onclick: onClick }, null)
    const btn = target.querySelector<HTMLButtonElement>('[data-xeno-button]')!
    expect(btn.style.background).toContain('var(--xeno-accent)')
    btn.click()
    expect(onClick).not.toHaveBeenCalled()
    unmount()
  })
})

describe('XenolithControls', () => {
  it('configures the toolbar from props and removes it on unmount', () => {
    const { editor: fake, chrome } = fakeEditor()
    const { unmount } = mountWith(XenolithControls, { position: 'bottom-left', showZoom: false }, fake)
    expect(chrome.setControls).toHaveBeenCalledWith(expect.objectContaining({ position: 'bottom-left', showZoom: false }))
    unmount()
    expect(chrome.setControls).toHaveBeenCalledWith(false)
  })
})

describe('XenolithMiniMap', () => {
  it('shows + positions the minimap and hides it on unmount', () => {
    const { editor: fake, chrome } = fakeEditor()
    const { unmount } = mountWith(XenolithMiniMap, { position: 'top-right' }, fake)
    expect(chrome.setMinimapVisible).toHaveBeenCalledWith(true)
    expect(chrome.setMinimapPosition).toHaveBeenCalledWith('top-right')
    unmount()
    expect(chrome.setMinimapVisible).toHaveBeenCalledWith(false)
  })
})

describe('XenolithProposalQueue', () => {
  it('shows the proposal panel and hides it on unmount', () => {
    const { editor: fake, chrome } = fakeEditor()
    const { unmount } = mountWith(XenolithProposalQueue, {}, fake)
    expect(chrome.showProposals).toHaveBeenCalledTimes(1)
    unmount()
    expect(chrome.hideProposals).toHaveBeenCalledTimes(1)
  })
})
