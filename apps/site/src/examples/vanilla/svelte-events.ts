// Svelte adapter — events. The `use:xenolith` action re-dispatches every editor event off the
// host node as a kebab-named CustomEvent (`node-click`, `selection-changed`, …) — Svelte hosts
// bind these via `on:node-click`. Here we mount via the imperative primitive (to also load the
// shared demo) and attach the same kebab listeners on the node for parity with the action.
import { createXenolithGraph, svelteEventName } from '@xenolithengine/graph-svelte'
import { loadDemo } from '@xenolithengine/demo/scene'

export async function mount(target: HTMLElement): Promise<() => void> {
  const slot = document.createElement('div')
  slot.style.cssText = 'position:absolute;inset:0;'
  target.appendChild(slot)
  const binding = await createXenolithGraph(slot, { resizeToWindow: false })
  loadDemo(binding.editor)

  const panel = renderPanel()
  binding.editor.overlayRoot.appendChild(panel.root)

  // Subscribe through the binding (canonical) — the action would surface these as DOM events.
  const offs = [
    binding.on('node:click',        (e) => panel.push(`node:click ${String(e.nodeId)}`)),
    binding.on('selection:changed', (e) => { panel.selection(e.nodeIds.map(String)); panel.push(`selection:changed (${e.nodeIds.length})`) }),
    binding.on('node:moved',        (e) => panel.push(`node:moved ${String(e.nodeId)} → ${Math.round(e.position.x)},${Math.round(e.position.y)}`)),
    binding.on('edge:connected',    (e) => panel.push(`edge:connected ${String(e.edge.id)}`)),
    binding.on('edge:disconnected', (e) => panel.push(`edge:disconnected ${String(e.edgeId)}`)),
    binding.on('widget:changed',    (e) => { panel.widget(`${String(e.nodeId)}.${e.widgetId}`, e.value); panel.push(`widget:changed ${e.widgetId} = ${JSON.stringify(e.value)}`) }),
    binding.on('history:changed',   (e) => panel.push(`history undo=${e.canUndo} redo=${e.canRedo}`)),
  ]
  void svelteEventName  // exposed for the kebab event names contract

  return () => { offs.forEach((o) => o()); panel.root.remove(); binding.destroy(); slot.remove() }
}

function renderPanel() {
  const root = document.createElement('div')
  root.setAttribute('data-xeno-panel', '')
  root.style.cssText = 'position:absolute;top:12px;right:12px;width:280px;max-height:calc(100% - 24px);overflow-y:auto;padding:12px;background:var(--xeno-panel,#1d1d1d);border:1px solid var(--xeno-border,#333);border-radius:8px;font:12px Inter,system-ui,sans-serif;color:var(--xeno-text,#cfcfcf);z-index:5;'
  root.innerHTML = '<h3 style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#9a9a9a;">Selection</h3><div data-sel></div><h3 style="margin:16px 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#9a9a9a;">Widget values</h3><div data-widgets></div><h3 style="margin:16px 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#9a9a9a;">Event log</h3><div data-log style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;line-height:1.5;"></div>'
  const $sel = root.querySelector<HTMLElement>('[data-sel]')!
  const $widgets = root.querySelector<HTMLElement>('[data-widgets]')!
  const $log = root.querySelector<HTMLElement>('[data-log]')!
  const widgets: Record<string, unknown> = {}
  const log: string[] = []
  $sel.textContent = 'Nothing selected.'
  $widgets.textContent = 'Drag a slider, type, toggle…'
  $log.textContent = 'Interact with the graph…'
  return {
    root,
    selection(ids: string[]) {
      $sel.innerHTML = ids.length === 0 ? 'Nothing selected.' : ids.map((id) => `<div>${id}</div>`).join('')
    },
    widget(id: string, v: unknown) {
      widgets[id] = v
      $widgets.innerHTML = Object.entries(widgets).map(([k, val]) => `<div style="display:flex;justify-content:space-between;gap:8px;"><span style="color:#9a9a9a;">${k}</span><span>${JSON.stringify(val)}</span></div>`).join('')
    },
    push(line: string) {
      log.unshift(line); log.length = Math.min(log.length, 40)
      $log.innerHTML = log.map((l) => `<div>${l}</div>`).join('')
    },
  }
}
