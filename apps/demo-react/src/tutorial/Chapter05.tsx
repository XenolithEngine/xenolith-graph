// CHAPTER 5 — Events: drive your UI from the graph (React).
//
// React doesn't need ref-poking — the editor publishes a typed event bus, the adapter wraps it
// in `useSyncExternalStore`-backed hooks. Same readout as the vanilla version, expressed in the
// React idiom: `useNodes()` / `useEdges()` / `useSelection()` for derived state, `useEditor()` +
// `useEffect` for one-shot event subscriptions, `<XenolithPanel>` for in-editor overlay UI.

import { useEffect, useState } from 'react'
import { XenolithGraph, XenolithPanel, useEditor, useNodes, useEdges, useSelection } from '@xenolith/react'
import type { NodeSchema, XenolithGraphV1 } from '@xenolith/editor'
import { DemoStage } from '../Layout.js'

const greeterSchema: NodeSchema = {
  type: 'Greeter', title: 'Greeter', category: 'data',
  pins:    [{ kind: 'data', direction: 'out', type: 'string', label: 'Out', multiple: true }],
  widgets: [
    { id: 'msg',    type: 'text',  key: 'msg',    label: 'Message', placeholder: 'Hello, Xenolith', freeFloating: true },
    { id: 'volume', type: 'slider', key: 'volume', label: 'Volume', min: 0, max: 100, step: 1, freeFloating: true },
  ],
}

const toUpperSchema: NodeSchema = {
  type: 'ToUpper', title: 'To Upper', category: 'transform',
  pins: [
    { kind: 'data', direction: 'in',  type: 'string', label: 'In',  multiple: false },
    { kind: 'data', direction: 'out', type: 'string', label: 'Out', multiple: true  },
  ],
}

const graph = {
  version: 'xenolith.v1',
  nodes: [
    { id: 'greeter', type: 'Greeter', position: { x: -240, y: 0 }, state: { msg: 'Hello, Xenolith', volume: 60 } },
    { id: 'upper',   type: 'ToUpper', position: { x:  200, y: 0 }, state: {} },
  ],
  edges: [
    { id: 'e1', from: { node: 'greeter', pin: 'greeter:Out' }, to: { node: 'upper', pin: 'upper:In' } },
  ],
}

/** Live readout — rendered INSIDE the editor via <XenolithPanel>. Pure declarative React:
 *  hooks subscribe to the editor's reactive stores; useEffect handles the one-off event we want
 *  to capture imperatively (the last widget edit). */
function Readout() {
  const editor = useEditor()
  const nodes = useNodes()
  const edges = useEdges()
  const selection = useSelection()
  const [lastEdit, setLastEdit] = useState<string>('—')

  useEffect(() => editor.on('widget:changed', ({ nodeId, widgetId, value }) => {
    setLastEdit(`${nodeId}.${widgetId} → ${JSON.stringify(value)}`)
  }), [editor])

  return (
    <XenolithPanel
      position="top-right"
      bare
      style={{
        minWidth: 200, padding: '8px 12px', borderRadius: 6,
        background: 'rgba(0,0,0,0.45)', color: '#e8e8e8',
        font: '12px/1.5 var(--xn-mono, ui-monospace, monospace)',
        // Push away from the preview's rounded corner so the two don't read as nested boxes.
        marginTop: 8, marginRight: 8,
      }}
    >
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.04em', color: 'rgba(255,255,255,0.5)', marginBottom: 4, fontWeight: 600 }}>
        Live readout
      </div>
      <div>Nodes: <b>{nodes.length}</b> · Edges: <b>{edges.length}</b></div>
      <div>Selected: <b>{selection.length === 0 ? '—' : selection.join(', ')}</b></div>
      <div>Last edit: <b>{lastEdit}</b></div>
    </XenolithPanel>
  )
}

export function Chapter05() {
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
      >
        <Readout />
      </XenolithGraph>
    </DemoStage>
  )
}
