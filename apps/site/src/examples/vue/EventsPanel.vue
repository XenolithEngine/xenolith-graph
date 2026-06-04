<script setup lang="ts">
// Subscriptions live with the state that records them. `useEditorEvent` auto-rebinds on editor swap
// and cleans up on unmount. Mounted as a child of <XenolithGraph> so the editor injection resolves.
import { ref } from 'vue'
import { useEditorEvent } from '@xenolith/vue'

const log = ref<string[]>([])
const widgets = ref<Record<string, unknown>>({})
const selected = ref<string[]>([])

const push = (line: string): void => { log.value = [line, ...log.value].slice(0, 40) }

useEditorEvent('node:click', (e) => push(`node:click ${String(e.nodeId)}`))
useEditorEvent('selection:changed', (e) => {
  selected.value = e.nodeIds.map(String)
  push(`selection:changed (${e.nodeIds.length})`)
})
useEditorEvent('node:moved', (e) => push(`node:moved ${String(e.nodeId)} → ${Math.round(e.position.x)},${Math.round(e.position.y)}`))
useEditorEvent('edge:connected', (e) => push(`edge:connected ${String(e.edge.id)}`))
useEditorEvent('edge:disconnected', (e) => push(`edge:disconnected ${String(e.edgeId)}`))
useEditorEvent('widget:changed', (e) => {
  widgets.value = { ...widgets.value, [`${String(e.nodeId)}.${e.widgetId}`]: e.value }
  push(`widget:changed ${e.widgetId} = ${JSON.stringify(e.value)}`)
})
useEditorEvent('history:changed', (e) => push(`history undo=${e.canUndo} redo=${e.canRedo}`))
</script>

<template>
  <div data-xeno-panel class="panel">
    <h3>Selection</h3>
    <p v-if="selected.length === 0" class="muted">Nothing selected.</p>
    <div v-for="id in selected" :key="id" class="row"><span>{{ id }}</span></div>

    <h3 style="margin-top:16px;">Widget values</h3>
    <p v-if="Object.keys(widgets).length === 0" class="muted">Drag a slider, type in a field, toggle a switch…</p>
    <div v-for="(v, id) in widgets" :key="id" class="row">
      <span class="muted">{{ id }}</span><span>{{ JSON.stringify(v) }}</span>
    </div>

    <h3 style="margin-top:16px;">Event log</h3>
    <div class="log">
      <p v-if="log.length === 0" class="muted">Interact with the graph…</p>
      <div v-for="(line, i) in log" :key="i">{{ line }}</div>
    </div>
  </div>
</template>

<style scoped>
.panel {
  position: absolute; top: 12px; right: 12px;
  width: 280px; max-height: calc(100% - 24px); overflow-y: auto;
  background: var(--xeno-panel, #1d1d1d);
  border: 1px solid var(--xeno-border, #333);
  border-radius: 8px;
  padding: 12px;
  font: 12px Inter, system-ui, sans-serif;
  color: var(--xeno-text, #cfcfcf);
  z-index: 5;
}
.panel h3 { margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: var(--xeno-muted, #9a9a9a); }
.muted { color: var(--xeno-muted, #9a9a9a); margin: 0; }
.row { display: flex; justify-content: space-between; gap: 8px; padding: 2px 0; }
.log { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; line-height: 1.5; }
</style>
