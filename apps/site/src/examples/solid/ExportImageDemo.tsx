// Solid — full-graph image export. The editor signal is filled from on:ready.
import { createSignal } from 'solid-js'
import { xenolith } from '@xenolithengine/graph-solid'
import type { XenolithEditor } from '@xenolithengine/graph-editor'
import { loadDemo } from '@xenolithengine/demo/scene'
import { exportGraphImage } from '@xenolithengine/demo/export-image'

export function ExportImageDemo() {
  const [editor, setEditor] = createSignal<XenolithEditor | null>(null)
  const [busy, setBusy] = createSignal(false)

  async function save(format: 'png' | 'jpeg', scale: number): Promise<void> {
    const live = editor()
    if (!live || busy()) return
    setBusy(true)
    try { await exportGraphImage(live, format, scale) } finally { setBusy(false) }
  }

  const btn = 'font:inherit;font-size:13px;padding:7px 12px;border-radius:8px;border:1px solid var(--xeno-border);background:var(--xeno-elevated);color:var(--xeno-text);width:100%;'

  return (
    <div
      use:xenolith={{ resizeToWindow: false }}
      on:ready={(e) => {
        setEditor(e.detail)
        e.detail.chrome.setControls({ position: 'bottom-left' })
        loadDemo(e.detail)
      }}
      style="position:absolute;inset:0"
    >
      <div style="position:absolute;top:12px;left:12px;z-index:5;display:flex;flex-direction:column;gap:6px;width:190px;padding:10px;background:var(--xeno-panel);border:1px solid var(--xeno-border);border-radius:10px;color:var(--xeno-text);font:13px system-ui,sans-serif;">
        <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--xeno-muted);">Export image</p>
        <button type="button" style={btn} disabled={busy()} onClick={() => void save('png', 1)}>↓ PNG · 1×</button>
        <button type="button" style={btn} disabled={busy()} onClick={() => void save('png', 2)}>↓ PNG · 2× (retina)</button>
        <button type="button" style={btn} disabled={busy()} onClick={() => void save('jpeg', 2)}>↓ JPG · 2×</button>
        <span style="color:var(--xeno-muted);font-size:11px;line-height:1.45;">
          Exports the entire graph, not just what’s on screen.
        </span>
      </div>
    </div>
  )
}
