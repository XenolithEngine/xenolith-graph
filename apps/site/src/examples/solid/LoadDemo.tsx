// Solid — load a saved graph on ready. No panel package: the reload control is a DOM card.
// on:ready is the one colon attribute; the editor is e.detail.
import { createSignal } from 'solid-js'
import { xenolith } from '@xenolithengine/graph-solid'
import type { XenolithEditor } from '@xenolithengine/graph-editor'
import { loadDemo } from '@xenolithengine/demo/scene'
import { demoGraph } from '@xenolithengine/demo'

export function LoadDemo() {
  const [editor, setEditor] = createSignal<XenolithEditor | null>(null)
  return (
    <div
      use:xenolith={{ resizeToWindow: false }}
      on:ready={(e) => {
        setEditor(e.detail)
        e.detail.chrome.setControls({ position: 'bottom-left' })
        loadDemo(e.detail)
      }}
      style="position:absolute;inset:0"
    >
      <div style="position:absolute;top:12px;right:12px;z-index:5;padding:10px;background:var(--xeno-panel);border:1px solid var(--xeno-border);border-radius:10px;">
        <button
          type="button"
          style="font:inherit;font-size:13px;padding:7px 12px;cursor:pointer;border-radius:8px;border:1px solid var(--xeno-border);background:var(--xeno-elevated);color:var(--xeno-text);"
          onClick={() => {
            const live = editor()
            if (!live) return
            live.loadJSON(demoGraph)
            live.view.fitView({ padding: 48, maxZoom: 1 })
          }}
        >
          Reload graph
        </button>
      </div>
    </div>
  )
}
