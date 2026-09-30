// Solid — no panel package. stores.edges() is the live list; the effect writes the flag.
import { createEffect, createSignal } from 'solid-js'
import { xenolith, createXenolithStores } from '@xenolithengine/graph-solid'
import { buildDiagram } from '@xenolithengine/demo/diagram'

export function DiagramDemo() {
  const stores = createXenolithStores()
  const [animated, setAnimated] = createSignal(true)

  createEffect(() => {
    const live = stores.editor()
    const list = stores.edges()
    const on = animated()
    if (!live) return
    for (const edge of list) live.setEdgeOptions(edge.id, { animated: on })
  })

  const btn = (on: boolean) =>
    `font:inherit;font-size:13px;padding:7px 12px;border-radius:8px;cursor:pointer;width:100%;border:1px solid ${on ? 'var(--xeno-accent)' : 'var(--xeno-border)'};background:${on ? 'var(--xeno-accent)' : 'var(--xeno-elevated)'};color:${on ? 'var(--xeno-canvas)' : 'var(--xeno-text)'};`

  return (
    <div
      use:xenolith={{ resizeToWindow: false }}
      on:ready={(e) => {
        stores.setEditor(e.detail)
        e.detail.chrome.setControls({ position: 'bottom-left' })
        buildDiagram(e.detail)
      }}
      style="position:absolute;inset:0"
    >
      <div style="position:absolute;top:12px;left:12px;z-index:5;display:flex;flex-direction:column;gap:6px;width:200px;padding:10px;background:var(--xeno-panel);border:1px solid var(--xeno-border);border-radius:10px;color:var(--xeno-text);font:13px system-ui,sans-serif;">
        <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--xeno-muted);">Diagram edges</p>
        <button type="button" style={btn(animated())} onClick={() => setAnimated(!animated())}>
          {animated() ? '⏸ Stop flow' : '▶ Animate flow'}
        </button>
        <span style="color:var(--xeno-muted);font-size:11px;line-height:1.45;">
          Directional edges with arrowheads + labels. The main path animates a flowing dash.
          The toggle writes stores.edges() through setEdgeOptions.
        </span>
      </div>
    </div>
  )
}
