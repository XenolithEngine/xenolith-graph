<!-- Svelte — ELK keeps the macro hierarchy; dagre flattens it. -->
<script lang="ts">
  import { xenolith, createXenolithEditorContext } from '@xenolithengine/graph-svelte'
  import { XenolithPanel, XenolithButton } from '@xenolithengine/graph-svelte/components'
  import type { XenolithEditor } from '@xenolithengine/graph-editor'
  import { setupNestedLayout, runNestedLayout, type LayoutEngineId } from '@xenolithengine/demo/nested-layout'

  const panelEditor = createXenolithEditorContext()
  let editor = $state<XenolithEditor | null>(null)
  let engine = $state<LayoutEngineId>('elk')
  let busy = $state(false)

  async function arrange(next: LayoutEngineId = engine): Promise<void> {
    if (!editor || busy) return
    busy = true
    try { await runNestedLayout(editor, next) } finally { busy = false }
  }
  async function flip(next: LayoutEngineId): Promise<void> {
    engine = next
    await arrange(next)
  }
</script>

<div
  use:xenolith={{ resizeToWindow: false }}
  onready={(e) => { editor = e.detail; panelEditor.set(e.detail); setupNestedLayout(e.detail) }}
  style="position:absolute;inset:0"
></div>

<XenolithPanel position="top-left">
  <div style="display:flex;gap:6px;">
    <XenolithButton active disabled={busy} onclick={() => arrange()}>{busy ? 'Arranging…' : 'Auto-arrange'}</XenolithButton>
    <XenolithButton active={engine === 'elk'} disabled={busy} onclick={() => flip('elk')}>ELK</XenolithButton>
    <XenolithButton active={engine === 'dagre'} disabled={busy} onclick={() => flip('dagre')}>dagre</XenolithButton>
  </div>
</XenolithPanel>
