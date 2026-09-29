// Solid — method/auth are signals. setWidgetValue makes displayOptions.show re-evaluate.
import { createSignal } from 'solid-js'
import { xenolith } from '@xenolithengine/graph-solid'
import type { XenolithEditor } from '@xenolithengine/graph-editor'
import { setupConditionalWidgets, CONDITIONAL_WIDGETS_NODE_ID } from '@xenolithengine/demo/conditional-widgets'

type Method = 'GET' | 'POST' | 'PUT'
type Auth = 'none' | 'basic' | 'bearer'

const sel = 'font:inherit;font-size:12px;padding:3px 6px;border-radius:4px;border:1px solid var(--xeno-border);background:transparent;color:var(--xeno-text);'

export function ConditionalWidgetsDemo() {
  const [editor, setEditor] = createSignal<XenolithEditor | null>(null)
  const [method, setMethod] = createSignal<Method>('GET')
  const [auth, setAuth] = createSignal<Auth>('none')

  return (
    <div
      use:xenolith={{ resizeToWindow: false }}
      on:ready={(e) => { setEditor(e.detail); setupConditionalWidgets(e.detail) }}
      style="position:absolute;inset:0"
    >
      <div style="position:absolute;top:12px;left:12px;z-index:5;display:flex;gap:8px;align-items:center;padding:8px;background:var(--xeno-panel);border:1px solid var(--xeno-border);border-radius:10px;color:var(--xeno-text);font:13px system-ui,sans-serif;">
        <span style="font-size:12px;">method</span>
        <select
          style={sel}
          value={method()}
          onChange={(ev) => {
            const next = ev.currentTarget.value as Method
            setMethod(next)
            editor()?.setWidgetValue(CONDITIONAL_WIDGETS_NODE_ID, 'method', next)
          }}
        >
          <option>GET</option><option>POST</option><option>PUT</option>
        </select>
        <span style="font-size:12px;margin-left:8px;">auth</span>
        <select
          style={sel}
          value={auth()}
          onChange={(ev) => {
            const next = ev.currentTarget.value as Auth
            setAuth(next)
            editor()?.setWidgetValue(CONDITIONAL_WIDGETS_NODE_ID, 'auth', next)
          }}
        >
          <option>none</option><option>basic</option><option>bearer</option>
        </select>
      </div>
    </div>
  )
}
