<!-- Svelte — full-graph image export. The editor from onready is enough; the download
     helper is framework-agnostic. -->
<script lang="ts">
  import { xenolith, createXenolithEditorContext } from '@xenolithengine/graph-svelte'
  import { XenolithPanel, XenolithButton, XenolithControls } from '@xenolithengine/graph-svelte/components'
  import type { XenolithEditor } from '@xenolithengine/graph-editor'
  import { loadDemo } from '@xenolithengine/demo/scene'
  import { exportGraphImage } from '@xenolithengine/demo/export-image'

  const panelEditor = createXenolithEditorContext()
  let editor = $state<XenolithEditor | null>(null)
  let busy = $state(false)

  async function save(format: 'png' | 'jpeg', scale: number): Promise<void> {
    if (!editor || busy) return
    busy = true
    try { await exportGraphImage(editor, format, scale) } finally { busy = false }
  }
</script>

<div
  use:xenolith={{ resizeToWindow: false }}
  onready={(e) => { editor = e.detail; panelEditor.set(e.detail); loadDemo(e.detail) }}
  style="position:absolute;inset:0"
></div>

<XenolithControls position="bottom-left" />

<XenolithPanel position="top-left">
  <div style="display:flex;flex-direction:column;gap:6px;width:190px;">
    <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--xeno-muted);">Export image</p>
    <XenolithButton style="width:100%" disabled={busy} onclick={() => save('png', 1)}>↓ PNG · 1×</XenolithButton>
    <XenolithButton style="width:100%" disabled={busy} onclick={() => save('png', 2)}>↓ PNG · 2× (retina)</XenolithButton>
    <XenolithButton style="width:100%" disabled={busy} onclick={() => save('jpeg', 2)}>↓ JPG · 2×</XenolithButton>
    <span style="color:var(--xeno-muted);font-size:11px;line-height:1.45;">
      Exports the entire graph, not just what’s on screen.
    </span>
  </div>
</XenolithPanel>
