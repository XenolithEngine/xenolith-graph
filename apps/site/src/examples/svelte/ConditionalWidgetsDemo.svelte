<!-- Svelte — method/auth are component state. setWidgetValue makes displayOptions.show re-evaluate. -->
<script lang="ts">
  import { xenolith, createXenolithEditorContext } from '@xenolithengine/graph-svelte'
  import { XenolithPanel } from '@xenolithengine/graph-svelte/components'
  import type { XenolithEditor } from '@xenolithengine/graph-editor'
  import { setupConditionalWidgets, CONDITIONAL_WIDGETS_NODE_ID } from '@xenolithengine/demo/conditional-widgets'

  type Method = 'GET' | 'POST' | 'PUT'
  type Auth = 'none' | 'basic' | 'bearer'

  const panelEditor = createXenolithEditorContext()
  let editor = $state<XenolithEditor | null>(null)
  let method = $state<Method>('GET')
  let auth = $state<Auth>('none')

  const sel = 'font:inherit;font-size:12px;padding:3px 6px;border-radius:4px;border:1px solid var(--xeno-border);background:transparent;color:var(--xeno-text);'

  function onMethod(ev: Event): void {
    const next = (ev.target as HTMLSelectElement).value as Method
    method = next
    editor?.setWidgetValue(CONDITIONAL_WIDGETS_NODE_ID, 'method', next)
  }
  function onAuth(ev: Event): void {
    const next = (ev.target as HTMLSelectElement).value as Auth
    auth = next
    editor?.setWidgetValue(CONDITIONAL_WIDGETS_NODE_ID, 'auth', next)
  }
</script>

<div
  use:xenolith={{ resizeToWindow: false }}
  onready={(e) => { editor = e.detail; panelEditor.set(e.detail); setupConditionalWidgets(e.detail) }}
  style="position:absolute;inset:0"
></div>

<XenolithPanel position="top-left">
  <div style="display:flex;gap:8px;align-items:center;">
    <span style="font-size:12px;">method</span>
    <select style={sel} value={method} onchange={onMethod}>
      <option>GET</option><option>POST</option><option>PUT</option>
    </select>
    <span style="font-size:12px;margin-left:8px;">auth</span>
    <select style={sel} value={auth} onchange={onAuth}>
      <option>none</option><option>basic</option><option>bearer</option>
    </select>
  </div>
</XenolithPanel>
