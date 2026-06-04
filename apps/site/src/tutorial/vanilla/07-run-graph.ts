// CHAPTER 7 — Run the graph: a topological executor (vanilla JS).
//
// Up to now the editor RENDERS graphs. This chapter is about EXECUTING them. Wiring is the same;
// runtime is just code over the graph model — topological sort, walk node by node, gather inputs
// from incoming edges, write outputs to a value cache, repeat. Watch the active node light up.
//
// Schemas demonstrate three patterns: a leaf source (Const), inner functions (Add, Multiply), a
// terminal sink (Output). The seed graph is 8 nodes and 7 edges so the topological order is
// non-trivial — try `Run` and watch the highlight walk the DAG.

import { XenolithEditor, type NodeSchema, type XenolithGraphV1, type NodeId } from '@xenolith/editor'

const constSchema: NodeSchema = {
  type: 'Const', title: 'Const', category: 'data',
  pins:    [{ kind: 'data', direction: 'out', type: 'number', label: 'Out', multiple: true }],
  widgets: [{ id: 'value', type: 'number', key: 'value', label: 'Value', step: 1, freeFloating: true }],
}
const addSchema: NodeSchema = {
  type: 'Add', title: 'Add', category: 'transform',
  pins: [
    { kind: 'data', direction: 'in',  type: 'number', label: 'A', multiple: false },
    { kind: 'data', direction: 'in',  type: 'number', label: 'B', multiple: false },
    { kind: 'data', direction: 'out', type: 'number', label: 'Sum', multiple: true },
  ],
}
const mulSchema: NodeSchema = {
  type: 'Multiply', title: 'Multiply', category: 'transform',
  pins: [
    { kind: 'data', direction: 'in',  type: 'number', label: 'A', multiple: false },
    { kind: 'data', direction: 'in',  type: 'number', label: 'B', multiple: false },
    { kind: 'data', direction: 'out', type: 'number', label: 'Product', multiple: true },
  ],
}
const outSchema: NodeSchema = {
  type: 'Output', title: 'Output', category: 'utility',
  pins:    [{ kind: 'data', direction: 'in', type: 'number', label: 'In', multiple: false }],
  widgets: [{ id: 'result', type: 'text', key: 'result', label: 'Result', placeholder: 'press Run', freeFloating: true, disabled: true }],
}

const seedGraph = {
  version: 'xenolith.v1',
  nodes: [
    { id: 'c1', type: 'Const',    position: { x: -380, y: -160 }, state: { value: 5 } },
    { id: 'c2', type: 'Const',    position: { x: -380, y:  -40 }, state: { value: 3 } },
    { id: 'c3', type: 'Const',    position: { x: -380, y:  120 }, state: { value: 2 } },
    { id: 'c4', type: 'Const',    position: { x: -380, y:  260 }, state: { value: 7 } },
    { id: 'a1', type: 'Add',      position: { x:  -80, y: -100 }, state: {} },
    { id: 'm1', type: 'Multiply', position: { x:  180, y:    0 }, state: {} },
    { id: 'a2', type: 'Add',      position: { x:  440, y:  100 }, state: {} },
    { id: 'out',type: 'Output',   position: { x:  700, y:  100 }, state: {} },
  ],
  edges: [
    { id: 'e1', from: { node: 'c1', pin: 'c1:Out' },    to: { node: 'a1', pin: 'a1:A' } },
    { id: 'e2', from: { node: 'c2', pin: 'c2:Out' },    to: { node: 'a1', pin: 'a1:B' } },
    { id: 'e3', from: { node: 'a1', pin: 'a1:Sum' },    to: { node: 'm1', pin: 'm1:A' } },
    { id: 'e4', from: { node: 'c3', pin: 'c3:Out' },    to: { node: 'm1', pin: 'm1:B' } },
    { id: 'e5', from: { node: 'm1', pin: 'm1:Product' },to: { node: 'a2', pin: 'a2:A' } },
    { id: 'e6', from: { node: 'c4', pin: 'c4:Out' },    to: { node: 'a2', pin: 'a2:B' } },
    { id: 'e7', from: { node: 'a2', pin: 'a2:Sum' },    to: { node: 'out', pin: 'out:In' } },
  ],
}

// ── The runtime ────────────────────────────────────────────────────────────────────────────────
//
// A node's COMPUTE function: read incoming values by pin label, return a map of outgoing values
// keyed by pin label. Keep it simple — this is education, not a real engine. (Real engines worry
// about async, batching, dynamic schemas, exec flow vs data flow, error pins. Not here.)

type ComputeFn = (inputs: Record<string, number>, state: Record<string, unknown>) => Record<string, number>
const compute: Record<string, ComputeFn> = {
  Const:    (_,  state) => ({ Out: Number(state['value'] ?? 0) }),
  Add:      (i)         => ({ Sum: (i['A'] ?? 0) + (i['B'] ?? 0) }),
  Multiply: (i)         => ({ Product: (i['A'] ?? 0) * (i['B'] ?? 0) }),
  Output:   (i)         => ({ In: i['In'] ?? 0 }), // sinks return their input so the executor can stash it
}

export async function mount(target: HTMLElement): Promise<() => void> {
  const editor = await XenolithEditor.init(target, { minimap: false })
  ;[constSchema, addSchema, mulSchema, outSchema].forEach((s) => editor.registry.register(s))
  editor.loadJSON(seedGraph)
  editor.view.fitView({ padding: 80, maxZoom: 1 })

  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

  // ── Run pass: snapshot the graph once via `getGraphReadonly()` — the public, frozen view of the
  //    scene — then walk a Kahn topological order over it, gather inputs per node, compute, cache
  //    outputs, propagate. Highlight the active node by selecting it; clear after. Returns early
  //    with "cycle" when the DAG isn't acyclic.
  const run = async (stepMs: number): Promise<void> => {
    const snapshot = editor.getGraphReadonly()
    const nodeById = new Map(snapshot.nodes.map((n) => [n.id, n]))

    // Kahn's algorithm.
    const indeg = new Map<string, number>()
    const outs  = new Map<string, string[]>()
    for (const n of snapshot.nodes) { indeg.set(n.id, 0); outs.set(n.id, []) }
    for (const e of snapshot.edges) {
      indeg.set(e.to.node, (indeg.get(e.to.node) ?? 0) + 1)
      outs.get(e.from.node)!.push(e.to.node)
    }
    const ready: string[] = []
    for (const [id, d] of indeg) if (d === 0) ready.push(id)
    const order: string[] = []
    while (ready.length > 0) {
      const id = ready.shift()!
      order.push(id)
      for (const next of outs.get(id) ?? []) {
        const d = (indeg.get(next) ?? 0) - 1; indeg.set(next, d)
        if (d === 0) ready.push(next)
      }
    }
    if (order.length !== indeg.size) { setStatus('cycle detected — refuse to run'); return }

    const values = new Map<string, number>() // key: `${nodeId}:${pinLabel}`
    for (const id of order) {
      editor.setSelection([id as NodeId])
      const node = nodeById.get(id)!
      const inputs: Record<string, number> = {}
      // Read inputs by walking edges where to.node === id; resolve from `values` cache.
      for (const e of snapshot.edges) {
        if (e.to.node !== id) continue
        const inPin  = node.pins.find((p) => String(p.id) === String(e.to.pin))
        if (!inPin || !inPin.label) continue
        const fromNode = nodeById.get(e.from.node)
        const fromPin  = fromNode?.pins.find((p) => String(p.id) === String(e.from.pin))
        if (!fromPin || !fromPin.label) continue
        const v = values.get(`${e.from.node}:${fromPin.label}`)
        if (typeof v === 'number') inputs[inPin.label] = v
      }
      const fn = compute[node.type]
      const outs = fn ? fn(inputs, node.state ?? {}) : {}
      for (const [label, v] of Object.entries(outs)) values.set(`${id}:${label}`, v)
      // Sink: write the value into the Output node's `result` widget so the user sees it.
      if (node.type === 'Output') editor.setWidgetValue(id as NodeId, 'result', String(outs['In'] ?? ''))
      if (stepMs > 0) await sleep(stepMs)
    }
    editor.setSelection([])
    setStatus(`ran ${order.length} nodes`)
  }

  // ── Toolbar
  const panel = document.createElement('div')
  panel.style.cssText = `
    position: absolute; top: 20px; right: 20px; pointer-events: auto;
    display: flex; flex-direction: column; gap: 6px; padding: 8px 12px; border-radius: 6px;
    background: rgba(0,0,0,0.45); color: #e8e8e8;
    font: 12px/1.5 var(--xn-mono, ui-monospace, monospace);`
  panel.innerHTML = `
    <div style="display:flex;gap:6px;">
      <button data-act="run"   style="font:inherit;padding:4px 10px;border-radius:4px;border:1px solid #555;background:#222;color:#fff;cursor:pointer;">▶ Run</button>
      <button data-act="step"  style="font:inherit;padding:4px 10px;border-radius:4px;border:1px solid #555;background:#222;color:#fff;cursor:pointer;">Step ×slow</button>
    </div>
    <div data-status style="font-size:10px;color:rgba(255,255,255,0.55);text-transform:uppercase;letter-spacing:.04em;">idle</div>`
  target.appendChild(panel)
  const statusEl = panel.querySelector<HTMLElement>('[data-status]')!
  const setStatus = (s: string) => { statusEl.textContent = s }

  panel.querySelector('[data-act="run"]')!.addEventListener('click', () => { setStatus('running…'); void run(0) })
  panel.querySelector('[data-act="step"]')!.addEventListener('click', () => { setStatus('stepping…'); void run(450) })

  return () => { panel.remove(); editor.destroy() }
}
