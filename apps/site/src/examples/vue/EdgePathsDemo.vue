<script setup lang="ts">
// Vue — one click sets every edge to that path style. 'each' is the layout setupEdgePaths starts with.
import { ref } from 'vue'
import { XenolithGraph, XenolithPanel, XenolithButton } from '@xenolithengine/graph-vue'
import type { XenolithEditor } from '@xenolithengine/graph-editor'
import type { EdgePathStyle } from '@xenolithengine/graph-render-pixi'
import { setupEdgePaths, setAllEdgePaths, EDGE_PATH_STYLES } from '@xenolithengine/demo/edge-paths'

const editor = ref<XenolithEditor | null>(null)
const active = ref<EdgePathStyle | 'each'>('each')
const styles = EDGE_PATH_STYLES

function onReady(e: XenolithEditor): void {
  editor.value = e
  setupEdgePaths(e)
}
function flip(style: EdgePathStyle): void {
  const e = editor.value
  if (!e) return
  active.value = style
  setAllEdgePaths(e, style)
}
</script>

<template>
  <div class="app" style="position:absolute;inset:0;">
    <XenolithGraph class="xeno" :resize-to-window="false" @ready="onReady">
      <XenolithPanel position="top-left">
        <div style="display:flex;flex-direction:column;gap:6px;min-width:200px;">
          <div style="font-size:11px;color:var(--xeno-muted);text-transform:uppercase;letter-spacing:.06em;">Apply to all</div>
          <XenolithButton
            v-for="style in styles"
            :key="style"
            style="text-align:left"
            :active="active === style"
            @click="flip(style)"
          >{{ style }}</XenolithButton>
        </div>
      </XenolithPanel>
    </XenolithGraph>
  </div>
</template>
