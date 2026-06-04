<script setup lang="ts">
// Toolbar — child of <XenolithGraph>. Autosave rides `history:changed`; downloads/loads use
// `useEditor()` for the imperative `getGraphReadonly()`/`loadJSON()` calls.
import { onBeforeUnmount, ref } from 'vue'
import { useEditor, useEditorEvent } from '@xenolith/vue'

const props = defineProps<{ storageKey: string }>()
const editor = useEditor()
const savedAt = ref<number | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
let timer: ReturnType<typeof setTimeout> | null = null
let first = true

function paint(): string {
  if (savedAt.value === null) return 'Seed graph'
  const age = Math.max(0, Math.round((Date.now() - savedAt.value) / 1000))
  return `Autosaved · ${age}s ago`
}
const status = ref<string>(paint())
const tick = setInterval(() => { status.value = paint() }, 1000)
onBeforeUnmount(() => { clearInterval(tick); if (timer) clearTimeout(timer) })

useEditorEvent('history:changed', () => {
  if (first) { first = false; return }
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    const e = editor.value
    if (!e) return
    try { localStorage.setItem(props.storageKey, JSON.stringify(e.getGraphReadonly())); savedAt.value = Date.now(); status.value = paint() } catch { /* quota */ }
  }, 250)
})

function onDownload(): void {
  const e = editor.value
  if (!e) return
  const blob = new Blob([JSON.stringify(e.getGraphReadonly(), null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'graph.json'; a.click()
  URL.revokeObjectURL(url)
}

async function onFile(ev: Event): Promise<void> {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  const e = editor.value
  if (!file || !e) return
  try {
    e.loadJSON(JSON.parse(await file.text()))
    e.view.fitView({ padding: 80, maxZoom: 1 })
    savedAt.value = null; status.value = paint()
  } catch (err) { status.value = `Load failed: ${(err as Error).message}` }
  input.value = ''
}
</script>

<template>
  <div data-xeno-panel class="panel">
    <div class="row">
      <button class="btn" @click="onDownload">Download .json</button>
      <button class="btn" @click="fileInput?.click()">Load .json</button>
    </div>
    <div class="status">{{ status }}</div>
    <input ref="fileInput" type="file" accept="application/json" hidden @change="onFile" />
  </div>
</template>

<style scoped>
.panel {
  position: absolute; top: 20px; right: 20px; pointer-events: auto; z-index: 5;
  display: flex; flex-direction: column; gap: 6px; padding: 8px 12px; border-radius: 6px;
  background: rgba(0,0,0,0.45); color: #e8e8e8;
  font: 12px/1.5 var(--xn-mono, ui-monospace, monospace);
}
.row { display: flex; gap: 6px; }
.btn { font: inherit; padding: 4px 10px; border-radius: 4px; border: 1px solid #555; background: #222; color: #fff; cursor: pointer; }
.btn:hover { background: #2a2a2a; }
.status { font-size: 10px; color: rgba(255,255,255,0.55); text-transform: uppercase; letter-spacing: .04em; }
</style>
