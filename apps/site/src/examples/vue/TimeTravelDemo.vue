<script setup lang="ts">
import { XenolithGraph } from '@xenolithengine/graph-vue'
import ScrubPanel from './ScrubPanel.vue'
</script>

<template>
  <div class="app" style="position:absolute;inset:0;">
    <XenolithGraph class="xeno" :resize-to-window="false">
      <ScrubPanel />
    </XenolithGraph>
  </div>
</template>
