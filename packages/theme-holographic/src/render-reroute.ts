import { Container, Graphics } from 'pixi.js'
import type { Node } from '@xenolithengine/core'
import { rerouteSize, rerouteBoxSize, markPinInteractive, type NodeView, type NodeVisualState, type RenderNodeOptions } from '@xenolithengine/render-pixi'
import type { XenTokens } from '@xenolithengine/theme-xen'
import { createIridescentMesh } from './iridescent-mesh.js'

// Holographic reroute renderers — the inline knot ($reroute) and the palette Reroute node box.
// Both follow the same glass + iridescent vocabulary as the regular node, using the SAME shader
// mesh (`createIridescentMesh`) so the rainbow ring stays consistent across all node kinds.
//
// Glow uses concentric rounded layers (not BlurFilter) — the filter renders to a rectangular
// bbox which clips the rounded silhouette, leaving a visible square halo. Stacked layers preserve
// the rounded shape.

// ─── Inline `$reroute` knot — circular disc ────────────────────────────────────────────
export function renderRerouteHolographic(node: Node, tokens: XenTokens, _opts: RenderNodeOptions = {}): NodeView {
  const { x: w, y: h } = rerouteSize(tokens)
  const r = tokens.geometry.reroute.radius
  const cx = r, cy = r

  const container = new Container({ label: `holo-reroute:${node.id}` })
  container.position.set(node.position.x, node.position.y)
  container.eventMode = 'static'

  // Glass disc.
  const body = new Graphics()
    .circle(cx, cy, r)
    .fill({ color: 0x14141c, alpha: 0.65 })
  body.eventMode = 'static'
  container.addChild(body)

  // Iridescent ring (real GLSL shader — same as the node renderer).
  const iris = createIridescentMesh(w, h, r, 3)
  container.addChild(iris.mesh)

  // Centre highlight — small white speck (top-left of the disc) for a glass-bead specular feel.
  const spec = new Graphics()
    .circle(cx - r / 3, cy - r / 3, Math.max(1, r / 4))
    .fill({ color: 0xffffff, alpha: 0.55 })
  container.addChild(spec)

  // Pin anchor points — wires enter on the left, exit on the right (same as base reroute).
  const pinLocal = new Map<string, { x: number; y: number }>()
  for (const pin of node.pins) {
    pinLocal.set(String(pin.id), { x: pin.direction === 'in' ? 0 : 2 * r, y: cy })
  }

  let collapsed = false
  let currentState: NodeVisualState = 'default'
  let glow: Graphics | null = null

  function setGlow(intensity: 'none' | 'hover' | 'selected'): void {
    if (glow) { const g = glow; glow = null; g.destroy({ children: true }) }
    if (intensity === 'none') return
    const baseColour = intensity === 'selected' ? 0xc8a8ff : 0xffffff
    const maxPad = intensity === 'selected' ? 14 : 8
    const peakAlpha = intensity === 'selected' ? 0.5 : 0.3
    const RINGS = 6
    const halo = new Graphics()
    for (let i = RINGS; i >= 1; i--) {
      const t = i / RINGS
      const pad = maxPad * t
      const a = peakAlpha * Math.pow(1 - t + 1 / RINGS, 2)
      halo.circle(cx, cy, r + pad).fill({ color: baseColour, alpha: a })
    }
    container.addChildAt(halo, 0)
    glow = halo
  }

  container.on('destroyed', () => { iris.destroy() })

  return {
    container,
    setVisualState: (s) => {
      if (s === currentState) return
      currentState = s
      if (s === 'hover')         setGlow('hover')
      else if (s === 'selected') setGlow('selected')
      else if (s === 'active')   setGlow('hover')
      else setGlow('none')
    },
    setCollapsed: (c) => { collapsed = c },
    isCollapsed: () => collapsed,
    pinLocalPosition: (pinId) => pinLocal.get(pinId) ?? null,
  }
}

// ─── Palette Reroute node — rectangular box with two visible pins ──────────────────────
export function renderRerouteNodeBoxHolographic(node: Node, tokens: XenTokens, _opts: RenderNodeOptions = {}): NodeView {
  const { x: w, y: h } = rerouteBoxSize(tokens)
  const r = Math.min(8, tokens.geometry.node.radius + 2)

  const container = new Container({ label: `holo-reroute-box:${node.id}` })
  container.position.set(node.position.x, node.position.y)
  container.eventMode = 'static'

  // Glass body.
  const body = new Graphics()
    .roundRect(0, 0, w, h, r)
    .fill({ color: 0x14141c, alpha: 0.55 })
  body.eventMode = 'static'
  container.addChild(body)

  // Top highlight.
  const highlight = new Graphics()
    .roundRect(2, 2, w - 4, Math.min(8, h * 0.4), r - 2)
    .fill({ color: 0xffffff, alpha: 0.06 })
  container.addChild(highlight)

  // Iridescent border.
  const iris = createIridescentMesh(w, h, r, 3)
  container.addChild(iris.mesh)

  // Pin beads — glass spheres at left/right midpoints.
  const pinDiameter = tokens.geometry.pin.diameter + 2
  const pinLocal = new Map<string, { x: number; y: number }>()
  for (const pin of node.pins) {
    const x = pin.direction === 'in' ? 0 : w
    const y = h / 2
    pinLocal.set(String(pin.id), { x, y })

    // Match the base Xen pattern — draw at (x,y) in local space, hitArea at the same coords.
    const bead = new Graphics()
    bead.circle(x, y, pinDiameter / 2).fill({ color: 0xc8a8ff, alpha: 0.4 })
    bead.circle(x, y, pinDiameter / 2 - 2).fill({ color: 0xc8a8ff, alpha: 1.0 })
    bead.circle(x - pinDiameter / 6, y - pinDiameter / 6, pinDiameter / 6).fill({ color: 0xffffff, alpha: 0.7 })
    markPinInteractive(bead, pin, String(node.id), x, y, pinDiameter / 2)
    container.addChild(bead)
  }

  let collapsed = false
  let currentState: NodeVisualState = 'default'
  let glow: Graphics | null = null

  function setGlow(intensity: 'none' | 'hover' | 'selected'): void {
    if (glow) { const g = glow; glow = null; g.destroy({ children: true }) }
    if (intensity === 'none') return
    const baseColour = intensity === 'selected' ? 0xc8a8ff : 0xffffff
    const maxPad = intensity === 'selected' ? 14 : 8
    const peakAlpha = intensity === 'selected' ? 0.5 : 0.3
    const RINGS = 6
    const halo = new Graphics()
    for (let i = RINGS; i >= 1; i--) {
      const t = i / RINGS
      const pad = maxPad * t
      const a = peakAlpha * Math.pow(1 - t + 1 / RINGS, 2)
      halo.roundRect(-pad, -pad, w + pad * 2, h + pad * 2, r + pad).fill({ color: baseColour, alpha: a })
    }
    container.addChildAt(halo, 0)
    glow = halo
  }

  container.on('destroyed', () => { iris.destroy() })

  return {
    container,
    setVisualState: (s) => {
      if (s === currentState) return
      currentState = s
      if (s === 'hover')         setGlow('hover')
      else if (s === 'selected') setGlow('selected')
      else if (s === 'active')   setGlow('hover')
      else setGlow('none')
    },
    setCollapsed: (c) => { collapsed = c },
    isCollapsed: () => collapsed,
    pinLocalPosition: (pinId) => pinLocal.get(pinId) ?? null,
  }
}
