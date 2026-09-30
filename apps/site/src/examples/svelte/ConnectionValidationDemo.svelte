<!-- Svelte — the attempt log is local state. The guard and the graph are shared. -->
<script lang="ts">
  import { xenolith, createXenolithEditorContext } from '@xenolithengine/graph-svelte'
  import { XenolithPanel, XenolithControls } from '@xenolithengine/graph-svelte/components'
  import { buildConnectionValidation, type Attempt } from '@xenolithengine/demo/connection-validation'

  const panelEditor = createXenolithEditorContext()
  let log = $state<Attempt[]>([])

  function push(attempt: Attempt): void {
    log = [attempt, ...log].slice(0, 8)
  }
</script>

<div
  use:xenolith={{ resizeToWindow: false }}
  onready={(e) => { panelEditor.set(e.detail); buildConnectionValidation(e.detail, push) }}
  style="position:absolute;inset:0"
></div>

<XenolithControls position="bottom-left" />

<XenolithPanel position="top-right">
  <div style="display:flex;flex-direction:column;gap:8px;width:230px;">
    <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--xeno-muted);">Connection rules</p>
    <span style="color:var(--xeno-muted);font-size:11px;line-height:1.5;">
      Pins are typed. Drag <b style="color:var(--xeno-text);">Text</b> → a float input — refused (snaps back).
      Drag <b style="color:var(--xeno-text);">C</b> → <b style="color:var(--xeno-text);">A</b> — blocked (cycle).
    </span>
    <div style="display:flex;flex-direction:column;gap:3px;max-height:168px;overflow:hidden;">
      {#if log.length === 0}
        <span style="color:var(--xeno-muted);font-size:11px;">No attempts yet.</span>
      {/if}
      {#each log as attempt, i (i + attempt.text)}
        <span style={`font-size:11px;font-family:var(--xeno-mono, monospace);color:${attempt.ok ? '#39d98a' : '#ff5b6e'};`}>
          {attempt.ok ? '✓' : '✗'} {attempt.text}
        </span>
      {/each}
    </div>
  </div>
</XenolithPanel>
