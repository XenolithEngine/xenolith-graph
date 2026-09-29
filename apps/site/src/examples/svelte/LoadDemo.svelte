<!-- Svelte — load a saved graph on ready; the panel reloads it. Panels read the
     editor context created during init and filled from onready. -->
<script lang="ts">
  import { xenolith, createXenolithEditorContext } from '@xenolithengine/graph-svelte'
  import { XenolithPanel, XenolithButton, XenolithControls } from '@xenolithengine/graph-svelte/components'
  import type { XenolithEditor } from '@xenolithengine/graph-editor'
  import { loadDemo } from '@xenolithengine/demo/scene'
  import { demoGraph } from '@xenolithengine/demo'

  const panelEditor = createXenolithEditorContext()
  let editor = $state<XenolithEditor | null>(null)

  function reload(): void {
    if (!editor) return
    editor.loadJSON(demoGraph)
    editor.view.fitView({ padding: 48, maxZoom: 1 })
  }
</script>

<div
  use:xenolith={{ resizeToWindow: false }}
  onready={(e) => { editor = e.detail; panelEditor.set(e.detail); loadDemo(e.detail) }}
  style="position:absolute;inset:0"
></div>

<XenolithControls position="bottom-left" />

<XenolithPanel position="top-right">
  <XenolithButton onclick={reload}>Reload graph</XenolithButton>
</XenolithPanel>
