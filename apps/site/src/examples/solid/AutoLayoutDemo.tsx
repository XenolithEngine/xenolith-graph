// Solid — one arrange call is one undo step. Direction is a signal passed to runAutoLayout.
import { createSignal } from 'solid-js'
import { xenolith } from '@xenolithengine/graph-solid'
import type { XenolithEditor } from '@xenolithengine/graph-editor'
import { setupAutoLayout, runAutoLayout } from '@xenolithengine/demo/auto-layout'

type Direction = 'LR' | 'TB'

function btn(on: boolean, disabled: boolean): string {
  return `font:inherit;font-size:12px;padding:6px 12px;border-radius:6px;cursor:${disabled ? 'default' : 'pointer'};opacity:${disabled ? 0.4 : 1};border:1px solid ${on ? 'var(--xeno-accent)' : 'var(--xeno-border)'};background:${on ? 'var(--xeno-accent)' : 'var(--xeno-panel)'};color:${on ? 'var(--xeno-canvas)' : 'var(--xeno-text)'};`
}

export function AutoLayoutDemo() {
  const [editor, setEditor] = createSignal<XenolithEditor | null>(null)
  const [dir, setDir] = createSignal<Direction>('LR')
  const [busy, setBusy] = createSignal(false)

  async function arrange(next: Direction = dir()): Promise<void> {
    const e = editor()
    if (!e || busy()) return
    setBusy(true)
    try { await runAutoLayout(e, { direction: next }) } finally { setBusy(false) }
  }
  async function flip(next: Direction): Promise<void> {
    setDir(next)
    await arrange(next)
  }

  return (
    <div
      use:xenolith={{ resizeToWindow: false }}
      on:ready={(e) => { setEditor(e.detail); setupAutoLayout(e.detail) }}
      style="position:absolute;inset:0"
    >
      <div style="position:absolute;top:12px;left:12px;z-index:5;display:flex;gap:6px;padding:6px;background:var(--xeno-panel);border:1px solid var(--xeno-border);border-radius:10px;">
        <button type="button" style={btn(true, busy())} disabled={busy()} onClick={() => void arrange()}>{busy() ? 'Arranging…' : 'Auto-arrange'}</button>
        <button type="button" style={btn(dir() === 'LR', busy())} disabled={busy()} onClick={() => void flip('LR')}>LR</button>
        <button type="button" style={btn(dir() === 'TB', busy())} disabled={busy()} onClick={() => void flip('TB')}>TB</button>
      </div>
    </div>
  )
}
