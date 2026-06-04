<script setup lang="ts">
// CHAPTER 6 — Save / Load (Vue).
//
// Boot from localStorage when available, otherwise from the seed. The toolbar lives in a child
// component that uses `useEditor()` + `useEditorEvent('history:changed')` for autosave.
import { XenolithGraph } from '@xenolithengine/graph-vue'
import type { NodeSchema, XenolithEditor } from '@xenolithengine/graph-editor'
import Chapter06Toolbar from './Chapter06Toolbar.vue'

const greeterSchema: NodeSchema = {
  type: 'Greeter', title: 'Greeter', category: 'data',
  pins:    [{ kind: 'data', direction: 'out', type: 'string', label: 'Out', multiple: true }],
  widgets: [
    { id: 'msg',    type: 'text',  key: 'msg',    label: 'Message', placeholder: 'Hello, Xenolith', freeFloating: true },
    { id: 'volume', type: 'slider', key: 'volume', label: 'Volume', min: 0, max: 100, step: 1, freeFloating: true },
  ],
}

const toUpperSchema: NodeSchema = {
  type: 'ToUpper', title: 'To Upper', category: 'transform',
  pins: [
    { kind: 'data', direction: 'in',  type: 'string', label: 'In',  multiple: false },
    { kind: 'data', direction: 'out', type: 'string', label: 'Out', multiple: true  },
  ],
}

const seedGraph = {
  version: 'xenolith.v1' as const,
  nodes: [
    { id: 'greeter', type: 'Greeter', position: { x: -240, y: 0 }, state: { msg: 'Hello, Xenolith', volume: 60 } },
    { id: 'upper',   type: 'ToUpper', position: { x:  200, y: 0 }, state: {} },
  ],
  edges: [
    { id: 'e1', from: { node: 'greeter', pin: 'greeter:Out' }, to: { node: 'upper', pin: 'upper:In' } },
  ],
}

const STORAGE_KEY = 'xeno-tutorial-ch6-vue'

function onReady(editor: XenolithEditor): void {
  editor.registry.register(greeterSchema)
  editor.registry.register(toUpperSchema)
  const saved = (() => { try { return localStorage.getItem(STORAGE_KEY) } catch { return null } })()
  if (saved) {
    try { editor.loadJSON(JSON.parse(saved)) } catch { editor.loadJSON(seedGraph) }
  } else {
    editor.loadJSON(seedGraph)
  }
  editor.view.fitView({ padding: 80, maxZoom: 1 })
}
</script>

<template>
  <div class="app" style="position:absolute;inset:0;">
    <XenolithGraph class="xeno" :resize-to-window="false" @ready="onReady">
      <Chapter06Toolbar :storage-key="STORAGE_KEY" />
    </XenolithGraph>
  </div>
</template>
