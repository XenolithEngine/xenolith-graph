<script setup lang="ts">
// Vue — both binding levels: useSelection() for the selected node's widgets,
// useGraphJSON() for the whole document. The editor stays the source of truth.
import { XenolithGraph } from '@xenolithengine/graph-vue'
import { loadDemo } from '@xenolithengine/demo/scene'
import TwoWayPanels from './TwoWayPanels.vue'
</script>

<template>
  <div class="app" style="position:absolute;inset:0;">
    <XenolithGraph class="xeno" :resize-to-window="false" @ready="loadDemo">
      <TwoWayPanels />
    </XenolithGraph>
  </div>
</template>
