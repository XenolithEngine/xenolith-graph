// Solid — a WebGL level bar. widget:changed is subscribed from on:ready. The directive's
// attribute form is on:widget-changed (one colon); on:widget:changed fails Vite's dep scan.
import { createSignal } from 'solid-js'
import { xenolith } from '@xenolithengine/graph-solid'
import type { NodeId, XenolithEditor } from '@xenolithengine/graph-editor'
import { buildCanvasWidget } from '@xenolithengine/demo/canvas-widget'

export function CanvasWidgetDemo() {
  const [gain, setGain] = createSignal(0.6)
  const [editor, setEditor] = createSignal<XenolithEditor | null>(null)
  const [nodeId, setNodeId] = createSignal<NodeId | null>(null)

  return (
    <div
      use:xenolith={{ resizeToWindow: false }}
      on:ready={(e) => {
        setEditor(e.detail)
        setNodeId(buildCanvasWidget(e.detail).nodeId)
        e.detail.on('widget:changed', (payload) => {
          if (payload.widgetId === 'gain') setGain(Number(payload.value))
        })
      }}
      style="position:absolute;inset:0"
    >
      <div style="position:absolute;top:12px;right:12px;z-index:5;width:220px;padding:10px;background:var(--xeno-panel);border:1px solid var(--xeno-border);border-radius:10px;color:var(--xeno-text);font:13px system-ui,sans-serif;">
        <h3 style="margin:0 0 6px;font-size:13px;">Live value (in Solid)</h3>
        <p style="margin:0 0 8px;font-size:12px;color:var(--xeno-muted);">
          The canvas widget commits through the editor; widget:changed hands the value back.
        </p>
        <div style="font-size:28px;font-weight:600;color:var(--xeno-accent);">{Math.round(gain() * 100)}%</div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={gain()}
          style="width:100%;"
          onInput={(ev) => {
            const live = editor()
            const id = nodeId()
            if (!live || !id) return
            live.setWidgetValue(id, 'gain', (ev.currentTarget as HTMLInputElement).valueAsNumber)
          }}
        />
      </div>
    </div>
  )
}
