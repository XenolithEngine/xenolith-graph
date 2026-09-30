<script setup lang="ts">
import { XenolithGraph } from '@xenolithengine/graph-vue'
import DebuggerPanel from './DebuggerPanel.vue'
</script>

<template>
  <div class="app" style="position:absolute;inset:0;">
    <XenolithGraph class="xeno" :resize-to-window="false">
      <DebuggerPanel />
    </XenolithGraph>
  </div>
</template>
