<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import { XenolithPanel, XenolithButton, useEditor } from '@xenolithengine/graph-vue'
import { mountHeatmap, type HeatmapHandle } from '@xenolithengine/demo/heatmap'

const editor = useEditor()
const pulsing = ref(false)
let handle: HeatmapHandle | null = null

watch(editor, (ed) => {
  handle?.dispose()
  handle = null
  pulsing.value = false
  if (!ed) return
  handle = mountHeatmap(ed)
}, { immediate: true })

onUnmounted(() => { handle?.dispose(); handle = null })

function toggle(): void {
  pulsing.value = !pulsing.value
  handle?.setPulsing(pulsing.value)
}
</script>

<template>
  <XenolithPanel position="top-left">
    <div style="display:flex;flex-direction:column;gap:8px;max-width:320px;">
      <div style="font-size:12px;font-weight:600;">Per-node cost heatmap</div>
      <div style="font-size:11px;color:var(--xeno-muted);line-height:1.4;">
        A simulated RAG pipeline. Each node has a per-call latency badge —
        <span style="color:hsl(200deg,80%,55%)"> cool blue</span> for cheap,
        <span style="color:hsl(40deg,80%,55%)"> warm</span> for medium,
        <span style="color:hsl(0deg,80%,55%)"> hot red</span> for the bottleneck.
        Press Pulse to animate live metrics.
      </div>
      <XenolithButton :active="pulsing" @click="toggle">
        {{ pulsing ? '⏸ Pause pulse' : '▶ Pulse' }}
      </XenolithButton>
    </div>
  </XenolithPanel>
</template>
