<script lang="ts">
  import { onDestroy } from 'svelte'
  import { xenolith, createXenolithEditorContext } from '@xenolithengine/graph-svelte'
  import { XenolithPanel, XenolithButton } from '@xenolithengine/graph-svelte/components'
  import type { XenolithEditor } from '@xenolithengine/graph-editor'
  import { demoSchemas, createCurveWidget, createXYPadWidget } from '@xenolithengine/demo'

  type Status = 'idle' | 'connecting' | 'open' | 'closed' | 'error'

  const SAMPLE_PROMPTS = [
    'Build a simple linear pipeline: Source → Sample → Filter → Cache → Transform → Resolve. Use list_node_types first, then add_node without coordinates, connect pins by label, finally call auto_layout.',
    'Show me every available node type, one of each, fan them out from a single Source. End with auto_layout LR.',
    'Make a branching pipeline: Source feeds two parallel branches (Filter + Sample), both converge into Validate, then Resolve. Call auto_layout when done.',
    'First call list_node_types to see what is available, then design something that uses at least 8 node types and looks visually interesting after auto_layout.',
  ]
  const URL_KEY = 'xeno.mcp.url'
  const DEFAULT_URL = 'ws://127.0.0.1:7777?token=devtoken'

  const panelEditor = createXenolithEditorContext()
  let editor = $state<XenolithEditor | null>(null)
  let url = $state(localStorage.getItem(URL_KEY) ?? DEFAULT_URL)
  let status = $state<Status>('idle')
  let err = $state<string | null>(null)
  let log = $state<string[]>([])
  let disconnect: (() => void) | null = null

  const stamp = (): string => new Date().toLocaleTimeString()
  function append(line: string): void { log = [...log.slice(-29), `${stamp()} ${line}`] }
  const labelFor = (s: Status): string => ({ idle: 'idle', connecting: 'connecting…', open: 'connected', closed: 'closed', error: 'error' })[s]
  function dotColor(s: Status): string {
    if (s === 'open') return '#3ddc97'
    if (s === 'connecting') return '#fcb400'
    if (s === 'error') return '#e25b5b'
    return '#666'
  }

  function setup(e: XenolithEditor): void {
    e.registerWidget('curve', createCurveWidget())
    e.registerWidget('xypad', createXYPadWidget())
    for (const schema of demoSchemas) e.registry.register(schema)
    e.view.fitView()
  }

  async function connect(): Promise<void> {
    if (!editor) return
    localStorage.setItem(URL_KEY, url)
    err = null
    status = 'connecting'
    append(`connect ${url}`)
    try {
      disconnect = await editor.connectMCP(url, {
        onStatus: (s) => { status = s; append(`status: ${s}`) },
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      status = 'error'
      err = message
      append(`error: ${message}`)
    }
  }

  function hangUp(): void {
    disconnect?.()
    disconnect = null
    status = 'closed'
    append('disconnected')
  }

  function clearGraph(): void {
    editor?.loadJSON({ version: 'xenolith.v1', nodes: [], edges: [] })
    append('graph cleared')
  }

  onDestroy(() => { disconnect?.(); disconnect = null })
</script>

<div
  use:xenolith={{ resizeToWindow: false }}
  onready={(e) => { editor = e.detail; panelEditor.set(e.detail); setup(e.detail) }}
  style="position:absolute;inset:0"
></div>

<XenolithPanel position="top-left">
  <div style="display:flex;flex-direction:column;gap:8px;max-width:360px;">
    <div style="display:flex;align-items:center;gap:8px;">
      <span style="width:8px;height:8px;border-radius:8px;background:{dotColor(status)};box-shadow:{status === 'open' ? '0 0 8px #3ddc9788' : 'none'};"></span>
      <strong style="font-size:12px;">MCP {labelFor(status)}</strong>
    </div>
    <input
      bind:value={url}
      disabled={status === 'open' || status === 'connecting'}
      placeholder="ws://127.0.0.1:7777?token=…"
      style="font:inherit;font-size:11px;padding:6px 8px;border-radius:6px;background:var(--xeno-bg);color:var(--xeno-text);border:1px solid var(--xeno-border);"
    />
    <div style="display:flex;gap:6px;">
      {#if status !== 'open'}
        <XenolithButton active disabled={status === 'connecting'} style="flex:1" onclick={() => void connect()}>
          {status === 'connecting' ? 'Connecting…' : 'Connect'}
        </XenolithButton>
      {:else}
        <XenolithButton style="flex:1" onclick={hangUp}>Disconnect</XenolithButton>
      {/if}
      <XenolithButton onclick={clearGraph}>Clear graph</XenolithButton>
    </div>
    {#if err}<div style="font-size:11px;color:#e25b5b;white-space:pre-wrap;">{err}</div>{/if}
    <details style="font-size:11px;color:var(--xeno-muted);">
      <summary style="cursor:pointer;">Sample prompts (click to copy)</summary>
      <div style="margin-top:8px;display:flex;flex-direction:column;gap:6px;">
        {#each SAMPLE_PROMPTS as prompt}
          <button
            type="button"
            style="text-align:left;font:inherit;font-size:11px;line-height:1.35;padding:6px 8px;border-radius:6px;cursor:pointer;background:var(--xeno-bg);color:var(--xeno-text);border:1px solid var(--xeno-border);"
            onclick={() => void navigator.clipboard.writeText(prompt)}
          >{prompt}</button>
        {/each}
        <em>Click to copy, then paste into Claude / Cursor chat.</em>
      </div>
    </details>
  </div>
</XenolithPanel>

<XenolithPanel position="bottom-left">
  <div style="min-width:280px;max-width:360px;max-height:200px;overflow:auto;">
    <div style="font-size:10px;color:var(--xeno-muted);margin-bottom:4px;">Log</div>
    {#if log.length === 0}
      <div style="font-size:11px;color:var(--xeno-muted);">Empty — connect and ask the AI to build something.</div>
    {:else}
      {#each log as line}<div style="font-family:ui-monospace,monospace;font-size:10px;">{line}</div>{/each}
    {/if}
  </div>
</XenolithPanel>
