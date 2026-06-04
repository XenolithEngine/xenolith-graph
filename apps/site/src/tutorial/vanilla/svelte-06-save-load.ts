// CHAPTER 6 — Save / Load (Svelte adapter).
//
// Autosave rides the binding's `history:changed` event. Imperative IO via the editor reference
// the `createXenolithGraph` primitive returns.
import { createXenolithGraph } from '@xenolithengine/svelte'
import type { NodeSchema } from '@xenolithengine/editor'

const greeterSchema: NodeSchema = {
  type: 'Greeter', title: 'Greeter', category: 'data',
  pins:    [{ kind: 'data', direction: 'out', type: 'string', label: 'Out', multiple: true }],
  widgets: [
    { id: 'msg',    type: 'text',   key: 'msg',    label: 'Message', placeholder: 'Hello, Xenolith', freeFloating: true },
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
  version: 'xenolith.v1' as const,
  nodes: [
    { id: 'greeter', type: 'Greeter', position: { x: -240, y: 0 }, state: { msg: 'Hello, Xenolith', volume: 60 } },
    { id: 'upper',   type: 'ToUpper', position: { x:  200, y: 0 }, state: {} },
  ],
  edges: [
    { id: 'e1', from: { node: 'greeter', pin: 'greeter:Out' }, to: { node: 'upper', pin: 'upper:In' } },
  ],
}

const STORAGE_KEY = 'xeno-tutorial-ch6-svelte'

export async function mount(target: HTMLElement): Promise<() => void> {
  const slot = document.createElement('div')
  slot.style.cssText = 'position:absolute;inset:0;'
  target.appendChild(slot)
  const binding = await createXenolithGraph(slot, { resizeToWindow: false })
  const editor = binding.editor
  editor.registry.register(greeterSchema)
  editor.registry.register(toUpperSchema)

  let bootedFrom: 'storage' | 'seed' = 'seed'
  const saved = (() => { try { return localStorage.getItem(STORAGE_KEY) } catch { return null } })()
  if (saved) {
    try { editor.loadJSON(JSON.parse(saved)); bootedFrom = 'storage' } catch { editor.loadJSON(seedGraph) }
  } else { editor.loadJSON(seedGraph) }
  editor.view.fitView({ padding: 80, maxZoom: 1 })

  const panel = document.createElement('div')
  panel.style.cssText = 'position:absolute;top:20px;right:20px;pointer-events:auto;display:flex;flex-direction:column;gap:6px;padding:8px 12px;border-radius:6px;background:rgba(0,0,0,0.45);color:#e8e8e8;font:12px/1.5 var(--xn-mono, ui-monospace, monospace);z-index:5;'
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
  let savedAt = 0
  const paint = (): void => {
    if (savedAt === 0) status.textContent = bootedFrom === 'storage' ? 'Loaded from localStorage' : 'Seed graph'
    else status.textContent = `Autosaved · ${Math.max(0, Math.round((Date.now() - savedAt) / 1000))}s ago`
  }
  paint()
  const tick = setInterval(paint, 1000)

  let timer: ReturnType<typeof setTimeout> | null = null
  let first = true
  const off = binding.on('history:changed', () => {
    if (first) { first = false; return }
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(editor.getGraphReadonly())); savedAt = Date.now(); paint() } catch { /* quota */ }
    }, 250)
  })

  panel.querySelector('[data-act="save"]')!.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(editor.getGraphReadonly(), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'graph.json'; a.click()
    URL.revokeObjectURL(url)
  })
  panel.querySelector('[data-act="load"]')!.addEventListener('click', () => fileInput.click())
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files?.[0]; if (!f) return
    try { editor.loadJSON(JSON.parse(await f.text())); editor.view.fitView({ padding: 80, maxZoom: 1 }); bootedFrom = 'storage'; savedAt = 0; paint() }
    catch (err) { status.textContent = `Load failed: ${(err as Error).message}` }
    fileInput.value = ''
  })
  panel.querySelector('[data-act="reset"]')!.addEventListener('click', () => {
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
    editor.loadJSON(seedGraph); editor.view.fitView({ padding: 80, maxZoom: 1 })
    bootedFrom = 'seed'; savedAt = 0; paint()
  })

  return () => {
    if (timer) clearTimeout(timer)
    clearInterval(tick); off()
    panel.remove(); binding.destroy(); slot.remove()
  }
}
