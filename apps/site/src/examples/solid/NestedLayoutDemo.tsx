// Solid — ELK keeps the macro hierarchy; dagre flattens it.
import { createSignal } from 'solid-js'
import { xenolith } from '@xenolithengine/graph-solid'
import type { XenolithEditor } from '@xenolithengine/graph-editor'
import { setupNestedLayout, runNestedLayout, type LayoutEngineId } from '@xenolithengine/demo/nested-layout'

function btn(on: boolean, disabled: boolean): string {
  return `font:inherit;font-size:12px;padding:6px 12px;border-radius:6px;cursor:${disabled ? 'default' : 'pointer'};opacity:${disabled ? 0.4 : 1};border:1px solid ${on ? 'var(--xeno-accent)' : 'var(--xeno-border)'};background:${on ? 'var(--xeno-accent)' : 'var(--xeno-panel)'};color:${on ? 'var(--xeno-canvas)' : 'var(--xeno-text)'};`
}

export function NestedLayoutDemo() {
  const [editor, setEditor] = createSignal<XenolithEditor | null>(null)
  const [engine, setEngine] = createSignal<LayoutEngineId>('elk')
  const [busy, setBusy] = createSignal(false)

  async function arrange(next: LayoutEngineId = engine()): Promise<void> {
    const e = editor()
    if (!e || busy()) return
    setBusy(true)
    try { await runNestedLayout(e, next) } finally { setBusy(false) }
  }
  async function flip(next: LayoutEngineId): Promise<void> {
    setEngine(next)
    await arrange(next)
  }

  return (
    <div
      use:xenolith={{ resizeToWindow: false }}
      on:ready={(e) => { setEditor(e.detail); setupNestedLayout(e.detail) }}
      style="position:absolute;inset:0"
    >
      <div style="position:absolute;top:12px;left:12px;z-index:5;display:flex;gap:6px;padding:6px;background:var(--xeno-panel);border:1px solid var(--xeno-border);border-radius:10px;">
        <button type="button" style={btn(true, busy())} disabled={busy()} onClick={() => void arrange()}>{busy() ? 'Arranging…' : 'Auto-arrange'}</button>
        <button type="button" style={btn(engine() === 'elk', busy())} disabled={busy()} onClick={() => void flip('elk')}>ELK</button>
        <button type="button" style={btn(engine() === 'dagre', busy())} disabled={busy()} onClick={() => void flip('dagre')}>dagre</button>
      </div>
    </div>
  )
}
