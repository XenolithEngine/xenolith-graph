// Solid — one click sets every edge to that path style.
import { createSignal, For } from 'solid-js'
import { xenolith } from '@xenolithengine/graph-solid'
import type { XenolithEditor } from '@xenolithengine/graph-editor'
import type { EdgePathStyle } from '@xenolithengine/graph-render-pixi'
import { setupEdgePaths, setAllEdgePaths, EDGE_PATH_STYLES } from '@xenolithengine/demo/edge-paths'

export function EdgePathsDemo() {
  const [editor, setEditor] = createSignal<XenolithEditor | null>(null)
  const [active, setActive] = createSignal<EdgePathStyle | 'each'>('each')

  function flip(style: EdgePathStyle): void {
    const e = editor()
    if (!e) return
    setActive(style)
    setAllEdgePaths(e, style)
  }

  return (
    <div
      use:xenolith={{ resizeToWindow: false }}
      on:ready={(e) => { setEditor(e.detail); setupEdgePaths(e.detail) }}
      style="position:absolute;inset:0"
    >
      <div style="position:absolute;top:12px;left:12px;z-index:5;display:flex;flex-direction:column;gap:6px;min-width:200px;padding:8px;background:var(--xeno-panel);border:1px solid var(--xeno-border);border-radius:10px;color:var(--xeno-text);font:13px system-ui,sans-serif;">
        <div style="font-size:11px;color:var(--xeno-muted);text-transform:uppercase;letter-spacing:.06em;">Apply to all</div>
        <For each={EDGE_PATH_STYLES}>{(style) =>
          <button
            type="button"
            style={`padding:6px 12px;font-size:12px;text-align:left;cursor:pointer;border-radius:6px;border:1px solid ${active() === style ? 'var(--xeno-accent)' : 'var(--xeno-border)'};background:${active() === style ? 'var(--xeno-accent)' : 'transparent'};color:${active() === style ? 'var(--xeno-canvas)' : 'var(--xeno-text)'};`}
            onClick={() => flip(style)}
          >{style}</button>
        }</For>
      </div>
    </div>
  )
}
