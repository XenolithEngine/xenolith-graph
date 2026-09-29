<script setup lang="ts">
// Vue — ELK keeps the macro hierarchy; dagre flattens it. runNestedLayout picks the engine.
import { ref } from 'vue'
import { XenolithGraph, XenolithPanel, XenolithButton } from '@xenolithengine/graph-vue'
import type { XenolithEditor } from '@xenolithengine/graph-editor'
import { setupNestedLayout, runNestedLayout, type LayoutEngineId } from '@xenolithengine/demo/nested-layout'

const editor = ref<XenolithEditor | null>(null)
const engine = ref<LayoutEngineId>('elk')
const busy = ref(false)

function onReady(e: XenolithEditor): void {
  editor.value = e
  setupNestedLayout(e)
}

async function arrange(next: LayoutEngineId = engine.value): Promise<void> {
  const e = editor.value
  if (!e || busy.value) return
  busy.value = true
  try { await runNestedLayout(e, next) } finally { busy.value = false }
}

async function flip(next: LayoutEngineId): Promise<void> {
  engine.value = next
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
          <XenolithButton :active="engine === 'elk'" :disabled="busy" @click="flip('elk')">ELK</XenolithButton>
          <XenolithButton :active="engine === 'dagre'" :disabled="busy" @click="flip('dagre')">dagre</XenolithButton>
        </div>
      </XenolithPanel>
    </XenolithGraph>
  </div>
</template>
