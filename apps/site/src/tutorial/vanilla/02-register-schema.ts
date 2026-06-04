// CHAPTER 2 — Register your first node type (vanilla JS).
//
// In chapter 1 the JSON carried every pin and widget per node — fine for a one-off, ugly for any
// real graph (the same shape is repeated on every instance). Here we declare a NodeSchema once
// and let the editor mint pins + widgets per instance. The graph JSON now only carries the bits
// that *vary per instance*: id, type, position, state.
//
// What the schema buys you:
//   - palette listing: Tab → search → spawn (with description, keywords, category-coloured header)
//   - implicit pins/widgets on JSON nodes
//   - implicit `render.category` fallback (instances inherit the schema's category)

import { XenolithEditor, type NodeSchema, type XenolithGraphV1 } from '@xenolith/editor'

const greeterSchema: NodeSchema = {
  type: 'Greeter',
  title: 'Greeter',
  category: 'data',
  description: 'Emits a string greeting.',
  keywords: ['hello', 'string', 'message'],
  pins: [
    { kind: 'data', direction: 'out', type: 'string', label: 'Out', multiple: true },
  ],
  widgets: [
    { id: 'msg', type: 'text', key: 'msg', label: 'Message', placeholder: 'Hello, Xenolith', freeFloating: true },
  ],
}

// Compact JSON: no pins, no widgets — the editor resolves them from the registered schema. Edges
// reference pins by their deterministic id (`${node.id}:${pin.label}`) so they keep working across
// reloads without any per-instance pin declarations.
const graph = {
  version: 'xenolith.v1',
  nodes: [
    { id: 'greeter', type: 'Greeter', position: { x: 0, y: 0 }, state: { msg: 'Hello, Xenolith' } },
  ],
  edges: [],
}

export async function mount(target: HTMLElement): Promise<() => void> {
  const editor = await XenolithEditor.init(target, { minimap: false })

  // Tell the editor what a Greeter is — palette discovery, default pins, default widgets, header
  // tint. Register before loadJSON so compact nodes can resolve their shape.
  editor.registry.register(greeterSchema)

  editor.loadJSON(graph)
  editor.view.fitView({ padding: 80, maxZoom: 1 })

  return () => editor.destroy()
}
