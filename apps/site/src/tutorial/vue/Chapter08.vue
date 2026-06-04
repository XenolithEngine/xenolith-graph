<script setup lang="ts">
// CHAPTER 8 — Make it yours (Vue).
//
// Theme switcher (Xen / Liquid Glass) as a child component, custom level widget registered in
// `@ready`, minimap toggled via the standard `minimap` prop on <XenolithGraph>.
import { XenolithGraph } from '@xenolithengine/vue'
import type { NodeSchema, XenolithEditor, CanvasWidgetController } from '@xenolithengine/editor'
import { xenTheme } from '@xenolithengine/render-pixi'
import Chapter08ThemeSwitcher from './Chapter08ThemeSwitcher.vue'

const levelWidget: CanvasWidgetController = {
  draw(ctx, { value, width, height, accent, muted }) {
    const v = typeof value === 'number' ? value : 0
    ctx.fillStyle = muted; ctx.font = '11px Inter'; ctx.textBaseline = 'top'
    ctx.fillText(`${Math.round(v * 100)}%`, 0, 0)
    const barY = height - 10
    ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(0, barY, width, 8)
    ctx.fillStyle = accent;                    ctx.fillRect(0, barY, width * v, 8)
  },
  onPointer(phase, x, _y, { width }) {
    if (phase === 'up') return undefined
    return Math.max(0, Math.min(1, x / width))
  },
}

const greeterSchema: NodeSchema = {
  type: 'Greeter', title: 'Greeter', category: 'data',
  pins:    [{ kind: 'data', direction: 'out', type: 'string', label: 'Out', multiple: true }],
  widgets: [{ id: 'msg', type: 'text', key: 'msg', label: 'Message', placeholder: 'Hi', freeFloating: true }],
}
const mixerSchema: NodeSchema = {
  type: 'Mixer', title: 'Mixer', category: 'transform',
  pins: [
    { kind: 'data', direction: 'in',  type: 'string', label: 'In',  multiple: false },
    { kind: 'data', direction: 'out', type: 'string', label: 'Out', multiple: true  },
  ],
  widgets: [{ id: 'level', type: 'custom', key: 'level', renderer: 'level', label: 'Level', height: 56, freeFloating: true }],
}

const graph = {
  version: 'xenolith.v1' as const,
  nodes: [
    { id: 'greeter', type: 'Greeter', position: { x: -240, y: 0 }, state: { msg: 'Hello, world' } },
    { id: 'mixer',   type: 'Mixer',   position: { x:  120, y: 0 }, state: { level: 0.6 } },
  ],
  edges: [
    { id: 'e1', from: { node: 'greeter', pin: 'greeter:Out' }, to: { node: 'mixer', pin: 'mixer:In' } },
  ],
}

function onReady(editor: XenolithEditor): void {
  editor.registerWidget('level', levelWidget)
  editor.registry.register(greeterSchema)
  editor.registry.register(mixerSchema)
  editor.loadJSON(graph)
  editor.view.fitView({ padding: 80, maxZoom: 1 })
}
</script>

<template>
  <div class="app" style="position:absolute;inset:0;">
    <XenolithGraph
      class="xeno"
      :resize-to-window="false"
      :theme="xenTheme"
      :minimap="true"
      @ready="onReady"
    >
      <Chapter08ThemeSwitcher />
    </XenolithGraph>
  </div>
</template>
