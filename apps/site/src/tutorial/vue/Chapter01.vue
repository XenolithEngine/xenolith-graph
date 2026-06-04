<script setup lang="ts">
// CHAPTER 1 — Mount your first editor (Vue).
//
// Vue is a first-class consumer — `<XenolithGraph>` is the component, `@ready` hands you the editor
// instance the moment it's mounted. The graph itself is the same xenolith.v1 JSON the vanilla and
// React versions load — author once, render anywhere.
import { XenolithGraph } from '@xenolithengine/vue'
import type { XenolithEditor } from '@xenolithengine/editor'

const graph = {
  version: 'xenolith.v1' as const,
  nodes: [
    {
      id: 'greeter',
      type: 'Greeter',
      position: { x: 0, y: 0 },
      render: { title: 'Greeter' },
      state: { msg: 'Hello, Xenolith' },
      pins: [
        { id: 'greeter:out', kind: 'data' as const, direction: 'out' as const, type: 'string', multiple: true, label: 'Out' },
      ],
      widgets: [
        { id: 'msg', type: 'text' as const, key: 'msg', label: 'Message', freeFloating: true },
      ],
    },
  ],
  edges: [],
}

function onReady(editor: XenolithEditor): void {
  editor.loadJSON(graph)
  editor.view.fitView({ padding: 80, maxZoom: 1 })
}
</script>

<template>
  <div class="app" style="position:absolute;inset:0;">
    <XenolithGraph class="xeno" :resize-to-window="false" @ready="onReady" />
  </div>
</template>
