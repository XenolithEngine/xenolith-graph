<script setup lang="ts">
// Vue SFC — properties sidebar. One-time auto-open via `@ready`; toggle panel is a child component
// that uses `useEditor()` for the imperative open/close calls.
import { XenolithGraph } from '@xenolithengine/graph-vue'
import type { XenolithEditor } from '@xenolithengine/graph-editor'
import { setupPropertiesSidebar, PROPERTIES_SIDEBAR_NODE_ID } from '@xenolithengine/demo/properties-sidebar'
import SidebarTogglePanel from './SidebarTogglePanel.vue'

function onReady(editor: XenolithEditor): void {
  setupPropertiesSidebar(editor)
  editor.openSidebar(PROPERTIES_SIDEBAR_NODE_ID)
}
</script>

<template>
  <div class="app" style="position:absolute;inset:0;">
    <XenolithGraph class="xeno" :resize-to-window="false" @ready="onReady">
      <SidebarTogglePanel />
    </XenolithGraph>
  </div>
</template>
