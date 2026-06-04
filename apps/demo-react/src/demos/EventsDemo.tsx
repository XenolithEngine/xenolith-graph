import { useState } from 'react'
import { XenolithGraph, XenolithPanel, useEditorEvent, useSelection } from '@xenolithengine/react'
import { DemoStage } from '../Layout.js'
import { loadDemo } from '../demo-data.js'

const SIDE_PANEL = { width: 280, maxHeight: 'calc(100% - 24px)', overflowY: 'auto' as const }

/** Island: typed event callbacks wired to React state — a live log + selection inspector, all in an
 *  in-editor panel.
 *
 *  Canon: subscriptions live with the state that records them. EventsPanel uses `useEditorEvent`
 *  (one line per event, auto-rebinds on editor swap); `useSelection()` replaces the manual
 *  selection-tracking state. No on* callback props on <XenolithGraph>. */
function EventsPanel() {
  const selected = useSelection()
  const [log, setLog] = useState<string[]>([])
  const [widgets, setWidgets] = useState<Record<string, unknown>>({})
  const push = (line: string): void => setLog((l) => [line, ...l].slice(0, 40))

  useEditorEvent('node:click', (e) => push(`node:click ${e.nodeId}`))
  useEditorEvent('selection:changed', (e) => push(`selection:changed (${e.nodeIds.length})`))
  useEditorEvent('node:moved', (e) => push(`node:moved ${e.nodeId} → ${Math.round(e.position.x)},${Math.round(e.position.y)}`))
  useEditorEvent('edge:connected', (e) => push(`edge:connected ${e.edge.id}`))
  useEditorEvent('edge:disconnected', (e) => push(`edge:disconnected ${e.edgeId}`))
  useEditorEvent('widget:changed', (e) => {
    setWidgets((w) => ({ ...w, [`${e.nodeId}.${e.widgetId}`]: e.value }))
    push(`widget:changed ${e.widgetId} = ${JSON.stringify(e.value)}`)
  })
  useEditorEvent('history:changed', (e) => push(`history undo=${e.canUndo} redo=${e.canRedo}`))

  return (
    <XenolithPanel position="top-right" style={SIDE_PANEL}>
      <h3>Selection</h3>
      {selected.length === 0 ? <p className="muted">Nothing selected.</p> : selected.map((id) => (
        <div className="row" key={String(id)}><span>{String(id)}</span></div>
      ))}
      <h3 style={{ marginTop: 16 }}>Widget values</h3>
      {Object.keys(widgets).length === 0
        ? <p className="muted">Drag a slider, type in a field, toggle a switch…</p>
        : Object.entries(widgets).map(([id, v]) => (
          <div className="row" key={id}><span className="muted">{id}</span><span>{JSON.stringify(v)}</span></div>
        ))}
      <h3 style={{ marginTop: 16 }}>Event log</h3>
      <div className="log">
        {log.length === 0 && <p className="muted">Interact with the graph…</p>}
        {log.map((line, i) => <div key={i}>{line}</div>)}
      </div>
    </XenolithPanel>
  )
}

export function EventsDemo() {
  return (
    <DemoStage>
      <XenolithGraph className="xeno" resizeToWindow={false} onReady={loadDemo}>
        <EventsPanel />
      </XenolithGraph>
    </DemoStage>
  )
}
