<script setup lang="ts">
import { ref } from 'vue'
import { XenolithGraph, XenolithControls, XenolithPanel, XenolithButton, vueWidget } from '@xenolithengine/graph-vue'
import { xenTheme } from '@xenolithengine/graph-render-pixi'
import { liquidGlassTheme } from '@xenolithengine/graph-theme-liquid-glass'
import type { XenolithEditor } from '@xenolithengine/graph-editor'
import AsyncSelect from './AsyncSelect.vue'
import FileDrop from './FileDrop.vue'
import CodeEditor from './CodeEditor.vue'
import Sparkline from './Sparkline.vue'

const theme = ref<'xen' | 'lg'>('xen')
const seedSpark = Array.from({ length: 16 }, (_, i) => 0.5 + 0.4 * Math.sin(i / 2))
const NODES = [
  { type: 'Pick', title: 'Pick fruit', renderer: 'async-select', key: 'fruit', val: 'Mango' as unknown, h: 34, x: 0, y: 0 },
  { type: 'Image', title: 'Image', renderer: 'file-drop', key: 'img', val: '', h: 120, x: 360, y: 0 },
  { type: 'Prompt', title: 'Prompt', renderer: 'code', key: 'json', val: '{\n  "seed": 42\n}', h: 140, x: 0, y: 250 },
  { type: 'Signal', title: 'Signal', renderer: 'sparkline', key: 'data', val: seedSpark, h: 96, x: 360, y: 320 },
]

function setup(editor: XenolithEditor): void {
  editor.registerWidget('async-select', vueWidget(AsyncSelect))
  editor.registerWidget('file-drop', vueWidget(FileDrop))
  editor.registerWidget('code', vueWidget(CodeEditor))
  editor.registerWidget('sparkline', vueWidget(Sparkline))
  for (const d of NODES) {
    editor.registry.register({
      type: d.type,
      title: d.title,
      pins: [{ kind: 'data', direction: 'out', type: 'any', label: 'Out' }],
      widgets: [{ id: d.key, label: d.title, type: 'custom', renderer: d.renderer, key: d.key, height: d.h }],
    })
    const node = editor.registry.instantiate(d.type, { x: d.x, y: d.y })
    node.state[d.key] = d.val
    editor.addNode(node)
  }
  editor.view.fitView({ padding: 56, maxZoom: 1 })
}
</script>

<template>
  <div class="app" style="position:absolute;inset:0;">
    <XenolithGraph
      class="xeno"
      :resize-to-window="false"
      :theme="theme === 'xen' ? xenTheme : liquidGlassTheme"
      @ready="setup"
    >
      <XenolithControls position="top-right" orientation="horizontal" />
      <XenolithPanel position="top-left">
        <div style="display:flex;flex-direction:column;gap:8px;max-width:240px;">
          <div style="display:flex;gap:8px;">
            <XenolithButton :active="theme === 'xen'" @click="theme = 'xen'">Xen</XenolithButton>
            <XenolithButton :active="theme === 'lg'" @click="theme = 'lg'">Liquid Glass</XenolithButton>
          </div>
          <span style="color:var(--xeno-muted);font-size:11px;line-height:1.4;">
            Widgets are Vue components styled with <code>var(--xeno-*)</code> — they restyle on theme change.
          </span>
        </div>
      </XenolithPanel>
    </XenolithGraph>
  </div>
</template>
