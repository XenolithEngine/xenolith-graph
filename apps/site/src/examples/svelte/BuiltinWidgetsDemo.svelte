<!-- Svelte — every built-in widget on one node. The node is data; this file only mounts it. -->
<script lang="ts">
  import { xenolith } from '@xenolithengine/graph-svelte'
  import { buildBuiltinWidgets } from '@xenolithengine/demo/builtin-widgets'
</script>

<div
  use:xenolith={{ resizeToWindow: false }}
  on:ready={(e) => buildBuiltinWidgets(e.detail)}
  style="position:absolute;inset:0"
></div>
