<script lang="ts">
  import type { WidgetProps } from '@xenolithengine/graph-svelte/components'
  let { value }: WidgetProps = $props()
</script>

<div style="width:100%;height:100%;border-radius:8px;overflow:hidden;background:rgba(0,0,0,0.25);border:1px solid var(--xeno-border);display:flex;align-items:center;justify-content:center;">
  {#if value}
    <img src={String(value)} alt="result" style="width:100%;height:100%;object-fit:contain;" />
  {:else}
    <span style="color:var(--xeno-muted);font-size:12px;">Rendering…</span>
  {/if}
</div>
