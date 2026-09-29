<script setup lang="ts">
// Vue — one arrange call is one undo step. Direction is panel state passed to runAutoLayout.
import { ref } from 'vue'
import { XenolithGraph, XenolithPanel, XenolithButton } from '@xenolithengine/graph-vue'
import type { XenolithEditor } from '@xenolithengine/graph-editor'
import { setupAutoLayout, runAutoLayout } from '@xenolithengine/demo/auto-layout'

type Direction = 'LR' | 'TB'

const editor = ref<XenolithEditor | null>(null)
const dir = ref<Direction>('LR')
const busy = ref(false)

function onReady(e: XenolithEditor): void {
  editor.value = e
  setupAutoLayout(e)
}

async function arrange(next: Direction = dir.value): Promise<void> {
  const e = editor.value
  if (!e || busy.value) return
  busy.value = true
  try { await runAutoLayout(e, { direction: next }) } finally { busy.value = false }
}

async function flip(next: Direction): Promise<void> {
  dir.value = next
  await arrange(next)
}
</script>

<template>
  <div class="app" style="position:absolute;inset:0;">
    <XenolithGraph class="xeno" :resize-to-window="false" @ready="onReady">
      <XenolithPanel position="top-left">
        <div style="display:flex;gap:6px;">
          <XenolithButton :active="true" :disabled="busy" @click="arrange()">
            {{ busy ? 'Arranging…' : 'Auto-arrange' }}
          </XenolithButton>
          <XenolithButton :active="dir === 'LR'" :disabled="busy" @click="flip('LR')">LR</XenolithButton>
          <XenolithButton :active="dir === 'TB'" :disabled="busy" @click="flip('TB')">TB</XenolithButton>
        </div>
      </XenolithPanel>
    </XenolithGraph>
  </div>
</template>
