// CHAPTER 8 — Make it yours (React).
//
// Same three polish patterns as the vanilla version, idiomatic React: theme state in `useState`,
// `editor.setTheme(...)` inside the click handler via `useEditor()`, custom widget registered in
// `onReady`, minimap toggled via the standard `minimap` prop on <XenolithGraph>.

import { useState } from 'react'
import { XenolithGraph, XenolithPanel, XenolithButton, useEditor } from '@xenolith/react'
import type { NodeSchema, XenolithGraphV1, CanvasWidgetController } from '@xenolith/editor'
import { xenTheme, type XenolithTheme } from '@xenolith/render-pixi'
import { liquidGlassTheme } from '@xenolith/theme-liquid-glass'
import { DemoStage } from '../Layout.js'

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

const graph: XenolithGraphV1 = {
  version: 'xenolith.v1',
  nodes: [
    { id: 'greeter', type: 'Greeter', position: { x: -240, y: 0 }, state: { msg: 'Hello, world' } },
    { id: 'mixer',   type: 'Mixer',   position: { x:  120, y: 0 }, state: { level: 0.6 } },
  ],
  edges: [
    { id: 'e1', from: { node: 'greeter', pin: 'greeter:Out' }, to: { node: 'mixer', pin: 'mixer:In' } },
  ],
}

const themes: { label: string; theme: XenolithTheme }[] = [
  { label: 'Xen',          theme: xenTheme },
  { label: 'Liquid Glass', theme: liquidGlassTheme },
]

function ThemeSwitcher() {
  const editor = useEditor()
  const [active, setActive] = useState(themes[0]!.label)
  return (
    <XenolithPanel
      position="top-right"
      bare
      style={{
        display: 'flex', gap: 6, padding: 6, borderRadius: 6,
        background: 'rgba(0,0,0,0.45)',
        font: '12px/1.5 var(--xn-mono, ui-monospace, monospace)',
        marginTop: 8, marginRight: 8,
      }}
    >
      {themes.map((t) => (
        <XenolithButton
          key={t.label}
          active={t.label === active}
          onClick={() => { setActive(t.label); editor.setTheme(t.theme) }}
        >
          {t.label}
        </XenolithButton>
      ))}
    </XenolithPanel>
  )
}

export function Chapter08() {
  return (
    <DemoStage>
      <XenolithGraph
        className="xeno"
        resizeToWindow={false}
        theme={xenTheme}
        minimap
        onReady={(editor) => {
          editor.registerWidget('level', levelWidget)
          editor.registry.register(greeterSchema)
          editor.registry.register(mixerSchema)
          editor.loadJSON(graph)
          editor.fitView({ padding: 80, maxZoom: 1 })
        }}
      >
        <ThemeSwitcher />
      </XenolithGraph>
    </DemoStage>
  )
}
