<!-- Svelte 5 — properties sidebar: auto-open after mount, toggle is a direct editor call. -->
<script lang="ts">
  import { xenolith } from '@xenolithengine/graph-svelte'
  import { XenolithPanel, XenolithButton } from '@xenolithengine/graph-svelte/components'
  import type { XenolithEditor } from '@xenolithengine/graph-editor'
  import { setupPropertiesSidebar, PROPERTIES_SIDEBAR_NODE_ID } from '@xenolithengine/demo/properties-sidebar'

  let editor = $state<XenolithEditor | null>(null)
  let open = $state(true)
</script>

<div
  use:xenolith={{ resizeToWindow: false }}
  on:ready={(e) => { editor = e.detail; setupPropertiesSidebar(e.detail); e.detail.openSidebar(PROPERTIES_SIDEBAR_NODE_ID) }}
  style="position:absolute;inset:0"
></div>

<XenolithPanel position="top-left">
  <XenolithButton active={open} onclick={() => {
    if (!editor) return
    if (open) { editor.closeSidebar(); open = false } else { editor.openSidebar(PROPERTIES_SIDEBAR_NODE_ID); open = true }
  }}>
    {open ? 'Close sidebar' : 'Open sidebar'}
  </XenolithButton>
</XenolithPanel>
