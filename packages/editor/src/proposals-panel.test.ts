// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { ProposalQueue } from './mcp.js'
import { ProposalsPanel } from './proposals-panel.js'

function enqueue(queue: ProposalQueue, tool: string, clientId = 'claude-desktop'): number {
  return queue._enqueue({
    clientId, tool,
    summary: `${tool}({"type":"Box"}) — proposed`,
    args: { type: 'Box' },
    run: () => undefined,
  })
}

function harness() {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const queue = new ProposalQueue()
  const events: string[] = []
  const panel = new ProposalsPanel({
    overlayRoot: root,
    queue,
    onApprove: () => events.push('approve'),
    onReject: () => events.push('reject'),
  })
  return { root, queue, panel, events }
}

const click = (el: Element | null | undefined): void =>
  (el as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }))

describe('ProposalsPanel (F1 — review UI for the C-Bet1b queue)', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('open() mounts one row per queued entry, oldest first, with tool + client + effect badge', () => {
    const h = harness()
    enqueue(h.queue, 'add_node')
    enqueue(h.queue, 'connect_pins')
    h.panel.open()
    const rows = h.root.querySelectorAll('[data-xeno-proposal-entry]')
    expect(rows.length).toBe(2)
    expect(rows[0]!.getAttribute('data-entry-tool')).toBe('add_node')
    expect(rows[1]!.getAttribute('data-entry-tool')).toBe('connect_pins')
    expect(rows[0]!.textContent).toContain('claude-desktop')
    expect(rows[0]!.querySelector('[data-xeno-proposal-effect]')!.textContent).toContain('node')
    expect(rows[1]!.querySelector('[data-xeno-proposal-effect]')!.textContent).toContain('edge')
  })

  it('Approve all routes through queue.approve — ONE transaction — empties the queue, fires onApprove, closes the panel', () => {
    const h = harness()
    const tx: Array<() => unknown> = []
    h.queue.attach({ transaction: (fn) => { tx.push(fn); return fn() } })
    enqueue(h.queue, 'add_node')
    enqueue(h.queue, 'connect_pins')
    h.panel.open()
    click(h.root.querySelector('[data-xeno-proposals-approve]'))
    expect(tx.length).toBe(1)
    expect(h.queue.size).toBe(0)
    expect(h.events).toEqual(['approve'])
    expect(h.panel.isOpen()).toBe(false)
    expect(h.root.querySelector('[data-xeno-proposals-panel]')).not.toBeNull() // hidden, not torn down
  })

  it('a per-entry ✕ rejects ONLY that entry; the rest stay queued', () => {
    const h = harness()
    const first = enqueue(h.queue, 'add_node')
    enqueue(h.queue, 'add_node')
    h.panel.open()
    click(h.root.querySelector(`[data-xeno-proposal-entry][data-entry-id="${first}"] [data-xeno-proposal-reject]`))
    expect(h.queue.size).toBe(1)
    const remaining = h.root.querySelectorAll('[data-xeno-proposal-entry]')
    expect(remaining.length).toBe(1)
    expect(remaining[0]!.getAttribute('data-entry-id')).toBe(String(first + 1))
    expect(h.events).toEqual(['reject'])
  })

  it('Reject all discards the batch, fires onReject and closes', () => {
    const h = harness()
    enqueue(h.queue, 'add_node')
    h.panel.open()
    click(h.root.querySelector('[data-xeno-proposals-reject]'))
    expect(h.queue.size).toBe(0)
    expect(h.events).toEqual(['reject'])
    expect(h.panel.isOpen()).toBe(false)
  })

  it('enqueue while open grows the list live (onChange re-render)', () => {
    const h = harness()
    h.panel.open()
    expect(h.root.querySelectorAll('[data-xeno-proposal-entry]').length).toBe(0)
    enqueue(h.queue, 'add_node')
    expect(h.root.querySelectorAll('[data-xeno-proposal-entry]').length).toBe(1)
    expect(h.root.querySelector('[data-xeno-proposals-count]')!.textContent).toContain('1')
  })

  it('the queue emptying (from ANY path) closes the open panel', () => {
    const h = harness()
    enqueue(h.queue, 'add_node')
    h.panel.open()
    h.queue.reject()
    expect(h.panel.isOpen()).toBe(false)
  })

  it('a badge appears while the queue is non-empty and the panel closed; clicking it opens the panel and hides the badge', () => {
    const h = harness()
    enqueue(h.queue, 'add_node')
    const badge = h.root.querySelector('[data-xeno-proposals-badge]') as HTMLElement
    expect(badge).not.toBeNull()
    expect(badge.textContent).toContain('1')
    expect(badge.getAttribute('data-hidden')).toBe(null)
    expect(badge.style.display).not.toBe('none')
    click(badge)
    expect(h.panel.isOpen()).toBe(true)
    const after = h.root.querySelector('[data-xeno-proposals-badge]') as HTMLElement
    expect(after.getAttribute('data-hidden')).toBe('')
    expect(after.style.display).toBe('none')
  })

  it('the badge hides while the queue is empty and never blocks the panel', () => {
    const h = harness()
    const id = enqueue(h.queue, 'add_node')
    h.queue.reject([id])
    const badge = h.root.querySelector('[data-xeno-proposals-badge]') as HTMLElement
    expect(badge?.getAttribute('data-hidden')).toBe('')
    expect(badge?.style.display).toBe('none')
  })

  it('close() hides the panel and the badge returns when entries remain', () => {
    const h = harness()
    enqueue(h.queue, 'add_node')
    h.panel.open()
    h.panel.close()
    expect(h.panel.isOpen()).toBe(false)
    expect(h.root.querySelector('[data-xeno-proposals-badge]')!.getAttribute('data-hidden')).toBe(null)
  })

  it('dispose() removes panel + badge and detaches from the queue', () => {
    const h = harness()
    enqueue(h.queue, 'add_node')
    h.panel.open()
    h.panel.dispose()
    expect(h.root.querySelector('[data-xeno-proposals-panel]')).toBeNull()
    expect(h.root.querySelector('[data-xeno-proposals-badge]')).toBeNull()
    enqueue(h.queue, 'add_node')
    expect(h.root.querySelector('[data-xeno-proposals-badge]')).toBeNull()
  })

  it('the client identity is labelled unverified in the DOM (transport-provided, NOT authenticated)', () => {
    const h = harness()
    enqueue(h.queue, 'add_node')
    h.panel.open()
    const row = h.root.querySelector('[data-xeno-proposal-entry]')!
    const client = row.querySelector('[data-xeno-proposal-client]')!
    expect(client.getAttribute('title')).toContain('NOT authenticated')
  })
})
