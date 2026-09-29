// Solid — nodes/edges/viewport are accessors from createXenolithStores. No panel package:
// the minimap is editor.chrome, and the readout is a DOM card.
import { createSignal, For } from 'solid-js'
import { xenolith, createXenolithStores } from '@xenolithengine/graph-solid'
import type { MinimapPosition } from '@xenolithengine/graph-editor'
import { loadDemo } from '@xenolithengine/demo/scene'

const GRID = [
  'top-left', 'top', 'top-right',
  'left', 'center', 'right',
  'bottom-left', 'bottom', 'bottom-right',
] as const

const ARROW: Record<string, string> = {
  'top-left': '↖', top: '↑', 'top-right': '↗', left: '←', right: '→',
  'bottom-left': '↙', bottom: '↓', 'bottom-right': '↘',
}

export function ViewportDemo() {
  const stores = createXenolithStores()
  const [on, setOn] = createSignal(true)
  const [pos, setPos] = createSignal<MinimapPosition>('bottom-right')

  function show(next: boolean): void {
    setOn(next)
    stores.editor()?.chrome.setMinimapVisible(next)
  }

  function pick(cell: string): void {
    if (cell === 'center') { show(!on()); return }
    const next = cell as MinimapPosition
    setPos(next)
    stores.editor()?.chrome.setMinimapPosition(next)
  }

  return (
    <div
      use:xenolith={{ resizeToWindow: false }}
      on:ready={(e) => {
        stores.setEditor(e.detail)
        e.detail.chrome.setControls({ position: 'top-right', orientation: 'horizontal' })
        e.detail.chrome.setMinimapVisible(true)
        e.detail.chrome.setMinimapPosition('bottom-right')
        loadDemo(e.detail)
      }}
      style="position:absolute;inset:0"
    >
      <div style="position:absolute;top:12px;left:12px;z-index:5;min-width:150px;padding:10px;background:var(--xeno-panel);border:1px solid var(--xeno-border);border-radius:10px;color:var(--xeno-text);font:13px system-ui,sans-serif;">
        <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--xeno-muted);">Minimap</p>
        <button
          type="button"
          style={`width:100%;font:inherit;font-size:13px;padding:7px 12px;cursor:pointer;border-radius:8px;border:1px solid ${on() ? 'var(--xeno-accent)' : 'var(--xeno-border)'};background:${on() ? 'var(--xeno-accent)' : 'var(--xeno-elevated)'};color:${on() ? 'var(--xeno-canvas)' : 'var(--xeno-text)'};`}
          onClick={() => show(!on())}
        >{on() ? 'Visible' : 'Hidden'}</button>
        <p style="margin:14px 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--xeno-muted);">Position</p>
        <div style="display:grid;grid-template-columns:repeat(3, 34px);gap:6px;">
          <For each={GRID}>{(cell) =>
            cell === 'center'
              ? <button type="button" style="width:34px;height:30px;padding:0;font-size:14px;color:var(--xeno-muted);border-radius:8px;border:1px solid var(--xeno-border);background:var(--xeno-elevated);" onClick={() => pick(cell)}>⊙</button>
              : <button
                  type="button"
                  disabled={!on()}
                  style={`width:34px;height:30px;padding:0;font-size:14px;border-radius:8px;cursor:${on() ? 'pointer' : 'default'};opacity:${on() ? 1 : 0.35};border:1px solid ${on() && pos() === cell ? 'var(--xeno-accent)' : 'var(--xeno-border)'};background:${on() && pos() === cell ? 'var(--xeno-accent)' : 'var(--xeno-elevated)'};color:${on() && pos() === cell ? 'var(--xeno-canvas)' : 'var(--xeno-text)'};`}
                  onClick={() => pick(cell)}
                >{ARROW[cell]}</button>
          }</For>
        </div>
      </div>
      <div style="position:absolute;bottom:12px;left:12px;z-index:5;padding:6px 10px;background:var(--xeno-panel);border:1px solid var(--xeno-border);border-radius:10px;color:var(--xeno-text);font:13px system-ui,sans-serif;font-variant-numeric:tabular-nums;">
        <span style="color:var(--xeno-accent)">{stores.nodes().length}</span> nodes ·{' '}
        <span style="color:var(--xeno-accent)">{stores.edges().length}</span> edges ·{' '}
        <span style="color:var(--xeno-accent)">{Math.round(stores.viewport().zoom * 100)}%</span>
      </div>
    </div>
  )
}
