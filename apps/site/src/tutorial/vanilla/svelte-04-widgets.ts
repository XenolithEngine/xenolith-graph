// CHAPTER 4 — Widgets (Svelte adapter).
import { createXenolithGraph } from '@xenolith/svelte'
import type { NodeSchema } from '@xenolith/editor'

const greeterSchema: NodeSchema = {
  type: 'Greeter', title: 'Greeter', category: 'data',
  pins:    [{ kind: 'data', direction: 'out', type: 'string', label: 'Out', multiple: true }],
  widgets: [
    { id: 'msg', type: 'text', key: 'msg', label: 'Message', placeholder: 'Hello, Xenolith', freeFloating: true },
    { id: 'tone', type: 'combo', key: 'tone', label: 'Tone', values: ['friendly', 'formal', 'sarcastic'], freeFloating: true },
    { id: 'volume', type: 'slider', key: 'volume', label: 'Volume', min: 0, max: 100, step: 1, freeFloating: true },
    { id: 'showAccent', type: 'toggle', key: 'showAccent', label: 'Show accent', onLabel: 'on', offLabel: 'off', freeFloating: true },
    { id: 'accent', type: 'color', key: 'accent', label: 'Accent', freeFloating: true,
      displayOptions: { show: (state) => state['showAccent'] === true } },
  ],
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
    { id: 'greeter', type: 'Greeter', position: { x: -240, y: 0 },
      state: { msg: 'Hello, Xenolith', tone: 'friendly', volume: 60, showAccent: true, accent: '#fcb400' } },
    { id: 'upper',   type: 'ToUpper', position: { x:  200, y: 0 }, state: {} },
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
