<!-- Svelte — per-node canvas drawing. No panel: setupPreviewNodes registers the widgets and the poller. -->
<script lang="ts">
  import { xenolith } from '@xenolithengine/graph-svelte'
  import { setupPreviewNodes } from '@xenolithengine/demo/preview-nodes'
</script>

<div
  use:xenolith={{ resizeToWindow: false }}
  on:ready={(e) => setupPreviewNodes(e.detail)}
  style="position:absolute;inset:0"
></div>
