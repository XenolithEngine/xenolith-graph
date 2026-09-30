<script setup lang="ts">
import { computed } from 'vue'
import type { WidgetProps } from '@xenolithengine/graph-vue'

const props = defineProps<WidgetProps>()
const points = computed(() => {
  const data = Array.isArray(props.value) ? props.value as number[] : []
  return data.map((v, i) => `${(i / Math.max(1, data.length - 1)) * 100},${100 - v * 100}`).join(' ')
})

function shuffle(): void {
  props.setValue(Array.from({ length: 16 }, () => Math.random()))
}
</script>

<template>
  <div style="position:relative;width:100%;height:100%;">
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:100%;display:block;">
      <polyline :points="points" fill="none" stroke="var(--xeno-accent)" stroke-width="2" vector-effect="non-scaling-stroke" />
    </svg>
    <button
      type="button"
      style="position:absolute;right:4px;bottom:4px;font:inherit;font-size:10px;padding:2px 6px;border-radius:6px;border:1px solid var(--xeno-border);background:var(--xeno-elevated);color:var(--xeno-text);cursor:pointer;"
      @mousedown.prevent
      @click="shuffle"
    >Shuffle</button>
  </div>
</template>
