<script setup lang="ts">
// CHAPTER 3 — Connect nodes with typed edges (Vue).
//
// Two schemas, two instances, one edge in JSON. Idiomatic Vue wiring: schemas live at module scope,
// registration runs inside `@ready`.
import { XenolithGraph } from '@xenolithengine/vue'
import type { NodeSchema, XenolithEditor } from '@xenolithengine/editor'

const greeterSchema: NodeSchema = {
  type: 'Greeter', title: 'Greeter', category: 'data',
  description: 'Emits a string greeting.',
  pins: [
    { kind: 'data', direction: 'out', type: 'string', label: 'Out', multiple: true },
  ],
  widgets: [
    { id: 'msg', type: 'text', key: 'msg', label: 'Message', placeholder: 'Hello, Xenolith', freeFloating: true },
  ],
}

const toUpperSchema: NodeSchema = {
  type: 'ToUpper', title: 'To Upper', category: 'transform',
  description: 'Uppercases the incoming string.',
  keywords: ['upper', 'case', 'caps'],
  pins: [
    { kind: 'data', direction: 'in',  type: 'string', label: 'In',  multiple: false },
    { kind: 'data', direction: 'out', type: 'string', label: 'Out', multiple: true  },
  ],
}

const graph = {
  version: 'xenolith.v1' as const,
  nodes: [
    { id: 'greeter', type: 'Greeter', position: { x: -220, y: 0 }, state: { msg: 'Hello, Xenolith' } },
    { id: 'upper',   type: 'ToUpper', position: { x:  180, y: 0 }, state: {} },
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
