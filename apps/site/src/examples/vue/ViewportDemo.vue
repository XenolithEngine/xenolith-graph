<script setup lang="ts">
// Vue — controls, minimap, and a live readout. The hooks have to run in a child of
// <XenolithGraph> (provide/inject); that child is ViewportChrome.
import { XenolithGraph } from '@xenolithengine/graph-vue'
import { loadDemo } from '@xenolithengine/demo/scene'
import ViewportChrome from './ViewportChrome.vue'
</script>

<template>
  <div class="app" style="position:absolute;inset:0;">
    <XenolithGraph class="xeno" :resize-to-window="false" @ready="loadDemo">
      <ViewportChrome />
    </XenolithGraph>
  </div>
</template>
