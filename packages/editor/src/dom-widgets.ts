import type { Graph, Node, NodeId } from '@xenolithengine/graph-core'
import { widgetRendersInBody, type WidgetSpec, type WidgetStyle } from '@xenolithengine/graph-core'
import {
  computeWidgetRects, isDomWidgetController, resolveWidgetStyle, widgetCssVars,
  type CustomWidgetController, type DomWidgetController, type NodeView, type WidgetLayoutTokens,
  type XenolithTheme,
} from '@xenolithengine/graph-render-pixi'
import type { Container, ContainerChild } from 'pixi.js'

/** The editor surface the DOM widget layer needs. Package-private by convention — never
 *  re-exported; the editor constructs the one instance (index.ts keeps a `#domWidgets` field
 *  and delegates). Extraction M2: keeps the 5.5k-line editor index lean without changing a
 *  line of behavior — the moved code is verbatim, only `this.#editorField` → `h.field`. */
export interface DomWidgetHost {
  readonly graph: Graph
  readonly host: HTMLElement
  readonly theme: XenolithTheme
  readonly viewport: { readonly state: { x: number; y: number; zoom: number } }
  readonly views: Map<NodeId, NodeView>
  readonly nodesLayer: Container<ContainerChild>
  readonly widgetControllers: ReadonlyMap<string, CustomWidgetController>
  isPinConnected(nodeId: NodeId, pinKey: string): boolean
  widgetDisplayValue(node: Node, w: WidgetSpec): unknown
  widgetThemeColors(spec?: { style?: WidgetStyle }): { accent: string; text: string; muted: string }
  setWidgetValue(nodeId: NodeId, widgetId: string, value: unknown): void
  openSidebar(nodeId: NodeId): void
}

interface DomWidgetRecord {
  el: HTMLElement
  controller: DomWidgetController
  cleanup?: () => void
  nodeId: NodeId
  widgetId: string
}

/**
 * Screen-space layer that hosts DOM custom widgets over the WebGL canvas (extraction M2 of the
 * editor monolith; code moved verbatim from `index.ts`). Owns the absolutely-positioned layer
 * div and the mounted-widget map; keeps every element glued to its node's on-screen widget rect
 * (pan/zoom/drag/collapse) on every painted frame, and clips widgets against the nodes painted
 * above them (DOM always paints above the WebGL canvas).
 */
export class DomWidgetLayer {
  readonly #h: DomWidgetHost
  #layer: HTMLDivElement | null = null
  readonly #widgets = new Map<string, DomWidgetRecord>()

  constructor(host: DomWidgetHost) {
    this.#h = host
  }

  /** Mount/unmount DOM custom widgets to match the current graph, then position them. Called after
   *  structural changes (load, add, re-render, theme swap). */
  sync(): void {
    const h = this.#h
    const seen = new Set<string>()
    for (const node of h.graph.nodes()) {
      for (const w of node.widgets ?? []) {
        if (w.type !== 'custom' || !widgetRendersInBody(w)) continue
        const ctrl = h.widgetControllers.get(w.renderer)
        if (!ctrl || !isDomWidgetController(ctrl)) continue
        const key = `${String(node.id)}:${w.id}`
        seen.add(key)
        if (this.#widgets.has(key)) {
          this.#applyWidgetVars(this.#widgets.get(key)!.el, w)
          ctrl.update?.({ value: h.widgetDisplayValue(node as Node, w), node, width: 0, height: 0, ...h.widgetThemeColors(w) })
          continue
        }
        const el = document.createElement('div')
        Object.assign(el.style, { position: 'absolute', pointerEvents: 'auto', transformOrigin: 'top left' })
        this.#applyWidgetVars(el, w)
        this.#ensureLayer().appendChild(el)
        const cleanup = ctrl.mount(el, {
          value: h.widgetDisplayValue(node as Node, w), node, width: 0, height: 0, ...h.widgetThemeColors(w),
          setValue: (v) => h.setWidgetValue(node.id, w.id, v),
          openSidebar: () => h.openSidebar(node.id),
        })
        const entry: DomWidgetRecord = { el, controller: ctrl, nodeId: node.id, widgetId: w.id }
        if (typeof cleanup === 'function') entry.cleanup = cleanup
        this.#widgets.set(key, entry)
      }
    }
    for (const [key, rec] of this.#widgets) {
      if (seen.has(key)) continue
      rec.cleanup?.(); rec.controller.unmount?.(); rec.el.remove()
      this.#widgets.delete(key)
    }
    this.position()
  }

  /** Sync each mounted DOM widget to its node's on-screen widget rect. Cheap — runs per painted
   *  frame so pan/zoom/drag/collapse keep the element glued to the node. */
  position(): void {
    if (this.#widgets.size === 0) return
    const h = this.#h
    const vp = h.viewport.state
    const layout = this.#layoutTokens()
    // Paint-order index per node container, so DOM widgets can match the canvas z-order and hide
    // where a higher node occludes them (DOM always paints above the WebGL canvas, so without this
    // a back node's widget bleeds over a front node's body).
    const z = new Map<unknown, number>()
    h.nodesLayer.children.forEach((c, i) => z.set(c, i))
    for (const rec of this.#widgets.values()) {
      const node = h.graph.getNode(rec.nodeId)
      const view = h.views.get(rec.nodeId)
      const rect = node?.size ? computeWidgetRects(node, node.size.x, layout, { isPinConnected: (k) => h.isPinConnected(rec.nodeId, k) }).find((r) => r.id === rec.widgetId) : undefined
      if (!node || !view || !rect || view.isCollapsed()) { rec.el.style.display = 'none'; continue }
      // Use the VIEW container's live world position, not node.position — during a drag the model
      // position isn't committed until drop, but the container moves every frame.
      const left = (view.container.x + rect.x) * vp.zoom + vp.x
      const top = (view.container.y + rect.y) * vp.zoom + vp.y
      const myZ = z.get(view.container) ?? 0
      const W = rect.width, H = rect.height
      // Clip the widget to the VISIBLE region = widget rect MINUS every node painted above it
      // (DOM always paints above the WebGL canvas). Computed as a rectangle difference into a set
      // of NON-overlapping rects — overlapping evenodd "holes" cancel each other, so we subtract
      // explicitly instead. clip-path = the union of the surviving rects.
      const gn = h.theme.tokens.geometry.node
      let vis: { x: number; y: number; w: number; h: number }[] = [{ x: 0, y: 0, w: W, h: H }]
      // Subtract an axis-aligned rect from the visible set (splits each survivor into ≤4 slivers).
      const subtract = (ax1: number, ay1: number, ax2: number, ay2: number): void => {
        if (ax2 - ax1 < 0.5 || ay2 - ay1 < 0.5) return
        const next: typeof vis = []
        for (const r of vis) {
          const ix1 = Math.max(r.x, ax1), iy1 = Math.max(r.y, ay1)
          const ix2 = Math.min(r.x + r.w, ax2), iy2 = Math.min(r.y + r.h, ay2)
          if (ix2 <= ix1 || iy2 <= iy1) { next.push(r); continue }
          if (iy1 > r.y) next.push({ x: r.x, y: r.y, w: r.w, h: iy1 - r.y })
          if (iy2 < r.y + r.h) next.push({ x: r.x, y: iy2, w: r.w, h: r.y + r.h - iy2 })
          if (ix1 > r.x) next.push({ x: r.x, y: iy1, w: ix1 - r.x, h: iy2 - iy1 })
          if (ix2 < r.x + r.w) next.push({ x: ix2, y: iy1, w: r.x + r.w - ix2, h: iy2 - iy1 })
        }
        vis = next
      }
      for (const [id, ov] of h.views) {
        if (id === rec.nodeId || (z.get(ov.container) ?? 0) <= myZ) continue
        const other = h.graph.getNode(id)
        if (!other?.size) continue
        const collapsed = ov.isCollapsed()
        // A collapsed node occludes only its header pill (exact rect + radius from the view), not
        // its full expanded size. Expanded → the body rect (node radius).
        const cRect = collapsed ? ov.collapsedRect : undefined
        const localX = cRect?.x ?? 0, localY = cRect?.y ?? 0
        const ow = cRect?.w ?? other.size.x, oh = cRect?.h ?? other.size.y
        const ol = (ov.container.x + localX) * vp.zoom + vp.x, ot = (ov.container.y + localY) * vp.zoom + vp.y
        // Small pad to cover the front node's thin outline/border (pins are handled separately below).
        const OCC_PAD = 2
        const ox1 = (ol - left) / vp.zoom - OCC_PAD, oy1 = (ot - top) / vp.zoom - OCC_PAD
        const ox2 = ox1 + ow + OCC_PAD * 2, oy2 = oy1 + oh + OCC_PAD * 2
        // Occlude by the node's ROUNDED-rect shape, not its bounding box: the corners outside the
        // border radius aren't painted, so the node behind must show there (not be clipped to black).
        // Subtract the straight middle as one rect, then the rounded caps as arc-following strips.
        const cr = Math.max(0, Math.min((cRect?.r ?? gn.radius) + OCC_PAD, (ox2 - ox1) / 2, (oy2 - oy1) / 2))
        if (cr < 0.5) { subtract(ox1, oy1, ox2, oy2) }
        else {
          subtract(ox1, oy1 + cr, ox2, oy2 - cr) // straight middle band (full width)
          const STEP = 2
          for (let yy = 0; yy < cr; yy += STEP) {
            const dy = Math.min(STEP, cr - yy)
            // Inset at the strip's wider edge (toward the middle) so we slightly over-cover rather
            // than bleed: top cap widens downward, bottom cap widens upward.
            const d = cr - (yy + dy)
            const inset = cr - Math.sqrt(Math.max(0, cr * cr - d * d))
            subtract(ox1 + inset, oy1 + yy, ox2 - inset, oy1 + yy + dy)        // top cap strip
            subtract(ox1 + inset, oy2 - yy - dy, ox2 - inset, oy2 - yy)        // bottom cap strip
          }
        }
        // Pins poke out beyond the body silhouette — subtract a small box at each so the back widget
        // doesn't bleed over them.
        const wox = view.container.x + rect.x, woy = view.container.y + rect.y
        for (const pin of other.pins) {
          const pp = ov.pinLocalPosition(pin.id)
          if (!pp) continue
          const px = ov.container.x + pp.x - wox, py = ov.container.y + pp.y - woy
          subtract(px - 7, py - 7, px + 7, py + 7)
        }
      }
      if (vis.length === 0) { rec.el.style.display = 'none'; continue }
      const fullyVisible = vis.length === 1 && vis[0]!.x <= 0.5 && vis[0]!.y <= 0.5 && vis[0]!.w >= W - 0.5 && vis[0]!.h >= H - 0.5
      const clip = fullyVisible ? 'none'
        : `path("${vis.map((r) => `M${r.x.toFixed(1)} ${r.y.toFixed(1)} H${(r.x + r.w).toFixed(1)} V${(r.y + r.h).toFixed(1)} H${r.x.toFixed(1)} Z`).join(' ')}")`
      rec.el.style.display = ''
      rec.el.style.clipPath = clip
      rec.el.style.zIndex = String(myZ)
      rec.el.style.left = `${left}px`
      rec.el.style.top = `${top}px`
      rec.el.style.width = `${rect.width}px`
      rec.el.style.height = `${rect.height}px`
      rec.el.style.transform = `scale(${vp.zoom})`
    }
  }

  /** DOM-mounted widgets are real DOM above the canvas, so the WebGL interaction gate can't stop
   *  them — toggle their pointer events directly so a locked graph freezes framework widgets too. */
  setInteractivity(interactive: boolean): void {
    for (const rec of this.#widgets.values()) rec.el.style.pointerEvents = interactive ? 'auto' : 'none'
  }

  /** Unmount every widget (controller unmount + optional cleanup) and drop the layer's children.
   *  The layer div itself stays (cheap to reuse); full teardown happens with the host. */
  destroy(): void {
    for (const rec of this.#widgets.values()) { rec.cleanup?.(); rec.controller.unmount?.(); rec.el.remove() }
    this.#widgets.clear()
  }

  #ensureLayer(): HTMLDivElement {
    if (!this.#layer) {
      const l = document.createElement('div')
      Object.assign(l.style, { position: 'absolute', inset: '0', overflow: 'hidden', pointerEvents: 'none', zIndex: '5' })
      if (getComputedStyle(this.#h.host).position === 'static') this.#h.host.style.position = 'relative'
      this.#h.host.appendChild(l)
      this.#layer = l
    }
    return this.#layer
  }

  /** Layout tokens for `computeWidgetRects` from the active theme's geometry (moved verbatim
   *  from the editor — only the DOM layer ever needed them). */
  #layoutTokens(): WidgetLayoutTokens {
    const g = this.#h.theme.tokens.geometry
    return {
      node:   { headerHeight: g.node.headerHeight },
      pin:    { rowSpacing: g.pin.rowSpacing, rowHeight: g.pin.rowHeight, diameter: g.pin.diameter, labelGap: g.pin.labelGap },
      header: { toPinsGap: g.header.toPinsGap },
      widget: { rowHeight: g.widget.rowHeight, gap: g.widget.gap, paddingX: g.widget.paddingX },
    }
  }

  /** Expose the active widget theme as --xeno-* CSS custom properties on a DOM widget's host, so
   *  framework/vanilla widgets can style with var(--xeno-accent) etc. and track the theme for free. */
  #applyWidgetVars(el: HTMLElement, spec: { style?: WidgetStyle }): void {
    const vars = widgetCssVars(resolveWidgetStyle(this.#h.theme.tokens, spec.style))
    for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v)
  }
}
