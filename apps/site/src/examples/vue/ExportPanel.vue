<script setup lang="ts">
import { ref } from 'vue'
import { XenolithPanel, XenolithButton, useEditor } from '@xenolithengine/graph-vue'
import { exportGraphImage } from '@xenolithengine/demo/export-image'

const editor = useEditor()
const busy = ref(false)

async function save(format: 'png' | 'jpeg', scale: number): Promise<void> {
  const e = editor.value
  if (!e || busy.value) return
  busy.value = true
  try { await exportGraphImage(e, format, scale) } finally { busy.value = false }
}
</script>

<template>
  <XenolithPanel position="top-left">
    <div style="display:flex;flex-direction:column;gap:6px;width:190px;">
      <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--xeno-muted);">Export image</p>
      <XenolithButton style="width:100%" :disabled="busy" @click="save('png', 1)">↓ PNG · 1×</XenolithButton>
      <XenolithButton style="width:100%" :disabled="busy" @click="save('png', 2)">↓ PNG · 2× (retina)</XenolithButton>
      <XenolithButton style="width:100%" :disabled="busy" @click="save('jpeg', 2)">↓ JPG · 2×</XenolithButton>
      <span style="color:var(--xeno-muted);font-size:11px;line-height:1.45;">
        Exports the entire graph, not just what’s on screen.
      </span>
    </div>
  </XenolithPanel>
</template>
