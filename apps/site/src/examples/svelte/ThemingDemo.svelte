<!-- Svelte — the action's update() forwards a new theme object, so the bound prop restyles live. -->
<script lang="ts">
  import { xenolith, createXenolithEditorContext } from '@xenolithengine/graph-svelte'
  import { XenolithPanel, XenolithButton, XenolithControls } from '@xenolithengine/graph-svelte/components'
  import { xenTheme } from '@xenolithengine/graph-render-pixi'
  import { liquidGlassTheme } from '@xenolithengine/graph-theme-liquid-glass'
  import { loadDemo } from '@xenolithengine/demo/scene'

  const panelEditor = createXenolithEditorContext()
  let name = $state<'xen' | 'lg'>('xen')
</script>

<div
  use:xenolith={{ theme: name === 'xen' ? xenTheme : liquidGlassTheme, resizeToWindow: false }}
  onready={(e) => { panelEditor.set(e.detail); loadDemo(e.detail) }}
  style="position:absolute;inset:0"
></div>

<XenolithControls position="top-right" orientation="horizontal" />

<XenolithPanel position="top-left">
  <div style="display:flex;gap:6px;">
    <XenolithButton active={name === 'xen'} onclick={() => { name = 'xen' }}>Xen</XenolithButton>
    <XenolithButton active={name === 'lg'} onclick={() => { name = 'lg' }}>Liquid Glass</XenolithButton>
  </div>
</XenolithPanel>
