<script setup lang="ts">
import { ref } from 'vue'
import {
  XenolithControls, XenolithPanel, XenolithButton, XenolithMiniMap,
  useNodes, useEdges, useViewport,
} from '@xenolithengine/graph-vue'
import type { MinimapPosition } from '@xenolithengine/graph-editor'

const nodes = useNodes()
const edges = useEdges()
const vp = useViewport()

const on = ref(true)
const pos = ref<MinimapPosition>('bottom-right')

const GRID = [
  'top-left', 'top', 'top-right',
  'left', 'center', 'right',
  'bottom-left', 'bottom', 'bottom-right',
] as const

const ARROW: Record<string, string> = {
  'top-left': '↖', top: '↑', 'top-right': '↗', left: '←', right: '→',
  'bottom-left': '↙', bottom: '↓', 'bottom-right': '↘',
}

function pick(cell: (typeof GRID)[number]): void {
  if (cell === 'center') { on.value = !on.value; return }
  pos.value = cell
}
</script>

<template>
  <XenolithControls position="top-right" orientation="horizontal" />

  <XenolithPanel position="top-left">
    <div style="min-width:150px;">
      <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--xeno-muted);">Minimap</p>
      <XenolithButton :active="on" style="width:100%" @click="on = !on">
        {{ on ? 'Visible' : 'Hidden' }}
      </XenolithButton>
      <p style="margin:14px 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--xeno-muted);">Position</p>
      <div style="display:grid;grid-template-columns:repeat(3, 34px);gap:6px;">
        <template v-for="cell in GRID" :key="cell">
          <XenolithButton
            v-if="cell === 'center'"
            style="width:34px;height:30px;padding:0;font-size:14px;color:var(--xeno-muted)"
            @click="pick(cell)"
          >⊙</XenolithButton>
          <XenolithButton
            v-else
            :active="on && pos === cell"
            :disabled="!on"
            :style="{ width: '34px', height: '30px', padding: 0, fontSize: '14px', opacity: on ? 1 : 0.35 }"
            @click="pick(cell)"
          >{{ ARROW[cell] }}</XenolithButton>
        </template>
      </div>
    </div>
  </XenolithPanel>

  <XenolithMiniMap v-if="on" :position="pos" />

  <XenolithPanel position="bottom-left">
    <span style="font-variant-numeric:tabular-nums;">
      <span style="color:var(--xeno-accent)">{{ nodes.length }}</span> nodes ·
      <span style="color:var(--xeno-accent)">{{ edges.length }}</span> edges ·
      <span style="color:var(--xeno-accent)">{{ Math.round(vp.zoom * 100) }}%</span>
    </span>
  </XenolithPanel>
</template>
