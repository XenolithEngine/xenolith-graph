<script setup lang="ts">
// Vue — full-graph image export. The buttons live in a child so useEditor() injects
// inside <XenolithGraph>. Download logic stays in @xenolithengine/demo/export-image.
import { XenolithGraph, XenolithControls } from '@xenolithengine/graph-vue'
import { loadDemo } from '@xenolithengine/demo/scene'
import ExportPanel from './ExportPanel.vue'
</script>

<template>
  <div class="app" style="position:absolute;inset:0;">
    <XenolithGraph class="xeno" :resize-to-window="false" @ready="loadDemo">
      <XenolithControls position="bottom-left" />
      <ExportPanel />
    </XenolithGraph>
  </div>
</template>
