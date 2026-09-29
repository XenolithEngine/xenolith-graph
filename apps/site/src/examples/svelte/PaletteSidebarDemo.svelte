<!-- Svelte 5 — palette sidebar: schemas + sidebar config from the shared package; the editor's
     built-in node:drop handler spawns the dragged node at the drop point. -->
<script lang="ts">
  import { xenolith } from '@xenolithengine/graph-svelte'
  import { buildPaletteSidebar } from '@xenolithengine/demo/palette-sidebar'
</script>

<div
  use:xenolith={{ resizeToWindow: false }}
  on:ready={(e) => { buildPaletteSidebar(e.detail); e.detail.view.fitView({ padding: 80, maxZoom: 1 }) }}
  style="position:absolute;inset:0"
></div>
