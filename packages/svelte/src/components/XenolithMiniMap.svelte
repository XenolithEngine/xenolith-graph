<script lang="ts">
  import type { MinimapPosition } from '@xenolithengine/graph-editor'
  import { getXenolithEditorContext } from '../context.js'

  let { position = 'bottom-right' }: { position?: MinimapPosition } = $props()

  const editor = getXenolithEditorContext()

  $effect(() => {
    const e = $editor
    if (!e) return
    e.chrome.setMinimapVisible(true)
    e.chrome.setMinimapPosition(position)
    return () => e.chrome.setMinimapVisible(false)
  })
</script>
