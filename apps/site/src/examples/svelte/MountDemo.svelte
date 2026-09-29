<!-- Svelte 5 — the honest minimum: the use:xenolith action mounts the editor, on:ready hands
     you the live editor for one-shot seed work (register, insert, frame). -->
<script lang="ts">
  import { xenolith } from '@xenolithengine/graph-svelte'
  import { buildMount } from '@xenolithengine/demo/mount'
</script>

<div
  use:xenolith={{ resizeToWindow: false }}
  on:ready={(e) => buildMount(e.detail)}
  style="position:absolute;inset:0"
></div>
