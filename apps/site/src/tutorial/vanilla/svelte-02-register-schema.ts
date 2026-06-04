// CHAPTER 2 — Register your first node type (Svelte adapter).
import { createXenolithGraph } from '@xenolithengine/graph-svelte'
import type { NodeSchema } from '@xenolithengine/graph-editor'

const greeterSchema: NodeSchema = {
  type: 'Greeter', title: 'Greeter', category: 'data',
  description: 'Emits a string greeting.',
  keywords: ['hello', 'string', 'message'],
  pins:    [{ kind: 'data', direction: 'out', type: 'string', label: 'Out', multiple: true }],
  widgets: [{ id: 'msg', type: 'text', key: 'msg', label: 'Message', placeholder: 'Hello, Xenolith', freeFloating: true }],
}

const graph = {
  version: 'xenolith.v1' as const,
  nodes: [{ id: 'greeter', type: 'Greeter', position: { x: 0, y: 0 }, state: { msg: 'Hello, Xenolith' } }],
  edges: [],
}

export async function mount(target: HTMLElement): Promise<() => void> {
  const slot = document.createElement('div')
  slot.style.cssText = 'position:absolute;inset:0;'
  target.appendChild(slot)
  const binding = await createXenolithGraph(slot, { resizeToWindow: false })
  binding.editor.registry.register(greeterSchema)
  binding.editor.loadJSON(graph)
  binding.editor.view.fitView({ padding: 80, maxZoom: 1 })
  return () => { binding.destroy(); slot.remove() }
}
