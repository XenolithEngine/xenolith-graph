// Comment frames: PIXI views, selection, and drag. The editor owns the layers and the command bus;
// this type owns the per-comment view map so that code does not live in XenolithEditor.
import type { Container, FederatedPointerEvent } from 'pixi.js'
import {
  MoveComment,
  MoveNode,
  ResizeComment,
  SetCommentText,
  nodesInsideComment,
  type CommandBus,
  type Comment,
  type CommentId,
  type EdgeId,
  type Graph,
  type NodeId,
  type Selection,
} from '@xenolithengine/graph-core'
import { renderComment, type CommentView, type Viewport, type XenolithTheme } from '@xenolithengine/graph-render-pixi'
import type { EdgeContextMenu } from './edge-menu.js'
import type { WidgetOverlay } from './widget-overlay.js'
import type { NodeView } from '@xenolithengine/graph-render-pixi'

type Drag =
  | { kind: 'move'; id: CommentId; startScreen: { x: number; y: number }; commentStart: { x: number; y: number }; nodeStarts: Map<NodeId, { x: number; y: number }> }
  | { kind: 'resize'; id: CommentId; startScreen: { x: number; y: number }; sizeStart: { x: number; y: number } }

export interface CommentControllerDeps {
  graph: () => Graph
  commandBus: () => CommandBus
  selection: Selection
  theme: () => XenolithTheme
  viewport: Viewport
  commentsLayer: Container
  commentHeadersLayer: Container
  views: Map<NodeId, NodeView>
  edgesByNode: Map<NodeId, EdgeId[]>
  lodLevel: () => string
  interactive: () => boolean
  requestRender: () => void
  redrawEdge: (id: EdgeId) => void
  virtualizeActive: () => boolean
  virtualizeBands: () => { inner: { x: number; y: number; width: number; height: number }; outer: { x: number; y: number; width: number; height: number } }
  rectIntersects: (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) => boolean
  ensureEdgeMenu: () => EdgeContextMenu
  ensureWidgetOverlay: () => WidgetOverlay
  updateVisualStates: () => void
  removeComment: (id: CommentId) => void
  setCommentColor: (id: CommentId, color: string) => void
}

export class CommentController {
  readonly #d: CommentControllerDeps
  readonly #views = new Map<CommentId, CommentView>()
  #drag: Drag | null = null
  #lastTap = 0
  readonly #selected = new Set<CommentId>()

  constructor(deps: CommentControllerDeps) { this.#d = deps }

  isDraggingNode(id: NodeId): boolean {
    return this.#drag?.kind === 'move' && this.#drag.nodeStarts.has(id)
  }
  get dragging(): boolean { return this.#drag !== null }
  selectionSize(): number { return this.#selected.size }
  selectedIds(): CommentId[] { return [...this.#selected] }

  setSimplified(simple: boolean): void {
    for (const v of this.#views.values()) v.setSimplified(simple)
  }

  dropViews(): void {
    for (const v of this.#views.values()) v.destroy()
    this.#views.clear()
  }

  sync(): void {
    const virtualize = this.#d.virtualizeActive()
    const bands = virtualize ? this.#d.virtualizeBands() : null
    const seen = new Set<string>()
    for (const c of this.#d.graph().comments()) {
      seen.add(String(c.id))
      const live = this.#views.has(c.id)
      let want = true
      if (bands) {
        const r = { x: c.position.x, y: c.position.y, width: c.size.x, height: c.size.y }
        want = live ? this.#d.rectIntersects(r, bands.outer) : this.#d.rectIntersects(r, bands.inner)
      }
      if (!want) { if (live) this.#destroyView(c.id); continue }
      this.#ensureView(c as Comment)
    }
    for (const [id] of [...this.#views]) {
      if (!seen.has(String(id))) { this.#destroyView(id); this.#selected.delete(id) }
    }
    this.#d.requestRender()
  }

  updateDrag(screen: { x: number; y: number }): void {
    const d = this.#drag
    if (!d) return
    const zoom = this.#d.viewport.state.zoom
    const dx = (screen.x - d.startScreen.x) / zoom
    const dy = (screen.y - d.startScreen.y) / zoom
    const view = this.#views.get(d.id)
    const c = this.#d.graph().getComment(d.id)
    if (!view || !c) return
    if (d.kind === 'move') {
      view.container.position.set(d.commentStart.x + dx, d.commentStart.y + dy)
      view.headerLayer.position.set(d.commentStart.x + dx, d.commentStart.y + dy)
      const affected = new Set<EdgeId>()
      for (const [nid, start] of d.nodeStarts) {
        this.#d.views.get(nid)?.container.position.set(start.x + dx, start.y + dy)
        for (const eid of this.#d.edgesByNode.get(nid) ?? []) affected.add(eid)
      }
      for (const eid of affected) this.#d.redrawEdge(eid)
    } else {
      const geo = this.#d.theme().tokens.geometry.comment
      const w = Math.max(geo.minWidth, d.sizeStart.x + dx)
      const h = Math.max(geo.minHeight, d.sizeStart.y + dy)
      view.update({ ...(c as Comment), size: { x: w, y: h } })
    }
    this.#d.requestRender()
  }

  endDrag(screen: { x: number; y: number }): void {
    const d = this.#drag
    if (!d) return
    this.#drag = null
    const zoom = this.#d.viewport.state.zoom
    const dx = (screen.x - d.startScreen.x) / zoom
    const dy = (screen.y - d.startScreen.y) / zoom
    if (d.kind === 'move') {
      if (dx === 0 && dy === 0) return
      const bus = this.#d.commandBus()
      bus.transaction(() => {
        bus.apply(new MoveComment(d.id, { x: d.commentStart.x + dx, y: d.commentStart.y + dy }))
        for (const [nid, start] of d.nodeStarts) {
          bus.apply(new MoveNode(nid, { x: start.x + dx, y: start.y + dy }))
        }
      })
    } else {
      const geo = this.#d.theme().tokens.geometry.comment
      const w = Math.max(geo.minWidth, d.sizeStart.x + dx)
      const h = Math.max(geo.minHeight, d.sizeStart.y + dy)
      this.#d.commandBus().apply(new ResizeComment(d.id, { x: w, y: h }))
    }
  }

  selectExclusive(id: CommentId): void { this.#select(id) }

  clearSelection(): void {
    if (this.#selected.size === 0) return
    for (const id of this.#selected) this.#views.get(id)?.setVisualState('default')
    this.#selected.clear()
  }

  selectAll(): void {
    this.clearSelection()
    for (const c of this.#d.graph().comments()) {
      this.#selected.add(c.id)
      this.#views.get(c.id)?.setVisualState('selected')
    }
  }

  #destroyView(id: CommentId): void {
    const v = this.#views.get(id)
    if (!v) return
    v.destroy()
    this.#views.delete(id)
  }

  #ensureView(c: Comment): void {
    const existing = this.#views.get(c.id)
    if (existing) { existing.update(c); return }
    const theme = this.#d.theme()
    const view = renderComment(c, theme.tokens, theme.commentHeaderStyle ?? 'gradient')
    if (this.#d.lodLevel() !== 'full') view.setSimplified(true)
    if (this.#selected.has(c.id)) view.setVisualState('selected')
    this.#views.set(c.id, view)
    this.#d.commentsLayer.addChild(view.container)
    this.#d.commentHeadersLayer.addChild(view.headerLayer)
    this.#wire(c.id, view)
  }

  #select(id: CommentId): void {
    if (this.#selected.size === 1 && this.#selected.has(id)) return
    this.clearSelection()
    if (this.#d.selection.size > 0) { this.#d.selection.clear(); this.#d.updateVisualStates() }
    this.#selected.add(id)
    const v = this.#views.get(id)
    if (v) {
      v.setVisualState('selected')
      this.#d.commentsLayer.setChildIndex(v.container, this.#d.commentsLayer.children.length - 1)
      this.#d.commentHeadersLayer.setChildIndex(v.headerLayer, this.#d.commentHeadersLayer.children.length - 1)
    }
    this.#d.requestRender()
  }

  #wire(id: CommentId, view: CommentView): void {
    view.header.on('pointerover', () => { if (!this.#selected.has(id)) { view.setVisualState('hover'); this.#d.requestRender() } })
    view.header.on('pointerout', () => { if (!this.#selected.has(id)) { view.setVisualState('default'); this.#d.requestRender() } })
    view.header.on('rightdown', (e: FederatedPointerEvent) => {
      if (!this.#d.interactive()) return
      e.stopPropagation()
      this.#d.ensureEdgeMenu().open({ x: e.global.x, y: e.global.y }, [
        { label: 'Rename', onSelect: () => this.#editText(id, view) },
        { label: 'Colour…', onSelect: () => this.#editColor(id, view) },
        { label: 'Delete', onSelect: () => this.#d.removeComment(id) },
      ])
    })
    view.header.on('pointerdown', (e: FederatedPointerEvent) => {
      if (e.button !== 0 || !this.#d.interactive()) return
      e.stopPropagation()
      this.#select(id)
      const now = performance.now()
      if (now - this.#lastTap < 320) {
        this.#lastTap = 0
        this.#drag = null
        requestAnimationFrame(() => this.#editText(id, this.#views.get(id) ?? view))
        return
      }
      this.#lastTap = now
      const c = this.#d.graph().getComment(id)
      if (!c) return
      const members = nodesInsideComment(c, [...this.#d.graph().nodes()])
      const nodeStarts = new Map<NodeId, { x: number; y: number }>()
      for (const nid of members) {
        const n = this.#d.graph().getNode(nid)
        if (n) nodeStarts.set(nid, { x: n.position.x, y: n.position.y })
      }
      this.#drag = {
        kind: 'move', id,
        startScreen: { x: e.global.x, y: e.global.y },
        commentStart: { x: c.position.x, y: c.position.y },
        nodeStarts,
      }
    })
    view.resizeHandle.on('pointerdown', (e: FederatedPointerEvent) => {
      if (e.button !== 0 || !this.#d.interactive()) return
      e.stopPropagation()
      const c = this.#d.graph().getComment(id)
      if (!c) return
      this.#drag = { kind: 'resize', id, startScreen: { x: e.global.x, y: e.global.y }, sizeStart: { x: c.size.x, y: c.size.y } }
    })
  }

  #editText(id: CommentId, view: CommentView): void {
    const c = this.#d.graph().getComment(id)
    if (!c) return
    const vp = this.#d.viewport.state
    const sx = c.position.x * vp.zoom + vp.x
    const sy = c.position.y * vp.zoom + vp.y
    const t = this.#d.theme().tokens
    const ct = t.typography.comment
    const base = c as Comment
    view.setEditing(true)
    this.#d.requestRender()
    this.#d.ensureWidgetOverlay().editText({
      rect: { x: sx, y: sy, width: c.size.x * vp.zoom, height: view.headerHeight * vp.zoom },
      value: c.text,
      style: {
        background: 'transparent', text: 'transparent', border: 'transparent', borderWidth: 0, radius: 0,
        paddingX: 10 * vp.zoom, paddingY: 2 * vp.zoom,
        fontSize: ct.size * vp.zoom, fontFamily: t.typography.fontFamily, fontWeight: '700',
        placeholder: '', selection: 'transparent',
      },
      caretColor: ct.color,
      selectAll: false,
      autoGrow: true,
      onInput: (text: string) => { this.#views.get(id)?.update({ ...base, text }); this.#d.requestRender() },
      onCommit: (text: string) => { this.#d.commandBus().apply(new SetCommentText(id, text)); this.sync() },
      onClose: () => { this.#views.get(id)?.setEditing(false); this.sync() },
    })
  }

  #editColor(id: CommentId, view: CommentView): void {
    const c = this.#d.graph().getComment(id)
    if (!c) return
    const vp = this.#d.viewport.state
    const sx = c.position.x * vp.zoom + vp.x
    const sy = c.position.y * vp.zoom + vp.y
    this.#d.ensureWidgetOverlay().editColor({
      rect: { x: sx, y: sy, width: c.size.x * vp.zoom, height: view.headerHeight * vp.zoom },
      value: c.color ?? '#8A38F5',
      onInput: (hex: string) => { view.update({ ...(c as Comment), color: hex }); this.#d.requestRender() },
      onCommit: (hex: string) => this.#d.setCommentColor(id, hex),
    })
  }
}
