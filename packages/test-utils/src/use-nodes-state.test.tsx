// @vitest-environment jsdom
// E5 contract for the React useNodesState triple: the mirror folds commit-time arrays (not
// per-frame), setNodes diffs onto the editor as one undo step, echoes converge.
import { describe, it, expect, afterEach } from 'vitest'
import { act } from 'react'
import { useXenolithEditor, XenolithGraph, useNodesState } from '@xenolithengine/graph-react'
import { createRoot } from 'react-dom/client'
import { mockPixi } from './index.js'
import type { XenolithEditor, Node, Edge } from '@xenolithengine/graph-editor'

let restore: (() => void) | null = null
afterEach(() => {
  restore?.()
  restore = null
  document.body.innerHTML = ''
})

interface Probe {
  editor: XenolithEditor | null
  api: ReturnType<typeof useNodesState>
}

async function mountProbe(): Promise<Probe> {
  const restoreFn = mockPixi().restore
  restore = restoreFn
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  let editorRef: XenolithEditor | null = null
  let api: ReturnType<typeof useNodesState> | null = null
  function ProbeChild(): React.ReactElement {
    editorRef = useXenolithEditor()
    api = useNodesState()
    return <span data-probe="1" />
  }

  await act(async () => {
    root.render(
      <XenolithGraph onReady={(e) => { editorRef = e }}>
        <ProbeChild />
      </XenolithGraph>,
    )
  })
  const deadline = Date.now() + 4000
  while (editorRef === null && Date.now() < deadline) {
    await act(async () => { await Promise.resolve() })
  }
  return { get editor() { return editorRef }, get api() { return api! } }
}

const SCHEMA = {
  type: 'Box', title: 'Box', category: 'data',
  pins: [
    { kind: 'data' as const, direction: 'in' as const, type: 'float', label: 'In' },
    { kind: 'data' as const, direction: 'out' as const, type: 'float', label: 'Out' },
  ],
}

describe('useNodesState (E5 / ADR 0006)', () => {
  it('mirror tracks committed mutations', async () => {
    const p = await mountProbe()
    const editor = p.editor!
    editor.registry.register(SCHEMA)
    await act(async () => { editor.insertNode('Box', { x: 0, y: 0 }) })
    await act(async () => { await Promise.resolve() })
    expect(p.api.nodes).toHaveLength(1)
  })

  it('drag-shaped group updates the mirror ONCE at commit, with the final position', async () => {
    const p = await mountProbe()
    const editor = p.editor!
    editor.registry.register(SCHEMA)
    const n = editor.insertNode('Box', { x: 0, y: 0 })!
    await act(async () => { await Promise.resolve() })
    expect(p.api.nodes[0]!.position).toEqual({ x: 0, y: 0 })
    editor.commandBus.beginGroup({ label: 'drag' })
    editor.moveNode(n.id, { x: 5, y: 5 })
    editor.moveNode(n.id, { x: 9, y: 9 })
    await act(async () => { await Promise.resolve() })
    expect(p.api.nodes[0]!.position).toEqual({ x: 0, y: 0 }) // per-frame silence
    editor.commandBus.endGroup()
    await act(async () => { await Promise.resolve() })
    expect(p.api.nodes[0]!.position).toEqual({ x: 9, y: 9 })
  })

  it('setNodes moves a node through the editor (one undo step) and the echo updates the mirror', async () => {
    const p = await mountProbe()
    const editor = p.editor!
    editor.registry.register(SCHEMA)
    const n = editor.insertNode('Box', { x: 0, y: 0 })!
    await act(async () => { await Promise.resolve() })
    await act(async () => {
      p.api.setNodes((prev) => prev.map((x: Node) => (x.id === n.id ? { ...x, position: { x: 77, y: 33 } } : x)))
    })
    await act(async () => { await Promise.resolve() })
    expect(editor.graph.getNode(n.id)!.position).toEqual({ x: 77, y: 33 })
    expect(p.api.nodes[0]!.position).toEqual({ x: 77, y: 33 })
    editor.history.undo()
    await act(async () => { await Promise.resolve() })
    expect(editor.graph.getNode(n.id)!.position).toEqual({ x: 0, y: 0 })
  })

  it('setNodes adds + removes in the same call as ONE undo step', async () => {
    const p = await mountProbe()
    const editor = p.editor!
    editor.registry.register(SCHEMA)
    const a = editor.insertNode('Box', { x: 0, y: 0 })!
    editor.insertNode('Box', { x: 100, y: 0 })
    await act(async () => { await Promise.resolve() })
    const fresh: Node = { ...a, id: 'hook-add' as never, position: { x: 500, y: 500 } } as Node
    await act(async () => {
      p.api.setNodes((prev) => [prev.find((x) => x.id !== a.id)!, fresh])
    })
    await act(async () => { await Promise.resolve() })
    expect(editor.graph.getNode('hook-add' as never)).toBeTruthy()
    expect(editor.graph.getNode(a.id)).toBeFalsy()
    editor.history.undo()
    await act(async () => { await Promise.resolve() })
    expect(editor.graph.getNode(a.id)).toBeTruthy()
    expect(editor.graph.getNode('hook-add' as never)).toBeFalsy()
  })

  it('setEdges adds a wire as ONE undo step and the echo updates the mirror', async () => {
    const p = await mountProbe()
    const editor = p.editor!
    editor.registry.register(SCHEMA)
    const a = editor.insertNode('Box', { x: 0, y: 0 })!
    const b = editor.insertNode('Box', { x: 100, y: 0 })!
    await act(async () => { await Promise.resolve() })
    const out = a.pins.find((pin) => pin.direction === 'out')!
    const inn = b.pins.find((pin) => pin.direction === 'in')!
    const edge = {
      id: 'e-hook',
      from: { node: a.id, pin: out.id },
      to: { node: b.id, pin: inn.id },
    } as Edge
    await act(async () => { p.api.setEdges([edge]) })
    await act(async () => { await Promise.resolve() })
    expect([...editor.graphEdges()].some((e) => e.id === 'e-hook')).toBe(true)
    expect(p.api.edges.some((e) => e.id === 'e-hook')).toBe(true)
    editor.history.undo()
    await act(async () => { await Promise.resolve() })
    expect([...editor.graphEdges()].some((e) => e.id === 'e-hook')).toBe(false)
  })
})
