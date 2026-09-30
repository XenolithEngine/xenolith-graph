<script setup lang="ts">
import type { XenolithEditor } from '@xenolithengine/graph-editor'
import { XenolithGraph } from '@xenolithengine/graph-vue'
import { demoSchemas, createCurveWidget, createXYPadWidget } from '@xenolithengine/demo'
import MCPPanel from './MCPPanel.vue'

function setupMCP(editor: XenolithEditor): void {
  editor.registerWidget('curve', createCurveWidget())
  editor.registerWidget('xypad', createXYPadWidget())
  for (const schema of demoSchemas) editor.registry.register(schema)
  editor.view.fitView()
}
</script>

<template>
  <div class="app" style="position:absolute;inset:0;">
    <XenolithGraph class="xeno" :resize-to-window="false" @ready="setupMCP">
      <MCPPanel />
    </XenolithGraph>
  </div>
</template>
