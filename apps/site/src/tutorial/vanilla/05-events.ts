// CHAPTER 5 — Events: drive your UI from the graph (vanilla JS).
//
// The editor is one component, your app's UI is another. Wire them together via the editor's
// EVENT BUS: subscribe to typed events, react in your own DOM. Same graph as the last chapter,
// plus a small live-readout panel that paints on every relevant event.
//
// Events used here (the rest live on `EditorEvents` — your editor instance has IDE autocomplete):
//   - `widget:changed`     — { nodeId, widgetId, value } after a widget edit
//   - `selection:changed`  — { nodeIds } after the selected set changes
//   - `node:added`/`removed` + `edge:connected`/`disconnected` — graph mutations
//
// All events fire on every path (user interaction, programmatic API, undo / redo) because the
// editor's bus is bridged off the command bus.

import { XenolithEditor, type NodeSchema, type XenolithGraphV1 } from '@xenolith/editor'

const greeterSchema: NodeSchema = {
  type: 'Greeter', title: 'Greeter', category: 'data',
  pins:    [{ kind: 'data', direction: 'out', type: 'string', label: 'Out', multiple: true }],
  widgets: [
    { id: 'msg',    type: 'text',  key: 'msg',    label: 'Message', placeholder: 'Hello, Xenolith', freeFloating: true },
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
  version: 'xenolith.v1',
  nodes: [
    { id: 'greeter', type: 'Greeter', position: { x: -240, y: 0 }, state: { msg: 'Hello, Xenolith', volume: 60 } },
    { id: 'upper',   type: 'ToUpper', position: { x:  200, y: 0 }, state: {} },
  ],
  edges: [
    { id: 'e1', from: { node: 'greeter', pin: 'greeter:Out' }, to: { node: 'upper', pin: 'upper:In' } },
  ],
}

export async function mount(target: HTMLElement): Promise<() => void> {
  const editor = await XenolithEditor.init(target, { minimap: false })
  editor.registry.register(greeterSchema)
  editor.registry.register(toUpperSchema)
  editor.loadJSON(graph)
  editor.fitView({ padding: 80, maxZoom: 1 })

  // ── Build a small live-readout panel inside the editor's overlay root. The overlay root sits
  //    above the canvas and below the editor's chrome — same place the in-editor controls live.
  const panel = document.createElement('div')
  panel.style.cssText = `
    position: absolute; top: 20px; right: 20px; pointer-events: auto;
    min-width: 200px; padding: 8px 12px; border-radius: 6px;
    background: rgba(0,0,0,0.45); color: #e8e8e8;
    font: 12px/1.5 var(--xn-mono, ui-monospace, monospace);`
  panel.innerHTML = `
    <div style="font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:rgba(255,255,255,0.5);margin-bottom:4px;font-size:10px;">Live readout</div>
    <div>Nodes: <b data-k="nodes">0</b> · Edges: <b data-k="edges">0</b></div>
    <div>Selected: <b data-k="sel">—</b></div>
    <div>Last edit: <b data-k="edit">—</b></div>`
  editor.overlayRoot.appendChild(panel)
  const $ = (k: string) => panel.querySelector<HTMLElement>(`[data-k="${k}"]`)!

  // Initial paint and helper to refresh node/edge counts from the live graph.
  const refreshCounts = (): void => {
    $('nodes').textContent = String(editor.graph.nodeCount)
    $('edges').textContent = String(editor.graph.edgeCount)
  }
  refreshCounts()

  // Subscriptions. `editor.on(eventName, handler)` returns a disposer — collect them so the
  // teardown stays exact, even if you add more later.
  const offs = [
    editor.on('selection:changed', ({ nodeIds }) => {
      $('sel').textContent = nodeIds.length === 0 ? '—' : nodeIds.join(', ')
    }),
    editor.on('widget:changed', ({ nodeId, widgetId, value }) => {
      $('edit').textContent = `${nodeId}.${widgetId} → ${JSON.stringify(value)}`
    }),
    editor.on('node:added',        refreshCounts),
    editor.on('node:removed',      refreshCounts),
    editor.on('edge:connected',    refreshCounts),
    editor.on('edge:disconnected', refreshCounts),
  ]

  return () => {
    offs.forEach((off) => off())
    panel.remove()
    editor.destroy()
  }
}
