<!-- Svelte — a WebGL level bar. widget:changed is subscribed on the editor from onready.
     The range uses oninput, so the file stays on the Svelte 5 event form (no on:ready mix). -->
<script lang="ts">
  import { xenolith, createXenolithEditorContext } from '@xenolithengine/graph-svelte'
  import { XenolithPanel } from '@xenolithengine/graph-svelte/components'
  import type { NodeId, XenolithEditor } from '@xenolithengine/graph-editor'
  import { buildCanvasWidget } from '@xenolithengine/demo/canvas-widget'

  const panelEditor = createXenolithEditorContext()
  let gain = $state(0.6)
  let editor = $state<XenolithEditor | null>(null)
  let nodeId = $state<NodeId | null>(null)

  function onRange(ev: Event): void {
    if (!editor || !nodeId) return
    editor.setWidgetValue(nodeId, 'gain', (ev.target as HTMLInputElement).valueAsNumber)
  }
</script>

<div
  use:xenolith={{ resizeToWindow: false }}
  onready={(e) => {
    editor = e.detail
    panelEditor.set(e.detail)
    nodeId = buildCanvasWidget(e.detail).nodeId
    e.detail.on('widget:changed', (payload) => {
      if (payload.widgetId === 'gain') gain = Number(payload.value)
    })
  }}
  style="position:absolute;inset:0"
></div>

<XenolithPanel position="top-right">
  <div style="width:220px;">
    <h3 style="margin:0 0 6px;font-size:13px;">Live value (in Svelte)</h3>
    <p style="margin:0 0 8px;font-size:12px;color:var(--xeno-muted);">
      The canvas widget commits through the editor; <code>widget:changed</code> hands the value back.
    </p>
    <div style="font-size:28px;font-weight:600;color:var(--xeno-accent);">{Math.round(gain * 100)}%</div>
    <input type="range" min="0" max="1" step="0.01" value={gain} style="width:100%;" oninput={onRange} />
  </div>
</XenolithPanel>
