// Solid — the cast toggle calls setConversionEnabled. edge:connected is subscribed from on:ready.
import { createSignal, For } from 'solid-js'
import { xenolith } from '@xenolithengine/graph-solid'
import type { XenolithEditor } from '@xenolithengine/graph-editor'
import { setupTypeConversions, setConversionEnabled } from '@xenolithengine/demo/type-conversions'

const stamp = (): string => new Date().toISOString().slice(11, 19)

function color(line: string): string {
  if (line.includes('✗')) return '#f88'
  if (line.includes('✓')) return '#9f9'
  return '#cfcfcf'
}

export function TypeConversionsDemo() {
  const [editor, setEditor] = createSignal<XenolithEditor | null>(null)
  const [enabled, setEnabled] = createSignal(false)
  const [log, setLog] = createSignal<string[]>([
    `[${stamp()}] No conversion registered. Try dragging from NumberSource.out to TextSink.in — refused.`,
  ])

  const append = (line: string): void => {
    setLog((prev) => [...prev.slice(-39), `[${stamp()}] ${line}`])
  }

  const toggle = (): void => {
    const e = editor()
    if (!e) return
    const result = setConversionEnabled(e, !enabled())
    setEnabled(result.enabled)
    if (result.enabled) {
      append('✓ conversion number → text registered — try connecting the pins now')
    } else {
      const tail = result.droppedEdges > 0
        ? ` (dropped ${result.droppedEdges} stale edge${result.droppedEdges === 1 ? '' : 's'})`
        : ''
      append(`✗ conversion removed${tail} — try connecting again, it refuses`)
    }
  }

  return (
    <div
      use:xenolith={{ resizeToWindow: false }}
      on:ready={(e) => {
        setEditor(e.detail)
        setupTypeConversions(e.detail)
        e.detail.on('edge:connected', (payload) => {
          append(`✓ connected ${String(payload.edge.id).slice(0, 6)} (number → text via cast)`)
        })
      }}
      style="position:absolute;inset:0"
    >
      <div style="position:absolute;top:12px;left:12px;z-index:5;display:flex;flex-direction:column;gap:6px;min-width:280px;padding:8px;background:var(--xeno-panel);border:1px solid var(--xeno-border);border-radius:10px;color:var(--xeno-text);font:13px system-ui,sans-serif;">
        <button
          type="button"
          style={`padding:8px 12px;font-size:12px;border-radius:6px;cursor:pointer;border:1px solid ${enabled() ? 'var(--xeno-accent)' : 'var(--xeno-border)'};background:${enabled() ? 'var(--xeno-accent)' : 'var(--xeno-panel)'};color:${enabled() ? 'var(--xeno-canvas)' : 'var(--xeno-text)'};`}
          onClick={toggle}
        >{enabled() ? '✓ Conversion enabled' : 'Enable number → text cast'}</button>
        <div style="font:11px/1.4 ui-monospace,monospace;max-height:120px;overflow:auto;padding:6px;background:rgba(0,0,0,0.3);border-radius:4px;">
          <For each={log().slice(-6)}>{(line) => <div style={{ color: color(line) }}>{line}</div>}</For>
        </div>
      </div>
    </div>
  )
}
