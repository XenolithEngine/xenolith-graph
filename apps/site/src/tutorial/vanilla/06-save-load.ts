// CHAPTER 6 — Save / Load (vanilla JS).
//
// The graph is plain data. `editor.getGraphReadonly()` returns everything that defines the scene —
// nodes (with state), edges, viewport, comments, optional schemas[], etc. — as a `xenolith.v1`
// payload. `editor.loadJSON(data)` is the inverse: replace the current scene with the payload.
//
// This chapter wires up three real-world patterns at once:
//   1. Autosave to `localStorage` on every graph mutation (debounced).
//   2. "Download .json" — save the current graph to disk via a Blob URL.
//   3. "Load .json" — open a file picker, parse, load into the editor.

import { XenolithEditor, type NodeSchema, type XenolithGraphV1 } from '@xenolithengine/editor'

const greeterSchema: NodeSchema = {
  type: 'Greeter', title: 'Greeter', category: 'data',
  pins:    [{ kind: 'data', direction: 'out', type: 'string', label: 'Out', multiple: true }],
  widgets: [
    { id: 'msg',    type: 'text',  key: 'msg',    label: 'Message', placeholder: 'Hello, Xenolith', freeFloating: true },
    { id: 'volume', type: 'slider', key: 'volume', label: 'Volume', min: 0, max: 100, step: 1, freeFloating: true },
  ],
}

const toUpperSchema: NodeSchema = {
  type: 'ToUpper', title: 'To Upper', category: 'transform',
  pins: [
    { kind: 'data', direction: 'in',  type: 'string', label: 'In',  multiple: false },
    { kind: 'data', direction: 'out', type: 'string', label: 'Out', multiple: true  },
  ],
}

const seedGraph = {
  version: 'xenolith.v1',
  nodes: [
    { id: 'greeter', type: 'Greeter', position: { x: -240, y: 0 }, state: { msg: 'Hello, Xenolith', volume: 60 } },
    { id: 'upper',   type: 'ToUpper', position: { x:  200, y: 0 }, state: {} },
  ],
  edges: [
    { id: 'e1', from: { node: 'greeter', pin: 'greeter:Out' }, to: { node: 'upper', pin: 'upper:In' } },
  ],
}

const STORAGE_KEY = 'xeno-tutorial-ch6'

export async function mount(target: HTMLElement): Promise<() => void> {
  const editor = await XenolithEditor.init(target, { minimap: false })
  editor.registry.register(greeterSchema)
  editor.registry.register(toUpperSchema)

  // Boot from localStorage when there's a saved scene; otherwise from the seed. Defensive parse —
  // a corrupt entry shouldn't wedge the demo.
  let bootedFrom: 'storage' | 'seed' = 'seed'
  const saved = (() => { try { return localStorage.getItem(STORAGE_KEY) } catch { return null } })()
  if (saved) {
    try { editor.loadJSON(JSON.parse(saved)); bootedFrom = 'storage' } catch { editor.loadJSON(seedGraph) }
  } else {
    editor.loadJSON(seedGraph)
  }
  editor.view.fitView({ padding: 80, maxZoom: 1 })

  // ── Autosave: debounce every graph mutation into one localStorage write per ~250ms. The graph
  //    events all bridge off the command bus, so this picks up palette inserts, drags, widget
  //    edits, undo, redo — every state-changing path, no manual hooks per feature.
  let timer: ReturnType<typeof setTimeout> | null = null
  let savedAt = 0
  const flushSave = (): void => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(editor.getGraphReadonly())); savedAt = Date.now() } catch { /* quota */ }
    paint()
  }
  const scheduleSave = (): void => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(flushSave, 250)
  }
  const offs = [
    editor.on('widget:changed',     scheduleSave),
    editor.on('node:added',         scheduleSave),
    editor.on('node:removed',       scheduleSave),
    editor.on('node:moved',         scheduleSave),
    editor.on('edge:connected',     scheduleSave),
    editor.on('edge:disconnected',  scheduleSave),
  ]

  // ── Toolbar panel: download / load + status line. Plain DOM; pulls --xeno-* tokens from the
  //    active theme so it restyles when the editor theme changes.
  const panel = document.createElement('div')
  panel.style.cssText = `
    position: absolute; top: 20px; right: 20px; pointer-events: auto;
    display: flex; flex-direction: column; gap: 6px; padding: 8px 12px; border-radius: 6px;
    background: rgba(0,0,0,0.45); color: #e8e8e8;
    font: 12px/1.5 var(--xn-mono, ui-monospace, monospace);`
  panel.innerHTML = `
    <div style="display:flex;gap:6px;">
      <button data-act="save"  style="font:inherit;padding:4px 10px;border-radius:4px;border:1px solid #555;background:#222;color:#fff;cursor:pointer;">Download .json</button>
      <button data-act="load"  style="font:inherit;padding:4px 10px;border-radius:4px;border:1px solid #555;background:#222;color:#fff;cursor:pointer;">Load .json</button>
      <button data-act="reset" style="font:inherit;padding:4px 10px;border-radius:4px;border:1px solid #555;background:transparent;color:#aaa;cursor:pointer;">Reset</button>
    </div>
    <div data-status style="font-size:10px;color:rgba(255,255,255,0.55);text-transform:uppercase;letter-spacing:.04em;"></div>
    <input type="file" accept="application/json" data-file hidden>`
  target.appendChild(panel)

  const status = panel.querySelector<HTMLElement>('[data-status]')!
  const fileInput = panel.querySelector<HTMLInputElement>('[data-file]')!
  const paint = (): void => {
    if (savedAt === 0) {
      status.textContent = bootedFrom === 'storage' ? 'Loaded from localStorage' : 'Seed graph'
    } else {
      const age = Math.max(0, Math.round((Date.now() - savedAt) / 1000))
      status.textContent = `Autosaved · ${age}s ago`
    }
  }
  paint()
  const tick = setInterval(paint, 1000)

  panel.querySelector('[data-act="save"]')!.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(editor.getGraphReadonly(), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'graph.json'; a.click()
    URL.revokeObjectURL(url)
  })
  panel.querySelector('[data-act="load"]')!.addEventListener('click', () => fileInput.click())
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      editor.loadJSON(JSON.parse(text))
      editor.view.fitView({ padding: 80, maxZoom: 1 })
      bootedFrom = 'storage'; savedAt = 0; paint()
    } catch (err) { status.textContent = `Load failed: ${(err as Error).message}` }
    fileInput.value = '' // allow re-choosing the same file
  })
  panel.querySelector('[data-act="reset"]')!.addEventListener('click', () => {
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
    editor.loadJSON(seedGraph)
    editor.view.fitView({ padding: 80, maxZoom: 1 })
    bootedFrom = 'seed'; savedAt = 0; paint()
  })

  return () => {
    if (timer) clearTimeout(timer)
    clearInterval(tick)
    offs.forEach((off) => off())
    panel.remove()
    editor.destroy()
  }
}
