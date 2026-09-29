<script setup lang="ts">
// Vue — a WebGL level bar. @widget-changed is the camelCase emit of widget:changed.
// The slider writes the same key back through setWidgetValue.
import { ref } from 'vue'
import { XenolithGraph, XenolithPanel } from '@xenolithengine/graph-vue'
import type { NodeId, XenolithEditor } from '@xenolithengine/graph-editor'
import { buildCanvasWidget } from '@xenolithengine/demo/canvas-widget'

const gain = ref(0.6)
const editor = ref<XenolithEditor | null>(null)
const nodeId = ref<NodeId | null>(null)

function onReady(e: XenolithEditor): void {
  editor.value = e
  nodeId.value = buildCanvasWidget(e).nodeId
}

function onWidget(payload: { widgetId: string; value: unknown }): void {
  if (payload.widgetId === 'gain') gain.value = Number(payload.value)
}

function onRange(ev: Event): void {
  const e = editor.value
  const id = nodeId.value
  if (!e || !id) return
  e.setWidgetValue(id, 'gain', (ev.target as HTMLInputElement).valueAsNumber)
}
</script>

<template>
  <div class="app" style="position:absolute;inset:0;">
    <XenolithGraph class="xeno" :resize-to-window="false" @ready="onReady" @widget-changed="onWidget">
      <XenolithPanel position="top-right">
        <div style="width:220px;">
          <h3 style="margin:0 0 6px;font-size:13px;">Live value (in Vue)</h3>
          <p style="margin:0 0 8px;font-size:12px;color:var(--xeno-muted);">
            The canvas widget commits through the editor; <code>widget:changed</code> hands the value back.
          </p>
          <div style="font-size:28px;font-weight:600;color:var(--xeno-accent);">{{ Math.round(gain * 100) }}%</div>
          <input type="range" min="0" max="1" step="0.01" :value="gain" style="width:100%;" @input="onRange" />
        </div>
      </XenolithPanel>
    </XenolithGraph>
  </div>
</template>
