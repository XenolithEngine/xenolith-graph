<script lang="ts">
  import { onDestroy } from 'svelte'
  import { xenolith, createXenolithEditorContext } from '@xenolithengine/graph-svelte'
  import { XenolithPanel, XenolithButton } from '@xenolithengine/graph-svelte/components'
  import { mountHeatmap, type HeatmapHandle } from '@xenolithengine/demo/heatmap'

  const panelEditor = createXenolithEditorContext()
  let pulsing = $state(false)
  let handle: HeatmapHandle | null = null

  function toggle(): void {
    pulsing = !pulsing
    handle?.setPulsing(pulsing)
  }

  onDestroy(() => { handle?.dispose(); handle = null })
</script>

<div
  use:xenolith={{ resizeToWindow: false }}
  onready={(e) => { panelEditor.set(e.detail); handle = mountHeatmap(e.detail) }}
  style="position:absolute;inset:0"
></div>

<XenolithPanel position="top-left">
  <div style="display:flex;flex-direction:column;gap:8px;max-width:320px;">
    <div style="font-size:12px;font-weight:600;">Per-node cost heatmap</div>
    <div style="font-size:11px;color:var(--xeno-muted);line-height:1.4;">
      A simulated RAG pipeline. Each node has a per-call latency badge —
      <span style="color:hsl(200deg,80%,55%)"> cool blue</span> for cheap,
      <span style="color:hsl(40deg,80%,55%)"> warm</span> for medium,
      <span style="color:hsl(0deg,80%,55%)"> hot red</span> for the bottleneck.
      Press Pulse to animate live metrics.
    </div>
    <XenolithButton active={pulsing} onclick={toggle}>
      {pulsing ? '⏸ Pause pulse' : '▶ Pulse'}
    </XenolithButton>
  </div>
</XenolithPanel>
