<script setup lang="ts">
import { ref } from 'vue'
import { useEditor } from '@xenolith/vue'
import { PROPERTIES_SIDEBAR_NODE_ID } from '@xenolith/demo/properties-sidebar'

const editor = useEditor()
const open = ref(true)

function toggle(): void {
  const e = editor.value
  if (!e) return
  if (open.value) { e.closeSidebar(); open.value = false }
  else            { e.openSidebar(PROPERTIES_SIDEBAR_NODE_ID); open.value = true }
}
</script>

<template>
  <div data-xeno-panel class="panel">
    <button class="btn" :class="{ on: open }" @click="toggle">
      {{ open ? 'Close sidebar' : 'Open sidebar' }}
    </button>
  </div>
</template>

<style scoped>
.panel {
  position: absolute; top: 12px; left: 12px;
  display: flex; gap: 6px; padding: 6px;
  background: var(--xeno-panel, #1d1d1d);
  border: 1px solid var(--xeno-border, #333);
  border-radius: 8px;
  font: 12px Inter, system-ui, sans-serif;
  z-index: 5;
}
.btn {
  padding: 6px 12px; font: inherit; font-size: 12px; cursor: pointer;
  border-radius: 6px;
  border: 1px solid var(--xeno-border, #333);
  background: transparent;
  color: var(--xeno-text, #cfcfcf);
}
.btn.on {
  border-color: var(--xeno-accent, #FCB400);
  background: var(--xeno-accent, #FCB400);
  color: var(--xeno-canvas, #111);
}
</style>
