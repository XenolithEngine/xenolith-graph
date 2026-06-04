<script setup lang="ts">
// CHAPTER 4 — Widgets (Vue).
//
// Same schemas + graph as the vanilla/React versions. `displayOptions.show` stays a live closure
// inside the schema and is preserved when the schema's widgets are copied onto each instance.
import { XenolithGraph } from '@xenolithengine/graph-vue'
import type { NodeSchema, XenolithEditor } from '@xenolithengine/graph-editor'

const greeterSchema: NodeSchema = {
  type: 'Greeter', title: 'Greeter', category: 'data',
  description: 'Emits a string greeting with configurable tone and accent.',
  pins: [
    { kind: 'data', direction: 'out', type: 'string', label: 'Out', multiple: true },
  ],
  widgets: [
    { id: 'msg', type: 'text', key: 'msg', label: 'Message', placeholder: 'Hello, Xenolith', freeFloating: true },
    { id: 'tone', type: 'combo', key: 'tone', label: 'Tone',
      values: ['friendly', 'formal', 'sarcastic'], freeFloating: true },
    { id: 'volume', type: 'slider', key: 'volume', label: 'Volume',
      min: 0, max: 100, step: 1, freeFloating: true },
    { id: 'showAccent', type: 'toggle', key: 'showAccent', label: 'Show accent',
      onLabel: 'on', offLabel: 'off', freeFloating: true },
    { id: 'accent', type: 'color', key: 'accent', label: 'Accent', freeFloating: true,
      displayOptions: { show: (state) => state['showAccent'] === true } },
  ],
}

const toUpperSchema: NodeSchema = {
  type: 'ToUpper', title: 'To Upper', category: 'transform',
  pins: [
    { kind: 'data', direction: 'in',  type: 'string', label: 'In',  multiple: false },
    { kind: 'data', direction: 'out', type: 'string', label: 'Out', multiple: true  },
  ],
}

const graph = {
  version: 'xenolith.v1' as const,
  nodes: [
    { id: 'greeter', type: 'Greeter', position: { x: -240, y: 0 },
      state: { msg: 'Hello, Xenolith', tone: 'friendly', volume: 60, showAccent: true, accent: '#fcb400' } },
    { id: 'upper',   type: 'ToUpper', position: { x:  200, y: 0 }, state: {} },
  ],
  edges: [
    { id: 'e1', from: { node: 'greeter', pin: 'greeter:Out' }, to: { node: 'upper', pin: 'upper:In' } },
  ],
}

function onReady(editor: XenolithEditor): void {
  editor.registry.register(greeterSchema)
  editor.registry.register(toUpperSchema)
  editor.loadJSON(graph)
  editor.view.fitView({ padding: 80, maxZoom: 1 })
}
</script>

<template>
  <div class="app" style="position:absolute;inset:0;">
    <XenolithGraph class="xeno" :resize-to-window="false" @ready="onReady" />
  </div>
</template>
