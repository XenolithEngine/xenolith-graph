<script lang="ts">
  import type { WidgetProps } from '@xenolithengine/graph-svelte/components'
  let { value }: WidgetProps = $props()
  const text = $derived(String(value ?? ''))
</script>

<div style="width:100%;height:100%;box-sizing:border-box;overflow:auto;white-space:pre-wrap;font:11px ui-monospace,monospace;background:var(--xeno-bg);border:1px solid var(--xeno-border);border-radius:6px;padding:6px;color:{text ? 'var(--xeno-text)' : 'var(--xeno-muted)'};">
  {text || 'Run to generate…'}
</div>
