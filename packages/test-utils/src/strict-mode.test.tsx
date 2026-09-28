// @vitest-environment jsdom
// E4 contract: the React adapter's lifecycle guarantees under React 19 StrictMode (dev runs
// every effect mount → cleanup → mount) and under fast unmount-during-boot. These lock the
// `pendingChain` serialization in packages/react/src/index.tsx — the mechanism that keeps ONE
// live editor per host across double-invokes. Adversarial review recommended: lifecycle races
// are exactly where agent-written tests share blind spots with agent-written impls.
import { describe, it, expect, afterEach } from 'vitest'
import { StrictMode, act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { XenolithGraph } from '@xenolithengine/graph-react'
import type { XenolithEditor } from '@xenolithengine/graph-editor'
import { mockPixi } from './index.js'

let restore: (() => void) | null = null
afterEach(() => {
  restore?.()
  restore = null
  document.body.innerHTML = ''
})

/** Mount <XenolithGraph> manually (not via renderXenolithToDOM) so tests control act timing. */
async function mount(opts: { strictMode?: boolean; onReady?: (e: XenolithEditor) => void } = {}) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const element = <XenolithGraph onReady={opts.onReady} />
  await act(async () => {
    root.render(opts.strictMode ? <StrictMode>{element}</StrictMode> : element)
  })
  return { container, root }
}

/** Flush act/microtask queues until `done()` holds or the deadline passes (4s default). */
async function flushUntil(done: () => boolean, ms = 4000): Promise<void> {
  const deadline = Date.now() + ms
  while (!done() && Date.now() < deadline) await act(async () => { await Promise.resolve() })
}

describe('StrictMode guarantees (E4)', () => {
  it('double-invoke boots EXACTLY one editor: one onReady, one canvas', async () => {
    restore = mockPixi().restore
    const readied: XenolithEditor[] = []
    const { container } = await mount({ strictMode: true, onReady: (e) => readied.push(e) })
    await flushUntil(() => readied.length > 0)
    expect(readied).toHaveLength(1)
    expect(container.querySelectorAll('canvas')).toHaveLength(1)
    expect(readied[0]!.isDestroyed).toBe(false)
  })

  it('mount → unmount → mount cycles yield a FRESH editor and destroy the previous one', async () => {
    const m = mockPixi()
    restore = m.restore
    const readied: XenolithEditor[] = []
    const first = await mount({ onReady: (e) => readied.push(e) })
    await flushUntil(() => readied.length > 0)
    expect(readied).toHaveLength(1)

    await act(async () => { first.root.unmount() })
    // teardown rides the pendingChain — flush it before asserting destruction
    await flushUntil(() => readied[0]!.isDestroyed === true)
    expect(readied[0]!.isDestroyed).toBe(true)
    expect(first.container.querySelector('canvas')).toBe(null)

    const second = await mount({ onReady: (e) => readied.push(e) })
    await flushUntil(() => readied.length >= 2)
    expect(readied).toHaveLength(2)
    expect(readied[1]).not.toBe(readied[0])
    expect(readied[1]!.isDestroyed).toBe(false)
    expect(second.container.querySelectorAll('canvas')).toHaveLength(1)
    await act(async () => { second.root.unmount() })
    await flushUntil(() => readied[1]!.isDestroyed === true)
    expect(readied[1]!.isDestroyed).toBe(true)
  })

  it('unmount DURING boot (before onReady) cancels cleanly — no ghost editor, next mount works', async () => {
    const m = mockPixi()
    restore = m.restore
    const readied: XenolithEditor[] = []

    // Mount and unmount in the same act block — the async createEditorBinding is still in
    // flight when cleanup runs. pendingChain must destroy the late-booted binding.
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root: Root = createRoot(container)
    await act(async () => {
      root.render(<XenolithGraph onReady={(e) => readied.push(e)} />)
      root.unmount()
    })
    await flushUntil(() => readied.every((e) => e.isDestroyed))
    // Either the boot completed and was destroyed, or it was cut short — but no live ghost.
    for (const e of readied) expect(e.isDestroyed).toBe(true)
    expect(container.querySelector('canvas')).toBe(null)
    expect(document.body.contains(container)).toBe(true) // container is ours; canvas must be gone

    // And the host is reusable: a fresh mount on a new root still boots.
    const readied2: XenolithEditor[] = []
    const second = await mount({ onReady: (e) => readied2.push(e) })
    await flushUntil(() => readied2.length > 0)
    expect(readied2).toHaveLength(1)
    expect(readied2[0]!.isDestroyed).toBe(false)
    await act(async () => { second.root.unmount() })
    await flushUntil(() => readied2[0]!.isDestroyed === true)
  })

  it('no canvas leaks across StrictMode churn: body ends with zero orphan canvases', async () => {
    const m = mockPixi()
    restore = m.restore
    for (let i = 0; i < 3; i++) {
      const seen: XenolithEditor[] = []
      const h = await mount({ strictMode: true, onReady: (e) => seen.push(e) })
      await flushUntil(() => seen.length > 0)
      await act(async () => { h.root.unmount() })
      await flushUntil(() => seen[0]!.isDestroyed === true)
    }
    expect(document.querySelectorAll('canvas')).toHaveLength(0)
    void m
  })
})
