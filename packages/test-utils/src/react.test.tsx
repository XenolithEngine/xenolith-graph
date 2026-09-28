// @vitest-environment jsdom
// Consumer-style contract: a host's React suite boots the REAL <XenolithGraph> adapter with the
// REAL editor underneath (packages/react's own unit tests mock createEditorBinding — this file
// must NOT). Adversarial review recommended for the same reason as boot.test.ts.
import { describe, it, expect, afterEach } from 'vitest'
import { renderXenolithToDOM, type ReactRenderHandle } from './react.js'
import { XenolithEditor } from '@xenolithengine/graph-editor'

let mounted: ReactRenderHandle | null = null
afterEach(() => {
  mounted?.unmount()
  mounted = null
})

describe('renderXenolithToDOM() — REAL React adapter under jsdom', () => {
  it('mounts <XenolithGraph>, fires onReady with a real XenolithEditor, and shows the canvas', async () => {
    const h = await renderXenolithToDOM()
    mounted = h
    expect(h.editor).toBeInstanceOf(XenolithEditor)
    expect(h.container.querySelector('canvas')).toBeTruthy()
    expect(document.body.contains(h.container)).toBe(true)
  })

  it('drives the real editor from React: register, insert, connect, toJSON', async () => {
    const h = await renderXenolithToDOM()
    mounted = h
    h.editor.registry.register({
      type: 'Number',
      title: 'Number',
      category: 'data',
      pins: [
        { kind: 'data', direction: 'in', type: 'float', label: 'In' },
        { kind: 'data', direction: 'out', type: 'float', label: 'Out' },
      ],
    })
    const a = h.editor.insertNode('Number', { x: 0, y: 0 })
    const b = h.editor.insertNode('Number', { x: 120, y: 0 })
    h.editor.connect(a!, 1, b!, 0)
    const json = h.editor.toJSON()
    expect(json.nodes).toHaveLength(2)
    expect(json.edges).toHaveLength(1)
  })

  it('strictMode option boots under <React.StrictMode> (double-invoke safe)', async () => {
    const h = await renderXenolithToDOM({}, { strictMode: true })
    mounted = h
    expect(h.editor).toBeInstanceOf(XenolithEditor)
    expect(h.container.querySelector('canvas')).toBeTruthy()
  })

  it('unmount() tears the root down and removes the container', async () => {
    const h = await renderXenolithToDOM()
    const { container, unmount } = h
    unmount()
    mounted = null
    expect(container.isConnected).toBe(false)
  })
})
