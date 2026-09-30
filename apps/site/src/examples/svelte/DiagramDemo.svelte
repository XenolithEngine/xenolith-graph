<!-- Svelte — edges is a store. The effect pushes `animated` onto every current edge. -->
<script lang="ts">
  import { xenolith, createXenolithStores, createXenolithEditorContext } from '@xenolithengine/graph-svelte'
  import { XenolithPanel, XenolithButton, XenolithControls } from '@xenolithengine/graph-svelte/components'
  import type { XenolithEditor } from '@xenolithengine/graph-editor'
  import { buildDiagram } from '@xenolithengine/demo/diagram'

  const stores = createXenolithStores()
  const edges = stores.edges
  const panelEditor = createXenolithEditorContext()
  let editor = $state<XenolithEditor | null>(null)
  let animated = $state(true)

  $effect(() => {
    const live = editor
    const list = $edges
    const on = animated
    if (!live) return
    for (const edge of list) live.setEdgeOptions(edge.id, { animated: on })
  })
</script>

<div
  use:xenolith={{ resizeToWindow: false }}
  onready={(e) => { editor = e.detail; panelEditor.set(e.detail); stores.editor.set(e.detail); buildDiagram(e.detail) }}
  style="position:absolute;inset:0"
></div>

<XenolithControls position="bottom-left" />

<XenolithPanel position="top-left">
  <div style="display:flex;flex-direction:column;gap:6px;width:200px;">
    <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--xeno-muted);">Diagram edges</p>
    <XenolithButton active={animated} style="width:100%" onclick={() => { animated = !animated }}>
      {animated ? '⏸ Stop flow' : '▶ Animate flow'}
    </XenolithButton>
    <span style="color:var(--xeno-muted);font-size:11px;line-height:1.45;">
      Directional edges with arrowheads + labels. The main path animates a flowing dash.
      The toggle writes the edges store through setEdgeOptions.
    </span>
  </div>
</XenolithPanel>
