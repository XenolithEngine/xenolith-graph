// CHAPTER 2 — Register your first node type (React).
//
// Same lesson as the vanilla version, expressed idiomatically: schema is plain data at module
// scope, registration happens inside `onReady` (the editor instance is ready). The graph JSON is
// now compact — pins and widgets come from the schema, not from every node entry.

import { XenolithGraph } from '@xenolith/react'
import type { NodeSchema, XenolithGraphV1 } from '@xenolith/editor'
import { DemoStage } from '../Layout.js'

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

const graph = {
  version: 'xenolith.v1',
  nodes: [
    { id: 'greeter', type: 'Greeter', position: { x: 0, y: 0 }, state: { msg: 'Hello, Xenolith' } },
  ],
  edges: [],
}

export function Chapter02() {
  return (
    <DemoStage>
      <XenolithGraph
        className="xeno"
        resizeToWindow={false}
        onReady={(editor) => {
          editor.registry.register(greeterSchema)
          editor.loadJSON(graph)
          editor.view.fitView({ padding: 80, maxZoom: 1 })
        }}
      />
    </DemoStage>
  )
}
