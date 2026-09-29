import { RenderTexture, type Application, type Container } from 'pixi.js'
import type { Edge, Graph, Node, NodeId } from '@xenolithengine/graph-core'
import type { LODLevel, NodeView, XenolithTheme } from '@xenolithengine/graph-render-pixi'

/** The editor surface the export controller needs. Package-private by convention — never
 *  re-exported; the editor constructs the one instance and its `exportImage`/`exportNodeImage`
 *  delegate to it. Extraction M3: keeps the editor index lean; the moved code is verbatim,
 *  only `this.#editorField` → `h.field`. */
export interface ExportHost {
  readonly graph: Graph
  readonly theme: XenolithTheme
  readonly world: Container
  readonly app: Application
  readonly views: Map<NodeId, NodeView>
  get frozen(): boolean
  get lodLevel(): LODLevel
  endFreeze(): void
  applyLODLevel(level: LODLevel): void
  ensureView(node: Node): NodeView
  /** Materialize an edge's graphics unless a record already exists (leaks an orphan otherwise). */
  materializeEdgeIfAbsent(e: Edge): void
  applyMacroVisibility(): void
  virtualizeActive(): boolean
  cullToViewport(): void
  requestRender(): void
}

/**
 * Whole-graph and single-node image export (extraction M3 of the editor monolith; code moved
 * verbatim from `index.ts`). Owns the render-to-texture tiling (the GPU's MAX_TEXTURE_SIZE cap
 * would silently blank over-limit sheets), the 2D-canvas stitching, and the
 * with-full-graph-visible scene juggling that makes a render of `#world` capture every
 * node/edge regardless of culling, virtualization, LOD batches or the pan/zoom freeze.
 */
export class ExportController {
  readonly #h: ExportHost

  constructor(host: ExportHost) {
    this.#h = host
  }

  /** World-space bounding box of all nodes, or null when the graph is empty. */
  #graphBounds(): { x: number; y: number; w: number; h: number } | null {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const n of this.#h.graph.nodes()) {
      const size = n.size ?? { x: this.#h.theme.tokens.geometry.node.minWidth, y: 40 }
      minX = Math.min(minX, n.position.x); minY = Math.min(minY, n.position.y)
      maxX = Math.max(maxX, n.position.x + size.x); maxY = Math.max(maxY, n.position.y + size.y)
    }
    if (!Number.isFinite(minX)) return null
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
  }

  /** Run `fn` with the WHOLE graph materialized and visible in `#world`, then restore the live
   *  (viewport-culled, LOD-appropriate) state. Used by {@link image} so a render of `#world`
   *  captures every node/edge at full detail regardless of culling, virtualization, LOD batches
   *  or the pan/zoom freeze — any of which otherwise leaves `#world` holding only a slice of the
   *  graph.
   *
   *  Setup: drop the freeze (it hides live nodes behind baked sprites), force LOD back to 'full'
   *  (sprite/flat replace real nodes with baked stand-ins or hide #nodesLayer), materialize a live
   *  view for every node and every edge, then reapply macro visibility so collapsed-macro members
   *  stay hidden and expanded-macro frames/overlay reparenting is correct.
   *
   *  Teardown (in `finally`, via the same reconciliation the live view uses): reapply macro
   *  visibility, restore the prior LOD level (disposing the export-time views its swap removes), and
   *  re-cull to the viewport so off-screen nodes lose their views again. No manual per-view bookkeeping.
   *
   *  NOTE: DOM-mounted custom widgets are HTML-overlay only and are NOT part of `#world`, so they
   *  remain absent from any render done inside `fn` — see {@link image}. */
  #withFullGraphVisible<T>(fn: () => T): T {
    const h = this.#h
    // Freeze hides live nodes behind baked sprites captured for the CURRENT viewport — drop it first
    // (also restores visible=true on every view and reapplies macro visibility).
    if (h.frozen) h.endFreeze()
    const prevLod = h.lodLevel
    if (prevLod !== 'full') h.applyLODLevel('full')
    // The graph model (not views) is the source of truth for what exists; materialize every node so
    // off-screen / virtualized nodes get a real container in the nodes layer.
    for (const n of h.graph.nodes()) h.ensureView(n as Node)
    // Edges follow live nodes (culling only materializes edges incident to a live view), so wire
    // up every edge too — guarded against duplicates by the host.
    for (const e of h.graph.edges()) h.materializeEdgeIfAbsent(e as Edge)
    // Correct visibility for macro state: collapsed members hidden, expanded macros framed. Idempotent
    // (rebuilds frames + reparents from scratch), so it's also the restore call below.
    h.applyMacroVisibility()
    try {
      return fn()
    } finally {
      // Restore the live scene through the same reconciliation paths that build it normally — no
      // hand-rolled per-view snapshot/restore to drift out of sync.
      h.applyMacroVisibility()
      if (prevLod !== 'full') h.applyLODLevel(prevLod)
      // Re-cull to the viewport: virtualization disposes the off-screen views we just materialized
      // (and rebuilds the right LOD batch if prevLod wasn't 'full'). A no-op when virtualization is
      // inert (graph under the threshold keeps every view live anyway).
      if (h.virtualizeActive()) h.cullToViewport()
      h.requestRender()
    }
  }

  /** Snapshot a single node's current view (with widget values, statuses, the lot) to a Blob.
   *  Renders the live container — NOT the bake-cache "blank" texture — so AI clients calling MCP
   *  `node_screenshot` see exactly what the user sees, not a default-state stand-in. */
  async nodeImage(nodeId: NodeId, opts: { format?: 'png' | 'jpeg'; quality?: number; scale?: number; padding?: number; background?: string | null } = {}): Promise<Blob> {
    const h = this.#h
    const view = h.views.get(nodeId)
    const node = h.graph.getNode(nodeId)
    if (!view || !node) throw new Error(`exportNodeImage: no live view for node '${nodeId}'`)
    const format = opts.format ?? 'png'
    const scale = opts.scale ?? 2
    const padding = opts.padding ?? 8
    const w = Math.max(1, Math.ceil((node.size?.x ?? h.theme.tokens.geometry.node.minWidth) + padding * 2))
    const hh = Math.max(1, Math.ceil((node.size?.y ?? h.theme.tokens.geometry.node.headerHeight) + padding * 2))
    const rt = RenderTexture.create({ width: w, height: hh, resolution: scale })
    // Render the node's container at identity into rt, offset by padding so there's a small bleed.
    const savedPos = { x: view.container.position.x, y: view.container.position.y }
    view.container.position.set(padding, padding)
    // Opaque canvas colour by default (looks like the editor); `background: null` → transparent.
    const clearColor = opts.background === null ? [0, 0, 0, 0] : (opts.background ?? h.theme.tokens.color.surface.canvas)
    h.app.renderer.render({ container: view.container, target: rt, clearColor: clearColor as never })
    view.container.position.set(savedPos.x, savedPos.y)
    h.requestRender()
    const canvas = h.app.renderer.extract.canvas(rt) as HTMLCanvasElement
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), `image/${format}`, opts.quality ?? 0.92),
    )
    rt.destroy(true)
    if (!blob) throw new Error('exportNodeImage: canvas.toBlob returned null')
    return blob
  }

  /** Render the whole graph to an image Blob. The clear colour defaults to the theme's canvas
   *  surface so exports look like the editor and never come out transparent (PNG) or empty — pass
   *  `background: null` for a transparent PNG, or a colour string to override.
   *
   *  Renders EVERY node/edge at full detail regardless of the live viewport state: culling,
   *  virtualization, LOD batches and the pan/zoom freeze all leave `#world` holding only a slice of
   *  the graph (off-screen nodes have no view, low zoom swaps in flat/sprite batches, the freeze
   *  hides live nodes behind baked sprites). Rendering `#world` as-is in any of those states yields a
   *  blank or wrong-detail export, so the render runs inside `#withFullGraphVisible`, which
   *  materializes every node/edge and un-hides the LOD/freeze layers for the duration of the render,
   *  then restores the culled live state.
   *
   *  Caveat: DOM-mounted custom widgets (registered via `registerWidget` with an HTML controller) live
   *  in an HTML overlay outside the WebGL scene graph, so they cannot appear in this render path —
   *  only canvas/custom-draw widgets (drawn into the PIXI scene) are captured. */
  async image(opts: { format?: 'png' | 'jpeg'; quality?: number; padding?: number; scale?: number; background?: string | null } = {}): Promise<Blob> {
    const h = this.#h
    const format = opts.format ?? 'png'
    const padding = opts.padding ?? 48
    const scale = opts.scale ?? 2
    const b = this.#graphBounds() ?? { x: 0, y: 0, w: 1, h: 1 }
    const width = Math.ceil(b.w + padding * 2)
    const height = Math.ceil(b.h + padding * 2)

    // Opaque canvas colour by default (looks like the editor); `background: null` → transparent.
    const clearColor = opts.background === null ? [0, 0, 0, 0] : (opts.background ?? h.theme.tokens.color.surface.canvas)

    // The export target's pixel size is width × scale × height × scale. A wide graph at a high scale
    // blows past the GPU's MAX_TEXTURE_SIZE (8192 on weak/headless contexts, up to 16384 elsewhere),
    // and a RenderTexture over the limit renders as a silently empty (fully transparent) sheet — so
    // the PNG comes out blank regardless of viewport state. Tile the render so every RenderTexture
    // stays under the limit, then stitch the tiles into one 2D canvas.
    const maxTex = this.#maxRenderTextureSize()
    // Tile size in EXPORT pixels, with headroom so a tile never grazes the cap.
    const tilePx = Math.max(64, Math.floor(maxTex * 0.5))
    // Tile size in WORLD pixels (the render is at scale 1; `scale` only raises the texture resolution).
    const tileW = Math.max(1, Math.floor(tilePx / scale))
    const tileH = Math.max(1, Math.floor(tilePx / scale))

    // Compose the final image on a plain 2D canvas — the tiles are drawn into it, then it's encoded.
    // 2D canvases have no GPU texture cap, so arbitrarily large exports are fine here.
    const canvas2d = document.createElement('canvas')
    canvas2d.width = Math.ceil(width * scale)
    canvas2d.height = Math.ceil(height * scale)
    const ctx2d = canvas2d.getContext('2d')!
    // For an opaque export, prime the whole canvas with the clear colour so seams between tiles
    // (and any sub-pixel gaps) are the background, not transparent black. Transparent exports skip
    // this so the alpha channel stays clean.
    if (opts.background !== null) {
      ctx2d.fillStyle = typeof clearColor === 'string' ? clearColor : h.theme.tokens.color.surface.canvas as string
      ctx2d.fillRect(0, 0, canvas2d.width, canvas2d.height)
    }

    // Save the live viewport transform; the tile renders move #world to aim each tile at its region.
    const savedPos = { x: h.world.x, y: h.world.y }
    const savedScale = { x: h.world.scale.x, y: h.world.scale.y }
    h.world.scale.set(1)
    // The whole-graph render must run with every node/edge visible (see #withFullGraphVisible); wrap
    // the full tile loop so the materialization pays once, not per tile.
    this.#withFullGraphVisible(() => {
      for (let ty = 0; ty < height; ty += tileH) {
        const th = Math.min(tileH, height - ty)
        for (let tx = 0; tx < width; tx += tileW) {
          const tw = Math.min(tileW, width - tx)
          const rt = RenderTexture.create({ width: tw, height: th, resolution: scale })
          // Place #world so the tile's top-left world corner (b.x - padding + tx, b.y - padding + ty)
          // maps to the texture origin (0,0). Generalises the single-shot offset (padding - b.x).
          h.world.position.set((padding - b.x) - tx, (padding - b.y) - ty)
          h.app.renderer.render({ container: h.world, target: rt, clearColor: clearColor as never })
          const tileCanvas = h.app.renderer.extract.canvas(rt) as HTMLCanvasElement
          ctx2d.drawImage(tileCanvas, Math.round(tx * scale), Math.round(ty * scale), Math.ceil(tw * scale), Math.ceil(th * scale))
          rt.destroy(true)
        }
      }
    })

    // Restore the live view.
    h.world.position.set(savedPos.x, savedPos.y)
    h.world.scale.set(savedScale.x, savedScale.y)
    h.requestRender()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas2d.toBlob((b2) => resolve(b2), `image/${format}`, opts.quality ?? 0.92),
    )
    if (!blob) throw new Error('exportImage: canvas.toBlob returned null')
    return blob
  }

  /** Largest square RenderTexture edge (in texture pixels) the current renderer will accept. WebGL
   *  reports it via `gl.MAX_TEXTURE_SIZE`; WebGPU / unavailable contexts fall back to a conservative
   *  4096 (a safe floor across mobile and headless software rasterizers). Tiling in {@link image}
   *  keeps every tile under this so the GPU never silently drops an over-limit texture. */
  #maxRenderTextureSize(): number {
    const gl = (this.#h.app.renderer as unknown as { gl?: WebGL2RenderingContext }).gl
    if (gl) {
      try {
        const v = gl.getParameter(gl.MAX_TEXTURE_SIZE)
        if (typeof v === 'number' && v > 0) return v
      } catch { /* swallow — renderer context not ready, use fallback */ }
    }
    return 4096
  }
}
