// Solid — selection() and graphJSON() from the signal bag. No panel package: the
// inspector is a DOM card. The canvas on the site stays the React island; this is the source.
import { createEffect, createSignal, For, Show } from 'solid-js'
import { xenolith, createXenolithStores } from '@xenolithengine/graph-solid'
import type { WidgetSpec, XenolithEditor } from '@xenolithengine/graph-editor'
import { loadDemo } from '@xenolithengine/demo/scene'

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

const card = 'position:absolute;z-index:5;padding:10px;background:var(--xeno-panel);border:1px solid var(--xeno-border);border-radius:10px;color:var(--xeno-text);font:13px Inter,system-ui,sans-serif;'

export function TwoWayBindingDemo() {
  const stores = createXenolithStores()
  const [editor, setEditor] = createSignal<XenolithEditor | null>(null)
  const [tick, setTick] = createSignal(0)
  const [text, setText] = createSignal('')
  const [err, setErr] = createSignal(false)
  const [focused, setFocused] = createSignal(false)

  createEffect(() => {
    const doc = stores.graphJSON()
    if (doc && !focused()) { setText(JSON.stringify(doc, null, 2)); setErr(false) }
  })

  const nodeId = () => stores.selection()[0] ?? null
  const node = () => {
    void tick()
    const id = nodeId()
    const e = editor()
    return id && e ? e.getNode(id) : undefined
  }
  const widgets = () => (node()?.widgets ?? []).filter((w) => w.key !== undefined)
  const valueOf = (id: string): unknown => {
    void tick()
    const nid = nodeId()
    const e = editor()
    return nid && e ? e.getWidgetValue(nid, id) : undefined
  }
  const setValue = (w: WidgetSpec, value: unknown): void => {
    const nid = nodeId()
    const e = editor()
    if (!nid || !e) return
    e.setWidgetValue(nid, w.id, value)
    setTick((n) => n + 1)
  }
  const apply = (): void => {
    const e = editor()
    if (!e) return
    try {
      e.loadJSON(JSON.parse(text()))
      e.view.fitView({ padding: 48, maxZoom: 1 })
      setFocused(false)
      setErr(false)
    } catch { setErr(true) }
  }

  return (
    <div
      use:xenolith={{ resizeToWindow: false }}
      on:ready={(e) => {
        setEditor(e.detail)
        stores.setEditor(e.detail)
        loadDemo(e.detail)
        e.detail.on('widget:changed', () => setTick((n) => n + 1))
      }}
      style="position:absolute;inset:0"
    >
      <div style={`${card}top:12px;left:12px;width:340px;height:min(420px,calc(100% - 24px));display:flex;flex-direction:column;gap:8px;`}>
        <div style="display:flex;align-items:center;gap:8px;">
          <button type="button" onClick={apply} style="padding:7px 12px;border-radius:8px;border:1px solid var(--xeno-accent);background:var(--xeno-accent);color:var(--xeno-canvas);cursor:pointer;">Apply JSON →</button>
          <Show when={err()}><span style="color:#e06c5b;font-size:12px;">Invalid JSON</span></Show>
        </div>
        <p style="margin:0;font-size:11.5px;color:var(--xeno-muted);">graphJSON() → the whole graph as state</p>
        <textarea
          spellcheck={false}
          style="flex:1;resize:none;font:12px ui-monospace,monospace;background:var(--xeno-canvas);color:var(--xeno-text);border:1px solid var(--xeno-border);border-radius:6px;padding:8px;"
          value={text()}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onInput={(e) => setText(e.currentTarget.value)}
        />
      </div>
      <div style={`${card}top:12px;right:12px;width:232px;max-height:calc(100% - 24px);overflow-y:auto;`}>
        <h3 style="margin:0 0 6px;font-size:13px;">Inspector</h3>
        <p style="margin:0 0 8px;font-size:11.5px;color:var(--xeno-muted);">selection() → widgets</p>
        <Show when={!node()}><p style="color:var(--xeno-muted);">Select a node.</p></Show>
        <Show when={node() && widgets().length === 0}><p style="color:var(--xeno-muted);">No editable widgets.</p></Show>
        <For each={widgets()}>{(w) => (
          <label style="display:flex;flex-direction:column;gap:4px;margin:0 0 8px;font-size:12px;">
            <span>{w.label}</span>
            <Show when={w.type === 'slider' || w.type === 'number'}>
              <input type="range" min={numBound(w, 'min', 0)} max={numBound(w, 'max', 1)}
                step={w.type === 'slider' ? numBound(w, 'step', 0.01) : numBound(w, 'step', 1)}
                value={Number(valueOf(String(w.id))) || 0}
                onInput={(e) => setValue(w, e.currentTarget.valueAsNumber)} />
              <em>{String(valueOf(String(w.id)))}</em>
            </Show>
            <Show when={w.type === 'text'}>
              <input type="text" value={String(valueOf(String(w.id)) ?? '')} onInput={(e) => setValue(w, e.currentTarget.value)} />
            </Show>
            <Show when={w.type === 'toggle'}>
              <input type="checkbox" checked={Boolean(valueOf(String(w.id)))} onChange={(e) => setValue(w, e.currentTarget.checked)} />
            </Show>
            <Show when={w.type === 'color'}>
              <input type="color" value={String(valueOf(String(w.id)) ?? '#000000')} onInput={(e) => setValue(w, e.currentTarget.value)} />
            </Show>
            <Show when={w.type === 'combo'}>
              <select value={String(valueOf(String(w.id)))} onChange={(e) => setValue(w, e.currentTarget.value)}>
                <For each={comboOptions(w)}>{(o) => <option value={o.value}>{o.label}</option>}</For>
              </select>
            </Show>
          </label>
        )}</For>
      </div>
    </div>
  )
}
