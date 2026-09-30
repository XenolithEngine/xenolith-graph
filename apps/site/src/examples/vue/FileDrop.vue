<script setup lang="ts">
import { computed } from 'vue'
import type { WidgetProps } from '@xenolithengine/graph-vue'

const props = defineProps<WidgetProps>()
const src = computed(() => (typeof props.value === 'string' && props.value.startsWith('data:') ? props.value : ''))

function onFile(file?: File): void {
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => props.setValue(reader.result as string)
  reader.readAsDataURL(file)
}
function onPick(event: Event): void {
  onFile((event.target as HTMLInputElement).files?.[0])
}
function onDrop(event: DragEvent): void {
  onFile(event.dataTransfer?.files?.[0])
}
</script>

<template>
  <div
    style="width:100%;height:100%;border-radius:8px;overflow:hidden;background:rgba(0,0,0,0.25);border:1px dashed var(--xeno-border);display:flex;align-items:center;justify-content:center;"
    @dragover.prevent
    @drop.prevent="onDrop"
  >
    <img v-if="src" :src="src" alt="" style="width:100%;height:100%;object-fit:contain;display:block;" />
    <label v-else style="color:var(--xeno-muted);font-size:12px;cursor:pointer;">
      Drop image or <span style="color:var(--xeno-accent);">browse</span>
      <input type="file" accept="image/*" hidden @change="onPick" />
    </label>
  </div>
</template>
