<!-- Svelte — useSelection via the store bag, useGraphJSON via graphJSON. Panels need
     createXenolithEditorContext() during init; feed it from onready. -->
<script lang="ts">
  import { xenolith, createXenolithStores, createXenolithEditorContext } from '@xenolithengine/graph-svelte'
  import { XenolithPanel, XenolithButton } from '@xenolithengine/graph-svelte/components'
  import type { WidgetSpec, XenolithEditor } from '@xenolithengine/graph-editor'
  import { loadDemo } from '@xenolithengine/demo/scene'

  const stores = createXenolithStores()
  const panelEditor = createXenolithEditorContext()
  const selection = stores.selection
  const graphJSON = stores.graphJSON
  let editor = $state<XenolithEditor | null>(null)
  let tick = $state(0)
  let text = $state('')
  let err = $state(false)
  let focused = $state(false)

  $effect(() => {
    const doc = $graphJSON
    if (doc && !focused) { text = JSON.stringify(doc, null, 2); err = false }
  })

  const nodeId = $derived($selection[0] ?? null)
  const node = $derived.by(() => {
    void tick
    return nodeId && editor ? editor.getNode(nodeId) : undefined
  })
  const widgets = $derived((node?.widgets ?? []).filter((w) => w.key !== undefined))

  function valueOf(id: string): unknown {
    void tick
    return nodeId && editor ? editor.getWidgetValue(nodeId, id) : undefined
  }
  function setValue(w: WidgetSpec, value: unknown): void {
    if (!nodeId || !editor) return
    editor.setWidgetValue(nodeId, w.id, value)
    tick += 1
  }
  function numBound(w: WidgetSpec, key: 'min' | 'max' | 'step', fallback: number): number {
    const rec = w as unknown as Record<string, unknown>
    return typeof rec[key] === 'number' ? rec[key] : fallback
  }
  function comboOptions(w: WidgetSpec): { value: string; label: string }[] {
    if (w.type !== 'combo') return []
    return w.values.map((o) => typeof o === 'string'
      ? { value: o, label: o }
      : { value: String(o.value), label: o.label })
  }
  function apply(): void {
    if (!editor) return
    try {
      editor.loadJSON(JSON.parse(text))
      editor.view.fitView({ padding: 48, maxZoom: 1 })
      focused = false
      err = false
    } catch { err = true }
  }
</script>

<div
  use:xenolith={{ resizeToWindow: false }}
  onready={(e) => {
    editor = e.detail
    panelEditor.set(e.detail)
    stores.editor.set(e.detail)
    loadDemo(e.detail)
    e.detail.on('widget:changed', () => { tick += 1 })
  }}
  style="position:absolute;inset:0"
></div>

<XenolithPanel position="top-left">
  <div style="width:340px;height:min(420px,calc(100vh - 280px));display:flex;flex-direction:column;gap:8px;">
    <div style="display:flex;align-items:center;gap:8px;">
      <XenolithButton active onclick={apply}>Apply JSON →</XenolithButton>
      {#if err}<span style="color:#e06c5b;font-size:12px;">Invalid JSON</span>{/if}
    </div>
    <p style="margin:0;font-size:11.5px;color:var(--xeno-muted);">graphJSON store → the whole graph as state</p>
    <textarea
      spellcheck="false"
      style="flex:1;resize:none;font:12px ui-monospace,monospace;background:var(--xeno-canvas);color:var(--xeno-text);border:1px solid var(--xeno-border);border-radius:6px;padding:8px;"
      value={text}
      onfocus={() => { focused = true }}
      onblur={() => { focused = false }}
      oninput={(e) => { text = e.currentTarget.value }}
    ></textarea>
  </div>
</XenolithPanel>

<XenolithPanel position="top-right">
  <div style="width:232px;max-height:70vh;overflow-y:auto;">
    <h3 style="margin:0 0 6px;font-size:13px;">Inspector</h3>
    <p style="margin:0 0 8px;font-size:11.5px;color:var(--xeno-muted);">selection store → widgets</p>
    {#if !node}<p style="color:var(--xeno-muted);">Select a node.</p>
    {:else if widgets.length === 0}<p style="color:var(--xeno-muted);">No editable widgets.</p>
    {/if}
    {#each widgets as w (w.id)}
      <label style="display:flex;flex-direction:column;gap:4px;margin:0 0 8px;font-size:12px;">
        <span>{w.label}</span>
        {#if w.type === 'slider' || w.type === 'number'}
          <input type="range" min={numBound(w, 'min', 0)} max={numBound(w, 'max', 1)}
            step={w.type === 'slider' ? numBound(w, 'step', 0.01) : numBound(w, 'step', 1)}
            value={Number(valueOf(String(w.id))) || 0}
            oninput={(e) => setValue(w, e.currentTarget.valueAsNumber)} />
          <em>{String(valueOf(String(w.id)))}</em>
        {:else if w.type === 'text'}
          <input type="text" value={String(valueOf(String(w.id)) ?? '')}
            oninput={(e) => setValue(w, e.currentTarget.value)} />
        {:else if w.type === 'toggle'}
          <input type="checkbox" checked={Boolean(valueOf(String(w.id)))}
            onchange={(e) => setValue(w, e.currentTarget.checked)} />
        {:else if w.type === 'color'}
          <input type="color" value={String(valueOf(String(w.id)) ?? '#000000')}
            oninput={(e) => setValue(w, e.currentTarget.value)} />
        {:else if w.type === 'combo'}
          <select value={String(valueOf(String(w.id)))} onchange={(e) => setValue(w, e.currentTarget.value)}>
            {#each comboOptions(w) as o (o.value)}<option value={o.value}>{o.label}</option>{/each}
          </select>
        {/if}
      </label>
    {/each}
  </div>
</XenolithPanel>
