<!-- Svelte — dive helpers called with the editor from onready. -->
<script lang="ts">
  import { xenolith, createXenolithEditorContext } from '@xenolithengine/graph-svelte'
  import { XenolithPanel, XenolithButton } from '@xenolithengine/graph-svelte/components'
  import type { XenolithEditor } from '@xenolithengine/graph-editor'
  import { setupBreadcrumbDive, diveIntoSlug } from '@xenolithengine/demo/breadcrumb-dive'

  const panelEditor = createXenolithEditorContext()
  let editor = $state<XenolithEditor | null>(null)
</script>

<div
  use:xenolith={{ resizeToWindow: false }}
  onready={(e) => { editor = e.detail; panelEditor.set(e.detail); setupBreadcrumbDive(e.detail) }}
  style="position:absolute;inset:0"
></div>

<XenolithPanel position="top-right">
  <div style="display:flex;flex-direction:column;gap:6px;min-width:180px;">
    <XenolithButton style="text-align:left" onclick={() => editor && diveIntoSlug(editor, 'pipeline')}>Dive into Pipeline</XenolithButton>
    <XenolithButton style="text-align:left" onclick={() => editor && diveIntoSlug(editor, 'stage')}>… then into Stage</XenolithButton>
    <XenolithButton style="text-align:left" onclick={() => editor?.diveOut(0)}>Pop to Root</XenolithButton>
    <div style="font-size:11px;color:var(--xeno-muted);">Or double-click any $templateInstance node.</div>
  </div>
</XenolithPanel>
