<script lang="ts">
  import type { WidgetProps } from '@xenolithengine/graph-svelte/components'
  let { value, setValue }: WidgetProps = $props()
  const src = $derived(typeof value === 'string' && value.startsWith('data:') ? value : '')

  function onFile(file?: File): void {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setValue(reader.result as string)
    reader.readAsDataURL(file)
  }
</script>

<div
  style="width:100%;height:100%;border-radius:8px;overflow:hidden;background:rgba(0,0,0,0.25);border:1px dashed var(--xeno-border);display:flex;align-items:center;justify-content:center;"
  ondragover={(e) => e.preventDefault()}
  ondrop={(e) => { e.preventDefault(); onFile(e.dataTransfer?.files?.[0]) }}
>
  {#if src}
    <img src={src} alt="" style="width:100%;height:100%;object-fit:contain;display:block;" />
  {:else}
    <label style="color:var(--xeno-muted);font-size:12px;cursor:pointer;">
      Drop image or <span style="color:var(--xeno-accent);">browse</span>
      <input type="file" accept="image/*" hidden onchange={(e) => onFile((e.target as HTMLInputElement).files?.[0])} />
    </label>
  {/if}
</div>
