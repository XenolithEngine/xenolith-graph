// CHAPTER 4 — Widgets (React).
//
// Same schemas + graph as the vanilla version, plugged into the standard React wrapper. The
// `displayOptions.show` callback is a real function in code — it stays a live closure inside
// the schema and is preserved when the schema's widgets are copied onto each instance.

import { XenolithGraph } from '@xenolith/react'
import type { NodeSchema, XenolithGraphV1 } from '@xenolith/editor'
import { DemoStage } from '../Layout.js'

const greeterSchema: NodeSchema = {
  type: 'Greeter',
  title: 'Greeter',
  category: 'data',
  description: 'Emits a string greeting with configurable tone and accent.',
  pins: [
    { kind: 'data', direction: 'out', type: 'string', label: 'Out', multiple: true },
  ],
  widgets: [
    { id: 'msg', type: 'text', key: 'msg', label: 'Message', placeholder: 'Hello, Xenolith', freeFloating: true },
    { id: 'tone', type: 'combo', key: 'tone', label: 'Tone',
      values: ['friendly', 'formal', 'sarcastic'], freeFloating: true },
    { id: 'volume', type: 'slider', key: 'volume', label: 'Volume',
      min: 0, max: 100, step: 1, freeFloating: true },
    { id: 'showAccent', type: 'toggle', key: 'showAccent', label: 'Show accent',
      onLabel: 'on', offLabel: 'off', freeFloating: true },
    { id: 'accent', type: 'color', key: 'accent', label: 'Accent', freeFloating: true,
      displayOptions: { show: (state) => state['showAccent'] === true } },
  ],
}

const toUpperSchema: NodeSchema = {
  type: 'ToUpper',
  title: 'To Upper',
  category: 'transform',
  pins: [
    { kind: 'data', direction: 'in',  type: 'string', label: 'In',  multiple: false },
    { kind: 'data', direction: 'out', type: 'string', label: 'Out', multiple: true  },
  ],
}

const graph: XenolithGraphV1 = {
  version: 'xenolith.v1',
  nodes: [
    { id: 'greeter', type: 'Greeter', position: { x: -240, y: 0 },
      state: { msg: 'Hello, Xenolith', tone: 'friendly', volume: 60, showAccent: true, accent: '#fcb400' } },
    { id: 'upper',   type: 'ToUpper', position: { x:  200, y: 0 }, state: {} },
  ],
  edges: [
    { id: 'e1', from: { node: 'greeter', pin: 'greeter:Out' }, to: { node: 'upper', pin: 'upper:In' } },
  ],
}

export function Chapter04() {
  return (
    <DemoStage>
      <XenolithGraph
        className="xeno"
        resizeToWindow={false}
        onReady={(editor) => {
          editor.registry.register(greeterSchema)
          editor.registry.register(toUpperSchema)
          editor.loadJSON(graph)
          editor.fitView({ padding: 80, maxZoom: 1 })
        }}
      />
    </DemoStage>
  )
}
