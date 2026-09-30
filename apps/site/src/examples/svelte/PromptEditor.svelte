<script lang="ts">
  import type { WidgetProps } from '@xenolithengine/graph-svelte/components'
  let { value, setValue }: WidgetProps = $props()
</script>

<textarea
  spellcheck="false"
  style="width:100%;height:100%;box-sizing:border-box;font:inherit;font-size:11px;background:var(--xeno-bg);color:var(--xeno-text);border:1px solid var(--xeno-border);border-radius:6px;padding:6px;resize:none;"
  value={String(value ?? '')}
  oninput={(e) => setValue((e.target as HTMLTextAreaElement).value)}
></textarea>
