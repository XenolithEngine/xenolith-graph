<script setup lang="ts">
// CHAPTER 7 — Run the graph: a topological executor (Vue).
//
// Schemas + graph at module scope. `@ready` registers + loads + frames. The toolbar child runs
// Kahn's algorithm over the live snapshot from `useEditor().getGraphReadonly()`.
import { XenolithGraph } from '@xenolithengine/vue'
import type { NodeSchema, XenolithEditor } from '@xenolithengine/editor'
import Chapter07Toolbar from './Chapter07Toolbar.vue'

const constSchema: NodeSchema = {
  type: 'Const', title: 'Const', category: 'data',
  pins:    [{ kind: 'data', direction: 'out', type: 'number', label: 'Out', multiple: true }],
  widgets: [{ id: 'value', type: 'number', key: 'value', label: 'Value', step: 1, freeFloating: true }],
}
const addSchema: NodeSchema = {
  type: 'Add', title: 'Add', category: 'transform',
  pins: [
    { kind: 'data', direction: 'in',  type: 'number', label: 'A', multiple: false },
    { kind: 'data', direction: 'in',  type: 'number', label: 'B', multiple: false },
    { kind: 'data', direction: 'out', type: 'number', label: 'Sum', multiple: true },
  ],
}
const mulSchema: NodeSchema = {
  type: 'Multiply', title: 'Multiply', category: 'transform',
  pins: [
    { kind: 'data', direction: 'in',  type: 'number', label: 'A', multiple: false },
    { kind: 'data', direction: 'in',  type: 'number', label: 'B', multiple: false },
    { kind: 'data', direction: 'out', type: 'number', label: 'Product', multiple: true },
  ],
}
const outSchema: NodeSchema = {
  type: 'Output', title: 'Output', category: 'utility',
  pins:    [{ kind: 'data', direction: 'in', type: 'number', label: 'In', multiple: false }],
  widgets: [{ id: 'result', type: 'text', key: 'result', label: 'Result', placeholder: 'press Run', freeFloating: true, disabled: true }],
}

const seedGraph = {
  version: 'xenolith.v1' as const,
  nodes: [
    { id: 'c1', type: 'Const',    position: { x: -380, y: -160 }, state: { value: 5 } },
    { id: 'c2', type: 'Const',    position: { x: -380, y:  -40 }, state: { value: 3 } },
    { id: 'c3', type: 'Const',    position: { x: -380, y:  120 }, state: { value: 2 } },
    { id: 'c4', type: 'Const',    position: { x: -380, y:  260 }, state: { value: 7 } },
    { id: 'a1', type: 'Add',      position: { x:  -80, y: -100 }, state: {} },
    { id: 'm1', type: 'Multiply', position: { x:  180, y:    0 }, state: {} },
    { id: 'a2', type: 'Add',      position: { x:  440, y:  100 }, state: {} },
    { id: 'out',type: 'Output',   position: { x:  700, y:  100 }, state: {} },
  ],
  edges: [
    { id: 'e1', from: { node: 'c1', pin: 'c1:Out' },    to: { node: 'a1', pin: 'a1:A' } },
    { id: 'e2', from: { node: 'c2', pin: 'c2:Out' },    to: { node: 'a1', pin: 'a1:B' } },
    { id: 'e3', from: { node: 'a1', pin: 'a1:Sum' },    to: { node: 'm1', pin: 'm1:A' } },
    { id: 'e4', from: { node: 'c3', pin: 'c3:Out' },    to: { node: 'm1', pin: 'm1:B' } },
    { id: 'e5', from: { node: 'm1', pin: 'm1:Product' },to: { node: 'a2', pin: 'a2:A' } },
    { id: 'e6', from: { node: 'c4', pin: 'c4:Out' },    to: { node: 'a2', pin: 'a2:B' } },
    { id: 'e7', from: { node: 'a2', pin: 'a2:Sum' },    to: { node: 'out', pin: 'out:In' } },
  ],
}

function onReady(editor: XenolithEditor): void {
  for (const s of [constSchema, addSchema, mulSchema, outSchema]) editor.registry.register(s)
  editor.loadJSON(seedGraph)
  editor.view.fitView({ padding: 80, maxZoom: 1 })
}
</script>

<template>
  <div class="app" style="position:absolute;inset:0;">
    <XenolithGraph class="xeno" :resize-to-window="false" @ready="onReady">
      <Chapter07Toolbar />
    </XenolithGraph>
  </div>
</template>
