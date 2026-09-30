<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import { XenolithPanel, XenolithButton, useEditor } from '@xenolithengine/graph-vue'
import { loadAudioGraph, createAudioEngine, type AudioSynthHandle } from '@xenolithengine/demo/audio-synth'

const editor = useEditor()
const playing = ref(false)
let engine: AudioSynthHandle | null = null

// Editor ref flips null → instance before @ready. Load and own the AudioContext here.
watch(editor, (ed) => {
  engine?.dispose()
  engine = null
  playing.value = false
  if (!ed) return
  loadAudioGraph(ed)
  engine = createAudioEngine(ed)
}, { immediate: true })

onUnmounted(() => { engine?.dispose(); engine = null })

function toggle(): void {
  if (!engine) return
  if (playing.value) engine.stop()
  else engine.play()
  playing.value = !playing.value
}
</script>

<template>
  <XenolithPanel position="top-left">
    <div style="display:flex;flex-direction:column;gap:6px;max-width:220px;">
      <XenolithButton :active="playing" style="width:100%" @click="toggle">
        {{ playing ? '■ Stop' : '▶ Play' }}
      </XenolithButton>
      <span style="color:var(--xeno-muted);font-size:11px;line-height:1.4;">
        Tweak the knobs while it plays — the chain is wired from the graph; the active path glows.
      </span>
    </div>
  </XenolithPanel>
</template>
