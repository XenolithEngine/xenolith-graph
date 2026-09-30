<script setup lang="ts">
// Vue — the flow toggle lives in a child so useEdges() injects inside <XenolithGraph>.
import { XenolithGraph, XenolithControls } from '@xenolithengine/graph-vue'
import { buildDiagram } from '@xenolithengine/demo/diagram'
import DiagramPanel from './DiagramPanel.vue'
</script>

<template>
  <div class="app" style="position:absolute;inset:0;">
    <XenolithGraph class="xeno" :resize-to-window="false" @ready="buildDiagram">
      <XenolithControls position="bottom-left" />
      <DiagramPanel />
    </XenolithGraph>
  </div>
</template>
