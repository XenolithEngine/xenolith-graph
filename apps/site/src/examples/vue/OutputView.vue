<script setup lang="ts">
import { computed } from 'vue'
import type { WidgetProps } from '@xenolithengine/graph-vue'

const props = defineProps<WidgetProps>()
const text = computed(() => String(props.value ?? ''))
</script>

<template>
  <div
    :style="{
      width: '100%', height: '100%', boxSizing: 'border-box', overflow: 'auto', whiteSpace: 'pre-wrap',
      font: '11px ui-monospace, monospace', background: 'var(--xeno-bg)', border: '1px solid var(--xeno-border)',
      borderRadius: '6px', padding: '6px', color: text ? 'var(--xeno-text)' : 'var(--xeno-muted)',
    }"
  >{{ text || 'Run to generate…' }}</div>
</template>
