// CHAPTER 6 — Save / Load (React).
//
// Same patterns as the vanilla version, idiomatic to React: `useGraphJSON()` is the live JSON of
// the scene (recomputed on every mutation, undo, redo). Use it for autosave, downloads, "is dirty"
// indicators — anything that needs the current serialised graph as state. Toolbar lives in a
// `<XenolithPanel>`; buttons are themed via `<XenolithButton>`.

import { useEffect, useRef, useState } from 'react'
import { XenolithGraph, XenolithPanel, XenolithButton, useEditor, useGraphJSON } from '@xenolithengine/graph-react'
import type { NodeSchema, XenolithGraphV1 } from '@xenolithengine/graph-editor'
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

const seedGraph = {
  version: 'xenolith.v1',
  nodes: [
    { id: 'greeter', type: 'Greeter', position: { x: -240, y: 0 }, state: { msg: 'Hello, Xenolith', volume: 60 } },
    { id: 'upper',   type: 'ToUpper', position: { x:  200, y: 0 }, state: {} },
  ],
  edges: [
    { id: 'e1', from: { node: 'greeter', pin: 'greeter:Out' }, to: { node: 'upper', pin: 'upper:In' } },
  ],
}

const STORAGE_KEY = 'xeno-tutorial-ch6-react'

/** Toolbar — runs inside the editor via <XenolithPanel>. Uses `useGraphJSON` for autosave and
 *  download; `useEditor` for the imperative `loadJSON` / `fitView` calls that don't have a
 *  declarative equivalent. */
function SaveLoadToolbar({ onBoot }: { onBoot: () => void }) {
  const editor = useEditor()
  const graph = useGraphJSON()
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [tick, setTick] = useState(0)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Autosave: every change to the live JSON re-schedules a debounced write.
  useEffect(() => {
    if (!graph) return
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(graph)); setSavedAt(Date.now()) } catch { /* quota */ }
    }, 250)
    return () => { if (debounce.current) clearTimeout(debounce.current) }
  }, [graph])

  // 1Hz tick so the "Xs ago" label stays live.
  useEffect(() => {
    const i = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(i)
  }, [])

  const status = savedAt === null
    ? 'Seed graph'
    : `Autosaved · ${Math.max(0, Math.round((Date.now() - savedAt) / 1000))}s ago` + (tick ? '' : '')

  const download = (): void => {
    if (!graph) return
    const blob = new Blob([JSON.stringify(graph, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'graph.json'; a.click()
    URL.revokeObjectURL(url)
  }
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      editor.loadJSON(JSON.parse(await file.text()))
      editor.view.fitView({ padding: 80, maxZoom: 1 })
      setSavedAt(null)
    } catch (err) { console.error(err) }
    e.target.value = ''
  }
  const reset = (): void => {
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
    editor.loadJSON(seedGraph)
    editor.view.fitView({ padding: 80, maxZoom: 1 })
    setSavedAt(null); onBoot()
  }

  return (
    <XenolithPanel
      position="top-right"
      bare
      style={{
        display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 12px', borderRadius: 6,
        background: 'rgba(0,0,0,0.45)', color: '#e8e8e8',
        font: '12px/1.5 var(--xn-mono, ui-monospace, monospace)',
        marginTop: 8, marginRight: 8,
      }}
    >
      <div style={{ display: 'flex', gap: 6 }}>
        <XenolithButton onClick={download}>Download .json</XenolithButton>
        <XenolithButton onClick={() => fileRef.current?.click()}>Load .json</XenolithButton>
        <XenolithButton onClick={reset} style={{ background: 'transparent', color: '#aaa' }}>Reset</XenolithButton>
      </div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
        {status}
      </div>
      <input ref={fileRef} type="file" accept="application/json" hidden onChange={onFile} />
    </XenolithPanel>
  )
}

export function Chapter06() {
  // Boot from localStorage when available — keeps the demo "sticky" across page reloads.
  const initial = (() => {
    try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? (JSON.parse(raw) as XenolithGraphV1) : seedGraph } catch { return seedGraph }
  })()
  const [bootKey, setBootKey] = useState(0)

  return (
    <DemoStage>
      <XenolithGraph
        key={bootKey}
        className="xeno"
        resizeToWindow={false}
        onReady={(editor) => {
          editor.registry.register(greeterSchema)
          editor.registry.register(toUpperSchema)
          editor.loadJSON(initial)
          editor.view.fitView({ padding: 80, maxZoom: 1 })
        }}
      >
        <SaveLoadToolbar onBoot={() => setBootKey((n) => n + 1)} />
      </XenolithGraph>
    </DemoStage>
  )
}
