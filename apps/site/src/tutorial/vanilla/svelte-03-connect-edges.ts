// CHAPTER 3 — Connect nodes with typed edges (Svelte adapter).
import { createXenolithGraph } from '@xenolithengine/graph-svelte'
import type { NodeSchema } from '@xenolithengine/graph-editor'

const greeterSchema: NodeSchema = {
  type: 'Greeter', title: 'Greeter', category: 'data',
  pins:    [{ kind: 'data', direction: 'out', type: 'string', label: 'Out', multiple: true }],
  widgets: [{ id: 'msg', type: 'text', key: 'msg', label: 'Message', placeholder: 'Hello, Xenolith', freeFloating: true }],
}
const toUpperSchema: NodeSchema = {
  type: 'ToUpper', title: 'To Upper', category: 'transform',
  pins: [
    { kind: 'data', direction: 'in',  type: 'string', label: 'In',  multiple: false },
    { kind: 'data', direction: 'out', type: 'string', label: 'Out', multiple: true  },
  ],
}

const graph = {
  version: 'xenolith.v1' as const,
  nodes: [
    { id: 'greeter', type: 'Greeter', position: { x: -220, y: 0 }, state: { msg: 'Hello, Xenolith' } },
    { id: 'upper',   type: 'ToUpper', position: { x:  180, y: 0 }, state: {} },
  ],
  edges: [
    { id: 'e1', from: { node: 'greeter', pin: 'greeter:Out' }, to: { node: 'upper', pin: 'upper:In' } },
  ],
}

export async function mount(target: HTMLElement): Promise<() => void> {
  const slot = document.createElement('div')
  slot.style.cssText = 'position:absolute;inset:0;'
  target.appendChild(slot)
  const binding = await createXenolithGraph(slot, { resizeToWindow: false })
  binding.editor.registry.register(greeterSchema)
  binding.editor.registry.register(toUpperSchema)
  binding.editor.loadJSON(graph)
  binding.editor.view.fitView({ padding: 80, maxZoom: 1 })
  return () => { binding.destroy(); slot.remove() }
}
