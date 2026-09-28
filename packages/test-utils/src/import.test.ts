// @vitest-environment jsdom
// Editor-level contract for editor.importReactFlow (E3): the wrapper loads the converted
// document into the REAL editor and hands back the loss report. The mapping itself is covered
// by packages/editor/src/import-reactflow.test.ts (pure, golden fixtures).
import { describe, it, expect, afterEach } from 'vitest'
import { renderEditorToDOM, type EditorToDOMHandle } from './index.js'

let mounted: EditorToDOMHandle | null = null
afterEach(() => {
  mounted?.unmount()
  mounted = null
})

const RF_JSON = {
  nodes: [
    { id: 'a', type: 'source', position: { x: 0, y: 0 }, data: { label: 'Feed' } },
    { id: 'b', type: 'sink', position: { x: 200, y: 0 } },
    { id: 'c', type: 'sink', position: { x: 400, y: 0 }, selected: true },
  ],
  edges: [
    { id: 'e1', source: 'a', sourceHandle: 'out', target: 'b', targetHandle: 'in', animated: true },
    { id: 'e2', source: 'a', sourceHandle: 'out', target: 'ghost', targetHandle: 'in' },
  ],
}

describe('editor.importReactFlow() — real editor', () => {
  it('loads the converted graph and returns the report', async () => {
    const h = await renderEditorToDOM()
    mounted = h
    const report = h.editor.importReactFlow(RF_JSON)
    const json = h.editor.toJSON()
    expect(json.nodes).toHaveLength(3)
    expect(json.edges).toHaveLength(1) // e2 dropped: unknown endpoint
    expect(report.unknownNodes).toEqual(['ghost'])
    expect(report.counts).toEqual({ nodes: 3, edges: 1, pins: 2 })
    expect(report.droppedFields['node.selected']).toBe(1)
    expect(h.editor.getEdgeOptions(json.edges[0]!.id)?.animated).toBe(true)
  })

  it('inferType flows through the wrapper', async () => {
    const h = await renderEditorToDOM()
    mounted = h
    h.editor.importReactFlow(RF_JSON, { inferType: () => 'float' })
    const json = h.editor.toJSON()
    for (const pin of json.nodes[0]!.pins) expect(pin.type).toBe('float')
  })
})
