// CHAPTER 1 — Mount your first editor (Svelte adapter).
//
// The idiomatic Svelte surface is `<div use:xenolith={props}>`; for programmatic setup we use the
// imperative `createXenolithGraph` primitive the adapter exposes alongside the action.
import { createXenolithGraph } from '@xenolithengine/graph-svelte'

const graph = {
  version: 'xenolith.v1' as const,
  nodes: [
    {
      id: 'greeter',
      type: 'Greeter',
      position: { x: 0, y: 0 },
      render: { title: 'Greeter' },
      state: { msg: 'Hello, Xenolith' },
      pins: [
        { id: 'greeter:out', kind: 'data' as const, direction: 'out' as const, type: 'string', multiple: true, label: 'Out' },
      ],
      widgets: [
        { id: 'msg', type: 'text' as const, key: 'msg', label: 'Message', freeFloating: true },
      ],
    },
  ],
  edges: [],
}

export async function mount(target: HTMLElement): Promise<() => void> {
  const slot = document.createElement('div')
  slot.style.cssText = 'position:absolute;inset:0;'
  target.appendChild(slot)
  const binding = await createXenolithGraph(slot, { resizeToWindow: false })
  binding.editor.loadJSON(graph)
  binding.editor.view.fitView({ padding: 80, maxZoom: 1 })
  return () => { binding.destroy(); slot.remove() }
}
