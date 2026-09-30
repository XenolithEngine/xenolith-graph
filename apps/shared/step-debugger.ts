// Stepping-debugger showcase. The React island keeps its own copy because Playwright
// drives `window.__xenoDebug` on that component. `attachStepDebugger` is the same
// session for every other host: the view re-renders from `snapshot()`.

import { TEMPLATE_INSTANCE_TYPE, type Node, type NodeId, type NodeSchema } from '@xenolithengine/graph-core'
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
  { type: 'Identity', title: 'Identity', category: 'utility',
    pins: [
      { kind: 'data', direction: 'in', type: 'number', label: 'in' },
      { kind: 'data', direction: 'out', type: 'number', label: 'out' },
    ] },
  { type: 'Display', title: 'Display', category: 'utility',
    pins: [{ kind: 'data', direction: 'in', type: 'number', label: 'In' }] },
]

function evalNode(node: Node, inputs: Map<string, unknown>): Map<string, unknown> {
  if (node.type === 'Const') return new Map([[node.pins[0]!.id, Number((node.state as { value?: number }).value ?? 0)]])
  if (node.type === 'Add' || node.type === 'Multiply') {
    const vals = [...inputs.values()].map(Number)
    const r = node.type === 'Add' ? vals.reduce((s, v) => s + v, 0) : vals.reduce((s, v) => s * v, 1)
    return new Map([[node.pins.find((p) => p.direction === 'out')!.id, r]])
  }
  if (node.type === 'Identity') {
    const v = [...inputs.values()][0]
    const outPin = node.pins.find((p) => p.direction === 'out')
    if (outPin && v !== undefined) return new Map([[outPin.id, v]])
  }
  return new Map()
}

function makeExecutor(editor: XenolithEditor): StepExecutor {
  return ({ node, inputs, peek }) => {
    if (node.type === 'Macro') {
      const state = node.state as { collapsed?: boolean; members?: NodeId[] }
      const memberIds = state.members ?? []
      const lastId = memberIds[memberIds.length - 1]
      if (!state.collapsed) {
        const out = lastId ? peek(lastId) : undefined
        if (!out) return new Map()
        const macroOutPin = node.pins.find((p) => p.direction === 'out')
        const value = [...out.values()][0]
        if (macroOutPin && value !== undefined) return new Map([[macroOutPin.id, value]])
        return out
      }
      const subValues = new Map<string, Map<string, unknown>>()
      const subSnap = editor.getGraphReadonly()
      const subNodeById = new Map(subSnap.nodes.map((n) => [String(n.id), n]))
      for (const mid of memberIds) {
        const member = subNodeById.get(String(mid))
        if (!member) continue
        const memberInputs = new Map<string, unknown>()
        for (const e of subSnap.edges) {
          if (e.to.node !== mid) continue
          if (memberIds.includes(e.from.node as NodeId)) {
            const v = subValues.get(e.from.node)?.get(e.from.pin as string)
            if (v !== undefined) memberInputs.set(e.to.pin as string, v)
          } else {
            const v = [...inputs.values()].shift()
            if (v !== undefined) memberInputs.set(e.to.pin as string, v)
          }
        }
        subValues.set(mid, evalNode(member as Node, memberInputs))
      }
      const lastOut = lastId ? subValues.get(lastId) : null
      const macroOutPin = node.pins.find((p) => p.direction === 'out')
      if (!macroOutPin || !lastOut) return new Map()
      const value = [...lastOut.values()][0]
      return new Map([[macroOutPin.id, value]])
    }
    if (node.type === TEMPLATE_INSTANCE_TYPE) {
      const v = [...inputs.values()][0]
      const outPin = node.pins.find((p) => p.direction === 'out')
      if (outPin && v !== undefined) return new Map([[outPin.id, v]])
      return new Map()
    }
    if (node.type === 'Display') return new Map()
    return evalNode(node, inputs)
  }
}

export function buildStepDemo(editor: XenolithEditor): void {
  for (const s of SCHEMAS) editor.registry.register(s)
  const a = editor.insertNode('Const', { x: 0, y: 0 })!
  const b = editor.insertNode('Const', { x: 0, y: 140 })!
  const c = editor.insertNode('Const', { x: 0, y: 280 })!
  const add = editor.insertNode('Add', { x: 320, y: 60 })!
  const mul = editor.insertNode('Multiply', { x: 640, y: 160 })!
  const idn = editor.insertNode('Identity', { x: 880, y: 160 })!
  const out = editor.insertNode('Display', { x: 1100, y: 160 })!
  editor.setWidgetValue(a.id, 'value', 2)
  editor.setWidgetValue(b.id, 'value', 3)
  editor.setWidgetValue(c.id, 'value', 4)
  const out0 = (n: typeof a) => n.pins.find((p) => p.direction === 'out')!.id
  const inAt = (n: typeof add, i: number) => n.pins.filter((p) => p.direction === 'in')[i]!.id
  const wire = (from: typeof a, to: typeof add, index: number): void => {
    editor.addEdge({
      id: crypto.randomUUID(),
      from: { node: from.id, pin: out0(from) },
      to: { node: to.id, pin: inAt(to, index) },
    } as never)
  }
  wire(a, add, 0)
  wire(b, add, 1)
  wire(add, mul, 0)
  wire(c, mul, 1)
  wire(mul, idn, 0)
  wire(idn, out, 0)
  editor.createMacroFromSelection([add.id, mul.id], 'Compute')
  editor.createTemplateFromSelection([idn.id], 'Probe')
  editor.view.fitView({ padding: 80 })
}

export interface StepDebugSnapshot {
  status: 'idle' | 'paused' | 'running' | 'finished' | 'error'
  paused: { nodeType: string; inputs: Array<[string, unknown]> } | null
  history: StepRecord[]
  planned: string[]
  macroExpanded: boolean
  busy: boolean
}

export interface StepDebugController {
  snapshot(): StepDebugSnapshot
  start(): Promise<void>
  step(): Promise<void>
  continue(): Promise<void>
  stop(): void
  toggleMacro(): Promise<void>
  dispose(): void
}

function findMacroId(editor: XenolithEditor): NodeId | null {
  for (const n of editor.getGraphReadonly().nodes) if (n.type === 'Macro') return n.id as NodeId
  return null
}

export function attachStepDebugger(editor: XenolithEditor, onChange: () => void): StepDebugController {
  const dbg = new StepDebugger(editor.readGraph(), makeExecutor(editor))
  const macroId = findMacroId(editor)
  const dots = new Map<string, HTMLDivElement>()
  const animated = new Set<string>()
  let status: StepDebugSnapshot['status'] = 'idle'
  let paused: StepDebugSnapshot['paused'] = null
  let history: StepRecord[] = []
  let planned: string[] = []
  let macroExpanded = false
  let busy = false
  let disposed = false

  const emit = (): void => { if (!disposed) onChange() }
  const setStatus = (id: NodeId, s: 'idle' | 'running' | 'ok' | 'error'): void => { editor.setNodeStatus(id, s) }
  const clearAnimated = (): void => {
    for (const id of animated) editor.setEdgeOptions(id as never, { animated: false })
    animated.clear()
  }
  const placeDot = (nodeId: string): void => {
    const dot = dots.get(nodeId)
    if (!dot) return
    const node = editor.getGraphReadonly().nodes.find((n) => String(n.id) === nodeId)
    if (!node) { dot.style.display = 'none'; return }
    const p = editor.view.worldToScreen({ x: node.position.x, y: node.position.y })
    dot.style.left = `${p.x}px`
    dot.style.top = `${p.y}px`
    dot.style.display = ''
  }
  const addDot = (nodeId: string): void => {
    if (dots.has(nodeId)) return
    const dot = document.createElement('div')
    Object.assign(dot.style, {
      position: 'absolute', width: '10px', height: '10px', borderRadius: '10px',
      background: '#ff3b3b', boxShadow: '0 0 6px #ff3b3baa', pointerEvents: 'none',
      transform: 'translate(-50%, -50%)', zIndex: '20',
    })
    editor.chrome.overlayRoot.appendChild(dot)
    dots.set(nodeId, dot)
    placeDot(nodeId)
  }
  const removeDot = (nodeId: string): void => {
    dots.get(nodeId)?.remove()
    dots.delete(nodeId)
  }

  dbg.on('paused', ({ nodeId, node, inputs }) => {
    setStatus(nodeId, 'running')
    clearAnimated()
    for (const e of editor.getGraphReadonly().edges) {
      if (e.to.node !== nodeId) continue
      editor.setEdgeOptions(e.id as never, { animated: true })
      animated.add(String(e.id))
    }
    paused = {
      nodeType: node.type,
      inputs: [...inputs.entries()].map(([pinId, v]) => [node.pins.find((p) => p.id === pinId)?.label ?? pinId, v]),
    }
    status = 'paused'
    emit()
  })
  dbg.on('stepped', (r) => {
    setStatus(r.nodeId, 'ok')
    for (const n of editor.getGraphReadonly().nodes) {
      if (n.type !== 'Macro') continue
      const members = ((n.state as { members?: string[] }).members ?? [])
      if (members.length > 0 && members.every((m) => editor.getNode(m as NodeId) && dbg.history.some((h) => String(h.nodeId) === m && true))) {
        const done = members.every((m) => dbg.history.some((h) => String(h.nodeId) === String(m)))
        if (done) setStatus(n.id as NodeId, 'ok')
      }
    }
    history = [...dbg.history]
    emit()
  })
  dbg.on('finished', () => { status = 'finished'; paused = null; clearAnimated(); emit() })
  dbg.on('error', ({ nodeId }) => { setStatus(nodeId, 'error'); status = 'error'; clearAnimated(); emit() })

  const offs = [
    editor.on('node:click', ({ nodeId }) => {
      if (dbg.status === 'idle' || dbg.status === 'finished') return
      const on = dbg.toggleBreakpoint(nodeId)
      if (on) addDot(String(nodeId))
      else removeDot(String(nodeId))
      emit()
    }),
    editor.on('viewport:changed', () => { for (const id of dots.keys()) placeDot(id) }),
    editor.on('node:moved', () => { for (const id of dots.keys()) placeDot(id) }),
  ]

  const clearStatuses = (): void => {
    for (const n of editor.getGraphReadonly().nodes) setStatus(n.id as NodeId, 'idle')
    for (const id of dbg.breakpoints) setStatus(id as NodeId, 'error')
  }
  const run = async (fn: () => Promise<void>): Promise<void> => {
    if (busy) return
    busy = true
    emit()
    try { await fn() } finally { busy = false; emit() }
  }

  return {
    snapshot: () => ({ status, paused, history, planned, macroExpanded, busy }),
    start: () => run(async () => {
      clearStatuses()
      history = []
      paused = null
      status = 'running'
      await dbg.start()
      const byId = new Map(editor.getGraphReadonly().nodes.map((n) => [String(n.id), n]))
      planned = dbg.order.map((id) => byId.get(String(id))?.type ?? String(id).slice(0, 6))
    }),
    step: () => run(async () => { await dbg.step() }),
    continue: () => run(async () => { status = 'running'; emit(); await dbg.continue() }),
    stop(): void {
      dbg.stop()
      status = 'idle'
      paused = null
      history = []
      planned = []
      clearStatuses()
      emit()
    },
    async toggleMacro(): Promise<void> {
      if (!macroId || busy) return
      const wasActive = dbg.status === 'paused' || dbg.status === 'running'
      const visited = new Set(dbg.history.map((r) => String(r.nodeId)))
      const members = ((editor.getGraphReadonly().nodes.find((n) => n.id === macroId)?.state as { members?: string[] } | undefined)?.members ?? [])
      if (macroExpanded) {
        if (members.length > 0 && members.every((m) => visited.has(String(m)))) visited.add(String(macroId))
      } else visited.delete(String(macroId))
      if (!wasActive) dbg.stop()
      if (macroExpanded) editor.collapseMacro(macroId)
      else editor.expandMacro(macroId)
      macroExpanded = !macroExpanded
      if (!wasActive) {
        status = 'idle'; history = []; paused = null; planned = []
        clearStatuses()
        emit()
        return
      }
      await dbg.start()
      while (dbg.status === 'paused' && dbg.currentNodeId && visited.has(String(dbg.currentNodeId))) dbg.advance()
      status = dbg.status
      const byId = new Map(editor.getGraphReadonly().nodes.map((n) => [String(n.id), n]))
      planned = dbg.order.map((id) => byId.get(String(id))?.type ?? '?')
      emit()
    },
    dispose(): void {
      disposed = true
      for (const off of offs) off()
      dbg.stop()
      clearAnimated()
      for (const dot of dots.values()) dot.remove()
      dots.clear()
    },
  }
}
