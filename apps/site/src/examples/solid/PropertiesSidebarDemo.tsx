// Solid — properties sidebar: auto-open after mount; toggle is a direct editor call.
import { createSignal } from 'solid-js'
import { xenolith } from '@xenolithengine/graph-solid'
import type { XenolithEditor } from '@xenolithengine/graph-editor'
import { setupPropertiesSidebar, PROPERTIES_SIDEBAR_NODE_ID } from '@xenolithengine/demo/properties-sidebar'

export function PropertiesSidebarDemo() {
  const [editor, setEditor] = createSignal<XenolithEditor | null>(null)
  const [open, setOpen] = createSignal(true)

  return (
    <div
      use:xenolith={{ resizeToWindow: false }}
      on:ready={(e) => {
        setEditor(e.detail)
        setupPropertiesSidebar(e.detail)
        e.detail.openSidebar(PROPERTIES_SIDEBAR_NODE_ID)
      }}
      style="position:absolute;inset:0"
    >
      <div style="position:absolute;top:12px;left:12px;padding:6px;background:var(--xeno-panel);border:1px solid var(--xeno-border);border-radius:8px;font:12px Inter,system-ui,sans-serif;z-index:5">
        <button
          style={`padding:6px 12px;font-size:12px;cursor:pointer;border-radius:6px;border:1px solid ${open() ? 'var(--xeno-accent)' : 'var(--xeno-border)'};background:${open() ? 'var(--xeno-accent)' : 'transparent'};color:${open() ? 'var(--xeno-canvas)' : 'var(--xeno-text)'}`}
          onClick={() => {
            const e = editor()
            if (!e) return
            if (open()) { e.closeSidebar(); setOpen(false) }
            else { e.openSidebar(PROPERTIES_SIDEBAR_NODE_ID); setOpen(true) }
          }}
        >
          {open() ? 'Close sidebar' : 'Open sidebar'}
        </button>
      </div>
    </div>
  )
}
