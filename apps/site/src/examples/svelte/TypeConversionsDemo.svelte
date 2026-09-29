<!-- Svelte — the cast toggle calls setConversionEnabled. edge:connected is subscribed on the editor. -->
<script lang="ts">
  import { xenolith, createXenolithEditorContext } from '@xenolithengine/graph-svelte'
  import { XenolithPanel } from '@xenolithengine/graph-svelte/components'
  import type { XenolithEditor } from '@xenolithengine/graph-editor'
  import { setupTypeConversions, setConversionEnabled } from '@xenolithengine/demo/type-conversions'

  const stamp = (): string => new Date().toISOString().slice(11, 19)
  const panelEditor = createXenolithEditorContext()
  let editor = $state<XenolithEditor | null>(null)
  let enabled = $state(false)
  let log = $state<string[]>([
    `[${stamp()}] No conversion registered. Try dragging from NumberSource.out to TextSink.in — refused.`,
  ])

  function append(line: string): void {
    log = [...log.slice(-39), `[${stamp()}] ${line}`]
  }
  function color(line: string): string {
    if (line.includes('✗')) return '#f88'
    if (line.includes('✓')) return '#9f9'
    return '#cfcfcf'
  }
  function toggle(): void {
    if (!editor) return
    const result = setConversionEnabled(editor, !enabled)
    enabled = result.enabled
    if (result.enabled) {
      append('✓ conversion number → text registered — try connecting the pins now')
    } else {
      const tail = result.droppedEdges > 0
        ? ` (dropped ${result.droppedEdges} stale edge${result.droppedEdges === 1 ? '' : 's'})`
        : ''
      append(`✗ conversion removed${tail} — try connecting again, it refuses`)
    }
  }
</script>

<div
  use:xenolith={{ resizeToWindow: false }}
  onready={(e) => {
    editor = e.detail
    panelEditor.set(e.detail)
    setupTypeConversions(e.detail)
    e.detail.on('edge:connected', (payload) => {
      append(`✓ connected ${String(payload.edge.id).slice(0, 6)} (number → text via cast)`)
    })
  }}
  style="position:absolute;inset:0"
></div>

<XenolithPanel position="top-left">
  <div style="display:flex;flex-direction:column;gap:6px;min-width:280px;">
    <button
      type="button"
      style={`padding:8px 12px;font-size:12px;border-radius:6px;cursor:pointer;border:1px solid ${enabled ? 'var(--xeno-accent)' : 'var(--xeno-border)'};background:${enabled ? 'var(--xeno-accent)' : 'var(--xeno-panel)'};color:${enabled ? 'var(--xeno-canvas)' : 'var(--xeno-text)'};`}
      onclick={toggle}
    >{enabled ? '✓ Conversion enabled' : 'Enable number → text cast'}</button>
    <div style="font:11px/1.4 ui-monospace,monospace;max-height:120px;overflow:auto;padding:6px;background:rgba(0,0,0,0.3);border-radius:4px;">
      {#each log.slice(-6) as line, i (i)}
        <div style:color={color(line)}>{line}</div>
      {/each}
    </div>
  </div>
</XenolithPanel>
