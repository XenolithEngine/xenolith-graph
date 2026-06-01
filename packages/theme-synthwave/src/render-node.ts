import { Container, Graphics, BlurFilter } from 'pixi.js'
import { renderNode as baseRenderNode, type NodeView, type RenderNodeOptions } from '@xenolith/render-pixi'
import type { XenTokens } from '@xenolith/theme-xen'
import type { Node } from '@xenolith/core'
import { createChromaticFilter } from './chromatic-filter.js'

// Synthwave renderNode — wraps the base Xen renderer with an outer NEON HALO. The base node
// (pins, header, widgets, text) draws as usual; UNDERNEATH we paint a rounded-rect tinted by the
// node's category accent and apply a PIXI BlurFilter so it blooms into a soft glow that reads
// as "neon sign in a dark arcade". Cheap (one extra Graphics + one filter per node), no shader.

// Map a category to a synthwave halo colour. Falls back to magenta for "logic" / unknown.
const HALO_BY_CATEGORY: Record<string, number> = {
  logic:   0xff2ec0, // hot pink
  data:    0x00f0ff, // electric cyan
  macro:   0xa040ff, // laser violet
  utility: 0xffea2c, // sodium yellow
}

export function renderNodeSynthwave(
  node: Node,
  tokens: XenTokens,
  opts: RenderNodeOptions = {},
): NodeView {
  const base = baseRenderNode(node, tokens, opts)

  // Resolve halo colour from the category render-opt (set by the editor at node creation from
  // the schema). Unknown categories get the default pink — they still glow, just one specific
  // colour instead of a category-coded one.
  const haloColor = HALO_BY_CATEGORY[opts.category ?? ''] ?? 0xff2ec0

  // Read the size from the node container's bounds AFTER base render — `base.container` already
  // contains everything sized correctly. Using the node's declared `size` would miss layout-time
  // adjustments (long titles, widget rows etc.).
  const bounds = base.container.getLocalBounds()
  const w = Math.max(1, bounds.width)
  const h = Math.max(1, bounds.height)
  const r = tokens.geometry.node.radius

  // Halo geometry: slightly larger than the node, drawn behind. Outer ring colour matches the
  // category; alpha is moderate so the blur reads as a glow not a fill.
  const HALO_PAD = 6
  const halo = new Graphics()
    .roundRect(bounds.x - HALO_PAD, bounds.y - HALO_PAD, w + HALO_PAD * 2, h + HALO_PAD * 2, r + HALO_PAD)
    .fill({ color: haloColor, alpha: 0.55 })
  const haloFilter = new BlurFilter({ strength: 10, quality: 4 })
  // Chromatic aberration ALSO applied to the halo — gives the glow a subtle RGB-split fringe
  // (CRT/VHS read) without touching node text/widgets, which broke when CA was applied to the
  // base container. Filters stack: PIXI applies them in array order, so blur first → CA over the
  // already-blurred halo, exactly the look we want.
  const chromaFilter = createChromaticFilter()
  halo.filters = [haloFilter, chromaFilter]
  // Tie both filters' lifecycles to the graphic — Container.destroy({children:true}) destroys
  // the Graphics but DOES NOT touch its `filters` array; without these hooks the BlurFilter +
  // chromatic filter (and their internal render-textures) live on the GPU forever.
  halo.on('destroyed', () => { haloFilter.destroy(); chromaFilter.destroy() })

  // Wrap base in a parent container; halo first (behind), then the base node.
  const wrap = new Container({ label: `node:${node.id}:synth` })
  wrap.position.set(base.container.position.x, base.container.position.y)
  // Reset the base position because the wrap container now carries it.
  base.container.position.set(0, 0)
  wrap.addChild(halo)
  wrap.addChild(base.container)

  // (Chromatic aberration filter previously applied here was eating node contents — needs more
  // PIXI-v8 verification before re-enabling. See packages/theme-synthwave/src/chromatic-filter.ts —
  // the file is kept for now but unwired until the shader is debugged with the 5-line red-fill
  // smoke test in the playground.)

  // Return a NodeView that forwards everything to the base view but exposes the wrap container,
  // so the editor positions / removes / interacts with the halo+base as one unit.
  return {
    get container() { return wrap },
    setVisualState: (s) => base.setVisualState(s),
    setCollapsed: (c, a) => base.setCollapsed(c, a),
    isCollapsed: () => base.isCollapsed(),
    get collapsedRect() { return base.collapsedRect },
    pinLocalPosition: (id) => base.pinLocalPosition(id),
    ...(base.widgetHit ? { widgetHit: base.widgetHit.bind(base) } : {}),
    ...(base.updateWidget ? { updateWidget: base.updateWidget.bind(base) } : {}),
  } as NodeView
}
