<script setup lang="ts">
// Vue — every built-in widget on one node. The node is data; this file only mounts it.
import { XenolithGraph } from '@xenolithengine/graph-vue'
import { buildBuiltinWidgets } from '@xenolithengine/demo/builtin-widgets'
</script>

<template>
  <div class="app" style="position:absolute;inset:0;">
    <XenolithGraph class="xeno" :resize-to-window="false" @ready="buildBuiltinWidgets" />
  </div>
</template>
