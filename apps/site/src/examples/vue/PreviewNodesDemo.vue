<script setup lang="ts">
// Vue — per-node canvas drawing. No panel: setupPreviewNodes registers the widgets and the poller.
import { XenolithGraph } from '@xenolithengine/graph-vue'
import { setupPreviewNodes } from '@xenolithengine/demo/preview-nodes'
</script>

<template>
  <div class="app" style="position:absolute;inset:0;">
    <XenolithGraph class="xeno" :resize-to-window="false" @ready="setupPreviewNodes" />
  </div>
</template>
