import { describe, it, expect, vi } from 'vitest'
import { ContextMenuRegistry, type ContextMenuTarget } from './context-menu.js'
import type { NodeId, EdgeId } from '@xenolithengine/graph-core'

const NID = (s: string): NodeId => s as unknown as NodeId
const EID = (s: string): EdgeId => s as unknown as EdgeId

describe('ContextMenuRegistry', () => {
  it('registers a node item and returns its EdgeMenuItem on itemsFor(node)', () => {
    const reg = new ContextMenuRegistry()
    const onSelect = vi.fn()
    reg.registerNodeItem({ label: 'Echo', hint: 'log', onSelect })

    const out = reg.itemsFor({ kind: 'node', nodeId: NID('n1') })
    expect(out.end).toHaveLength(1)
    expect(out.end[0]!.label).toBe('Echo')
    expect(out.end[0]!.hint).toBe('log')
    out.end[0]!.onSelect()
    expect(onSelect).toHaveBeenCalledWith({ kind: 'node', nodeId: 'n1' })
  })

  it('omits hint when not provided (EdgeMenuItem hint is optional)', () => {
    const reg = new ContextMenuRegistry()
    reg.registerNodeItem({ label: 'Plain', onSelect: () => {} })
    const out = reg.itemsFor({ kind: 'node', nodeId: NID('n1') })
    expect(out.end[0]!.hint).toBeUndefined()
  })

  it('drops items whose when() returns false', () => {
    const reg = new ContextMenuRegistry()
    reg.registerNodeItem({ label: 'OnlyN2', when: (t) => t.nodeId === 'n2', onSelect: () => {} })
    expect(reg.itemsFor({ kind: 'node', nodeId: NID('n1') }).end).toEqual([])
    expect(reg.itemsFor({ kind: 'node', nodeId: NID('n2') }).end).toHaveLength(1)
  })

  it('placement: "start" items separate from "end" items', () => {
    const reg = new ContextMenuRegistry()
    reg.registerNodeItem({ label: 'A', placement: 'start', onSelect: () => {} })
    reg.registerNodeItem({ label: 'B',                    onSelect: () => {} })
    reg.registerNodeItem({ label: 'C', placement: 'start', onSelect: () => {} })
    const out = reg.itemsFor({ kind: 'node', nodeId: NID('n1') })
    expect(out.start.map((i) => i.label)).toEqual(['A', 'C'])
    expect(out.end.map((i) => i.label)).toEqual(['B'])
  })

  it('registerEdgeItem / registerCanvasItem only fire for their target kind', () => {
    const reg = new ContextMenuRegistry()
    reg.registerNodeItem({   label: 'N', onSelect: () => {} })
    reg.registerEdgeItem({   label: 'E', onSelect: () => {} })
    reg.registerCanvasItem({ label: 'C', onSelect: () => {} })
    expect(reg.itemsFor({ kind: 'node',   nodeId: NID('n') }).end.map((i) => i.label)).toEqual(['N'])
    expect(reg.itemsFor({ kind: 'edge',   edgeId: EID('e') }).end.map((i) => i.label)).toEqual(['E'])
    expect(reg.itemsFor({ kind: 'canvas', worldPosition: { x: 0, y: 0 } }).end.map((i) => i.label)).toEqual(['C'])
  })

  it('unsubscribe returned from register* removes the item', () => {
    const reg = new ContextMenuRegistry()
    const off = reg.registerNodeItem({ label: 'Once', onSelect: () => {} })
    expect(reg.itemsFor({ kind: 'node', nodeId: NID('n') }).end).toHaveLength(1)
    off()
    expect(reg.itemsFor({ kind: 'node', nodeId: NID('n') }).end).toHaveLength(0)
  })

  it('canvas item receives the world position via the target', () => {
    const reg = new ContextMenuRegistry()
    let got: ContextMenuTarget | null = null
    reg.registerCanvasItem({ label: 'Spawn', onSelect: (t) => { got = t } })
    const out = reg.itemsFor({ kind: 'canvas', worldPosition: { x: 42, y: 7 } })
    out.end[0]!.onSelect()
    expect(got).toEqual({ kind: 'canvas', worldPosition: { x: 42, y: 7 } })
  })
})
