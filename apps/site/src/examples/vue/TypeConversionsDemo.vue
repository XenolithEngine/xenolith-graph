<script setup lang="ts">
// Vue — the cast toggle calls setConversionEnabled. edge:connected is the editor event
// (same payload the React useEditorEvent hook sees).
import { ref } from 'vue'
import { XenolithGraph, XenolithPanel } from '@xenolithengine/graph-vue'
import type { XenolithEditor } from '@xenolithengine/graph-editor'
import { setupTypeConversions, setConversionEnabled } from '@xenolithengine/demo/type-conversions'

const stamp = (): string => new Date().toISOString().slice(11, 19)

const editor = ref<XenolithEditor | null>(null)
const enabled = ref(false)
const log = ref<string[]>([
  `[${stamp()}] No conversion registered. Try dragging from NumberSource.out to TextSink.in — refused.`,
])

function append(line: string): void {
  log.value = [...log.value.slice(-39), `[${stamp()}] ${line}`]
}

function onReady(e: XenolithEditor): void {
  editor.value = e
  setupTypeConversions(e)
  e.on('edge:connected', (payload) => {
    append(`✓ connected ${String(payload.edge.id).slice(0, 6)} (number → text via cast)`)
  })
}

function toggle(): void {
  const e = editor.value
  if (!e) return
  const next = !enabled.value
  const result = setConversionEnabled(e, next)
  enabled.value = result.enabled
  if (result.enabled) {
    append('✓ conversion number → text registered — try connecting the pins now')
  } else {
    const tail = result.droppedEdges > 0
      ? ` (dropped ${result.droppedEdges} stale edge${result.droppedEdges === 1 ? '' : 's'})`
      : ''
    append(`✗ conversion removed${tail} — try connecting again, it refuses`)
  }
}

function color(line: string): string {
  if (line.includes('✗')) return '#f88'
  if (line.includes('✓')) return '#9f9'
  return '#cfcfcf'
}
</script>

<template>
  <div class="app" style="position:absolute;inset:0;">
    <XenolithGraph class="xeno" :resize-to-window="false" @ready="onReady">
      <XenolithPanel position="top-left">
        <div style="display:flex;flex-direction:column;gap:6px;min-width:280px;">
          <button type="button" :style="{
            padding: '8px 12px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer',
            border: `1px solid ${enabled ? 'var(--xeno-accent)' : 'var(--xeno-border)'}`,
            background: enabled ? 'var(--xeno-accent)' : 'var(--xeno-panel)',
            color: enabled ? 'var(--xeno-canvas)' : 'var(--xeno-text)',
          }" @click="toggle">
            {{ enabled ? '✓ Conversion enabled' : 'Enable number → text cast' }}
          </button>
          <div style="font:11px/1.4 ui-monospace,monospace;max-height:120px;overflow:auto;padding:6px;background:rgba(0,0,0,0.3);border-radius:4px;">
            <div v-for="(line, i) in log.slice(-6)" :key="i" :style="{ color: color(line) }">{{ line }}</div>
          </div>
        </div>
      </XenolithPanel>
    </XenolithGraph>
  </div>
</template>
