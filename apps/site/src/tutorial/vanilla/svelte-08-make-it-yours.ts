// CHAPTER 8 — Make it yours (Svelte adapter). Theme switcher panel, minimap via props,
// custom canvas-drawn level widget.
import { createXenolithGraph } from '@xenolithengine/graph-svelte'
import type { NodeSchema, CanvasWidgetController } from '@xenolithengine/graph-editor'
import { xenTheme } from '@xenolithengine/graph-render-pixi'
import { liquidGlassTheme } from '@xenolithengine/graph-theme-liquid-glass'

const levelWidget: CanvasWidgetController = {
  draw(ctx, { value, width, height, accent, muted }) {
    const v = typeof value === 'number' ? value : 0
    ctx.fillStyle = muted; ctx.font = '11px Inter'; ctx.textBaseline = 'top'
    ctx.fillText(`${Math.round(v * 100)}%`, 0, 0)
    const barY = height - 10
    ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(0, barY, width, 8)
    ctx.fillStyle = accent;                    ctx.fillRect(0, barY, width * v, 8)
  },
  onPointer(phase, x, _y, { width }) {
    if (phase === 'up') return undefined
    return Math.max(0, Math.min(1, x / width))
  },
}

const greeterSchema: NodeSchema = {
  type: 'Greeter', title: 'Greeter', category: 'data',
  pins:    [{ kind: 'data', direction: 'out', type: 'string', label: 'Out', multiple: true }],
  widgets: [{ id: 'msg', type: 'text', key: 'msg', label: 'Message', placeholder: 'Hi', freeFloating: true }],
}
const mixerSchema: NodeSchema = {
  type: 'Mixer', title: 'Mixer', category: 'transform',
  pins: [
    { kind: 'data', direction: 'in',  type: 'string', label: 'In',  multiple: false },
    { kind: 'data', direction: 'out', type: 'string', label: 'Out', multiple: true  },
  ],
  widgets: [{ id: 'level', type: 'custom', key: 'level', renderer: 'level', label: 'Level', height: 56, freeFloating: true }],
}

const graph = {
  version: 'xenolith.v1' as const,
  nodes: [
    { id: 'greeter', type: 'Greeter', position: { x: -240, y: 0 }, state: { msg: 'Hello, world' } },
    { id: 'mixer',   type: 'Mixer',   position: { x:  120, y: 0 }, state: { level: 0.6 } },
  ],
  edges: [
    { id: 'e1', from: { node: 'greeter', pin: 'greeter:Out' }, to: { node: 'mixer', pin: 'mixer:In' } },
  ],
}

export async function mount(target: HTMLElement): Promise<() => void> {
  const slot = document.createElement('div')
  slot.style.cssText = 'position:absolute;inset:0;'
  target.appendChild(slot)
  const binding = await createXenolithGraph(slot, { resizeToWindow: false, theme: xenTheme, minimap: true })
  const editor = binding.editor
  editor.registerWidget('level', levelWidget)
  editor.registry.register(greeterSchema)
  editor.registry.register(mixerSchema)
  editor.loadJSON(graph)
  editor.view.fitView({ padding: 80, maxZoom: 1 })

  const themes = [
    { label: 'Xen',          theme: xenTheme },
    { label: 'Liquid Glass', theme: liquidGlassTheme },
  ]
  let active = themes[0]!
  const panel = document.createElement('div')
  panel.style.cssText = 'position:absolute;top:20px;right:20px;pointer-events:auto;display:flex;gap:6px;padding:6px;border-radius:6px;background:rgba(0,0,0,0.45);color:#e8e8e8;font:12px/1.5 var(--xn-mono, ui-monospace, monospace);z-index:5;'
  const repaint = (): void => {
    panel.innerHTML = ''
    for (const t of themes) {
      const btn = document.createElement('button')
      btn.textContent = t.label
      btn.style.cssText = `font:inherit;padding:4px 10px;border-radius:4px;cursor:pointer;border:1px solid ${t === active ? 'var(--xeno-accent,#fcb400)' : '#555'};background:${t === active ? 'rgba(252,180,0,.18)' : '#222'};color:${t === active ? '#fff' : '#cfcfcf'};`
      btn.addEventListener('click', () => {
        if (t === active) return
        active = t; binding.setProps({ theme: t.theme, minimap: true, resizeToWindow: false }); repaint()
      })
      panel.appendChild(btn)
    }
  }
  repaint()
  target.appendChild(panel)

  return () => { panel.remove(); binding.destroy(); slot.remove() }
}
