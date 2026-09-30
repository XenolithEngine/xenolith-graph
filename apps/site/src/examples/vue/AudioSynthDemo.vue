<script setup lang="ts">
// Play lives in a child so useEditor() injects inside <XenolithGraph>.
import { XenolithGraph } from '@xenolithengine/graph-vue'
import AudioPanel from './AudioPanel.vue'
</script>

<template>
  <div class="app" style="position:absolute;inset:0;">
    <XenolithGraph class="xeno" :resize-to-window="false">
      <AudioPanel />
    </XenolithGraph>
  </div>
</template>
