<!-- Svelte 5 — typed event callbacks + the store bag: selection via the bag's selection store,
     the live log through the action's on:* CustomEvents (payloads in e.detail). -->
<script lang="ts">
  import { xenolith, createXenolithStores } from '@xenolithengine/graph-svelte'
  import { XenolithPanel } from '@xenolithengine/graph-svelte/components'
  import { loadDemo } from '@xenolithengine/demo/scene'

  const stores = createXenolithStores()
  const selection = stores.selection // destructure for the $-auto-subscription in the template
  let log = $state<string[]>([])

  const push = (line: string): void => { log = [line, ...log].slice(0, 40) }
</script>

<div
  use:xenolith={{ resizeToWindow: false }}
  on:ready={(e) => { stores.editor.set(e.detail); loadDemo(e.detail) }}
  on:node:click={(e) => push(`node:click ${String(e.detail.nodeId)}`)}
  on:selection:changed={(e) => push(`selection:changed (${e.detail.nodeIds.length})`)}
  on:edge:connected={(e) => push(`edge:connected ${String(e.detail.edge.id)}`)}
  on:widget:changed={(e) => push(`widget:changed ${e.detail.widgetId} = ${JSON.stringify(e.detail.value)}`)}
  on:history:changed={(e) => push(`history undo=${e.detail.canUndo} redo=${e.detail.canRedo}`)}
  style="position:absolute;inset:0"
></div>

<XenolithPanel position="top-right">
  <h3>Selection</h3>
  {#each $selection as id (id)}<div>{id}</div>{/each}
  <h3>Event log</h3>
  {#each log as line}<div>{line}</div>{/each}
</XenolithPanel>
