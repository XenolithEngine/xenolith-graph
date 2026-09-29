<script setup lang="ts">
// Vue — load a saved xenolith.v1 graph on ready, reload it from the panel.
// The editor arrives on @ready (the payload is the instance, not a DOM event).
import { ref } from 'vue'
import { XenolithGraph, XenolithControls, XenolithPanel, XenolithButton } from '@xenolithengine/graph-vue'
import type { XenolithEditor } from '@xenolithengine/graph-editor'
import { loadDemo } from '@xenolithengine/demo/scene'
import { demoGraph } from '@xenolithengine/demo'

const editor = ref<XenolithEditor | null>(null)

function onReady(e: XenolithEditor): void {
  editor.value = e
  loadDemo(e)
}

function reload(): void {
  const e = editor.value
  if (!e) return
  e.loadJSON(demoGraph)
  e.view.fitView({ padding: 48, maxZoom: 1 })
}
</script>

<template>
  <div class="app" style="position:absolute;inset:0;">
    <XenolithGraph class="xeno" :resize-to-window="false" @ready="onReady">
      <XenolithControls position="bottom-left" />
      <XenolithPanel position="top-right">
        <XenolithButton @click="reload">Reload graph</XenolithButton>
      </XenolithPanel>
    </XenolithGraph>
  </div>
</template>
