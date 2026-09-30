<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { XenolithPanel, XenolithButton, useEditor } from '@xenolithengine/graph-vue'
import type { StepRecord } from '@xenolithengine/graph-editor'
import { buildTimeTravel, runTimeTravel, showTimeTravelStep } from '@xenolithengine/demo/time-travel'

const editor = useEditor()
const history = ref<StepRecord[]>([])
const scrub = ref(0)
const playing = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

watch(editor, (ed) => {
  history.value = []
  scrub.value = 0
  playing.value = false
  if (!ed) return
  buildTimeTravel(ed)
  void runTimeTravel(ed).then((steps) => {
    if (editor.value !== ed) return
    history.value = steps
    scrub.value = steps.length
  })
}, { immediate: true })

watch([history, scrub], () => {
  const ed = editor.value
  if (!ed || history.value.length === 0) return
  showTimeTravelStep(ed, history.value, scrub.value)
})

watch([playing, scrub, history], () => {
  clearTimeout(timer)
  if (!playing.value) return
  if (scrub.value >= history.value.length) { playing.value = false; return }
  timer = setTimeout(() => { scrub.value = Math.min(scrub.value + 1, history.value.length) }, 600)
})

onUnmounted(() => clearTimeout(timer))

const current = computed(() => (scrub.value > 0 ? history.value[scrub.value - 1] : undefined))
const node = computed(() => {
  const rec = current.value
  const ed = editor.value
  if (!rec || !ed) return undefined
  return ed.getNode(rec.nodeId)
})
const outputRows = computed(() => {
  const rec = current.value
  const n = node.value
  if (!rec || !n) return []
  return [...rec.outputs.entries()].map(([pinId, value]) => ({
    label: n.pins.find((p) => p.id === pinId)?.label ?? pinId,
    value: JSON.stringify(value),
  }))
})

function onScrub(event: Event): void {
  playing.value = false
  scrub.value = Number((event.target as HTMLInputElement).value)
}
function togglePlay(): void {
  if (scrub.value >= history.value.length) scrub.value = 0
  playing.value = !playing.value
}
function reset(): void {
  playing.value = false
  scrub.value = 0
}
</script>

<template>
  <XenolithPanel position="top-left">
    <div style="display:flex;flex-direction:column;gap:8px;max-width:360px;">
      <div style="font-size:12px;font-weight:600;">Time-travel scrubber</div>
      <div style="font-size:11px;color:var(--xeno-muted);line-height:1.4;">
        The graph ran <strong>(2 + 3) × 4 = 20</strong> from start to finish. Drag the slider
        to rewind through {{ history.length }} steps — green = done, yellow = the step you're
        inspecting. Press Play to auto-advance.
      </div>
      <input data-testid="scrub" type="range" min="0" :max="history.length" :value="scrub" step="1" style="width:100%" @input="onScrub" />
      <div style="display:flex;gap:6px;align-items:center;font-size:11px;">
        <XenolithButton :active="playing" @click="togglePlay">{{ playing ? '⏸ Pause' : '▶ Play' }}</XenolithButton>
        <XenolithButton @click="reset">⟲ Reset</XenolithButton>
        <span style="margin-left:auto;color:var(--xeno-muted);">{{ scrub }}/{{ history.length }}</span>
      </div>
    </div>
  </XenolithPanel>

  <XenolithPanel v-if="current && node" position="top-right">
    <div style="min-width:240px;max-width:320px;">
      <div style="font-size:10px;color:var(--xeno-muted);text-transform:uppercase;">Step {{ scrub }}</div>
      <div style="font-size:14px;font-weight:600;">{{ node.type }}</div>
      <div style="font-size:10px;color:var(--xeno-muted);margin-top:8px;">Outputs</div>
      <div v-for="(row, i) in outputRows" :key="i" style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0;">
        <span style="color:var(--xeno-muted);">{{ row.label }}</span>
        <span style="font-family:ui-monospace,monospace;">{{ row.value }}</span>
      </div>
      <div style="font-size:10px;color:var(--xeno-muted);margin-top:6px;">{{ current.durationMs.toFixed(2) }}ms</div>
    </div>
  </XenolithPanel>
</template>
