// CHAPTER 3 — Connect nodes with typed edges (React).
//
// Two schemas, two instances, one edge in JSON. Same data, idiomatic React wiring: schemas are
// module-scope constants, registration happens inside `onReady`, the graph is loaded once.

import { XenolithGraph } from '@xenolithengine/react'
import type { NodeSchema, XenolithGraphV1 } from '@xenolithengine/editor'
import { DemoStage } from '../Layout.js'

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

const graph = {
  version: 'xenolith.v1',
  nodes: [
    { id: 'greeter', type: 'Greeter', position: { x: -220, y: 0 }, state: { msg: 'Hello, Xenolith' } },
    { id: 'upper',   type: 'ToUpper', position: { x:  180, y: 0 }, state: {} },
  ],
  edges: [
    { id: 'e1', from: { node: 'greeter', pin: 'greeter:Out' }, to: { node: 'upper', pin: 'upper:In' } },
  ],
}

export function Chapter03() {
  return (
    <DemoStage>
      <XenolithGraph
        className="xeno"
        resizeToWindow={false}
        onReady={(editor) => {
          editor.registry.register(greeterSchema)
          editor.registry.register(toUpperSchema)
          editor.loadJSON(graph)
          editor.view.fitView({ padding: 80, maxZoom: 1 })
        }}
      />
    </DemoStage>
  )
}
