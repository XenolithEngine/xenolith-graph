<script setup lang="ts">
// Vue — the counter has to live in a child of <XenolithGraph> so useNodes() injects.
// Zoom floor is a mount prop: 10k nodes still fit in one view.
import { XenolithGraph } from '@xenolithengine/graph-vue'
import { setupStressTest } from '@xenolithengine/demo/stress-test'
import StressPanel from './StressPanel.vue'

const zoomBounds = [0.05, 2] as const
</script>

<template>
  <div class="app" style="position:absolute;inset:0;">
    <XenolithGraph class="xeno" :resize-to-window="false" :zoom-bounds="zoomBounds" @ready="setupStressTest">
      <StressPanel />
    </XenolithGraph>
  </div>
</template>
