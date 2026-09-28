// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { SearchPalette } from './search-palette.js'
import type { FoundNode } from './find-nodes.js'

function harness() {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const picked: string[] = []
  const closed: number[] = []
  const nodes: FoundNode[] = [
    { id: 'n1', type: 'Smooth', title: 'Smoothing · temp', category: 'filter' },
    { id: 'n2', type: 'Clock', title: null, category: 'source' },
    { id: 'n3', type: 'Smooth', title: 'smoothing · press', category: 'filter' },
  ]
  const palette = new SearchPalette({
    overlayRoot: root,
    find: (q) => {
      if (q.type !== undefined) {
        const t = q.type.toLowerCase()
        return nodes.filter((n) => n.type.toLowerCase().includes(t))
      }
      const needle = (q.titleContains ?? '').toLowerCase()
      return nodes.filter((n) => (n.title ?? '').toLowerCase().includes(needle))
    },
    onPick: (id) => picked.push(id),
    onClose: () => closed.push(1),
  })
  const type = (text: string): void => {
    const input = root.querySelector('[data-xeno-search-input]') as HTMLInputElement
    input.value = text
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }
  const press = (key: string, opts: KeyboardEventInit = {}): void => {
    const input = root.querySelector('[data-xeno-search-input]') as HTMLInputElement
    input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...opts }))
  }
  return { root, palette, picked, closed, type, press }
}

describe('SearchPalette (H1 — Ctrl+F for existing graph nodes)', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('open() mounts a top-center search box focused and empty; close() hides it', () => {
    const h = harness()
    h.palette.open()
    const panel = h.root.querySelector('[data-xeno-search]') as HTMLElement
    expect(panel).not.toBeNull()
    const input = h.root.querySelector('[data-xeno-search-input]') as HTMLInputElement
    expect(document.activeElement).toBe(input)
    expect(input.value).toBe('')
    h.palette.close()
    expect(panel.style.display).toBe('none')
    expect(h.closed.length).toBe(1)
  })

  it('typing filters results live by title OR type (case-insensitive) — type-fold is deliberate', () => {
    const h = harness()
    h.palette.open()
    h.type('smooth')
    const rows = h.root.querySelectorAll('[data-xeno-search-result]')
    expect(rows.length).toBe(2) // n1 + n3 by title (n2 is a Clock — no match)
    expect(rows[0]!.textContent).toContain('Smoothing · temp')
    // the untitled Clock node IS findable — by its TYPE, which is the point of the fold
    h.type('clock')
    const clockRows = h.root.querySelectorAll('[data-xeno-search-result]')
    expect(clockRows.length).toBe(1)
    expect(clockRows[0]!.getAttribute('data-node-id')).toBe('n2')
  })

  it('Enter picks the active row and fires onPick; ArrowDown moves the active row', () => {
    const h = harness()
    h.palette.open()
    h.type('smooth')
    h.press('ArrowDown')
    h.press('Enter')
    expect(h.picked).toEqual(['n3'])
  })

  it('clicking a row picks that node', () => {
    const h = harness()
    h.palette.open()
    h.type('smooth')
    ;(h.root.querySelectorAll('[data-xeno-search-result]')[1]! as HTMLElement).click()
    expect(h.picked).toEqual(['n3'])
  })

  it('Escape closes and reports onClose; picking closes too', () => {
    const h = harness()
    h.palette.open()
    h.type('smooth')
    h.press('Escape')
    expect(h.palette.isOpen).toBe(false)
    expect(h.closed.length).toBe(1)
    h.palette.open()
    h.type('clock')
    h.press('Enter')
    expect(h.palette.isOpen).toBe(false)
  })

  it('shows an honest empty state when nothing matches', () => {
    const h = harness()
    h.palette.open()
    h.type('zzz-nothing')
    expect(h.root.querySelector('[data-xeno-search-empty]')).not.toBeNull()
  })
})
