// CHAPTER 3 — Connect nodes with typed edges (vanilla JS).
//
// Two registered types, two instances, one wire between them. The edge references pins by their
// deterministic id (`${node.id}:${pin.label}`) — that's the id the parser mints when a node
// omits its pins, so edges in compact JSON resolve without surprise.
//
// Pin TYPES (`'string'`, `'int'`, …) drive two things:
//   1. Validation — try to drag a wire from a `string` out to an `int` in: the editor refuses.
//   2. Wire colour — the Xen theme tints each wire by its source pin type.

import { XenolithEditor, type NodeSchema, type XenolithGraphV1 } from '@xenolith/editor'

const greeterSchema: NodeSchema = {
  type: 'Greeter',
  title: 'Greeter',
  category: 'data',
  description: 'Emits a string greeting.',
  pins: [
    { kind: 'data', direction: 'out', type: 'string', label: 'Out', multiple: true },
  ],
  widgets: [
    { id: 'msg', type: 'text', key: 'msg', label: 'Message', placeholder: 'Hello, Xenolith', freeFloating: true },
  ],
}

const toUpperSchema: NodeSchema = {
  type: 'ToUpper',
  title: 'To Upper',
  category: 'transform',
  description: 'Uppercases the incoming string.',
  keywords: ['upper', 'case', 'caps'],
  pins: [
    { kind: 'data', direction: 'in',  type: 'string', label: 'In',  multiple: false },
    { kind: 'data', direction: 'out', type: 'string', label: 'Out', multiple: true  },
  ],
}

const graph: XenolithGraphV1 = {
  version: 'xenolith.v1',
  nodes: [
    { id: 'greeter', type: 'Greeter', position: { x: -220, y: 0 }, state: { msg: 'Hello, Xenolith' } },
    { id: 'upper',   type: 'ToUpper', position: { x:  180, y: 0 }, state: {} },
  ],
  edges: [
    // Pin ids are derived from `${nodeId}:${pinLabel}` when pins are minted from the schema —
    // that's what makes compact JSON + edges play together. No more handwritten pin uuids.
    { id: 'e1', from: { node: 'greeter', pin: 'greeter:Out' }, to: { node: 'upper', pin: 'upper:In' } },
  ],
}

export async function mount(target: HTMLElement): Promise<() => void> {
  const editor = await XenolithEditor.init(target, { minimap: false })
  editor.registry.register(greeterSchema)
  editor.registry.register(toUpperSchema)
  editor.loadJSON(graph)
  editor.fitView({ padding: 80, maxZoom: 1 })
  return () => editor.destroy()
}
