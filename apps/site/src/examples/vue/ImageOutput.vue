<script setup lang="ts">
import type { WidgetProps } from '@xenolithengine/graph-vue'

defineProps<WidgetProps>()
</script>

<template>
  <div style="width:100%;height:100%;border-radius:8px;overflow:hidden;background:rgba(0,0,0,0.25);border:1px solid var(--xeno-border);display:flex;align-items:center;justify-content:center;">
    <img v-if="value" :src="String(value)" alt="result" style="width:100%;height:100%;object-fit:contain;" />
    <span v-else style="color:var(--xeno-muted);font-size:12px;">Rendering…</span>
  </div>
</template>
