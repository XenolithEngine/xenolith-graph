<!-- Svelte 5 — save & restore: autosave rides the store bag's graphJSON (commit-time
     snapshots), download/upload/restore through the shared helpers; the panel is the real
     XenolithPanel portalled into the editor overlay. -->
<script lang="ts">
  import { xenolith, createXenolithStores } from '@xenolithengine/graph-svelte'
  import { XenolithPanel, XenolithButton } from '@xenolithengine/graph-svelte/components'
  import type { XenolithEditor } from '@xenolithengine/graph-editor'
  import {
    initSaveRestore, downloadGraph, uploadGraph, saveToLocal, restoreFromLocal, hasSaved,
  } from '@xenolithengine/demo/save-restore'

  const stores = createXenolithStores()
  const graphJSON = stores.graphJSON // destructure for the $-auto-subscription
  let editor = $state<XenolithEditor | null>(null)
  let savedAt = $state<number | null>(null)
  let fileInput: HTMLInputElement
  let timer: ReturnType<typeof setTimeout> | null = null
  let first = true
  const hasSave = hasSaved()

  // Commit-time autosave: every committed change produces a fresh graphJSON snapshot.
  $effect(() => {
    const json = $graphJSON // tracked — the effect re-runs on every commit
    if (!editor || !json || first) { first = false; return }
    if (timer) clearTimeout(timer)
    const e = editor
    timer = setTimeout(() => { saveToLocal(e); savedAt = Date.now() }, 500)
  })
</script>

<div
  use:xenolith={{ resizeToWindow: false }}
  on:ready={(e) => { editor = e.detail; stores.editor.set(e.detail); initSaveRestore(e.detail) }}
  style="position:absolute;inset:0"
></div>

<XenolithPanel position="top-left">
  <XenolithButton onclick={() => editor && downloadGraph(editor)}>↓ Download .json</XenolithButton>
  <XenolithButton onclick={() => fileInput.click()}>↑ Upload .json</XenolithButton>
  <XenolithButton disabled={savedAt === null && !hasSave} onclick={() => editor && restoreFromLocal(editor)}>↺ Restore last</XenolithButton>
  <span>{savedAt ? '✓ Autosaved to your browser' : 'Edit the graph — it autosaves to localStorage.'}</span>
  <input bind:this={fileInput} type="file" accept="application/json,.json" hidden
    onchange={(ev) => { const f = (ev.currentTarget as HTMLInputElement).files?.[0]; if (f && editor) uploadGraph(editor, f) }} />
</XenolithPanel>
