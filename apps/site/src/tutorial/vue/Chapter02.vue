<script setup lang="ts">
// CHAPTER 2 — Register your first node type (Vue).
//
// Schema is plain data at module scope, registration happens inside `@ready`. The graph JSON is now
// compact — pins and widgets come from the schema, not from every node entry.
import { XenolithGraph } from '@xenolith/vue'
import type { NodeSchema, XenolithEditor } from '@xenolith/editor'

const greeterSchema: NodeSchema = {
  type: 'Greeter',
  title: 'Greeter',
  category: 'data',
  description: 'Emits a string greeting.',
  keywords: ['hello', 'string', 'message'],
  pins: [
    { kind: 'data', direction: 'out', type: 'string', label: 'Out', multiple: true },
  ],
  widgets: [
    { id: 'msg', type: 'text', key: 'msg', label: 'Message', placeholder: 'Hello, Xenolith', freeFloating: true },
  ],
}

const graph = {
  version: 'xenolith.v1' as const,
  nodes: [
    { id: 'greeter', type: 'Greeter', position: { x: 0, y: 0 }, state: { msg: 'Hello, Xenolith' } },
  ],
  edges: [],
}

function onReady(editor: XenolithEditor): void {
  editor.registry.register(greeterSchema)
  editor.loadJSON(graph)
  editor.view.fitView({ padding: 80, maxZoom: 1 })
}
</script>

<template>
  <div class="app" style="position:absolute;inset:0;">
    <XenolithGraph class="xeno" :resize-to-window="false" @ready="onReady" />
  </div>
</template>
