<script setup lang="ts">
import type { WidgetProps } from '@xenolithengine/graph-vue'

const props = defineProps<WidgetProps>()

function onFile(file?: File): void {
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => props.setValue(String(reader.result))
  reader.readAsDataURL(file)
}
function onDrop(event: DragEvent): void {
  onFile(event.dataTransfer?.files?.[0])
}
function onPick(event: Event): void {
  onFile((event.target as HTMLInputElement).files?.[0])
}
</script>

<template>
  <div
    style="position:relative;width:100%;height:100%;border-radius:8px;overflow:hidden;background:rgba(0,0,0,0.25);border:1px solid var(--xeno-border);"
    @dragover.prevent
    @drop.prevent="onDrop"
  >
    <img v-if="value" :src="String(value)" alt="source" style="width:100%;height:100%;object-fit:contain;display:block;" />
    <div v-else style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--xeno-muted);font-size:12px;">Drop an image</div>
    <label style="position:absolute;bottom:6px;right:6px;font-size:10px;padding:3px 8px;border-radius:6px;background:var(--xeno-elevated);color:var(--xeno-text);cursor:pointer;border:1px solid var(--xeno-border);">
      Replace
      <input type="file" accept="image/*" hidden @change="onPick" />
    </label>
  </div>
</template>
