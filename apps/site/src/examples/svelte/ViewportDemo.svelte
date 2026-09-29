<!-- Svelte — nodes/edges/viewport are stores. Destructure before `$`. The minimap
     component shows itself while it is mounted and hides on destroy. -->
<script lang="ts">
  import { xenolith, createXenolithStores, createXenolithEditorContext } from '@xenolithengine/graph-svelte'
  import { XenolithPanel, XenolithButton, XenolithControls, XenolithMiniMap } from '@xenolithengine/graph-svelte/components'
  import type { MinimapPosition } from '@xenolithengine/graph-editor'
  import { loadDemo } from '@xenolithengine/demo/scene'

  const stores = createXenolithStores()
  const panelEditor = createXenolithEditorContext()
  const nodes = stores.nodes
  const edges = stores.edges
  const viewport = stores.viewport

  let on = $state(true)
  let pos = $state<MinimapPosition>('bottom-right')

  const GRID = [
    'top-left', 'top', 'top-right',
    'left', 'center', 'right',
    'bottom-left', 'bottom', 'bottom-right',
  ] as const

  const ARROW: Record<string, string> = {
    'top-left': '↖', top: '↑', 'top-right': '↗', left: '←', right: '→',
    'bottom-left': '↙', bottom: '↓', 'bottom-right': '↘',
  }

  function pick(cell: string): void {
    if (cell === 'center') { on = !on; return }
    pos = cell as MinimapPosition
  }
</script>

<div
  use:xenolith={{ resizeToWindow: false }}
  onready={(e) => { panelEditor.set(e.detail); stores.editor.set(e.detail); loadDemo(e.detail) }}
  style="position:absolute;inset:0"
></div>

<XenolithControls position="top-right" orientation="horizontal" />

<XenolithPanel position="top-left">
  <div style="min-width:150px;">
    <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--xeno-muted);">Minimap</p>
    <XenolithButton active={on} style="width:100%" onclick={() => { on = !on }}>
      {on ? 'Visible' : 'Hidden'}
    </XenolithButton>
    <p style="margin:14px 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--xeno-muted);">Position</p>
    <div style="display:grid;grid-template-columns:repeat(3, 34px);gap:6px;">
      {#each GRID as cell (cell)}
        {#if cell === 'center'}
          <XenolithButton style="width:34px;height:30px;padding:0;font-size:14px;color:var(--xeno-muted)" onclick={() => pick(cell)}>⊙</XenolithButton>
        {:else}
          <XenolithButton
            active={on && pos === cell}
            disabled={!on}
            style={`width:34px;height:30px;padding:0;font-size:14px;opacity:${on ? 1 : 0.35}`}
            onclick={() => pick(cell)}
          >{ARROW[cell]}</XenolithButton>
        {/if}
      {/each}
    </div>
  </div>
</XenolithPanel>

{#if on}
  <XenolithMiniMap position={pos} />
{/if}

<XenolithPanel position="bottom-left">
  <span style="font-variant-numeric:tabular-nums;">
    <span style="color:var(--xeno-accent)">{$nodes.length}</span> nodes ·
    <span style="color:var(--xeno-accent)">{$edges.length}</span> edges ·
    <span style="color:var(--xeno-accent)">{Math.round($viewport.zoom * 100)}%</span>
  </span>
</XenolithPanel>
