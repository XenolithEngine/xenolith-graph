<script setup lang="ts">
// Theme switcher — child of <XenolithGraph>. Uses `useEditor()` to call `setTheme()` imperatively.
import { ref } from 'vue'
import { useEditor } from '@xenolith/vue'
import { xenTheme, type XenolithTheme } from '@xenolith/render-pixi'
import { liquidGlassTheme } from '@xenolith/theme-liquid-glass'

const themes: { label: string; theme: XenolithTheme }[] = [
  { label: 'Xen',          theme: xenTheme },
  { label: 'Liquid Glass', theme: liquidGlassTheme },
]
const editor = useEditor()
const active = ref(themes[0]!.label)

function pick(t: { label: string; theme: XenolithTheme }): void {
  if (t.label === active.value) return
  active.value = t.label
  editor.value?.setTheme(t.theme)
}
</script>

<template>
  <div data-xeno-panel class="panel">
    <button
      v-for="t in themes"
      :key="t.label"
      class="btn"
      :class="{ on: t.label === active }"
      @click="pick(t)"
    >{{ t.label }}</button>
  </div>
</template>

<style scoped>
.panel {
  position: absolute; top: 20px; right: 20px; pointer-events: auto; z-index: 5;
  display: flex; gap: 6px; padding: 6px; border-radius: 6px;
  background: rgba(0,0,0,0.45);
  font: 12px/1.5 var(--xn-mono, ui-monospace, monospace);
}
.btn {
  font: inherit; padding: 4px 10px; border-radius: 4px; cursor: pointer;
  border: 1px solid #555; background: #222; color: #cfcfcf;
}
.btn.on { border-color: var(--xeno-accent, #fcb400); background: rgba(252,180,0,.18); color: #fff; }
</style>
