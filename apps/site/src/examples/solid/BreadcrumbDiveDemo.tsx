// Solid — dive helpers called with the editor from on:ready. The card is host DOM.
import { createSignal } from 'solid-js'
import { xenolith } from '@xenolithengine/graph-solid'
import type { XenolithEditor } from '@xenolithengine/graph-editor'
import { setupBreadcrumbDive, diveIntoSlug } from '@xenolithengine/demo/breadcrumb-dive'

const btn = 'font:inherit;font-size:12px;padding:6px 12px;text-align:left;cursor:pointer;border-radius:6px;border:1px solid var(--xeno-border);background:transparent;color:var(--xeno-text);'

export function BreadcrumbDiveDemo() {
  const [editor, setEditor] = createSignal<XenolithEditor | null>(null)
  return (
    <div
      use:xenolith={{ resizeToWindow: false }}
      on:ready={(e) => { setEditor(e.detail); setupBreadcrumbDive(e.detail) }}
      style="position:absolute;inset:0"
    >
      <div style="position:absolute;top:12px;right:12px;z-index:5;display:flex;flex-direction:column;gap:6px;padding:8px;min-width:180px;background:var(--xeno-panel);border:1px solid var(--xeno-border);border-radius:10px;color:var(--xeno-text);font:13px system-ui,sans-serif;">
        <button type="button" style={btn} onClick={() => { const e = editor(); if (e) diveIntoSlug(e, 'pipeline') }}>Dive into Pipeline</button>
        <button type="button" style={btn} onClick={() => { const e = editor(); if (e) diveIntoSlug(e, 'stage') }}>… then into Stage</button>
        <button type="button" style={btn} onClick={() => editor()?.diveOut(0)}>Pop to Root</button>
        <div style="font-size:11px;color:var(--xeno-muted);">Or double-click any $templateInstance node.</div>
      </div>
    </div>
  )
}
