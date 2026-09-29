// Solid — events → your state: single events through the directive's on:* handlers; reactive
// selection through the store bag's signal accessors (stores.selection()).
import { createSignal } from 'solid-js'
import { For } from 'solid-js'
import { xenolith, createXenolithStores } from '@xenolithengine/graph-solid'
import { loadDemo } from '@xenolithengine/demo/scene'

export function EventsDemo() {
  const stores = createXenolithStores()
  const [log, setLog] = createSignal<string[]>([])
  const push = (line: string) => setLog((l) => [line, ...l].slice(0, 40))

  return (
    <div
      use:xenolith={{ resizeToWindow: false }}
      on:ready={(e) => { stores.setEditor(e.detail); loadDemo(e.detail) }}
      on:node:click={(e) => push(`node:click ${String(e.detail.nodeId)}`)}
      on:selection:changed={(e) => push(`selection:changed (${e.detail.nodeIds.length})`)}
      on:edge:connected={(e) => push(`edge:connected ${String(e.detail.edge.id)}`)}
      on:widget:changed={(e) => push(`widget:changed ${e.detail.widgetId} = ${JSON.stringify(e.detail.value)}`)}
      on:history:changed={(e) => push(`history undo=${e.detail.canUndo} redo=${e.detail.canRedo}`)}
      style="position:absolute;inset:0"
    >
      <div style="position:absolute;top:12px;right:12px;width:280px;max-height:60%;overflow-y:auto;padding:12px;background:var(--xeno-panel);border:1px solid var(--xeno-border);border-radius:8px;font:12px Inter,system-ui,sans-serif;color:var(--xeno-text);z-index:5">
        <h3 style="margin:0 0 6px;font-size:11px;text-transform:uppercase">Selection</h3>
        <For each={stores.selection()}>{(id) => <div>{id}</div>}</For>
        <h3 style="margin:8px 0 6px;font-size:11px;text-transform:uppercase">Event log</h3>
        <For each={log()}>{(line) => <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{line}</div>}</For>
      </div>
    </div>
  )
}
