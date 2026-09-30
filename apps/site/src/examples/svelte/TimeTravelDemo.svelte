<script lang="ts">
  import { onDestroy } from 'svelte'
  import { xenolith, createXenolithEditorContext } from '@xenolithengine/graph-svelte'
  import { XenolithPanel, XenolithButton } from '@xenolithengine/graph-svelte/components'
  import type { StepRecord, XenolithEditor } from '@xenolithengine/graph-editor'
  import { buildTimeTravel, runTimeTravel, showTimeTravelStep } from '@xenolithengine/demo/time-travel'

  const panelEditor = createXenolithEditorContext()
  let editor = $state<XenolithEditor | null>(null)
  let history = $state<StepRecord[]>([])
  let scrub = $state(0)
  let playing = $state(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  $effect(() => {
    const live = editor
    const steps = history
    const index = scrub
    if (!live || steps.length === 0) return
    showTimeTravelStep(live, steps, index)
  })

  $effect(() => {
    const on = playing
    const index = scrub
    const total = history.length
    clearTimeout(timer)
    if (!on) return
    if (index >= total) { playing = false; return }
    timer = setTimeout(() => { scrub = Math.min(scrub + 1, history.length) }, 600)
  })

  onDestroy(() => clearTimeout(timer))

  const current = $derived(scrub > 0 ? history[scrub - 1] : undefined)
  const node = $derived(current && editor ? editor.getNode(current.nodeId) : undefined)
  const outputRows = $derived(!current || !node ? [] : [...current.outputs.entries()].map(([pinId, value]) => ({
    label: node.pins.find((p) => p.id === pinId)?.label ?? pinId,
    value: JSON.stringify(value),
  })))

  function onScrub(event: Event): void {
    playing = false
    scrub = Number((event.target as HTMLInputElement).value)
  }
  function togglePlay(): void {
    if (scrub >= history.length) scrub = 0
    playing = !playing
  }
</script>

<div
  use:xenolith={{ resizeToWindow: false }}
  onready={(e) => {
    editor = e.detail
    panelEditor.set(e.detail)
    buildTimeTravel(e.detail)
    void runTimeTravel(e.detail).then((steps) => {
      if (editor !== e.detail) return
      history = steps
      scrub = steps.length
    })
  }}
  style="position:absolute;inset:0"
></div>

<XenolithPanel position="top-left">
  <div style="display:flex;flex-direction:column;gap:8px;max-width:360px;">
    <div style="font-size:12px;font-weight:600;">Time-travel scrubber</div>
    <div style="font-size:11px;color:var(--xeno-muted);line-height:1.4;">
      The graph ran <strong>(2 + 3) × 4 = 20</strong> from start to finish. Drag the slider
      to rewind through {history.length} steps — green = done, yellow = the step you're
      inspecting. Press Play to auto-advance.
    </div>
    <input data-testid="scrub" type="range" min="0" max={history.length} value={scrub} step="1" style="width:100%" oninput={onScrub} />
    <div style="display:flex;gap:6px;align-items:center;font-size:11px;">
      <XenolithButton active={playing} onclick={togglePlay}>{playing ? '⏸ Pause' : '▶ Play'}</XenolithButton>
      <XenolithButton onclick={() => { playing = false; scrub = 0 }}>⟲ Reset</XenolithButton>
      <span style="margin-left:auto;color:var(--xeno-muted);">{scrub}/{history.length}</span>
    </div>
  </div>
</XenolithPanel>

{#if current && node}
  <XenolithPanel position="top-right">
    <div style="min-width:240px;max-width:320px;">
      <div style="font-size:10px;color:var(--xeno-muted);text-transform:uppercase;">Step {scrub}</div>
      <div style="font-size:14px;font-weight:600;">{node.type}</div>
      <div style="font-size:10px;color:var(--xeno-muted);margin-top:8px;">Outputs</div>
      {#each outputRows as row}
        <div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0;">
          <span style="color:var(--xeno-muted);">{row.label}</span>
          <span style="font-family:ui-monospace,monospace;">{row.value}</span>
        </div>
      {/each}
      <div style="font-size:10px;color:var(--xeno-muted);margin-top:6px;">{current.durationMs.toFixed(2)}ms</div>
    </div>
  </XenolithPanel>
{/if}
