<script setup lang="ts">
// Autosave on every edit: subscribe to `graph:loaded` + `history:changed` (post-edit signal). The
// shared helpers do the actual IO; we only debounce + flash a status string.
import { ref } from 'vue'
import { useEditor, useEditorEvent } from '@xenolithengine/graph-vue'
import {
  downloadGraph, uploadGraph, saveToLocal, restoreFromLocal, hasSaved,
} from '@xenolithengine/demo/save-restore'

const editor = useEditor()
const savedAt = ref<number | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
let timer: ReturnType<typeof setTimeout> | null = null
let first = true

function scheduleAutosave(): void {
  if (first) { first = false; return }
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    const e = editor.value
    if (!e) return
    saveToLocal(e)
    savedAt.value = Date.now()
  }, 500)
}
useEditorEvent('history:changed', scheduleAutosave)

function onDownload(): void { const e = editor.value; if (e) downloadGraph(e) }
function onUpload(ev: Event): void {
  const f = (ev.target as HTMLInputElement).files?.[0]
  const e = editor.value
  if (f && e) uploadGraph(e, f)
}
function onRestore(): void { const e = editor.value; if (e) restoreFromLocal(e) }
</script>

<template>
  <div data-xeno-panel class="panel">
    <p class="label">Save / restore</p>
    <button class="btn" @click="onDownload">↓ Download .json</button>
    <button class="btn" @click="fileInput?.click()">↑ Upload .json</button>
    <button class="btn" :disabled="savedAt === null && !hasSaved()" @click="onRestore">↺ Restore last</button>
    <span class="status">{{ savedAt ? '✓ Autosaved to your browser' : 'Edit the graph — it autosaves to localStorage.' }}</span>
    <input ref="fileInput" type="file" accept="application/json,.json" hidden @change="onUpload" />
  </div>
</template>

<style scoped>
.panel {
  position: absolute; top: 12px; left: 12px;
  display: flex; flex-direction: column; gap: 6px; width: 180px;
  padding: 10px;
  background: var(--xeno-panel, #1d1d1d);
  border: 1px solid var(--xeno-border, #333);
  border-radius: 8px;
  font: 12px Inter, system-ui, sans-serif;
  color: var(--xeno-text, #cfcfcf);
  z-index: 5;
}
.label { margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: var(--xeno-muted, #9a9a9a); }
.btn { width: 100%; padding: 6px 10px; font: inherit; font-size: 12px; cursor: pointer;
  border: 1px solid var(--xeno-border, #333); border-radius: 6px;
  background: transparent; color: var(--xeno-text, #cfcfcf); }
.btn:hover:not(:disabled) { background: #2a2a2a; }
.btn:disabled { opacity: .5; cursor: default; }
.status { color: var(--xeno-muted, #9a9a9a); font-size: 11px; line-height: 1.4; }
</style>
