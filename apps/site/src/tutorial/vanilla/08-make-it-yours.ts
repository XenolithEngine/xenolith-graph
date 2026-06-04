// CHAPTER 8 — Make it yours (vanilla JS).
//
// The polish pass: things you reach for once the basics work. Three patterns in one demo:
//   1. Theme switching — runtime `editor.setTheme(...)`; chrome restyles automatically via
//      the editor's `--xeno-*` CSS variables.
//   2. Minimap — single init flag; sits in the editor's overlay layer.
//   3. Custom widget — register a CanvasWidgetController and reference it by name from a schema
//      `type: 'custom', renderer: 'level'`. Two functions: `draw` paints into a 2D canvas;
//      `onPointer` returns the new value during a drag. No DOM, no framework.

import { XenolithEditor, type NodeSchema, type XenolithGraphV1, type CanvasWidgetController } from '@xenolithengine/editor'
import { xenTheme } from '@xenolithengine/render-pixi'
import { liquidGlassTheme } from '@xenolithengine/theme-liquid-glass'

// ── Custom widget: a click/drag level bar. Draws a track + fill, returns the new value (0..1)
//    during a drag — the editor commits it through the command bus, undoable for free.
const levelWidget: CanvasWidgetController = {
  draw(ctx, { value, width, height, accent, muted }) {
    const v = typeof value === 'number' ? value : 0
    ctx.fillStyle = muted
    ctx.font = '11px Inter'
    ctx.textBaseline = 'top'
    ctx.fillText(`${Math.round(v * 100)}%`, 0, 0)
    const barY = height - 10
    ctx.fillStyle = 'rgba(255,255,255,0.10)'
    ctx.fillRect(0, barY, width, 8)
    ctx.fillStyle = accent
    ctx.fillRect(0, barY, width * v, 8)
  },
  onPointer(phase, x, _y, { width }) {
    if (phase === 'up') return undefined
    return Math.max(0, Math.min(1, x / width))
  },
}

const greeterSchema: NodeSchema = {
  type: 'Greeter', title: 'Greeter', category: 'data',
  pins:    [{ kind: 'data', direction: 'out', type: 'string', label: 'Out', multiple: true }],
  widgets: [
    { id: 'msg', type: 'text', key: 'msg', label: 'Message', placeholder: 'Hi', freeFloating: true },
  ],
}
const mixerSchema: NodeSchema = {
  type: 'Mixer', title: 'Mixer', category: 'transform',
  pins: [
    { kind: 'data', direction: 'in',  type: 'string', label: 'In',  multiple: false },
    { kind: 'data', direction: 'out', type: 'string', label: 'Out', multiple: true  },
  ],
  widgets: [
    // The custom widget — referenced by `renderer` name. `height` lets the controller declare
    // a taller row when it needs one (e.g. a curve editor); 56px is enough for the bar + label.
    { id: 'level', type: 'custom', key: 'level', renderer: 'level', label: 'Level', height: 56, freeFloating: true },
  ],
}

const graph = {
  version: 'xenolith.v1',
  nodes: [
    { id: 'greeter', type: 'Greeter', position: { x: -240, y: 0 }, state: { msg: 'Hello, world' } },
    { id: 'mixer',   type: 'Mixer',   position: { x:  120, y: 0 }, state: { level: 0.6 } },
  ],
  edges: [
    { id: 'e1', from: { node: 'greeter', pin: 'greeter:Out' }, to: { node: 'mixer', pin: 'mixer:In' } },
  ],
}

export async function mount(target: HTMLElement): Promise<() => void> {
  // Minimap is a single init flag — shows in the bottom-right by default, themed automatically.
  const editor = await XenolithEditor.init(target, { theme: xenTheme, minimap: true })

  // Register the custom widget controller BEFORE loading the graph so nodes with `type: 'custom',
  // renderer: 'level'` find their painter on first render.
  editor.registerWidget('level', levelWidget)

  editor.registry.register(greeterSchema)
  editor.registry.register(mixerSchema)
  editor.loadJSON(graph)
  editor.view.fitView({ padding: 80, maxZoom: 1 })

  // ── Theme switcher panel
  const themes = [
    { label: 'Xen',          theme: xenTheme },
    { label: 'Liquid Glass', theme: liquidGlassTheme },
  ]
  let active = themes[0]!
  const panel = document.createElement('div')
  panel.style.cssText = `
    position: absolute; top: 20px; right: 20px; pointer-events: auto;
    display: flex; gap: 6px; padding: 6px; border-radius: 6px;
    background: rgba(0,0,0,0.45); color: #e8e8e8;
    font: 12px/1.5 var(--xn-mono, ui-monospace, monospace);`
  const repaint = (): void => {
    panel.innerHTML = ''
    for (const t of themes) {
      const btn = document.createElement('button')
      btn.textContent = t.label
      btn.style.cssText = `
        font: inherit; padding: 4px 10px; border-radius: 4px; cursor: pointer;
        border: 1px solid ${t === active ? 'var(--xeno-accent,#fcb400)' : '#555'};
        background: ${t === active ? 'rgba(252,180,0,.18)' : '#222'};
        color: ${t === active ? '#fff' : '#cfcfcf'};`
      btn.addEventListener('click', () => {
        if (t === active) return
        active = t
        editor.setTheme(t.theme)
        repaint()
      })
      panel.appendChild(btn)
    }
  }
  repaint()
  target.appendChild(panel)

  return () => { panel.remove(); editor.destroy() }
}
