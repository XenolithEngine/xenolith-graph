<script setup lang="ts">
import { ref, watch } from 'vue'
import { XenolithPanel, XenolithButton, useEditor, useEdges } from '@xenolithengine/graph-vue'

const editor = useEditor()
const edges = useEdges()
const animated = ref(true)

// Same contract as the React demo: the flag is pushed onto every current edge.
// setEdgeOptions does not emit, so this watch does not re-enter itself.
watch([edges, animated], () => {
  const live = editor.value
  if (!live) return
  const on = animated.value
  for (const edge of edges.value) live.setEdgeOptions(edge.id, { animated: on })
})
</script>

<template>
  <XenolithPanel position="top-left">
    <div style="display:flex;flex-direction:column;gap:6px;width:200px;">
      <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--xeno-muted);">Diagram edges</p>
      <XenolithButton :active="animated" style="width:100%" @click="animated = !animated">
        {{ animated ? '⏸ Stop flow' : '▶ Animate flow' }}
      </XenolithButton>
      <span style="color:var(--xeno-muted);font-size:11px;line-height:1.45;">
        Directional edges with arrowheads + labels. The main path animates a flowing dash.
        The toggle writes useEdges() through setEdgeOptions.
      </span>
    </div>
  </XenolithPanel>
</template>
