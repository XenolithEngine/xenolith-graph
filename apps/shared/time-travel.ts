// Time-travel scrubber core. The React island keeps its own copy (Playwright reads
// `window.__xenoTimeTravel` there). Hosts call build, run to completion, then project
// a scrub index onto node statuses.

import type { NodeId, NodeSchema } from '@xenolithengine/graph-core'
import { StepDebugger, type StepExecutor, type StepRecord, type XenolithEditor } from '@xenolithengine/graph-editor'

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
]

const executor: StepExecutor = ({ node, inputs }) => {
  if (node.type === 'Const') return new Map([[node.pins[0]!.id, Number((node.state as { value?: number }).value ?? 0)]])
  if (node.type === 'Add' || node.type === 'Multiply') {
    const vals = [...inputs.values()].map(Number)
    const r = node.type === 'Add' ? vals.reduce((s, v) => s + v, 0) : vals.reduce((s, v) => s * v, 1)
    return new Map([[node.pins.find((p) => p.direction === 'out')!.id, r]])
  }
  return new Map()
}

export function buildTimeTravel(editor: XenolithEditor): void {
  for (const s of SCHEMAS) editor.registry.register(s)
  const a = editor.insertNode('Const', { x: 0, y: 0 })!
  const b = editor.insertNode('Const', { x: 0, y: 140 })!
  const c = editor.insertNode('Const', { x: 0, y: 280 })!
  const add = editor.insertNode('Add', { x: 320, y: 60 })!
  const mul = editor.insertNode('Multiply', { x: 640, y: 160 })!
  const out = editor.insertNode('Display', { x: 960, y: 160 })!
  editor.setWidgetValue(a.id, 'value', 2)
  editor.setWidgetValue(b.id, 'value', 3)
  editor.setWidgetValue(c.id, 'value', 4)
  const o0 = (n: typeof a) => n.pins.find((p) => p.direction === 'out')!.id
  const iAt = (n: typeof add, i: number) => n.pins.filter((p) => p.direction === 'in')[i]!.id
  const wire = (from: typeof a, to: typeof add, index: number): void => {
    editor.addEdge({
      id: crypto.randomUUID(),
      from: { node: from.id, pin: o0(from) },
      to: { node: to.id, pin: iAt(to, index) },
    } as never)
  }
  wire(a, add, 0)
  wire(b, add, 1)
  wire(add, mul, 0)
  wire(c, mul, 1)
  wire(mul, out, 0)
  editor.view.fitView({ padding: 80 })
}

/** Run the graph to the end and return the step history. */
export async function runTimeTravel(editor: XenolithEditor): Promise<StepRecord[]> {
  const dbg = new StepDebugger(editor.readGraph(), executor)
  await dbg.start()
  await dbg.continue()
  return [...dbg.history]
}

/** Paint statuses for a scrub index. Steps before it are done; the index itself is the one under inspection. */
export function showTimeTravelStep(editor: XenolithEditor, history: readonly StepRecord[], scrub: number): void {
  const ids = new Set(history.map((r) => String(r.nodeId)))
  for (const id of ids) editor.setNodeStatus(id as NodeId, 'idle')
  for (let i = 0; i < Math.min(scrub, history.length); i++) {
    const id = history[i]!.nodeId
    editor.setNodeStatus(id, i === scrub - 1 ? 'running' : 'ok')
  }
}
