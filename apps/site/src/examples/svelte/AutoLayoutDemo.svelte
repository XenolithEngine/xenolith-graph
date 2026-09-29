<!-- Svelte — one arrange call is one undo step. Direction is component state. -->
<script lang="ts">
  import { xenolith, createXenolithEditorContext } from '@xenolithengine/graph-svelte'
  import { XenolithPanel, XenolithButton } from '@xenolithengine/graph-svelte/components'
  import type { XenolithEditor } from '@xenolithengine/graph-editor'
  import { setupAutoLayout, runAutoLayout } from '@xenolithengine/demo/auto-layout'

  type Direction = 'LR' | 'TB'

  const panelEditor = createXenolithEditorContext()
  let editor = $state<XenolithEditor | null>(null)
  let dir = $state<Direction>('LR')
  let busy = $state(false)

  async function arrange(next: Direction = dir): Promise<void> {
    if (!editor || busy) return
    busy = true
    try { await runAutoLayout(editor, { direction: next }) } finally { busy = false }
  }
  async function flip(next: Direction): Promise<void> {
    dir = next
    await arrange(next)
  }
</script>

<div
  use:xenolith={{ resizeToWindow: false }}
  onready={(e) => { editor = e.detail; panelEditor.set(e.detail); setupAutoLayout(e.detail) }}
  style="position:absolute;inset:0"
></div>

<XenolithPanel position="top-left">
  <div style="display:flex;gap:6px;">
    <XenolithButton active disabled={busy} onclick={() => arrange()}>{busy ? 'Arranging…' : 'Auto-arrange'}</XenolithButton>
    <XenolithButton active={dir === 'LR'} disabled={busy} onclick={() => flip('LR')}>LR</XenolithButton>
    <XenolithButton active={dir === 'TB'} disabled={busy} onclick={() => flip('TB')}>TB</XenolithButton>
  </div>
</XenolithPanel>
