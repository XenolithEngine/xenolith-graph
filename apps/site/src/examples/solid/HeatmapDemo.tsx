import { createSignal, onCleanup } from 'solid-js'
import { xenolith } from '@xenolithengine/graph-solid'
import { mountHeatmap, type HeatmapHandle } from '@xenolithengine/demo/heatmap'

export function HeatmapDemo() {
  const [pulsing, setPulsing] = createSignal(false)
  let handle: HeatmapHandle | null = null
  onCleanup(() => { handle?.dispose(); handle = null })

  const toggle = (): void => {
    const next = !pulsing()
    setPulsing(next)
    handle?.setPulsing(next)
  }

  const btn = (on: boolean): string =>
    `font:inherit;font-size:13px;padding:7px 12px;border-radius:8px;cursor:pointer;border:1px solid ${on ? 'var(--xeno-accent)' : 'var(--xeno-border)'};background:${on ? 'var(--xeno-accent)' : 'var(--xeno-elevated)'};color:${on ? 'var(--xeno-canvas)' : 'var(--xeno-text)'};`

  return (
    <div
      use:xenolith={{ resizeToWindow: false }}
      on:ready={(e) => { handle = mountHeatmap(e.detail) }}
      style="position:absolute;inset:0"
    >
      <div style="position:absolute;top:12px;left:12px;z-index:5;display:flex;flex-direction:column;gap:8px;max-width:320px;padding:10px;background:var(--xeno-panel);border:1px solid var(--xeno-border);border-radius:10px;color:var(--xeno-text);font:13px system-ui,sans-serif;">
        <div style="font-size:12px;font-weight:600;">Per-node cost heatmap</div>
        <div style="font-size:11px;color:var(--xeno-muted);line-height:1.4;">
          A simulated RAG pipeline. Each node has a per-call latency badge —
          <span style="color:hsl(200deg,80%,55%)"> cool blue</span> for cheap,
          <span style="color:hsl(40deg,80%,55%)"> warm</span> for medium,
          <span style="color:hsl(0deg,80%,55%)"> hot red</span> for the bottleneck.
          Press Pulse to animate live metrics.
        </div>
        <button type="button" style={btn(pulsing())} onClick={toggle}>{pulsing() ? '⏸ Pause pulse' : '▶ Pulse'}</button>
      </div>
    </div>
  )
}
