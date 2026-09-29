// Solid — save & restore: autosave rides the store bag's graphJSON accessor (commit-time
// snapshots) via createEffect; imperative IO through the shared helpers.
import { createEffect, createSignal } from 'solid-js'
import { xenolith, createXenolithStores } from '@xenolithengine/graph-solid'
import type { XenolithEditor } from '@xenolithengine/graph-editor'
import {
  initSaveRestore, downloadGraph, uploadGraph, saveToLocal, restoreFromLocal, hasSaved,
} from '@xenolithengine/demo/save-restore'

export function SaveRestoreDemo() {
  const stores = createXenolithStores()
  const [editor, setEditor] = createSignal<XenolithEditor | null>(null)
  const [savedAt, setSavedAt] = createSignal<number | null>(null)
  const [hasSave] = createSignal(hasSaved())
  let timer: ReturnType<typeof setTimeout> | null = null
  let first = true
  let fileInput: HTMLInputElement | undefined

  // Commit-time autosave: every committed change produces a fresh graphJSON snapshot.
  createEffect(() => {
    const json = stores.graphJSON() // tracked signal read
    const e = editor()
    if (!e || !json || first) { first = false; return }
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { saveToLocal(e); setSavedAt(Date.now()) }, 500)
  })

  const btn = 'width:100%;padding:6px 10px;font-size:12px;cursor:pointer;border:1px solid var(--xeno-border);border-radius:6px;background:transparent;color:var(--xeno-text)'

  return (
    <div
      use:xenolith={{ resizeToWindow: false }}
      on:ready={(e) => { setEditor(e.detail); stores.setEditor(e.detail); initSaveRestore(e.detail) }}
      style="position:absolute;inset:0"
    >
      <div style="position:absolute;top:12px;left:12px;display:flex;flex-direction:column;gap:6px;width:180px;padding:10px;background:var(--xeno-panel);border:1px solid var(--xeno-border);border-radius:8px;font:12px Inter,system-ui,sans-serif;color:var(--xeno-text);z-index:5">
        <button style={btn} onClick={() => { const e = editor(); if (e) downloadGraph(e) }}>↓ Download .json</button>
        <button style={btn} onClick={() => fileInput?.click()}>↑ Upload .json</button>
        <button style={btn} disabled={savedAt() === null && !hasSave()} onClick={() => { const e = editor(); if (e) restoreFromLocal(e) }}>↺ Restore last</button>
        <span style="color:#9a9a9a;font-size:11px">{savedAt() ? '✓ Autosaved to your browser' : 'Edit the graph — it autosaves.'}</span>
        <input ref={fileInput} type="file" accept="application/json,.json" hidden
          onChange={(ev) => { const f = ev.currentTarget.files?.[0]; const e = editor(); if (f && e) uploadGraph(e, f) }} />
      </div>
    </div>
  )
}
