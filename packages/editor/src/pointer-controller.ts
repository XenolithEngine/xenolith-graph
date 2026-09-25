// Pointer/gesture state machines (stage + node wiring, node/pin/widget drags, Alt-rewire).
// Deliberately NO unit tests: every method consumes FederatedPointerEvent streams and live
// host view state, so headless doubles would re-implement the module. Coverage lives in the
// Playwright suite — apps/playground/tests/e2e: drag-jitter, marquee-hidden, select-all,
// widget-canon (widget drags + hit testing), connect-* / edge-insert (pin drags, Alt-rewire),
// macro*.spec (group drag). If a pure decision helper is ever extracted from here, unit-test
// it in pointer-controller.test.ts.
import { Graphics, type Container, type ContainerChild, type FederatedPointerEvent } from 'pixi.js'
import type { Application } from 'pixi.js'
import {
  ConnectPins,
  DisconnectEdge,
  MoveNode,
  clampWidgetValue,
  comboOptions,
  createEdgeId,
  isMacro,
  widgetValue,
  type Edge,
  type EdgeId,
  type EventEmitter,
  type Node,
  type NodeId,
  type Pin,
  type PinId,
  type WidgetSpec,
  type WidgetStyle,
} from '@xenolithengine/graph-core'
import {
  computeGroupSnappedDelta,
  isDomWidgetController,
  nodeBounds,
  readPinHandle,
  rectFromPoints,
  rectIntersects,
  resolveWidgetStyle,
  screenToWorld,
  type CanvasWidgetController,
  type CustomWidgetController,
  type NodeView,
  type PinHandle,
  type PinLayout,
  type RenderEdgeOptions,
  type Viewport,
  type WidgetHit,
  type XenolithTheme,
} from '@xenolithengine/graph-render-pixi'
import type { CommentController } from './comments-controller.js'
import { firePreventable, type EditorEvents } from './events.js'
import type { XenolithEditor } from './index.js'
import { WidgetOverlay, type OverlayRect } from './widget-overlay.js'

const MARQUEE_DRAG_THRESHOLD = 4
const NODE_DRAG_THRESHOLD = 4

type DragState =
  | { kind: 'idle' }
  | { kind: 'pending'; nodeId: NodeId; startScreen: { x: number; y: number }; shift: boolean; alt: boolean }
  | {
      kind: 'active'
      startScreen: { x: number; y: number }
      anchorId: NodeId
      initialPositions: Map<NodeId, { x: number; y: number }>
      affectedEdges: Set<EdgeId>
      alt: boolean
    }
  | {
      kind: 'pin-drag'
      source: PinHandle
      ghost: Graphics
      hoveredTarget: PinHandle | null
      rewireOriginal: Edge | null
    }

type MarqueeState =
  | { kind: 'idle' }
  | { kind: 'pending'; startScreen: { x: number; y: number }; startWorld: { x: number; y: number }; shift: boolean }
  | {
      kind: 'active'
      startScreen: { x: number; y: number }
      startWorld: { x: number; y: number }
      gfx: Graphics
      shift: boolean
    }

export interface PointerHost {
  ed: XenolithEditor
  app: Application
  comments: CommentController
  connectionAllowed: (sourceNode: Node, sourcePin: Pin, targetNode: Node, targetPin: Pin) => boolean
  deepestExpandedMacro: () => NodeId | null
  disposeEdgeGraphics: (edgeId: EdgeId) => void
  drawEdge: (g: Graphics, from: PinLayout, to: PinLayout, opts: RenderEdgeOptions) => Graphics
  edgeHoverGfx: Graphics
  edgeOpts: Map<EdgeId, RenderEdgeOptions>
  edgeRecords: Map<EdgeId, { edge: Edge; graphics: Graphics }>
  edgesAttachedTo: (nodeIds: ReadonlySet<NodeId>) => Set<EdgeId>
  edgesLayer: Container<ContainerChild>
  events: EventEmitter<EditorEvents>
  findIncidentEdgeId: (nodeId: NodeId, pinId: string) => EdgeId | null
  hiddenMembers: Set<NodeId>
  host: HTMLElement
  hoveredEdgeMid: EdgeId | null
  hoveredId: NodeId | null
  interactive: boolean
  isDisplayModeWidget: (node: Node, w: WidgetSpec) => boolean
  lastPointerScreen: { x: number; y: number } | null
  lastPointerWorld: { x: number; y: number } | null
  macroIsAncestor: (ancestor: NodeId, id: NodeId) => boolean
  marqueeHovered: Set<NodeId>
  nodesLayer: Container<ContainerChild>
  pinWorldPosition: (node: Node, pinId: string) => PinLayout | null
  redrawEdge: (edgeId: EdgeId) => void
  requestRender: () => void
  snapSize: number
  theme: XenolithTheme
  updateEdgeMidpointHover: (world: { x: number; y: number }) => void
  updateVisualStates: () => void
  viewport: Viewport
  views: Map<NodeId, NodeView>
  widgetControllers: Map<string, CustomWidgetController>
  widgetOverlay: WidgetOverlay | null
  widgetThemeColors: (spec?: { style?: WidgetStyle }) => { accent: string; text: string; muted: string }
  world: Container<ContainerChild>
}

/** Pointer gestures on the stage: marquee, node drag, pin connect, in-node widget drags. */
export class PointerController {
  #dragState: DragState = { kind: 'idle' }
  /** Drops a marquee owned by the stage closure. Null until wireStageInteraction runs. */
  #cancelMarqueeRef: (() => void) | null = null
  constructor(readonly h: PointerHost) {}

  isDraggingNode(id: NodeId): boolean {
    return this.#dragState.kind === 'active' && this.#dragState.initialPositions.has(id)
  }

  isPinDrag(): boolean {
    return this.#dragState.kind === 'pin-drag'
  }

  wireStageInteraction(): void {
    let marquee: MarqueeState = { kind: 'idle' }
    const stage = this.h.app.stage
    this.#cancelMarqueeRef = () => {
      if (marquee.kind === 'active') {
        marquee.gfx.parent?.removeChild(marquee.gfx)
        marquee.gfx.destroy()
      }
      marquee = { kind: 'idle' }
      this.h.marqueeHovered.clear()
      this.h.requestRender()
    }

    stage.on('pointerdown', (e: FederatedPointerEvent) => {
      if (e.button !== 0) return
      // Locked (non-interactive): no connecting, no marquee, no selection — only viewport pan (RMB)
      // stays live, so you can drag anywhere without grabbing the graph.
      if (!this.h.interactive) return
      this.h.requestRender()
      // A click that reaches the stage (empty canvas / node, not a comment header) drops comment
      // selection — the comment's own header pointerdown stops propagation before this runs.
      if (this.h.comments.selectionSize() > 0) { this.h.comments.clearSelection(); this.h.requestRender() }
      const pin = readPinHandle(e.target)
      if (pin) {
        // Alt+pin on a connected pin = "tear off" the edge and continue dragging the loose
        // end. UE Blueprint convention. If the pin has no incident edges, fall through to a
        // fresh pin-drag from this pin.
        if (e.altKey) {
          const detached = this.detachEdgeFromPin(pin)
          if (detached) {
            this.beginPinDrag(detached.other, e, detached.original)
            e.stopPropagation()
            return
          }
        }
        this.beginPinDrag(pin, e, null)
        e.stopPropagation()
        return
      }
      if (e.target !== stage) return
      // Click-outside: a click on empty canvas while a macro is expanded collapses the innermost open
      // one (the frame body captures clicks inside it, so reaching the stage means truly outside).
      const openMacro = this.h.deepestExpandedMacro()
      if (openMacro) { this.h.ed.collapseMacro(openMacro); return }
      const startScreen = { x: e.global.x, y: e.global.y }
      marquee = {
        kind: 'pending',
        startScreen,
        startWorld: screenToWorld(startScreen, this.h.viewport.state),
        shift: e.shiftKey,
      }
    })

    stage.on('pointermove', (e: FederatedPointerEvent) => {
      const current = { x: e.global.x, y: e.global.y }
      this.h.lastPointerScreen = current
      this.h.lastPointerWorld = screenToWorld(current, this.h.viewport.state)
      if (this.h.comments.dragging) { this.h.comments.updateDrag(current); return }
      // Edge midpoint hover affordance — only while fully idle (no drag / marquee).
      if (this.#dragState.kind === 'idle' && marquee.kind === 'idle') {
        this.h.updateEdgeMidpointHover(this.h.lastPointerWorld)
      } else if (this.h.hoveredEdgeMid) {
        this.h.hoveredEdgeMid = null
        this.h.edgeHoverGfx.clear()
      }
      // Note: no blanket requestRender here. Bare cursor movement over the canvas changes
      // nothing on screen — hover transitions repaint via the node pointerover/pointerout
      // handlers. We only mark dirty inside the branches that actually mutate visuals (active
      // drag, pin-drag ghost, marquee rect).

      if (this.#dragState.kind === 'pin-drag') {
        const target = readPinHandle(e.target)
        this.updatePinDrag(current, target)
        this.h.requestRender()
        return
      }

      if (this.#dragState.kind === 'pending') {
        const dx = current.x - this.#dragState.startScreen.x
        const dy = current.y - this.#dragState.startScreen.y
        if (Math.hypot(dx, dy) >= NODE_DRAG_THRESHOLD) {
          this.beginNodeDrag(this.#dragState.alt)
        }
      }
      if (this.#dragState.kind === 'active') {
        const zoom = this.h.viewport.state.zoom
        const worldDelta = {
          x: (current.x - this.#dragState.startScreen.x) / zoom,
          y: (current.y - this.#dragState.startScreen.y) / zoom,
        }
        // Snap during drag, not only at commit — gives the UE / Figma "node clicks into cells"
        // feel. Hold Alt at any point during the drag to disable. The snap is anchored to the
        // node under the cursor and the resulting delta applied uniformly, so the group's
        // internal layout is preserved (per-node snapping caused off-grid nodes to drift apart).
        const snap = e.altKey || this.#dragState.alt ? null : this.h.snapSize
        const anchorInitial = this.#dragState.initialPositions.get(this.#dragState.anchorId)
        const snappedDelta = anchorInitial
          ? computeGroupSnappedDelta(anchorInitial, worldDelta, snap)
          : worldDelta
        for (const [id, initial] of this.#dragState.initialPositions) {
          const view = this.h.views.get(id)
          if (!view) continue
          view.container.position.set(initial.x + snappedDelta.x, initial.y + snappedDelta.y)
        }
        for (const edgeId of this.#dragState.affectedEdges) this.h.redrawEdge(edgeId)
        this.h.requestRender()
        return
      }

      if (marquee.kind === 'idle') return
      if (marquee.kind === 'pending') {
        const dx = current.x - marquee.startScreen.x
        const dy = current.y - marquee.startScreen.y
        if (Math.hypot(dx, dy) < MARQUEE_DRAG_THRESHOLD) return
        const gfx = new Graphics()
        this.h.world.addChild(gfx)
        marquee = { ...marquee, kind: 'active', gfx }
      }
      if (marquee.kind === 'active') {
        const currentWorld = screenToWorld(current, this.h.viewport.state)
        const rect = rectFromPoints(marquee.startWorld, currentWorld)
        marquee.gfx.clear()
          .rect(rect.x, rect.y, rect.width, rect.height)
          .fill({ color: 'rgba(252, 180, 0, 0.08)' })
          .stroke({ color: '#FCB400', width: 1 / this.h.viewport.state.zoom, alpha: 0.8 })
        this.h.marqueeHovered.clear()
        for (const node of this.h.ed.graph.nodes()) {
          if (this.h.hiddenMembers.has(node.id)) continue // hidden members of a collapsed macro aren't selectable
          if (rectIntersects(rect, nodeBounds(node, this.h.theme.tokens))) {
            this.h.marqueeHovered.add(node.id)
          }
        }
        this.h.updateVisualStates()
        this.h.requestRender()
      }
    })

    const endStage = (e: FederatedPointerEvent): void => {
      this.h.requestRender()
      if (this.h.comments.dragging) {
        this.h.comments.endDrag({ x: e.global.x, y: e.global.y })
        return
      }
      if (this.#dragState.kind === 'pin-drag') {
        this.endPinDrag(readPinHandle(e.target))
        return
      }
      if (this.#dragState.kind !== 'idle') {
        this.endNodeDrag(e.altKey)
        return
      }
      if (marquee.kind === 'idle') return
      if (marquee.kind === 'pending') {
        if (!marquee.shift) this.h.ed.selection.clear()
        marquee = { kind: 'idle' }
        return
      }
      const currentWorld = screenToWorld({ x: e.global.x, y: e.global.y }, this.h.viewport.state)
      const rect = rectFromPoints(marquee.startWorld, currentWorld)
      const ids: NodeId[] = []
      for (const node of this.h.ed.graph.nodes()) {
        if (this.h.hiddenMembers.has(node.id)) continue // hidden members of a collapsed macro aren't selectable
        if (rectIntersects(rect, nodeBounds(node, this.h.theme.tokens))) ids.push(node.id)
      }
      this.h.marqueeHovered.clear()
      if (marquee.shift) {
        const merged = new Set([...this.h.ed.selection.ids(), ...ids])
        this.h.ed.selection.replaceWith([...merged])
      } else {
        this.h.ed.selection.replaceWith(ids)
      }
      marquee.gfx.parent?.removeChild(marquee.gfx)
      marquee.gfx.destroy()
      marquee = { kind: 'idle' }
    }
    stage.on('pointerup', endStage)
    stage.on('pointerupoutside', endStage)
  }

  wireNodeInteraction(id: NodeId, view: NodeView): void {
    view.container.eventMode = 'static'
    view.container.cursor = 'pointer'

    view.container.on('pointerover', () => {
      this.h.hoveredId = id
      this.h.updateVisualStates()
      this.h.requestRender()
    })
    view.container.on('pointerout', () => {
      if (this.h.hoveredId === id) this.h.hoveredId = null
      this.h.updateVisualStates()
      this.h.requestRender()
    })
    view.container.on('pointerdown', (e: FederatedPointerEvent) => {
      if (e.button !== 0) return
      if (readPinHandle(e.target)) return
      // Locked: nothing on the node responds — no widget edit, no select, no drag (pan stays live).
      if (!this.h.interactive) return
      // Modal macro: while a macro is expanded, only its (transitive) members are interactive. A click
      // on any node outside the open macro is a click-outside → collapse it and consume the event.
      const openMacro = this.h.deepestExpandedMacro()
      if (openMacro && !this.h.macroIsAncestor(openMacro, id)) {
        this.h.ed.collapseMacro(openMacro)
        e.stopPropagation()
        return
      }
      // Widget interaction pre-empts node drag: hit-test the pointer against this node's widgets.
      if (view.widgetHit) {
        const local = e.getLocalPosition(view.container)
        const hit = view.widgetHit(local.x, local.y)
        if (hit && this.onWidgetPointerDown(id, view, hit, e)) {
          e.stopPropagation()
          return
        }
      }
      // Raise the interacted node to the top of ITS layer (a macro member lives in the overlay layer,
      // not #nodesLayer — using the wrong layer would throw and break the drag).
      const layer = view.container.parent ?? this.h.nodesLayer
      layer.setChildIndex(view.container, layer.children.length - 1)
      // Pre-click veto (H7) — plugin can cancel the click and prevent selection + drag init.
      if (!firePreventable(this.h.events, 'node:clicking', { nodeId: id })) return
      if (!this.h.ed.selection.contains(id)) {
        this.h.ed.selection.select(id, e.shiftKey ? 'toggle' : 'replace')
      }
      this.h.events.emit('node:click', { nodeId: id })
      this.#dragState = {
        kind: 'pending',
        nodeId: id,
        startScreen: { x: e.global.x, y: e.global.y },
        shift: e.shiftKey,
        alt: e.altKey,
      }
      e.stopPropagation()
    })
  }

  /** Handle a pointerdown that landed on a widget. Returns true if the gesture was consumed.
   *  Toggle/button act immediately; slider/number begin a live drag committed on pointerup;
   *  combo/text defer to the DOM overlay (wired in a later slice). */
  onWidgetPointerDown(nodeId: NodeId, view: NodeView, hit: WidgetHit, e: FederatedPointerEvent): boolean {
    const node = this.h.ed.graph.getNode(nodeId)
    if (!node) return false
    const { spec, rect } = hit
    // Display-mode widgets (visibility:'always' bound to a wired IN-pin) show LIVE upstream
    // values — editing makes no sense, the next live update would just overwrite the change.
    // Swallow the pointer so it doesn't open the DOM overlay; selection / drag bubble normally.
    if (this.h.isDisplayModeWidget(node as Node, spec)) return false
    switch (spec.type) {
      case 'toggle':
        this.h.ed.setWidgetValue(nodeId, spec.id, !widgetValue(node, spec))
        return true
      case 'button':
        this.h.events.emit('widget:action', { nodeId, widgetId: spec.id, action: spec.action })
        return true
      case 'slider':
      case 'number': {
        this.beginWidgetDrag(nodeId, view, spec, rect, e)
        return true
      }
      case 'text':
        // Defer past the current pointer gesture: opening (and focusing) a DOM field mid-pointerdown
        // gets blurred immediately by the in-flight gesture, instantly committing + closing it.
        setTimeout(() => this.openWidgetTextEditor(nodeId, spec, rect), 0)
        return true
      case 'combo':
        setTimeout(() => this.openWidgetCombo(nodeId, spec, rect), 0)
        return true
      case 'color':
        // Open synchronously, inside the user gesture — the OS colour picker only opens from a
        // real gesture, and deferring also mis-anchored it to the window origin on first click.
        this.openWidgetColor(nodeId, spec, rect)
        return true
      case 'custom': {
        // DOM-mounted custom widgets receive their own native pointer events; only canvas-draw ones
        // forward through the editor.
        const ctrl = this.h.widgetControllers.get(spec.renderer)
        if (ctrl && !isDomWidgetController(ctrl) && ctrl.onPointer) {
          this.beginCustomWidgetDrag(nodeId, view, spec, rect, ctrl, e)
        }
        return true
      }
      default:
        return true
    }
  }

  ensureWidgetOverlay(): WidgetOverlay {
    if (!this.h.widgetOverlay) this.h.widgetOverlay = new WidgetOverlay(this.h.host, this.h.theme.paletteStyle)
    return this.h.widgetOverlay
  }

  /** Screen-space rect for a node-local widget rect, accounting for the current viewport. */
  widgetScreenRect(nodeId: NodeId, rect: { x: number; y: number; width: number; height: number }): OverlayRect | null {
    const node = this.h.ed.graph.getNode(nodeId)
    if (!node) return null
    const vp = this.h.viewport.state
    return {
      x: (node.position.x + rect.x) * vp.zoom + vp.x,
      y: (node.position.y + rect.y) * vp.zoom + vp.y,
      width: rect.width * vp.zoom,
      height: rect.height * vp.zoom,
    }
  }

  openWidgetTextEditor(
    nodeId: NodeId, spec: Extract<WidgetSpec, { type: 'text' | 'number' }>,
    rect: { x: number; y: number; width: number; height: number },
  ): void {
    const screen = this.widgetScreenRect(nodeId, rect)
    const node = this.h.ed.graph.getNode(nodeId)
    if (!screen || !node) return
    const zoom = this.h.viewport.state.zoom
    const r = resolveWidgetStyle(this.h.theme.tokens, spec.style)
    // Labelled text renders the label on a row above the field box — drop the DOM editor below it.
    if (spec.type === 'text' && spec.label.length > 0) {
      const labelH = this.h.theme.tokens.geometry.widget.rowHeight * zoom
      screen.y += labelH
      screen.height -= labelH
    }
    this.ensureWidgetOverlay().editText({
      rect: screen,
      value: String(widgetValue(node, spec) ?? ''),
      multiline: spec.type === 'text' ? spec.multiline === true : false,
      ...(spec.type === 'text' && spec.placeholder !== undefined ? { placeholder: spec.placeholder } : {}),
      numeric: spec.type === 'number',
      style: {
        background:  r.bgFocused,
        text:        r.text,
        border:      r.borderFocused,
        borderWidth: r.borderWidth * zoom,
        radius:      r.radius * zoom,
        paddingX:    r.paddingX * zoom,
        paddingY:    r.paddingY * zoom,
        fontSize:    this.h.theme.tokens.typography.label.size * zoom,
        fontFamily:  this.h.theme.tokens.typography.fontFamily,
        fontWeight:  String(this.h.theme.tokens.typography.label.weight),
        placeholder: r.placeholder,
        selection:   r.selection,
      },
      onCommit: (value) => this.h.ed.setWidgetValue(nodeId, spec.id, value),
    })
  }

  openWidgetCombo(
    nodeId: NodeId, spec: Extract<WidgetSpec, { type: 'combo' }>,
    rect: { x: number; y: number; width: number; height: number },
  ): void {
    const screen = this.widgetScreenRect(nodeId, rect)
    const node = this.h.ed.graph.getNode(nodeId)
    if (!screen || !node) return
    this.ensureWidgetOverlay().editCombo({
      rect: screen,
      options: comboOptions(spec),
      value: widgetValue(node, spec),
      fontSize: this.h.theme.tokens.typography.label.size * this.h.viewport.state.zoom,
      onPick: (value) => this.h.ed.setWidgetValue(nodeId, spec.id, value),
    })
  }

  openWidgetColor(
    nodeId: NodeId, spec: Extract<WidgetSpec, { type: 'color' }>,
    rect: { x: number; y: number; width: number; height: number },
  ): void {
    const screen = this.widgetScreenRect(nodeId, rect)
    const node = this.h.ed.graph.getNode(nodeId)
    if (!screen || !node) return
    this.ensureWidgetOverlay().editColor({
      rect: screen,
      value: String(widgetValue(node, spec)),
      // Live preview while picking (no command); the final pick commits one undoable step.
      onInput: (hex) => { this.h.views.get(nodeId)?.updateWidget?.(spec.id, hex); this.h.requestRender() },
      onCommit: (hex) => this.h.ed.setWidgetValue(nodeId, spec.id, hex),
    })
  }

  /** Forward a drag on a custom widget to its controller's `onPointer` (widget-local coords). Live
   *  preview via `updateWidget`; commit the final value once on pointerup (one undo step). */
  beginCustomWidgetDrag(
    nodeId: NodeId, view: NodeView, spec: Extract<WidgetSpec, { type: 'custom' }>,
    rect: { x: number; y: number; width: number; height: number },
    ctrl: CanvasWidgetController, e: FederatedPointerEvent,
  ): void {
    const node = this.h.ed.graph.getNode(nodeId)
    if (!node) return
    const stage = this.h.app.stage
    let cur = widgetValue(node, spec)
    const send = (phase: 'down' | 'move' | 'up', gx: number, gy: number): void => {
      const l = view.container.toLocal({ x: gx, y: gy })
      const next = ctrl.onPointer!(phase, l.x - rect.x, l.y - rect.y, { value: cur, node, width: rect.width, height: rect.height, ...this.h.widgetThemeColors(spec) })
      if (next !== undefined) { cur = next; view.updateWidget?.(spec.id, cur); this.h.requestRender() }
    }
    const onMove = (ev: FederatedPointerEvent): void => send('move', ev.global.x, ev.global.y)
    const onUp = (ev: FederatedPointerEvent): void => {
      stage.off('pointermove', onMove); stage.off('pointerup', onUp); stage.off('pointerupoutside', onUp)
      send('up', ev.global.x, ev.global.y)
      this.h.ed.setWidgetValue(nodeId, spec.id, cur)
    }
    stage.on('pointermove', onMove); stage.on('pointerup', onUp); stage.on('pointerupoutside', onUp)
    send('down', e.global.x, e.global.y)
  }

  beginWidgetDrag(
    nodeId: NodeId, view: NodeView, spec: WidgetSpec,
    fullRect: { x: number; y: number; width: number; height: number },
    e: FederatedPointerEvent,
  ): void {
    const rect = fullRect
    if (spec.key === undefined) return
    const stage = this.h.app.stage
    const valueAt = (globalX: number): number => {
      const local = view.container.toLocal({ x: globalX, y: 0 })
      if (spec.type === 'slider') {
        const frac = Math.min(1, Math.max(0, (local.x - rect.x) / rect.width))
        return spec.min + frac * (spec.max - spec.min)
      }
      // number: scrub — 1 step per `scrubPx` of horizontal travel from the press point.
      const startNode = this.h.ed.graph.getNode(nodeId)
      const base = startNode ? Number(widgetValue(startNode, spec)) : 0
      const step = spec.type === 'number' ? (spec.step ?? 1) : 1
      const dx = local.x - startLocalX
      return base + Math.round(dx / 4) * step
    }
    const startLocalX = view.container.toLocal({ x: e.global.x, y: 0 }).x
    const startGlobalX = e.global.x
    let moved = false
    const onMove = (ev: FederatedPointerEvent): void => {
      if (Math.abs(ev.global.x - startGlobalX) > 3) moved = true
      const clamped = clampWidgetValue(spec, valueAt(ev.global.x))
      view.updateWidget?.(spec.id, clamped)
      this.h.requestRender()
    }
    const onUp = (ev: FederatedPointerEvent): void => {
      stage.off('pointermove', onMove)
      stage.off('pointerup', onUp)
      stage.off('pointerupoutside', onUp)
      // A number click without dragging opens precise text entry; a slider/number drag commits.
      if (!moved && spec.type === 'number') {
        view.updateWidget?.(spec.id, widgetValue(this.h.ed.graph.getNode(nodeId)!, spec))
        this.openWidgetTextEditor(nodeId, spec, fullRect)
        return
      }
      this.h.ed.setWidgetValue(nodeId, spec.id, valueAt(ev.global.x))
    }
    stage.on('pointermove', onMove)
    stage.on('pointerup', onUp)
    stage.on('pointerupoutside', onUp)
  }

  beginNodeDrag(alt: boolean): void {
    if (this.#dragState.kind !== 'pending') return
    const initialPositions = new Map<NodeId, { x: number; y: number }>()
    // Drag the entire selection if any; otherwise just the node that was pressed.
    const anchorId = this.#dragState.nodeId
    const ids = this.h.ed.selection.size > 0 ? this.h.ed.selection.ids() : [anchorId]
    for (const id of ids) {
      const node = this.h.ed.graph.getNode(id)
      if (node) initialPositions.set(id, { ...node.position })
    }
    // H6 — bring picked nodes to the front of #nodesLayer. Without this, dragging a node UNDER
    // another (e.g. starting a drag from a node that overlaps a freshly-pasted one) keeps the
    // dragged node visually beneath. Rete `simpleNodesOrder` — small UX polish, big "feels right"
    // win. Excludes expanded macros (their frame manages its own z-order via #macroOverlayLayer).
    for (const id of ids) {
      const v = this.h.views.get(id)
      const n = this.h.ed.graph.getNode(id)
      if (v && n && !(isMacro(n) && n.state['collapsed'] === false)) {
        if (v.container.parent === this.h.nodesLayer) this.h.nodesLayer.addChild(v.container) // re-add = move to top
      }
    }
    const affectedEdges = this.h.edgesAttachedTo(new Set(initialPositions.keys()))
    this.#dragState = {
      kind: 'active',
      startScreen: this.#dragState.startScreen,
      anchorId,
      initialPositions,
      affectedEdges,
      alt,
    }
  }

  /** Drop the (most recent) edge incident to `pin` and return a handle to the *other* endpoint
   *  along with the original edge so the caller can restore it on cancel. */
  detachEdgeFromPin(pin: PinHandle): { other: PinHandle; original: Edge } | null {
    const edgeId = this.h.findIncidentEdgeId(pin.nodeId as NodeId, pin.pinId)
    if (!edgeId) return null
    const rec = this.h.edgeRecords.get(edgeId)
    if (!rec) return null
    const original: Edge = { ...rec.edge, from: { ...rec.edge.from }, to: { ...rec.edge.to } }
    const fromIsTorn = rec.edge.from.node === (pin.nodeId as NodeId) && String(rec.edge.from.pin) === pin.pinId
    const otherEndRef = fromIsTorn ? rec.edge.to : rec.edge.from
    const otherNode = this.h.ed.graph.getNode(otherEndRef.node)
    const otherPin: Pin | undefined = otherNode?.pins.find((p) => p.id === otherEndRef.pin)
    if (!otherNode || !otherPin) return null
    this.h.ed.commandBus.apply(new DisconnectEdge(edgeId))
    this.h.disposeEdgeGraphics(edgeId)
    return {
      other: {
        nodeId: String(otherNode.id),
        pinId: String(otherPin.id),
        direction: otherPin.direction,
        kind: otherPin.kind,
        type: String(otherPin.type),
      },
      original,
    }
  }

  beginPinDrag(source: PinHandle, e: FederatedPointerEvent, rewireOriginal: Edge | null): void {
    if (this.#dragState.kind !== 'idle') return
    const ghost = new Graphics()
    ghost.eventMode = 'none'
    this.h.edgesLayer.addChild(ghost)
    this.#dragState = { kind: 'pin-drag', source, ghost, hoveredTarget: null, rewireOriginal }
    this.updatePinDrag({ x: e.global.x, y: e.global.y }, null)
  }

  updatePinDrag(screen: { x: number; y: number }, hoveredTarget: PinHandle | null): void {
    if (this.#dragState.kind !== 'pin-drag') return
    const { source, ghost } = this.#dragState
    const sourceNode = this.h.ed.graph.getNode(source.nodeId as NodeId)
    if (!sourceNode) return
    const sourcePos = this.h.pinWorldPosition(sourceNode, source.pinId)
    if (!sourcePos) return
    const cursorWorld = screenToWorld(screen, this.h.viewport.state)
    const cursorEndpoint: PinLayout = {
      id: 'ghost' as PinLayout['id'],
      x: cursorWorld.x,
      y: cursorWorld.y,
      side: source.direction === 'out' ? 'left' : 'right',
    }
    const from = source.direction === 'out' ? sourcePos : cursorEndpoint
    const to = source.direction === 'out' ? cursorEndpoint : sourcePos
    this.h.drawEdge(ghost, from, to, { sourceType: source.type, noMidpoint: true })

    let validity: 'none' | 'valid' | 'invalid' = 'none'
    if (hoveredTarget) {
      const targetNode = this.h.ed.graph.getNode(hoveredTarget.nodeId as NodeId)
      const sourcePin = sourceNode.pins.find((p) => String(p.id) === source.pinId)
      const targetPin = targetNode?.pins.find((p) => String(p.id) === hoveredTarget.pinId)
      if (sourcePin && targetPin && targetNode) {
        validity = this.h.connectionAllowed(sourceNode, sourcePin, targetNode, targetPin) ? 'valid' : 'invalid'
      } else {
        validity = 'invalid'
      }
    }
    ghost.alpha = validity === 'none' ? 0.55 : 1
    ghost.tint = validity === 'invalid' ? 0xff5577 : 0xffffff

    this.#dragState = { ...this.#dragState, hoveredTarget }
  }

  endPinDrag(target: PinHandle | null): void {
    if (this.#dragState.kind !== 'pin-drag') return
    const { source, ghost, rewireOriginal } = this.#dragState
    const sourceNode = this.h.ed.graph.getNode(source.nodeId as NodeId)
    const sourcePin = sourceNode?.pins.find((p) => String(p.id) === source.pinId)
    let committed = false
    if (target && sourceNode && sourcePin) {
      const targetNode = this.h.ed.graph.getNode(target.nodeId as NodeId)
      const targetPin = targetNode?.pins.find((p) => String(p.id) === target.pinId)
      if (
        targetNode &&
        targetPin &&
        this.h.connectionAllowed(sourceNode, sourcePin, targetNode, targetPin)
      ) {
        // Normalise edge orientation to (out → in) so the data model stays consistent regardless
        // of which end the user dragged from.
        const fromIsSource = sourcePin.direction === 'out'
        const outNode = fromIsSource ? sourceNode : targetNode
        const outPin: Pin = fromIsSource ? sourcePin : targetPin
        const inNode = fromIsSource ? targetNode : sourceNode
        const inPin: Pin = fromIsSource ? targetPin : sourcePin
        const edge: Edge = {
          id: createEdgeId(),
          from: { node: outNode.id, pin: outPin.id as PinId },
          to: { node: inNode.id, pin: inPin.id as PinId },
        }
        const opts: RenderEdgeOptions = { sourceType: String(outPin.type) }
        // Cancellable hook — a plugin can veto a user-dragged connection by calling cancel().
        // Same gate the public addEdge() runs through; without it, only programmatic edges would
        // be vetoable and the interactive drop would silently sneak past.
        if (firePreventable(this.h.events, 'edge:connecting', { edge })) {
          this.h.edgeOpts.set(edge.id, opts)
          this.h.ed.commandBus.apply(new ConnectPins(edge))
          committed = true
        }
      }
    }
    ghost.parent?.removeChild(ghost)
    ghost.destroy()
    this.#dragState = { kind: 'idle' }
    // Rewire dropped in empty space (or on incompatible) → snap the original edge back. Same
    // behaviour as Esc; matches UE Blueprint where releasing into the void cancels the reroute.
    if (!committed && rewireOriginal) this.restoreEdge(rewireOriginal)
  }

  /** Multi-touch gesture took over the canvas — drop any single-pointer drag without committing it.
   *  Node drags revert visually to initial positions (no command pushed); pin drags use the existing
   *  cancel path (ghost destroyed, rewired edge restored). Marquee state lives inside
   *  #wireStageInteraction's closure and resets on the next pointerup. */
  cancelInFlightInteraction(): void {
    this.#cancelMarqueeRef?.()
    if (this.#dragState.kind === 'pin-drag') { this.cancelPinDrag(); return }
    if (this.#dragState.kind === 'pending')  { this.#dragState = { kind: 'idle' }; return }
    if (this.#dragState.kind === 'active') {
      for (const [id, initial] of this.#dragState.initialPositions) {
        const view = this.h.views.get(id)
        if (view) view.container.position.set(initial.x, initial.y)
      }
      for (const edgeId of this.#dragState.affectedEdges) this.h.redrawEdge(edgeId)
      this.#dragState = { kind: 'idle' }
      this.h.requestRender()
    }
  }

  cancelPinDrag(): void {
    if (this.#dragState.kind !== 'pin-drag') return
    const { rewireOriginal } = this.#dragState
    this.#dragState.ghost.parent?.removeChild(this.#dragState.ghost)
    this.#dragState.ghost.destroy()
    this.#dragState = { kind: 'idle' }
    if (rewireOriginal) this.restoreEdge(rewireOriginal)
  }

  /** Re-create an edge that was removed at the start of a rewire when the drag is cancelled or
   *  dropped in empty space. Pushes a ConnectPins command so it lands in undo history. */
  restoreEdge(edge: Edge): void {
    const fromNode = this.h.ed.graph.getNode(edge.from.node)
    if (!fromNode) return
    const fromPin = fromNode.pins.find((p) => p.id === edge.from.pin)
    if (!fromPin) return
    const opts: RenderEdgeOptions = { sourceType: String(fromPin.type) }
    this.h.edgeOpts.set(edge.id, opts)
    this.h.ed.commandBus.apply(new ConnectPins(edge))
  }

  endNodeDrag(altOnRelease: boolean): void {
    if (this.#dragState.kind === 'pending') {
      this.#dragState = { kind: 'idle' }
      return
    }
    if (this.#dragState.kind !== 'active') return

    const snap = altOnRelease || this.#dragState.alt ? null : this.h.snapSize
    const state = this.#dragState
    const movedIds = [...state.initialPositions.keys()]
    const affected = state.affectedEdges
    const anchorInitial = state.initialPositions.get(state.anchorId)
    const anchorView = this.h.views.get(state.anchorId)
    const rawDelta = anchorInitial && anchorView
      ? {
          x: anchorView.container.position.x - anchorInitial.x,
          y: anchorView.container.position.y - anchorInitial.y,
        }
      : { x: 0, y: 0 }
    const finalDelta = anchorInitial
      ? computeGroupSnappedDelta(anchorInitial, rawDelta, snap)
      : rawDelta

    this.h.ed.commandBus.transaction(() => {
      for (const [id, initial] of state.initialPositions) {
        const view = this.h.views.get(id)
        if (!view) continue
        const target = { x: initial.x + finalDelta.x, y: initial.y + finalDelta.y }
        view.container.position.set(target.x, target.y)
        this.h.ed.commandBus.apply(new MoveNode(id, target))
      }
    })

    this.#dragState = { kind: 'idle' }
    void movedIds
    // Sync edges to the now-committed positions.
    for (const edgeId of affected) this.h.redrawEdge(edgeId)
  }
}
