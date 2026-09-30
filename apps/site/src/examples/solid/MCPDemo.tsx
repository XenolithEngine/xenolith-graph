import { createSignal, onCleanup } from 'solid-js'
import { xenolith } from '@xenolithengine/graph-solid'
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

function setup(editor: XenolithEditor): void {
  editor.registerWidget('curve', createCurveWidget())
  editor.registerWidget('xypad', createXYPadWidget())
  for (const schema of demoSchemas) editor.registry.register(schema)
  editor.view.fitView()
}

export function MCPDemo() {
  let editor: XenolithEditor | null = null
  let disconnect: (() => void) | null = null
  const [url, setUrl] = createSignal(localStorage.getItem(URL_KEY) ?? DEFAULT_URL)
  const [status, setStatus] = createSignal<Status>('idle')
  const [err, setErr] = createSignal<string | null>(null)
  const [log, setLog] = createSignal<string[]>([])
  onCleanup(() => { disconnect?.(); disconnect = null })

  const stamp = (): string => new Date().toLocaleTimeString()
  const append = (line: string): void => setLog((prev) => [...prev.slice(-29), `${stamp()} ${line}`])
  const labelFor = (s: Status): string => ({ idle: 'idle', connecting: 'connecting…', open: 'connected', closed: 'closed', error: 'error' })[s]
  const dotColor = (s: Status): string => s === 'open' ? '#3ddc97' : s === 'connecting' ? '#fcb400' : s === 'error' ? '#e25b5b' : '#666'

  const connect = async (): Promise<void> => {
    if (!editor) return
    localStorage.setItem(URL_KEY, url())
    setErr(null)
    setStatus('connecting')
    append(`connect ${url()}`)
    try {
      disconnect = await editor.connectMCP(url(), {
        onStatus: (s) => { setStatus(s); append(`status: ${s}`) },
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      setStatus('error')
      setErr(message)
      append(`error: ${message}`)
    }
  }

  const hangUp = (): void => {
    disconnect?.()
    disconnect = null
    setStatus('closed')
    append('disconnected')
  }

  const clearGraph = (): void => {
    editor?.loadJSON({ version: 'xenolith.v1', nodes: [], edges: [] })
    append('graph cleared')
  }

  const field = 'font:inherit;font-size:11px;padding:6px 8px;border-radius:6px;background:var(--xeno-bg);color:var(--xeno-text);border:1px solid var(--xeno-border);'
  const btn = (on: boolean, off: boolean): string =>
    `font:inherit;font-size:13px;padding:7px 12px;border-radius:8px;cursor:${off ? 'default' : 'pointer'};opacity:${off ? '0.4' : '1'};border:1px solid ${on ? 'var(--xeno-accent)' : 'var(--xeno-border)'};background:${on ? 'var(--xeno-accent)' : 'var(--xeno-elevated)'};color:${on ? 'var(--xeno-canvas)' : 'var(--xeno-text)'};`

  return (
    <div
      use:xenolith={{ resizeToWindow: false }}
      on:ready={(e) => { editor = e.detail; setup(e.detail) }}
      style="position:absolute;inset:0"
    >
      <div style="position:absolute;top:12px;left:12px;z-index:5;display:flex;flex-direction:column;gap:8px;max-width:360px;padding:10px;background:var(--xeno-panel);border:1px solid var(--xeno-border);border-radius:10px;color:var(--xeno-text);font:13px system-ui,sans-serif;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style={`width:8px;height:8px;border-radius:8px;background:${dotColor(status())};`} />
          <strong style="font-size:12px;">MCP {labelFor(status())}</strong>
        </div>
        <input
          value={url()}
          disabled={status() === 'open' || status() === 'connecting'}
          placeholder="ws://127.0.0.1:7777?token=…"
          style={field}
          onInput={(e) => setUrl(e.currentTarget.value)}
        />
        <div style="display:flex;gap:6px;">
          {status() !== 'open'
            ? <button type="button" style={btn(true, status() === 'connecting') + 'flex:1;'} disabled={status() === 'connecting'} onClick={() => void connect()}>{status() === 'connecting' ? 'Connecting…' : 'Connect'}</button>
            : <button type="button" style={btn(false, false) + 'flex:1;'} onClick={hangUp}>Disconnect</button>}
          <button type="button" style={btn(false, false)} onClick={clearGraph}>Clear graph</button>
        </div>
        {err() && <div style="font-size:11px;color:#e25b5b;white-space:pre-wrap;">{err()}</div>}
        <details style="font-size:11px;color:var(--xeno-muted);">
          <summary style="cursor:pointer;">Sample prompts (click to copy)</summary>
          <div style="margin-top:8px;display:flex;flex-direction:column;gap:6px;">
            {SAMPLE_PROMPTS.map((prompt) => (
              <button type="button" style={field + 'text-align:left;cursor:pointer;'} onClick={() => void navigator.clipboard.writeText(prompt)}>{prompt}</button>
            ))}
            <em>Click to copy, then paste into Claude / Cursor chat.</em>
          </div>
        </details>
      </div>
      <div style="position:absolute;bottom:12px;left:12px;z-index:5;min-width:280px;max-width:360px;max-height:200px;overflow:auto;padding:8px;background:var(--xeno-panel);border:1px solid var(--xeno-border);border-radius:10px;color:var(--xeno-text);font:13px system-ui,sans-serif;">
        <div style="font-size:10px;color:var(--xeno-muted);margin-bottom:4px;">Log</div>
        {log().length === 0
          ? <div style="font-size:11px;color:var(--xeno-muted);">Empty — connect and ask the AI to build something.</div>
          : log().map((line) => <div style="font-family:ui-monospace,monospace;font-size:10px;">{line}</div>)}
      </div>
    </div>
  )
}
