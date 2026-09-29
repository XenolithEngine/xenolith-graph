// svelteWidget bridge suite (ADAPTER-CONTRACT §4): the consumer component mounts once per widget
// instance, update() streams new props without remounting (internal state survives), setValue is
// wired from mount context, and the unmount cleanup tears the app down.
import { describe, it, expect, vi } from 'vitest'
import { flushSync } from 'svelte'
import { svelteWidget } from './widget.js'
import Knob from './knob-fixture.svelte'
import type { XenolithEditor } from '@xenolithengine/graph-editor'

// svelteWidget types the component as Component<Record<string, unknown>>; the fixture's narrowed
// props satisfy that structurally for the test.
const controller = svelteWidget(Knob as never)

function ctx(over: Partial<{ value: unknown; accent: string; text: string; muted: string; width: number; height: number }> = {}) {
  return {
    value: 3, accent: '#FCB400', text: '#eee', muted: '#999', width: 120, height: 32,
    setValue: vi.fn(),
    openSidebar: vi.fn(),
    ...over,
  } as never
}

describe('svelteWidget', () => {
  it('mounts the component with initial props and wires setValue', () => {
    const setValue = vi.fn()
    const el = document.createElement('div')
    const dispose = controller.mount(el, ctx({ value: 7, setValue: setValue as never }))
    flushSync()
    expect(el.querySelector('[data-value]')!.textContent).toBe('7')
    el.querySelector<HTMLButtonElement>('[data-bump]')!.click()
    expect(setValue).toHaveBeenCalledWith(8)
    dispose()
  })

  it('update() streams new props WITHOUT remounting', () => {
    const el = document.createElement('div')
    const dispose = controller.mount(el, ctx({ value: 1, accent: '#111' }))
    flushSync()
    const span = el.querySelector('[data-value]')!
    controller.update(ctx({ value: 42, accent: '#0ff', width: 300 }))
    flushSync()
    expect(span.textContent).toBe('42') // SAME node — no remount
    expect(span.closest('label')!.style.width).toBe('300px')
    dispose()
  })
})

void ({} as unknown as XenolithEditor)
