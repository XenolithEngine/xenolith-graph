// CHAPTER 1 — Mount your first editor (vanilla JS).
//
// The smallest XenolithGraph app: one async init call, one inline graph in the xenolith.v1 JSON
// format, one frame. Run this in any HTML page with `<div id="app" style="position:relative;
// width:100%;height:100%">` and you get a working node editor — drag, pan, zoom, palette via
// Tab — all out of the box. No theme to wire (Xen is the default).

import { XenolithEditor } from '@xenolithengine/editor'

// xenolith.v1 — the canonical data format. The same JSON renders in every framework adapter.
const graph = {
  version: 'xenolith.v1' as const,
  nodes: [
    {
      id: 'greeter',
      type: 'Greeter',
      position: { x: 0, y: 0 },
      render: { title: 'Greeter' },
      state: { msg: 'Hello, Xenolith' },
      pins: [
        { id: 'greeter:out', kind: 'data' as const, direction: 'out' as const, type: 'string', multiple: true, label: 'Out' },
      ],
      widgets: [
        { id: 'msg', type: 'text' as const, key: 'msg', label: 'Message', freeFloating: true },
      ],
    },
  ],
  edges: [],
}

export async function mount(target: HTMLElement): Promise<() => void> {
  // 1. Create the editor on the target element. The editor owns its own canvas.
  const editor = await XenolithEditor.init(target, { minimap: false })

  // 2. Load the graph. Same JSON shape on web, on disk, in CI — author once, run anywhere.
  editor.loadJSON(graph)

  // 3. Frame the loaded content so it sits comfortably on screen.
  editor.view.fitView({ padding: 80, maxZoom: 1 })

  // Return a teardown. The tutorial preview calls it on reset; real apps call it on unmount.
  return () => editor.destroy()
}
