<script setup lang="ts">
import { XenolithGraph, XenolithControls } from '@xenolithengine/graph-vue'
import PipelinePanel from './PipelinePanel.vue'
</script>

<template>
  <div class="app" style="position:absolute;inset:0;">
    <XenolithGraph class="xeno" :resize-to-window="false">
      <XenolithControls position="bottom-left" />
      <PipelinePanel />
    </XenolithGraph>
  </div>
</template>
