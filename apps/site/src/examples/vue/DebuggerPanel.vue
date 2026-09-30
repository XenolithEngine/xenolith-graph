<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { XenolithPanel, XenolithButton, useEditor } from '@xenolithengine/graph-vue'
import {
  attachStepDebugger, buildStepDemo,
  type StepDebugController, type StepDebugSnapshot,
} from '@xenolithengine/demo/step-debugger'

const EMPTY: StepDebugSnapshot = {
  status: 'idle', paused: null, history: [], planned: [], macroExpanded: false, busy: false,
}

const editor = useEditor()
const tick = ref(0)
let ctrl: StepDebugController | null = null

watch(editor, (ed) => {
  ctrl?.dispose()
  ctrl = null
  if (!ed) return
  buildStepDemo(ed)
  ctrl = attachStepDebugger(ed, () => { tick.value++ })
  tick.value++
}, { immediate: true })

onUnmounted(() => { ctrl?.dispose(); ctrl = null })

const snap = computed(() => { void tick.value; return ctrl?.snapshot() ?? EMPTY })
const canStart = computed(() => !snap.value.busy && (snap.value.status === 'idle' || snap.value.status === 'finished' || snap.value.status === 'error'))
const canStep = computed(() => !snap.value.busy && snap.value.status === 'paused')
const canStop = computed(() => !snap.value.busy && snap.value.status !== 'idle')

function dotColor(status: StepDebugSnapshot['status']): string {
  if (status === 'paused') return '#fcb400'
  if (status === 'running') return '#3ddc97'
  if (status === 'error') return '#e25b5b'
  if (status === 'finished') return '#5b8def'
  return '#666'
}
function statusLabel(status: StepDebugSnapshot['status']): string {
  return ({ idle: 'idle', paused: 'paused', running: 'running…', finished: 'finished', error: 'error' })[status]
}
function traceOutputs(record: StepDebugSnapshot['history'][number]): string {
  return [...record.outputs.values()].map((v) => JSON.stringify(v)).join(', ') || '—'
}
</script>

<template>
  <XenolithPanel position="top-left">
    <div style="display:flex;flex-direction:column;gap:8px;max-width:320px;">
      <div style="display:flex;align-items:center;gap:8px;">
        <span :style="{ width:'8px', height:'8px', borderRadius:'8px', background:dotColor(snap.status), boxShadow: snap.status === 'paused' ? '0 0 8px #fcb40088' : 'none' }" />
        <strong style="font-size:12px;">Debugger {{ statusLabel(snap.status) }}</strong>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        <XenolithButton :active="canStart" :disabled="!canStart" @click="ctrl?.start()">▶ Start</XenolithButton>
        <XenolithButton :disabled="!canStep" @click="ctrl?.step()">⤵ Step</XenolithButton>
        <XenolithButton :disabled="!canStep" @click="ctrl?.continue()">⏩ Continue</XenolithButton>
        <XenolithButton :disabled="!canStop" @click="ctrl?.stop()">■ Stop</XenolithButton>
      </div>
      <XenolithButton :disabled="snap.busy" @click="ctrl?.toggleMacro()">
        {{ snap.macroExpanded ? '⟲ Collapse macro' : '⤢ Expand macro' }}
      </XenolithButton>
      <div style="font-size:11px;color:var(--xeno-muted);line-height:1.4;">
        Graph: <strong>(2 + 3) × 4 = 20</strong> piped through a template-wrapped Identity
        into Display. Add + Multiply are inside macro <em>Compute</em>; Identity is inside
        template <em>Probe</em>. Toggle the macro to step its members individually. Templates
        are always one step. Click any node while debugging to toggle a breakpoint (red).
        Yellow = paused, green = executed.
      </div>
    </div>
  </XenolithPanel>

  <XenolithPanel v-if="snap.paused" position="top-right">
    <div style="min-width:240px;max-width:320px;">
      <div style="font-size:10px;color:var(--xeno-muted);text-transform:uppercase;letter-spacing:.08em;">Paused on</div>
      <div style="font-size:14px;font-weight:600;">{{ snap.paused.nodeType }}</div>
      <div style="font-size:10px;color:var(--xeno-muted);margin-top:8px;">Inputs</div>
      <div v-if="snap.paused.inputs.length === 0" style="font-size:11px;color:var(--xeno-muted);">— (no incoming values)</div>
      <div v-for="(row, i) in snap.paused.inputs" :key="i" style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0;">
        <span style="color:var(--xeno-muted);">{{ row[0] }}</span>
        <span style="font-family:ui-monospace,monospace;">{{ JSON.stringify(row[1]) }}</span>
      </div>
    </div>
  </XenolithPanel>

  <XenolithPanel position="bottom-left">
    <div style="min-width:280px;max-width:360px;max-height:260px;overflow:auto;">
      <template v-if="snap.planned.length > 0">
        <div style="font-size:10px;color:var(--xeno-muted);margin-bottom:4px;">Planned walk ({{ snap.planned.length }} steps)</div>
        <div style="font-size:10px;font-family:ui-monospace,monospace;margin-bottom:8px;line-height:1.5;">
          <span v-for="(step, i) in snap.planned" :key="i">{{ i + 1 }}. {{ step }}{{ i < snap.planned.length - 1 ? ' → ' : '' }}</span>
        </div>
      </template>
      <div style="font-size:10px;color:var(--xeno-muted);margin-bottom:4px;">Trace</div>
      <div v-if="snap.history.length === 0" style="font-size:11px;color:var(--xeno-muted);">Press <strong>▶ Start</strong>, then <strong>⤵ Step</strong>.</div>
      <div v-for="(record, i) in snap.history" :key="i" style="display:grid;grid-template-columns:24px 1fr auto auto;gap:8px;font-size:11px;padding:2px 0;align-items:baseline;">
        <span style="color:var(--xeno-accent,#FCB400);">{{ String(i + 1).padStart(2, '0') }}</span>
        <span>{{ record.type }}</span>
        <span style="color:var(--xeno-muted);">{{ record.durationMs.toFixed(2) }}ms</span>
        <span style="font-family:ui-monospace,monospace;">{{ traceOutputs(record) }}</span>
      </div>
    </div>
  </XenolithPanel>
</template>
