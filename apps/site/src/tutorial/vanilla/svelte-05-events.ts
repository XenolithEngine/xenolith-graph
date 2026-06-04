// CHAPTER 5 — Events (Svelte adapter).
//
// The Svelte `use:xenolith` action re-dispatches every editor event off the host node as a
// kebab-named CustomEvent — `node-click`, `selection-changed`, … — which Svelte hosts bind via
// `on:node-click`. Here we mount via the imperative primitive and attach the same kebab listeners
// on the slot for parity, while subscribing through the binding for typed payloads.
import { createXenolithGraph, svelteEventName } from '@xenolith/svelte'
import type { NodeSchema } from '@xenolith/editor'

const greeterSchema: NodeSchema = {
  type: 'Greeter', title: 'Greeter', category: 'data',
  pins:    [{ kind: 'data', direction: 'out', type: 'string', label: 'Out', multiple: true }],
  widgets: [
    { id: 'msg',    type: 'text',   key: 'msg',    label: 'Message', placeholder: 'Hello, Xenolith', freeFloating: true },
    { id: 'volume', type: 'slider', key: 'volume', label: 'Volume', min: 0, max: 100, step: 1, freeFloating: true },
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
    { id: 'greeter', type: 'Greeter', position: { x: -240, y: 0 }, state: { msg: 'Hello, Xenolith', volume: 60 } },
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
  const editor = binding.editor
  editor.registry.register(greeterSchema)
  editor.registry.register(toUpperSchema)
  editor.loadJSON(graph)
  editor.view.fitView({ padding: 80, maxZoom: 1 })

  const panel = document.createElement('div')
  panel.setAttribute('data-xeno-panel', '')
  panel.style.cssText = 'position:absolute;top:20px;right:20px;pointer-events:auto;min-width:200px;padding:8px 12px;border-radius:6px;background:rgba(0,0,0,0.45);color:#e8e8e8;font:12px/1.5 var(--xn-mono, ui-monospace, monospace);z-index:5;'
  panel.innerHTML = `
    <div style="font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:rgba(255,255,255,0.5);margin-bottom:4px;font-size:10px;">Live readout</div>
    <div>Nodes: <b data-k="nodes">0</b> · Edges: <b data-k="edges">0</b></div>
    <div>Selected: <b data-k="sel">—</b></div>
    <div>Last edit: <b data-k="edit">—</b></div>`
  editor.chrome.overlayRoot.appendChild(panel)
  const $ = (k: string) => panel.querySelector<HTMLElement>(`[data-k="${k}"]`)!
  const refreshCounts = (): void => {
    const snap = editor.getGraphReadonly()
    $('nodes').textContent = String(snap.nodes.length)
    $('edges').textContent = String(snap.edges.length)
  }
  refreshCounts()

  // The Svelte idiom: listen for kebab CustomEvents on the host node. Done here for documentation;
  // the typed binding API is used below where payload typing matters.
  const onSelKebab = (e: Event) => { void (e as CustomEvent).detail }
  slot.addEventListener(svelteEventName('selection:changed'), onSelKebab)

  const offs = [
    binding.on('selection:changed', ({ nodeIds }) => {
      $('sel').textContent = nodeIds.length === 0 ? '—' : nodeIds.map(String).join(', ')
    }),
    binding.on('widget:changed', ({ nodeId, widgetId, value }) => {
      $('edit').textContent = `${String(nodeId)}.${widgetId} → ${JSON.stringify(value)}`
    }),
    binding.on('node:added',        refreshCounts),
    binding.on('node:removed',      refreshCounts),
    binding.on('edge:connected',    refreshCounts),
    binding.on('edge:disconnected', refreshCounts),
  ]

  return () => {
    slot.removeEventListener(svelteEventName('selection:changed'), onSelKebab)
    offs.forEach((o) => o())
    panel.remove()
    binding.destroy()
    slot.remove()
  }
}
