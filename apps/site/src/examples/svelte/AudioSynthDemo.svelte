<script lang="ts">
  import { onDestroy } from 'svelte'
  import { xenolith, createXenolithEditorContext } from '@xenolithengine/graph-svelte'
  import { XenolithPanel, XenolithButton } from '@xenolithengine/graph-svelte/components'
  import { loadAudioGraph, createAudioEngine, type AudioSynthHandle } from '@xenolithengine/demo/audio-synth'

  const panelEditor = createXenolithEditorContext()
  let playing = $state(false)
  let engine: AudioSynthHandle | null = null

  function toggle(): void {
    if (!engine) return
    if (playing) engine.stop()
    else engine.play()
    playing = !playing
  }

  onDestroy(() => { engine?.dispose(); engine = null })
</script>

<div
  use:xenolith={{ resizeToWindow: false }}
  onready={(e) => { panelEditor.set(e.detail); loadAudioGraph(e.detail); engine = createAudioEngine(e.detail) }}
  style="position:absolute;inset:0"
></div>

<XenolithPanel position="top-left">
  <div style="display:flex;flex-direction:column;gap:6px;max-width:220px;">
    <XenolithButton active={playing} style="width:100%" onclick={toggle}>
      {playing ? '■ Stop' : '▶ Play'}
    </XenolithButton>
    <span style="color:var(--xeno-muted);font-size:11px;line-height:1.4;">
      Tweak the knobs while it plays — the chain is wired from the graph; the active path glows.
    </span>
  </div>
</XenolithPanel>
