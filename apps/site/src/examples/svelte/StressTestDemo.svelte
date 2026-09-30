<!-- Svelte — the node count is the store bag. Destructure `nodes` before `$`. -->
<script lang="ts">
  import { xenolith, createXenolithStores, createXenolithEditorContext } from '@xenolithengine/graph-svelte'
  import { XenolithPanel, XenolithButton } from '@xenolithengine/graph-svelte/components'
  import type { XenolithEditor } from '@xenolithengine/graph-editor'
  import { setupStressTest, addStressNodes } from '@xenolithengine/demo/stress-test'

  const stores = createXenolithStores()
  const nodes = stores.nodes
  const panelEditor = createXenolithEditorContext()
  let editor = $state<XenolithEditor | null>(null)

  function add(n: number): void {
    if (editor) addStressNodes(editor, n)
  }
  function reset(): void {
    editor?.clear()
  }
</script>

<div
  use:xenolith={{ resizeToWindow: false, zoomBounds: [0.05, 2] }}
  onready={(e) => { editor = e.detail; panelEditor.set(e.detail); stores.editor.set(e.detail); setupStressTest(e.detail) }}
  style="position:absolute;inset:0"
></div>

<XenolithPanel position="top-left">
  <div style="display:flex;flex-direction:column;gap:6px;width:168px;">
    <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--xeno-muted);">Stress test</p>
    <div style="font-size:22px;font-weight:700;color:var(--xeno-accent);font-variant-numeric:tabular-nums;">
      {$nodes.length}<span style="font-size:12px;color:var(--xeno-muted);font-weight:400;"> nodes</span>
    </div>
    <div style="display:flex;gap:6px;">
      <XenolithButton style="flex:1" onclick={() => add(500)}>+500</XenolithButton>
      <XenolithButton style="flex:1" onclick={() => add(1000)}>+1000</XenolithButton>
    </div>
    <XenolithButton style="width:100%" onclick={() => add(5000)}>+5000</XenolithButton>
    <XenolithButton style="width:100%" onclick={() => reset()}>Reset</XenolithButton>
    <span style="color:var(--xeno-muted);font-size:11px;line-height:1.4;">
      WebGL, render-on-demand. Live stats top-right. The count is the nodes store.
    </span>
  </div>
</XenolithPanel>
