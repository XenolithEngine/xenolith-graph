<script lang="ts">
  import { xenolith, createXenolithEditorContext } from '@xenolithengine/graph-svelte'
  import { XenolithPanel, XenolithButton, XenolithControls, svelteWidget } from '@xenolithengine/graph-svelte/components'
  import type { XenolithEditor } from '@xenolithengine/graph-editor'
  import { buildImagePipeline, downloadImageResult } from '@xenolithengine/demo/image-pipeline'
  import ImageInput from './ImageInput.svelte'
  import ImageOutput from './ImageOutput.svelte'

  const panelEditor = createXenolithEditorContext()
  let editor = $state<XenolithEditor | null>(null)
  const input = svelteWidget(ImageInput)
  const output = svelteWidget(ImageOutput)

  function ready(e: { detail: XenolithEditor }): void {
    editor = e.detail
    panelEditor.set(e.detail)
    buildImagePipeline(e.detail, { input, output })
  }
</script>

<div use:xenolith={{ resizeToWindow: false }} onready={ready} style="position:absolute;inset:0"></div>
<XenolithControls position="bottom-left" />

<XenolithPanel position="top-left">
  <div style="display:flex;flex-direction:column;gap:6px;width:200px;">
    <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--xeno-muted);">Image pipeline</p>
    <XenolithButton style="width:100%" onclick={() => editor && downloadImageResult(editor)}>↓ Download result.png</XenolithButton>
    <span style="color:var(--xeno-muted);font-size:11px;line-height:1.45;">
      Each node is a live GLSL pass. Drag a slider — the result re-renders. Drop your own image on the Source node.
    </span>
  </div>
</XenolithPanel>
