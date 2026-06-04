<script setup lang="ts">
// Toolbar — child of <XenolithGraph>. The executor itself is plain code over the snapshot;
// `useEditor()` is the only adapter call.
import { ref } from 'vue'
import { useEditor } from '@xenolith/vue'
import type { NodeId } from '@xenolith/editor'

type ComputeFn = (inputs: Record<string, number>, state: Record<string, unknown>) => Record<string, number>
const compute: Record<string, ComputeFn> = {
  Const:    (_,  state) => ({ Out: Number(state['value'] ?? 0) }),
  Add:      (i)         => ({ Sum: (i['A'] ?? 0) + (i['B'] ?? 0) }),
  Multiply: (i)         => ({ Product: (i['A'] ?? 0) * (i['B'] ?? 0) }),
  Output:   (i)         => ({ In: i['In'] ?? 0 }),
}

const editor = useEditor()
const status = ref('idle')
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

async function run(stepMs: number): Promise<void> {
  const e = editor.value
  if (!e) return
  const snapshot = e.getGraphReadonly()
  const nodeById = new Map(snapshot.nodes.map((n) => [n.id, n]))

  const indeg = new Map<string, number>()
  const outs  = new Map<string, string[]>()
  for (const n of snapshot.nodes) { indeg.set(n.id, 0); outs.set(n.id, []) }
  for (const edge of snapshot.edges) {
    indeg.set(edge.to.node, (indeg.get(edge.to.node) ?? 0) + 1)
    outs.get(edge.from.node)!.push(edge.to.node)
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
  if (order.length !== indeg.size) { status.value = 'cycle detected — refuse to run'; return }

  const values = new Map<string, number>()
  status.value = stepMs > 0 ? 'stepping…' : 'running…'
  for (const id of order) {
    e.setSelection([id as NodeId])
    const node = nodeById.get(id)!
    const inputs: Record<string, number> = {}
    for (const edge of snapshot.edges) {
      if (edge.to.node !== id) continue
      const inPin = node.pins.find((p) => String(p.id) === String(edge.to.pin))
      if (!inPin?.label) continue
      const fromNode = nodeById.get(edge.from.node)
      const fromPin  = fromNode?.pins.find((p) => String(p.id) === String(edge.from.pin))
      if (!fromPin?.label) continue
      const v = values.get(`${edge.from.node}:${fromPin.label}`)
      if (typeof v === 'number') inputs[inPin.label] = v
    }
    const fn = compute[node.type]
    const result = fn ? fn(inputs, node.state ?? {}) : {}
    for (const [label, v] of Object.entries(result)) values.set(`${id}:${label}`, v)
    if (node.type === 'Output') e.setWidgetValue(id as NodeId, 'result', String(result['In'] ?? ''))
    if (stepMs > 0) await sleep(stepMs)
  }
  e.setSelection([])
  status.value = `ran ${order.length} nodes`
}
</script>

<template>
  <div data-xeno-panel class="panel">
    <div class="row">
      <button class="btn" @click="run(0)">▶ Run</button>
      <button class="btn" @click="run(450)">Step ×slow</button>
    </div>
    <div class="status">{{ status }}</div>
  </div>
</template>

<style scoped>
.panel {
  position: absolute; top: 20px; right: 20px; pointer-events: auto; z-index: 5;
  display: flex; flex-direction: column; gap: 6px; padding: 8px 12px; border-radius: 6px;
  background: rgba(0,0,0,0.45); color: #e8e8e8;
  font: 12px/1.5 var(--xn-mono, ui-monospace, monospace);
}
.row { display: flex; gap: 6px; }
.btn { font: inherit; padding: 4px 10px; border-radius: 4px; border: 1px solid #555; background: #222; color: #fff; cursor: pointer; }
.btn:hover { background: #2a2a2a; }
.status { font-size: 10px; color: rgba(255,255,255,0.55); text-transform: uppercase; letter-spacing: .04em; }
</style>
