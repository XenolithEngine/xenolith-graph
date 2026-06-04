<script setup lang="ts">
// Child of <XenolithGraph> — `useEditor()` and `useEditorEvent()` resolve via injection.
// Composables auto-rebind on editor swap and clean up on unmount.
import { ref, computed } from 'vue'
import { useEditor, useEditorEvent } from '@xenolith/vue'

const editor = useEditor()
const nodes = ref<number>(0)
const edges = ref<number>(0)
const selection = ref<string[]>([])
const lastEdit = ref<string>('—')

function refreshCounts(): void {
  const e = editor.value
  if (!e) return
  const snap = e.getGraphReadonly()
  nodes.value = snap.nodes.length
  edges.value = snap.edges.length
}

useEditorEvent('graph:loaded',        refreshCounts)
useEditorEvent('node:added',          refreshCounts)
useEditorEvent('node:removed',        refreshCounts)
useEditorEvent('edge:connected',      refreshCounts)
useEditorEvent('edge:disconnected',   refreshCounts)
useEditorEvent('selection:changed',   ({ nodeIds }) => { selection.value = nodeIds.map(String) })
useEditorEvent('widget:changed',      ({ nodeId, widgetId, value }) => {
  lastEdit.value = `${String(nodeId)}.${widgetId} → ${JSON.stringify(value)}`
})

const selLabel = computed(() => selection.value.length === 0 ? '—' : selection.value.join(', '))
</script>

<template>
  <div data-xeno-panel class="readout">
    <div class="title">Live readout</div>
    <div>Nodes: <b>{{ nodes }}</b> · Edges: <b>{{ edges }}</b></div>
    <div>Selected: <b>{{ selLabel }}</b></div>
    <div>Last edit: <b>{{ lastEdit }}</b></div>
  </div>
</template>

<style scoped>
.readout {
  position: absolute; top: 20px; right: 20px; pointer-events: auto; z-index: 5;
  min-width: 200px; padding: 8px 12px; border-radius: 6px;
  background: rgba(0,0,0,0.45); color: #e8e8e8;
  font: 12px/1.5 var(--xn-mono, ui-monospace, monospace);
}
.title {
  font-weight: 600; letter-spacing: .04em; text-transform: uppercase;
  color: rgba(255,255,255,0.5); margin-bottom: 4px; font-size: 10px;
}
</style>
