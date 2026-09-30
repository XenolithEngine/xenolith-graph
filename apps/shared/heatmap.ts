// Per-node latency badges for the heatmap showcase. The React island keeps its own copy
// because Playwright reads `window.__xenoHeatmap` off that file. These helpers are the
// same behaviour for every other host: dots live in editor.chrome.overlayRoot.

import type { NodeId, NodeSchema } from '@xenolithengine/graph-core'
import type { XenolithEditor } from '@xenolithengine/graph-editor'

const SCHEMAS: NodeSchema[] = [
  { type: 'Source', title: 'Source', category: 'data',
    pins: [{ kind: 'data', direction: 'out', type: 'object', label: 'Out' }] },
  { type: 'Embed', title: 'Embed', category: 'logic',
    pins: [
      { kind: 'data', direction: 'in', type: 'object', label: 'In' },
      { kind: 'data', direction: 'out', type: 'object', label: 'Out' },
    ] },
  { type: 'Retrieve', title: 'Retrieve', category: 'logic',
    pins: [
      { kind: 'data', direction: 'in', type: 'object', label: 'In' },
      { kind: 'data', direction: 'out', type: 'object', label: 'Out' },
    ] },
  { type: 'Rerank', title: 'Rerank', category: 'logic',
    pins: [
      { kind: 'data', direction: 'in', type: 'object', label: 'In' },
      { kind: 'data', direction: 'out', type: 'object', label: 'Out' },
    ] },
  { type: 'Prompt', title: 'Prompt', category: 'data',
    pins: [
      { kind: 'data', direction: 'in', type: 'object', label: 'In' },
      { kind: 'data', direction: 'out', type: 'object', label: 'Out' },
    ] },
  { type: 'Model', title: 'Model', category: 'macro',
    pins: [
      { kind: 'data', direction: 'in', type: 'object', label: 'In' },
      { kind: 'data', direction: 'out', type: 'object', label: 'Out' },
    ] },
  { type: 'Output', title: 'Output', category: 'utility',
    pins: [{ kind: 'data', direction: 'in', type: 'object', label: 'In' }] },
]

interface NodeMetric {
  nodeId: NodeId
  base: number
  phase: number
  metric: number
  label: string
}

function heatColor(t: number): string {
  const c = Math.max(0, Math.min(1, t))
  return `hsl(${200 - 200 * c}deg, 80%, 55%)`
}

function makeDot(): { el: HTMLDivElement; label: HTMLSpanElement } {
  const el = document.createElement('div')
  Object.assign(el.style, {
    position: 'absolute', width: '16px', height: '16px', borderRadius: '16px',
    pointerEvents: 'none', transform: 'translate(-50%, -50%)', zIndex: '15',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 0 12px currentColor',
  })
  const label = document.createElement('span')
  Object.assign(label.style, {
    position: 'absolute', top: '14px', left: '50%', transform: 'translateX(-50%)',
    fontSize: '10px', color: 'var(--xeno-text, #cfcfcf)', whiteSpace: 'nowrap',
    fontFamily: 'ui-monospace, monospace', pointerEvents: 'none', fontWeight: '600',
  })
  el.appendChild(label)
  return { el, label }
}

export interface HeatmapHandle {
  setPulsing(on: boolean): void
  dispose(): void
}

/** Build the RAG chain and pin a latency badge under each node. */
export function mountHeatmap(editor: XenolithEditor): HeatmapHandle {
  for (const s of SCHEMAS) editor.registry.register(s)
  const order = [
    { type: 'Source', x: 0, y: 100, cost: 0.05, label: '5ms' },
    { type: 'Embed', x: 220, y: 100, cost: 0.4, label: '320ms' },
    { type: 'Retrieve', x: 440, y: 100, cost: 0.6, label: '480ms' },
    { type: 'Rerank', x: 660, y: 100, cost: 0.25, label: '180ms' },
    { type: 'Prompt', x: 880, y: 100, cost: 0.1, label: '50ms' },
    { type: 'Model', x: 1100, y: 100, cost: 0.95, label: '2.3s' },
    { type: 'Output', x: 1340, y: 100, cost: 0.05, label: '8ms' },
  ]
  const created = order.map((spec) => ({ spec, node: editor.insertNode(spec.type, { x: spec.x, y: spec.y })! }))
  const outPin = (n: { pins: { id: string; direction: string }[] }) => n.pins.find((p) => p.direction === 'out')!.id
  const inPin = (n: { pins: { id: string; direction: string }[] }) => n.pins.find((p) => p.direction === 'in')!.id
  for (let i = 0; i < created.length - 1; i++) {
    const a = created[i]!.node
    const b = created[i + 1]!.node
    editor.addEdge({
      id: crypto.randomUUID(),
      from: { node: a.id, pin: outPin(a) },
      to: { node: b.id, pin: inPin(b) },
    } as never)
  }
  editor.view.fitView({ padding: 80 })

  let metrics: NodeMetric[] = created.map(({ spec, node }, i) => ({
    nodeId: node.id, base: spec.cost, phase: i * 0.7, metric: spec.cost, label: spec.label,
  }))
  const dots = new Map<string, { el: HTMLDivElement; label: HTMLSpanElement }>()
  const sizes = new Map<string, { w: number; h: number }>()

  const reposition = (): void => {
    const snap = editor.getGraphReadonly()
    const nodeById = new Map(snap.nodes.map((n) => [String(n.id), n]))
    for (const [id, dot] of dots) {
      const n = nodeById.get(id)
      if (!n) continue
      let cached = sizes.get(id)
      if (!cached && n.size) {
        cached = { w: n.size.x, h: n.size.y }
        sizes.set(id, cached)
      }
      const w = cached?.w ?? 220
      const h = cached?.h ?? 80
      const p = editor.view.worldToScreen({ x: n.position.x + w / 2, y: n.position.y + h })
      dot.el.style.left = `${p.x}px`
      dot.el.style.top = `${p.y + 12}px`
    }
  }
  const apply = (): void => {
    for (const m of metrics) {
      let dot = dots.get(String(m.nodeId))
      if (!dot) {
        dot = makeDot()
        editor.chrome.overlayRoot.appendChild(dot.el)
        dots.set(String(m.nodeId), dot)
      }
      const color = heatColor(m.metric)
      dot.el.style.color = color
      dot.el.style.background = color
      dot.label.textContent = m.label
    }
    reposition()
  }
  apply()
  const offView = editor.on('viewport:changed', reposition)
  const offMove = editor.on('node:moved', reposition)
  requestAnimationFrame(() => requestAnimationFrame(() => { reposition(); setTimeout(reposition, 100) }))

  let raf = 0
  return {
    setPulsing(on: boolean): void {
      cancelAnimationFrame(raf)
      if (!on) {
        metrics = metrics.map((m) => ({ ...m, metric: m.base }))
        apply()
        return
      }
      const step = (): void => {
        const t = performance.now() / 500
        metrics = metrics.map((m) => ({
          ...m,
          metric: Math.max(0.02, Math.min(1, m.base + Math.sin(t + m.phase) * 0.08)),
        }))
        apply()
        raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    },
    dispose(): void {
      cancelAnimationFrame(raf)
      offView()
      offMove()
      for (const dot of dots.values()) dot.el.remove()
      dots.clear()
    },
  }
}
