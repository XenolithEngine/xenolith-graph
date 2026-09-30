<script lang="ts">
  import type { WidgetProps } from '@xenolithengine/graph-svelte/components'
  let { value, setValue }: WidgetProps = $props()

  function onFile(file?: File): void {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setValue(String(reader.result))
    reader.readAsDataURL(file)
  }
</script>

<div
  style="position:relative;width:100%;height:100%;border-radius:8px;overflow:hidden;background:rgba(0,0,0,0.25);border:1px solid var(--xeno-border);"
  ondragover={(e) => e.preventDefault()}
  ondrop={(e) => { e.preventDefault(); onFile(e.dataTransfer?.files?.[0]) }}
>
  {#if value}
    <img src={String(value)} alt="source" style="width:100%;height:100%;object-fit:contain;display:block;" />
  {:else}
    <div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--xeno-muted);font-size:12px;">Drop an image</div>
  {/if}
  <label style="position:absolute;bottom:6px;right:6px;font-size:10px;padding:3px 8px;border-radius:6px;background:var(--xeno-elevated);color:var(--xeno-text);cursor:pointer;border:1px solid var(--xeno-border);">
    Replace
    <input type="file" accept="image/*" hidden onchange={(e) => onFile((e.target as HTMLInputElement).files?.[0])} />
  </label>
</div>
