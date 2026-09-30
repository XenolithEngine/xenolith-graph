<script lang="ts">
  import { onDestroy } from 'svelte'
  import { xenolith, createXenolithEditorContext } from '@xenolithengine/graph-svelte'
  import { XenolithPanel, XenolithButton } from '@xenolithengine/graph-svelte/components'
  import {
    attachStepDebugger, buildStepDemo,
    type StepDebugController, type StepDebugSnapshot,
  } from '@xenolithengine/demo/step-debugger'

  const EMPTY: StepDebugSnapshot = {
    status: 'idle', paused: null, history: [], planned: [], macroExpanded: false, busy: false,
  }

  const panelEditor = createXenolithEditorContext()
  let ctrl: StepDebugController | null = null
  let snap = $state<StepDebugSnapshot>(EMPTY)

  const canStart = $derived(!snap.busy && (snap.status === 'idle' || snap.status === 'finished' || snap.status === 'error'))
  const canStep = $derived(!snap.busy && snap.status === 'paused')
  const canStop = $derived(!snap.busy && snap.status !== 'idle')

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
  function outputsOf(record: StepDebugSnapshot['history'][number]): string {
    return [...record.outputs.values()].map((v) => JSON.stringify(v)).join(', ') || '—'
  }

  onDestroy(() => { ctrl?.dispose(); ctrl = null })
</script>

<div
  use:xenolith={{ resizeToWindow: false }}
  onready={(e) => {
    panelEditor.set(e.detail)
    buildStepDemo(e.detail)
    ctrl = attachStepDebugger(e.detail, () => { snap = ctrl?.snapshot() ?? EMPTY })
    snap = ctrl.snapshot()
  }}
  style="position:absolute;inset:0"
></div>

<XenolithPanel position="top-left">
  <div style="display:flex;flex-direction:column;gap:8px;max-width:320px;">
    <div style="display:flex;align-items:center;gap:8px;">
      <span style="width:8px;height:8px;border-radius:8px;background:{dotColor(snap.status)};box-shadow:{snap.status === 'paused' ? '0 0 8px #fcb40088' : 'none'};"></span>
      <strong style="font-size:12px;">Debugger {statusLabel(snap.status)}</strong>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;">
      <XenolithButton active={canStart} disabled={!canStart} onclick={() => void ctrl?.start()}>▶ Start</XenolithButton>
      <XenolithButton disabled={!canStep} onclick={() => void ctrl?.step()}>⤵ Step</XenolithButton>
      <XenolithButton disabled={!canStep} onclick={() => void ctrl?.continue()}>⏩ Continue</XenolithButton>
      <XenolithButton disabled={!canStop} onclick={() => ctrl?.stop()}>■ Stop</XenolithButton>
    </div>
    <XenolithButton disabled={snap.busy} onclick={() => void ctrl?.toggleMacro()}>
      {snap.macroExpanded ? '⟲ Collapse macro' : '⤢ Expand macro'}
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

{#if snap.paused}
  <XenolithPanel position="top-right">
    <div style="min-width:240px;max-width:320px;">
      <div style="font-size:10px;color:var(--xeno-muted);text-transform:uppercase;letter-spacing:.08em;">Paused on</div>
      <div style="font-size:14px;font-weight:600;">{snap.paused.nodeType}</div>
      <div style="font-size:10px;color:var(--xeno-muted);margin-top:8px;">Inputs</div>
      {#if snap.paused.inputs.length === 0}
        <div style="font-size:11px;color:var(--xeno-muted);">— (no incoming values)</div>
      {:else}
        {#each snap.paused.inputs as row}
          <div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0;">
            <span style="color:var(--xeno-muted);">{row[0]}</span>
            <span style="font-family:ui-monospace,monospace;">{JSON.stringify(row[1])}</span>
          </div>
        {/each}
      {/if}
    </div>
  </XenolithPanel>
{/if}

<XenolithPanel position="bottom-left">
  <div style="min-width:280px;max-width:360px;max-height:260px;overflow:auto;">
    {#if snap.planned.length > 0}
      <div style="font-size:10px;color:var(--xeno-muted);margin-bottom:4px;">Planned walk ({snap.planned.length} steps)</div>
      <div style="font-size:10px;font-family:ui-monospace,monospace;margin-bottom:8px;line-height:1.5;">
        {#each snap.planned as step, i}{i + 1}. {step}{i < snap.planned.length - 1 ? ' → ' : ''}{/each}
      </div>
    {/if}
    <div style="font-size:10px;color:var(--xeno-muted);margin-bottom:4px;">Trace</div>
    {#if snap.history.length === 0}
      <div style="font-size:11px;color:var(--xeno-muted);">Press <strong>▶ Start</strong>, then <strong>⤵ Step</strong>.</div>
    {:else}
      {#each snap.history as record, i}
        <div style="display:grid;grid-template-columns:24px 1fr auto auto;gap:8px;font-size:11px;padding:2px 0;align-items:baseline;">
          <span style="color:var(--xeno-accent,#FCB400);">{String(i + 1).padStart(2, '0')}</span>
          <span>{record.type}</span>
          <span style="color:var(--xeno-muted);">{record.durationMs.toFixed(2)}ms</span>
          <span style="font-family:ui-monospace,monospace;">{outputsOf(record)}</span>
        </div>
      {/each}
    {/if}
  </div>
</XenolithPanel>
