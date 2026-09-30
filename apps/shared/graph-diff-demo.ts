// Two-pane structural diff. The React island keeps its own copy (`window.__xenoGraphDiff`).
// `presentGraphDiff` builds BEFORE and AFTER, locks both editors, and paints the AFTER overlay.

import type { NodeSchema } from '@xenolithengine/graph-core'
import { diffGraphs, type GraphDiff, type XenolithEditor } from '@xenolithengine/graph-editor'

const SCHEMAS: NodeSchema[] = [
  { type: 'Const', title: 'Const', category: 'data',
    pins: [{ kind: 'data', direction: 'out', type: 'number', label: 'Out' }],
    widgets: [{ id: 'value', key: 'value', type: 'number', label: 'value', min: -999, max: 999, step: 1 }] },
  { type: 'Add', title: 'Add', category: 'logic',
    pins: [
      { kind: 'data', direction: 'in', type: 'number', label: 'a' },
      { kind: 'data', direction: 'in', type: 'number', label: 'b' },
      { kind: 'data', direction: 'out', type: 'number', label: 'sum' },
    ] },
  { type: 'Multiply', title: 'Multiply', category: 'logic',
    pins: [
      { kind: 'data', direction: 'in', type: 'number', label: 'a' },
      { kind: 'data', direction: 'in', type: 'number', label: 'b' },
      { kind: 'data', direction: 'out', type: 'number', label: 'product' },
    ] },
  { type: 'Display', title: 'Display', category: 'utility',
    pins: [{ kind: 'data', direction: 'in', type: 'number', label: 'In' }] },
  { type: 'Probe', title: 'Probe', category: 'utility',
    pins: [{ kind: 'data', direction: 'in', type: 'number', label: 'In' }] },
]

interface Box { x: number; y: number; w: number; h: number }

function place(editor: XenolithEditor): void {
  editor.view.fitView({ padding: 60 })
}

function wire(editor: XenolithEditor, from: { id: string; pins: { id: string; direction: string }[] }, to: { id: string; pins: { id: string; direction: string }[] }, index: number): void {
  const out = from.pins.find((p) => p.direction === 'out')!.id
  const inp = to.pins.filter((p) => p.direction === 'in')[index]!.id
  editor.addEdge({ id: crypto.randomUUID(), from: { node: from.id, pin: out }, to: { node: to.id, pin: inp } } as never)
}

interface Built {
  ids: Record<string, string>
  meta: Record<string, { key: string }>
  positions: Record<string, Box>
  typeByKey: Record<string, string>
}

function measure(editor: XenolithEditor, keys: Record<string, string>): Record<string, Box> {
  const positions: Record<string, Box> = {}
  for (const n of editor.getGraphReadonly().nodes) {
    const key = keys[String(n.id)]
    if (!key) continue
    positions[key] = { x: n.position.x, y: n.position.y, w: n.size?.x ?? 200, h: n.size?.y ?? 80 }
  }
  return positions
}

function buildBefore(editor: XenolithEditor): Built {
  editor.clear()
  for (const s of SCHEMAS) editor.registry.register(s)
  const a = editor.insertNode('Const', { x: 0, y: 0 })!
  const b = editor.insertNode('Const', { x: 0, y: 140 })!
  const add = editor.insertNode('Add', { x: 320, y: 60 })!
  const out = editor.insertNode('Display', { x: 640, y: 60 })!
  const dbg = editor.insertNode('Probe', { x: 640, y: 220 })!
  editor.setWidgetValue(a.id, 'value', 2)
  editor.setWidgetValue(b.id, 'value', 3)
  wire(editor, a, add, 0)
  wire(editor, b, add, 1)
  wire(editor, add, out, 0)
  wire(editor, add, dbg, 0)
  place(editor)
  const ids = { a: String(a.id), b: String(b.id), add: String(add.id), out: String(out.id), dbg: String(dbg.id) }
  const meta = { [a.id]: { key: 'a' }, [b.id]: { key: 'b' }, [add.id]: { key: 'add' }, [out.id]: { key: 'out' }, [dbg.id]: { key: 'dbg' } }
  return { ids, meta, positions: measure(editor, { [a.id]: 'a', [b.id]: 'b', [add.id]: 'add', [out.id]: 'out', [dbg.id]: 'dbg' }), typeByKey: { a: 'Const', b: 'Const', add: 'Add', out: 'Display', dbg: 'Probe' } }
}

function buildAfter(editor: XenolithEditor): Built {
  editor.clear()
  for (const s of SCHEMAS) editor.registry.register(s)
  const a = editor.insertNode('Const', { x: 0, y: 0 })!
  const b = editor.insertNode('Const', { x: 0, y: 140 })!
  const add = editor.insertNode('Add', { x: 320, y: 60 })!
  const extra = editor.insertNode('Const', { x: 320, y: 280 })!
  const mul = editor.insertNode('Multiply', { x: 560, y: 160 })!
  const out = editor.insertNode('Display', { x: 880, y: 160 })!
  editor.setWidgetValue(a.id, 'value', 2)
  editor.setWidgetValue(b.id, 'value', 7)
  editor.setWidgetValue(extra.id, 'value', 4)
  wire(editor, a, add, 0)
  wire(editor, b, add, 1)
  wire(editor, add, mul, 0)
  wire(editor, extra, mul, 1)
  wire(editor, mul, out, 0)
  place(editor)
  const meta = {
    [a.id]: { key: 'a' }, [b.id]: { key: 'b' }, [add.id]: { key: 'add' },
    [mul.id]: { key: 'mul' }, [extra.id]: { key: 'extra' }, [out.id]: { key: 'out' },
  }
  return {
    ids: { a: String(a.id), b: String(b.id), add: String(add.id), mul: String(mul.id), extra: String(extra.id), out: String(out.id) },
    meta,
    positions: measure(editor, { [a.id]: 'a', [b.id]: 'b', [add.id]: 'add', [mul.id]: 'mul', [extra.id]: 'extra', [out.id]: 'out' }),
    typeByKey: { a: 'Const', b: 'Const', add: 'Add', mul: 'Multiply', extra: 'Const', out: 'Display' },
  }
}

function snapshot(editor: XenolithEditor, meta: Record<string, { key: string }>) {
  const snap = editor.getGraphReadonly()
  return {
    nodes: snap.nodes.map((n) => ({
      id: meta[String(n.id)]?.key ?? String(n.id),
      type: n.type,
      position: { x: n.position.x, y: n.position.y },
      state: { ...n.state },
    })),
    edges: snap.edges.map((e) => {
      const fk = meta[String(e.from.node)]?.key ?? String(e.from.node)
      const tk = meta[String(e.to.node)]?.key ?? String(e.to.node)
      return { id: `${fk}→${tk}`, from: { node: fk, pin: '' }, to: { node: tk, pin: '' } }
    }),
  }
}

export interface GraphDiffPresentation {
  diff: GraphDiff
  dispose(): void
}

/** Fill `before` and `after`, then paint added / modified / removed on the after pane. */
export function presentGraphDiff(before: XenolithEditor, after: XenolithEditor): GraphDiffPresentation {
  const prev = buildBefore(before)
  const next = buildAfter(after)
  before.setInteractive(false)
  after.setInteractive(false)
  before.selection.clear()
  after.selection.clear()
  const diff = diffGraphs(snapshot(before, prev.meta), snapshot(after, next.meta))

  for (const n of after.getGraphReadonly().nodes) after.setNodeStatus(n.id as never, 'idle')
  for (const key of diff.addedNodes) {
    const id = next.ids[key]
    if (id) after.setNodeStatus(id as never, 'ok')
  }

  const modified = new Map<string, HTMLDivElement>()
  const removed = new Map<string, HTMLDivElement>()
  for (const key of diff.modifiedNodes) {
    const el = document.createElement('div')
    Object.assign(el.style, {
      position: 'absolute', border: '2px solid #fcb400', borderRadius: '10px',
      pointerEvents: 'none', boxShadow: '0 0 0 1px rgba(0,0,0,0.4) inset', zIndex: '20',
    })
    after.chrome.overlayRoot.appendChild(el)
    modified.set(key, el)
  }
  for (const key of diff.removedNodes) {
    const el = document.createElement('div')
    Object.assign(el.style, {
      position: 'absolute', border: '2px dashed #ff5b6e', borderRadius: '10px',
      pointerEvents: 'none', background: 'rgba(255,91,110,0.08)', zIndex: '20',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#ff8898', fontFamily: 'ui-monospace, monospace', overflow: 'hidden',
      boxSizing: 'border-box', whiteSpace: 'nowrap',
    })
    el.dataset['fullLabel'] = `— ${prev.typeByKey[key] ?? 'node'} removed —`
    el.textContent = el.dataset['fullLabel']
    after.chrome.overlayRoot.appendChild(el)
    removed.set(key, el)
  }

  const reposition = (): void => {
    const snap = after.getGraphReadonly()
    const byId = new Map(snap.nodes.map((n) => [String(n.id), n]))
    for (const [key, el] of modified) {
      const n = byId.get(next.ids[key] ?? '')
      if (!n) continue
      const tl = after.view.worldToScreen(n.position)
      const br = after.view.worldToScreen({ x: n.position.x + (n.size?.x ?? 200), y: n.position.y + (n.size?.y ?? 80) })
      el.style.left = `${tl.x - 3}px`
      el.style.top = `${tl.y - 3}px`
      el.style.width = `${br.x - tl.x + 6}px`
      el.style.height = `${br.y - tl.y + 6}px`
    }
    for (const [key, el] of removed) {
      const p = prev.positions[key]
      if (!p) continue
      const tl = after.view.worldToScreen({ x: p.x, y: p.y })
      const br = after.view.worldToScreen({ x: p.x + p.w, y: p.y + p.h })
      const wPx = br.x - tl.x
      el.style.left = `${tl.x}px`
      el.style.top = `${tl.y}px`
      el.style.width = `${wPx}px`
      el.style.height = `${br.y - tl.y}px`
      el.style.fontSize = `${Math.max(7, Math.min(12, wPx / 16))}px`
      el.textContent = wPx < 60 ? '—' : (el.dataset['fullLabel'] ?? '')
    }
  }
  reposition()
  const offs = [
    after.on('viewport:changed', reposition),
    after.on('node:moved', reposition),
  ]
  after.selection.clear()

  return {
    diff,
    dispose(): void {
      for (const off of offs) off()
      for (const el of modified.values()) el.remove()
      for (const el of removed.values()) el.remove()
    },
  }
}
