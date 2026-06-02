// CHAPTER 1 — Mount your first editor (React).
//
// React is a first-class consumer — `<XenolithGraph>` is the component, `onReady` hands you the
// editor instance when it's mounted. No imperative refs, no manual cleanup. The graph itself is
// the same xenolith.v1 JSON the vanilla example loads — author once, render anywhere.

import { XenolithGraph } from '@xenolith/react'
import type { XenolithGraphV1 } from '@xenolith/editor'
import { DemoStage } from '../Layout.js'

const graph = {
  version: 'xenolith.v1',
  nodes: [
    {
      id: 'greeter',
      type: 'Greeter',
      position: { x: 0, y: 0 },
      render: { title: 'Greeter' },
      state: { msg: 'Hello, Xenolith' },
      pins: [
        { id: 'greeter:out', kind: 'data', direction: 'out', type: 'string', multiple: true, label: 'Out' },
      ],
      widgets: [
        { id: 'msg', type: 'text', key: 'msg', label: 'Message', freeFloating: true },
      ],
    },
  ],
  edges: [],
}

export function Chapter01() {
  return (
    <DemoStage>
      <XenolithGraph
        className="xeno"
        resizeToWindow={false}
        onReady={(editor) => {
          editor.loadJSON(graph)
          editor.fitView({ padding: 80, maxZoom: 1 })
        }}
      />
    </DemoStage>
  )
}
