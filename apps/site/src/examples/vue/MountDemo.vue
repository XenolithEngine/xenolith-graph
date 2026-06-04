<script setup lang="ts">
// Vue 3 SFC — the honest minimum: load one node, frame it. Xen is the default theme.
import { XenolithGraph } from '@xenolithengine/vue'
import { buildMount } from '@xenolithengine/demo/mount'
</script>

<template>
  <div class="app" style="position:absolute;inset:0;">
    <XenolithGraph class="xeno" :resize-to-window="false" @ready="buildMount" />
  </div>
</template>
