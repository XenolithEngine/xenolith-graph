// E5 contract for the Vue useNodesState triple, mirrored 1:1 from
// packages/test-utils/src/use-nodes-state.test.tsx: the mirror folds commit-time arrays (not
// per-frame), setNodes diffs onto the editor as one undo step, echoes converge. Real editor,
// booted headlessly via the shared PIXI mock — the React and Vue triples must never drift.
import { describe, it, expect, afterEach } from 'vitest'
import { createApp, defineComponent, h } from 'vue'
import { XenolithGraph, useNodesState } from './index.js'
import { mockPixi } from '@xenolithengine/graph-test-utils'
import type { XenolithEditor, Node } from '@xenolithengine/graph-editor'

let restore: (() => void) | null = null
afterEach(() => {
  restore?.()
  restore = null
  document.body.innerHTML = ''
})

interface Probe {
  editor: XenolithEditor | null
  api: ReturnType<typeof useNodesState> | null
}

async function mountProbe(): Promise<Probe> {
  restore = mockPixi().restore
  const container = document.createElement('div')
  document.body.appendChild(container)
  const p: Probe = { editor: null, api: null }

  const ProbeChild = defineComponent({
    setup() {
      p.api = useNodesState()
      return () => null
    },
  })
  // `onReady` in vnode props is how a render function binds the `ready` emit (≡ `@ready`).
  const Root = defineComponent({
    render: () =>
      h(XenolithGraph, { onReady: (e: XenolithEditor) => { p.editor = e } }, () => h(ProbeChild)),
  })
  createApp(Root).mount(container)
  const deadline = Date.now() + 4000
  while (p.editor === null && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1))
  }
  expect(p.editor).not.toBeNull()
  expect(p.api).not.toBeNull()
  return p
}

const tick = async (): Promise<void> => { await new Promise((r) => setTimeout(r, 1)) }

const SCHEMA = {
  type: 'Box', title: 'Box', category: 'data',
  pins: [
    { kind: 'data' as const, direction: 'in' as const, type: 'float', label: 'In' },
    { kind: 'data' as const, direction: 'out' as const, type: 'float', label: 'Out' },
  ],
}

describe('useNodesState (E5 / ADR 0006 — Vue, real editor)', () => {
  it('mirror tracks committed mutations', async () => {
    const p = await mountProbe()
    const editor = p.editor!
    editor.registry.register(SCHEMA)
    editor.insertNode('Box', { x: 0, y: 0 })
    await tick()
    expect(p.api!.nodes.value).toHaveLength(1)
  })

  it('drag-shaped group updates the mirror ONCE at commit, with the final position', async () => {
    const p = await mountProbe()
    const editor = p.editor!
    editor.registry.register(SCHEMA)
    const n = editor.insertNode('Box', { x: 0, y: 0 })!
    await tick()
    expect(p.api!.nodes.value[0]!.position).toEqual({ x: 0, y: 0 })
    editor.commandBus.beginGroup({ label: 'drag' })
    editor.moveNode(n.id, { x: 5, y: 5 })
    editor.moveNode(n.id, { x: 9, y: 9 })
    await tick()
    expect(p.api!.nodes.value[0]!.position).toEqual({ x: 0, y: 0 }) // per-frame silence
    editor.commandBus.endGroup()
    await tick()
    expect(p.api!.nodes.value[0]!.position).toEqual({ x: 9, y: 9 })
  })

  it('setNodes moves a node through the editor (one undo step) and the echo updates the mirror', async () => {
    const p = await mountProbe()
    const editor = p.editor!
    editor.registry.register(SCHEMA)
    const n = editor.insertNode('Box', { x: 0, y: 0 })!
    await tick()
    p.api!.setNodes((prev) => prev.map((x: Node) => (x.id === n.id ? { ...x, position: { x: 77, y: 33 } } : x)))
    await tick()
    expect(editor.graph.getNode(n.id)!.position).toEqual({ x: 77, y: 33 })
    expect(p.api!.nodes.value[0]!.position).toEqual({ x: 77, y: 33 })
    editor.history.undo()
    await tick()
    expect(editor.graph.getNode(n.id)!.position).toEqual({ x: 0, y: 0 })
  })

  it('setNodes adds + removes in the same call as ONE undo step', async () => {
    const p = await mountProbe()
    const editor = p.editor!
    editor.registry.register(SCHEMA)
    const a = editor.insertNode('Box', { x: 0, y: 0 })!
    editor.insertNode('Box', { x: 100, y: 0 })
    await tick()
    const fresh: Node = { ...a, id: 'vue-add' as never, position: { x: 500, y: 500 } } as Node
    p.api!.setNodes((prev) => [prev.find((x) => x.id !== a.id)!, fresh])
    await tick()
    expect(editor.graph.getNode('vue-add' as never)).toBeTruthy()
    expect(editor.graph.getNode(a.id)).toBeFalsy()
    editor.history.undo()
    await tick()
    expect(editor.graph.getNode(a.id)).toBeTruthy()
    expect(editor.graph.getNode('vue-add' as never)).toBeFalsy()
  })
})
