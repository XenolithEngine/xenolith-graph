<script setup lang="ts">
// Vue SFC — palette sidebar. Schemas + sidebar config from the shared package; the editor's
// built-in `node:drop` handler spawns the dragged node at the drop point.
import { XenolithGraph } from '@xenolith/vue'
import type { XenolithEditor } from '@xenolith/editor'
import { buildPaletteSidebar } from '@xenolith/demo/palette-sidebar'

function onReady(editor: XenolithEditor): void {
  buildPaletteSidebar(editor)
  editor.view.fitView({ padding: 80, maxZoom: 1 })
}
</script>

<template>
  <div class="app" style="position:absolute;inset:0;">
    <XenolithGraph class="xeno" :resize-to-window="false" @ready="onReady" />
  </div>
</template>
