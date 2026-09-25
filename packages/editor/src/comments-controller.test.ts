// @vitest-environment jsdom
// Unit tests for CommentController (split tranche 1, 2026-09-25). `renderComment` is mocked —
// comment DRAWING is covered by renderer visual tests + e2e; these tests exercise the controller
// logic: view lifecycle + virtualized sync, spatial group-drag (members move with the comment),
// resize with min-clamping, selection semantics, double-tap rename, and the header context menu.
// Tests written after the implementation by a different agent — adversarial review recommended.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  AddComment, AddNode, CommandBus, EventEmitter, Graph, RemoveComment, Selection,
  createCommentId,
  type Comment, type CoreEvents, type Node, type NodeId,
} from '@xenolithengine/graph-core'
import { CommentController, type CommentControllerDeps } from './comments-controller.js'
import { xenTheme, type CommentView } from '@xenolithengine/graph-render-pixi'
import type * as RenderPixi from '@xenolithengine/graph-render-pixi'

// jsdom without pretendToBeVisual has no rAF; the double-tap rename defers one frame.
if (typeof globalThis.requestAnimationFrame !== 'function') {
  ;(globalThis as { requestAnimationFrame: (cb: () => void) => number }).requestAnimationFrame =
    (cb) => setTimeout(() => cb(), 0) as unknown as number
}

interface Rect { x: number; y: number; width: number; height: number }

class FakeEmitter {
  #handlers = new Map<string, Array<(e: unknown) => void>>()
  on(type: string, fn: (e: unknown) => void): void {
    const arr = this.#handlers.get(type) ?? []
    arr.push(fn)
    this.#handlers.set(type, arr)
  }
  emit(type: string, e: unknown): void { for (const fn of this.#handlers.get(type) ?? []) fn(e) }
}

/** Fake CommentView — records position.set calls, visual states, updates, destroy. */
function mkFakeView(): CommentView & { calls: string[]; pos: { x: number; y: number }; headerPos: { x: number; y: number } } {
  const calls: string[] = []
  const pos = { x: 0, y: 0 }
  const headerPos = { x: 0, y: 0 }
  const setInto = (target: { x: number; y: number }, label: string) =>
    (x: number, y: number) => { target.x = x; target.y = y; calls.push(label) }
  return {
    calls, pos, headerPos,
    container: { position: { set: setInto(pos, 'container.set') } },
    headerLayer: { position: { set: setInto(headerPos, 'headerLayer.set') } },
    header: new FakeEmitter(),
    resizeHandle: new FakeEmitter(),
    headerHeight: 28,
    setSimplified: (s: boolean) => { calls.push(`simplified:${s}`) },
    setVisualState: (v: string) => { calls.push(`visual:${v}`) },
    update: () => { calls.push('update') },
    setEditing: (e: boolean) => { calls.push(`editing:${e}`) },
    destroy: () => { calls.push('destroy') },
  } as unknown as CommentView & { calls: string[]; pos: { x: number; y: number }; headerPos: { x: number; y: number } }
}

const hoist = vi.hoisted(() => ({ views: [] as Array<ReturnType<typeof mkFakeView>> }))
vi.mock('@xenolithengine/graph-render-pixi', async (importOriginal) => {
  const orig = await importOriginal<typeof RenderPixi>()
  return {
    ...orig,
    renderComment: () => { const v = mkFakeView(); hoist.views.push(v); return v },
  }
})

const intersects = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y

const mkLayer = (): never =>
  ({ children: [], addChild(c: unknown) { this.children.push(c) }, setChildIndex() {} }) as never

const mkNode = (id: string, x: number, y: number): Node =>
  ({ id: id as unknown as NodeId, type: 'Test', position: { x, y }, size: { x: 50, y: 50 }, state: {}, pins: [] }) as Node

function harness() {
  const graph = new Graph()
  const bus = new CommandBus({ graph, events: new EventEmitter<CoreEvents>() })
  const selection = new Selection()
  const views = new Map<NodeId, { container: { position: { x: number; y: number } } }>()
  const flags = { virtualize: false }
  const bands = { inner: { x: -1000, y: -1000, width: 2000, height: 2000 }, outer: { x: -2000, y: -2000, width: 4000, height: 4000 } }
  const overlay = { editText: vi.fn(), editColor: vi.fn() }
  const edgeMenu = { open: vi.fn() }
  const deps: CommentControllerDeps = {
    graph: () => graph,
    commandBus: () => bus,
    selection,
    theme: () => xenTheme,
    viewport: { state: { x: 0, y: 0, zoom: 1 } } as never,
    commentsLayer: mkLayer(),
    commentHeadersLayer: mkLayer(),
    views: views as never,
    edgesByNode: new Map(),
    lodLevel: () => 'full',
    interactive: () => true,
    requestRender: vi.fn(),
    redrawEdge: vi.fn(),
    virtualizeActive: () => flags.virtualize,
    virtualizeBands: () => bands,
    rectIntersects: intersects,
    ensureEdgeMenu: () => edgeMenu as never,
    ensureWidgetOverlay: () => overlay as never,
    updateVisualStates: vi.fn(),
    removeComment: vi.fn(),
    setCommentColor: vi.fn(),
  }
  const ctl = new CommentController(deps)

  const addComment = (rect: Rect, text = 'Group'): Comment => {
    const c: Comment = { id: createCommentId(), position: { x: rect.x, y: rect.y }, size: { x: rect.width, y: rect.height }, text }
    bus.apply(new AddComment(c))
    return c
  }
  const addNode = (id: string, x: number, y: number): Node => {
    const n = mkNode(id, x, y)
    bus.apply(new AddNode(n))
    views.set(n.id, {
      container: {
        position: {
          x, y,
          set(sx: number, sy: number) { this.x = sx; this.y = sy },
        },
      },
    } as never)
    return n
  }
  /** Comment at (100,100) 300×200 with two nodes inside and one outside. */
  const scene = () => {
    const c = addComment({ x: 100, y: 100, width: 300, height: 200 })
    addNode('inside1', 120, 120)
    addNode('inside2', 200, 180)
    addNode('outside', 500, 500)
    ctl.sync()
    const view = hoist.views.at(-1)!
    return { c, view }
  }
  const pointerDown = (emitter: FakeEmitter, x = 10, y = 10) =>
    emitter.emit('pointerdown', { button: 0, global: { x, y }, stopPropagation: () => {} })
  return { ctl, deps, graph, bus, selection, views, flags, bands, overlay, edgeMenu, addComment, addNode, scene, pointerDown }
}

beforeEach(() => { hoist.views.length = 0 })

describe('CommentController — view lifecycle', () => {
  it('sync() creates one view per comment and prunes destroyed comments (incl. selection)', () => {
    const h = harness()
    const c1 = h.addComment({ x: 0, y: 0, width: 100, height: 80 })
    h.addComment({ x: 500, y: 0, width: 100, height: 80 })
    h.ctl.sync()
    expect(hoist.views.length).toBe(2)
    h.ctl.selectExclusive(c1.id)
    expect(h.ctl.selectionSize()).toBe(1)
    h.bus.apply(new RemoveComment(c1.id))
    h.ctl.sync()
    expect(hoist.views.filter((v) => !v.calls.includes('destroy')).length).toBe(1)
    expect(h.ctl.selectionSize()).toBe(0)
  })

  it('sync() keeps live views outside the OUTER band but creates new ones only inside the INNER band', () => {
    const h = harness()
    h.flags.virtualize = true
    h.bands.inner = { x: 0, y: 0, width: 400, height: 400 }
    h.bands.outer = { x: -1000, y: -1000, width: 2400, height: 2400 }
    const near = h.addComment({ x: 100, y: 100, width: 100, height: 80 }, 'near')
    const far = h.addComment({ x: 500, y: 500, width: 100, height: 80 }, 'far') // outside inner, inside outer
    h.ctl.sync()
    expect(hoist.views.length).toBe(1) // near only — far is created lazily when it enters the inner band
    // Pan the camera: `far` crosses into the inner band → view appears.
    h.bands.inner = { x: 400, y: 400, width: 400, height: 400 }
    h.ctl.sync()
    expect(hoist.views.length).toBe(2)
    // `near` leaves the outer band → its live view is destroyed.
    h.bands.outer = { x: 400, y: 400, width: 400, height: 400 }
    h.ctl.sync()
    expect(hoist.views.filter((v) => v.calls.includes('destroy')).length).toBe(1)
    void near; void far
  })

  it('setSimplified / dropViews touch every live view', () => {
    const h = harness()
    h.addComment({ x: 0, y: 0, width: 100, height: 80 })
    h.addComment({ x: 300, y: 0, width: 100, height: 80 })
    h.ctl.sync()
    h.ctl.setSimplified(true)
    expect(hoist.views.every((v) => v.calls.includes('simplified:true'))).toBe(true)
    h.ctl.dropViews()
    expect(hoist.views.every((v) => v.calls.includes('destroy'))).toBe(true)
  })
})

describe('CommentController — selection', () => {
  it('selectExclusive marks the comment, raises z-order, and clears a node selection', () => {
    const h = harness()
    const { c, view } = h.scene()
    h.selection.replaceWith(['inside1' as NodeId])
    h.ctl.selectExclusive(c.id)
    expect(h.ctl.selectedIds()).toEqual([c.id])
    expect(view.calls).toContain('visual:selected')
    expect(h.selection.size).toBe(0)
    expect(h.deps.updateVisualStates).toHaveBeenCalled()
    // Re-selecting the same single comment is a no-op (no second visual flip).
    const flips = view.calls.filter((s) => s === 'visual:selected').length
    h.ctl.selectExclusive(c.id)
    expect(view.calls.filter((s) => s === 'visual:selected').length).toBe(flips)
  })

  it('selectAll / clearSelection round-trip', () => {
    const h = harness()
    h.addComment({ x: 0, y: 0, width: 100, height: 80 })
    h.addComment({ x: 300, y: 0, width: 100, height: 80 })
    h.ctl.sync()
    h.ctl.selectAll()
    expect(h.ctl.selectionSize()).toBe(2)
    h.ctl.clearSelection()
    expect(h.ctl.selectionSize()).toBe(0)
  })

  it('header hover flips visual state only while unselected', () => {
    const h = harness()
    const { c, view } = h.scene()
    ;(view.header as unknown as FakeEmitter).emit('pointerover', {})
    expect(view.calls).toContain('visual:hover')
    ;(view.header as unknown as FakeEmitter).emit('pointerout', {})
    expect(view.calls).toContain('visual:default')
    h.ctl.selectExclusive(c.id)
    const before = view.calls.length
    ;(view.header as unknown as FakeEmitter).emit('pointerover', {})
    ;(view.header as unknown as FakeEmitter).emit('pointerout', {})
    expect(view.calls.length).toBe(before) // selected comments keep their state through hover
  })
})

describe('CommentController — spatial group-drag', () => {
  it('header pointerdown captures nodesInsideComment as drag members', () => {
    const h = harness()
    const { view } = h.scene()
    h.pointerDown(view.header as unknown as FakeEmitter)
    expect(h.ctl.dragging).toBe(true)
    expect(h.ctl.isDraggingNode('inside1' as NodeId)).toBe(true)
    expect(h.ctl.isDraggingNode('inside2' as NodeId)).toBe(true)
    expect(h.ctl.isDraggingNode('outside' as NodeId)).toBe(false)
  })

  it('move drag commits comment + members as ONE transaction; non-members stay; one undo reverts all', () => {
    const h = harness()
    const { c, view } = h.scene()
    const before = {
      comment: { ...c.position },
      inside1: { ...h.graph.getNode('inside1' as NodeId)!.position },
      outside: { ...h.graph.getNode('outside' as NodeId)!.position },
    }
    h.pointerDown(view.header as unknown as FakeEmitter, 10, 10)
    h.ctl.updateDrag({ x: 60, y: 30 }) // +50/+20 world px at zoom 1
    h.ctl.endDrag({ x: 60, y: 30 })
    expect(h.graph.getComment(c.id)!.position).toEqual({ x: before.comment.x + 50, y: before.comment.y + 20 })
    expect(h.graph.getNode('inside1' as NodeId)!.position).toEqual({ x: before.inside1.x + 50, y: before.inside1.y + 20 })
    expect(h.graph.getNode('outside' as NodeId)!.position).toEqual(before.outside)
    // One undo reverts the WHOLE group move (single transaction: MoveComment + both MoveNodes).
    h.bus.undo()
    expect(h.graph.getComment(c.id)!.position).toEqual(before.comment)
    expect(h.graph.getNode('inside1' as NodeId)!.position).toEqual(before.inside1)
    // Live views moved during the drag, before any commit.
    expect(view.pos).toEqual({ x: before.comment.x + 50, y: before.comment.y + 20 })
  })

  it('move drag divides screen delta by zoom (zoom 2 → half the world delta)', () => {
    const h = harness()
    const { c, view } = h.scene()
    const startX = c.position.x
    ;(h.deps.viewport.state as { zoom: number }).zoom = 2
    h.pointerDown(view.header as unknown as FakeEmitter, 0, 0)
    h.ctl.updateDrag({ x: 100, y: 0 })
    h.ctl.endDrag({ x: 100, y: 0 })
    expect(h.graph.getComment(c.id)!.position.x).toBe(startX + 50)
  })

  it('zero-delta endDrag does not commit a move', () => {
    const h = harness()
    const { c, view } = h.scene()
    const start = { ...c.position }
    h.pointerDown(view.header as unknown as FakeEmitter, 10, 10)
    h.ctl.endDrag({ x: 10, y: 10 })
    expect(h.graph.getComment(c.id)!.position).toEqual(start)
    expect(h.ctl.dragging).toBe(false)
  })
})

describe('CommentController — resize', () => {
  it('resize drag applies ResizeComment clamped to the theme minimums', () => {
    const h = harness()
    const { c, view } = h.scene()
    const geo = xenTheme.tokens.geometry.comment
    h.pointerDown(view.resizeHandle as unknown as FakeEmitter, 0, 0)
    expect(h.ctl.dragging).toBe(true)
    h.ctl.updateDrag({ x: -1000, y: -1000 }) // try to shrink below the floor
    h.ctl.endDrag({ x: -1000, y: -1000 })
    const after = h.graph.getComment(c.id)!
    expect(after.size.x).toBe(geo.minWidth)
    expect(after.size.y).toBe(geo.minHeight)
  })

  it('grow resize keeps the requested size', () => {
    const h = harness()
    const { c, view } = h.scene()
    const start = { ...c.size }
    h.pointerDown(view.resizeHandle as unknown as FakeEmitter, 0, 0)
    h.ctl.updateDrag({ x: 100, y: 40 })
    h.ctl.endDrag({ x: 100, y: 40 })
    expect(h.graph.getComment(c.id)!.size).toEqual({ x: start.x + 100, y: start.y + 40 })
  })
})

describe('CommentController — header menu & rename', () => {
  it('rightdown opens Rename / Colour… / Delete; Delete routes to removeComment', () => {
    const h = harness()
    const { view } = h.scene()
    ;(view.header as unknown as FakeEmitter).emit('rightdown', { global: { x: 5, y: 5 }, stopPropagation: () => {} })
    expect(h.edgeMenu.open).toHaveBeenCalledTimes(1)
    const items = h.edgeMenu.open.mock.calls[0]![1] as Array<{ label: string; onSelect: () => void }>
    expect(items.map((i) => i.label)).toEqual(['Rename', 'Colour…', 'Delete'])
    items.find((i) => i.label === 'Delete')!.onSelect()
    expect(h.deps.removeComment).toHaveBeenCalled()
  })

  it('double-tap opens text edit with the current text; commit writes SetCommentText to the model', async () => {
    const h = harness()
    const { c, view } = h.scene()
    const header = view.header as unknown as FakeEmitter
    h.pointerDown(header)
    h.pointerDown(header) // second tap within the 320ms window → rename
    await new Promise((r) => setTimeout(r, 20))
    expect(h.overlay.editText).toHaveBeenCalledTimes(1)
    const opts = h.overlay.editText.mock.calls[0]![0] as { value: string; onCommit: (t: string) => void; onClose: () => void }
    expect(opts.value).toBe('Group')
    expect(view.calls).toContain('editing:true')
    opts.onCommit('Renamed')
    expect(h.graph.getComment(c.id)!.text).toBe('Renamed')
    opts.onClose()
    expect(view.calls).toContain('editing:false')
  })

  it('colour edit commits through setCommentColor', () => {
    const h = harness()
    const { c, view } = h.scene()
    ;(view.header as unknown as FakeEmitter).emit('rightdown', { global: { x: 5, y: 5 }, stopPropagation: () => {} })
    const items = h.edgeMenu.open.mock.calls[0]![1] as Array<{ label: string; onSelect: () => void }>
    items.find((i) => i.label === 'Colour…')!.onSelect()
    const opts = h.overlay.editColor.mock.calls[0]![0] as { onCommit: (hex: string) => void }
    opts.onCommit('#ff0000')
    expect(h.deps.setCommentColor).toHaveBeenCalledWith(c.id, '#ff0000')
  })
})
