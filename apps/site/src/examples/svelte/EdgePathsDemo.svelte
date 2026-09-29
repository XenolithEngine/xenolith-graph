<!-- Svelte — one click sets every edge to that path style. -->
<script lang="ts">
  import { xenolith, createXenolithEditorContext } from '@xenolithengine/graph-svelte'
  import { XenolithPanel, XenolithButton } from '@xenolithengine/graph-svelte/components'
  import type { XenolithEditor } from '@xenolithengine/graph-editor'
  import type { EdgePathStyle } from '@xenolithengine/graph-render-pixi'
  import { setupEdgePaths, setAllEdgePaths, EDGE_PATH_STYLES } from '@xenolithengine/demo/edge-paths'

  const panelEditor = createXenolithEditorContext()
  let editor = $state<XenolithEditor | null>(null)
  let active = $state<EdgePathStyle | 'each'>('each')

  function flip(style: EdgePathStyle): void {
    if (!editor) return
    active = style
    setAllEdgePaths(editor, style)
  }
</script>

<div
  use:xenolith={{ resizeToWindow: false }}
  onready={(e) => { editor = e.detail; panelEditor.set(e.detail); setupEdgePaths(e.detail) }}
  style="position:absolute;inset:0"
></div>

<XenolithPanel position="top-left">
  <div style="display:flex;flex-direction:column;gap:6px;min-width:200px;">
    <div style="font-size:11px;color:var(--xeno-muted);text-transform:uppercase;letter-spacing:.06em;">Apply to all</div>
    {#each EDGE_PATH_STYLES as style (style)}
      <XenolithButton style="text-align:left" active={active === style} onclick={() => flip(style)}>{style}</XenolithButton>
    {/each}
  </div>
</XenolithPanel>
