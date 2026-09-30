<script setup lang="ts">
import { XenolithPanel } from '@xenolithengine/graph-vue'
import type { Attempt } from '@xenolithengine/demo/connection-validation'

defineProps<{ log: Attempt[] }>()
</script>

<template>
  <XenolithPanel position="top-right">
    <div style="display:flex;flex-direction:column;gap:8px;width:230px;">
      <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--xeno-muted);">Connection rules</p>
      <span style="color:var(--xeno-muted);font-size:11px;line-height:1.5;">
        Pins are typed. Drag <b style="color:var(--xeno-text);">Text</b> → a float input — refused (snaps back).
        Drag <b style="color:var(--xeno-text);">C</b> → <b style="color:var(--xeno-text);">A</b> — blocked (cycle).
      </span>
      <div style="display:flex;flex-direction:column;gap:3px;max-height:168px;overflow:hidden;">
        <span v-if="log.length === 0" style="color:var(--xeno-muted);font-size:11px;">No attempts yet.</span>
        <span
          v-for="(attempt, i) in log"
          :key="i"
          style="font-size:11px;font-family:var(--xeno-mono, monospace);"
          :style="{ color: attempt.ok ? '#39d98a' : '#ff5b6e' }"
        >{{ attempt.ok ? '✓' : '✗' }} {{ attempt.text }}</span>
      </div>
    </div>
  </XenolithPanel>
</template>
