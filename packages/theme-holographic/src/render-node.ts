import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { Node, Pin } from '@xenolithengine/graph-core'
import {
  computeNodeLayout, renderWidgets, markPinInteractive,
  type NodeView, type NodeVisualState, type RenderNodeOptions,
} from '@xenolithengine/graph-render-pixi'
import type { XenTokens } from '@xenolithengine/graph-theme-xen'
import { createIridescentMesh, type IridescentMeshHandle } from './iridescent-mesh.js'

// Module-scoped registry of every live iridescent mesh + its host container. The theme's
// `onFrame` hook (registered in index.ts) iterates this set each frame and updates each mesh's
// `uHueOffset` based on the container's current SCREEN-space position. Switched from
// `Ticker.shared.add` because Ticker.shared isn't guaranteed to be ticking inside an arbitrary
// host — `theme.onFrame` is contractually called by the editor every frame.
interface LiveEntry { container: Container; mesh: IridescentMeshHandle }
const liveMeshes = new Set<LiveEntry>()

export function syncHolographicMeshes(): void {
  const time = performance.now() / 5_000
  for (const entry of liveMeshes) {
    const t = entry.container.worldTransform
    const hue = ((t.tx * 0.006 + t.ty * 0.004 + time) % 1 + 1) % 1
    entry.mesh.setHueOffset(hue)
  }
}

// Holographic renderNode — built from scratch, NOT a wrap around the base Xen renderer.
//
// The node is composed of three "layers" tracked explicitly so we can rebuild them on collapse /
// state change without re-running computeNodeLayout:
//   • shell — body fill + top highlight + iridescent frame + title + chevron (always present)
//   • bodyExtras — pin labels + glass beads + widgets (visible only when expanded)
//   • glow — outer halo for hover/selected, attached/detached on demand
//
// Re-render is local to the shell/bodyExtras containers, so it's a few Graphics rebuilds rather
// than re-running the whole renderer.

interface Bead {
  pinId: string
  graphics: Graphics
  x: number
  y: number
}

const HEADER_BAND = 26 // height of the "header" visual band (title + chevron sit centred here)
const TITLE_FONT_SIZE = 13

export function renderNodeHolographic(
  node: Node,
  tokens: XenTokens,
  opts: RenderNodeOptions = {},
): NodeView {
  const isPinConnected = (k: string): boolean => {
    const set = opts.connectedPinIds
    if (!set) return false
    const pin = node.pins.find((p) => p.label === k || String(p.id) === k)
    return pin ? set.has(String(pin.id)) : false
  }

  const layout = computeNodeLayout(node, {
    node:   tokens.geometry.node,
    pin:    { diameter: tokens.geometry.pin.diameter, rowSpacing: tokens.geometry.pin.rowSpacing, rowHeight: tokens.geometry.pin.rowHeight },
    header: { toPinsGap: tokens.geometry.header.toPinsGap },
    widget: { rowHeight: tokens.geometry.widget.rowHeight, gap: tokens.geometry.widget.gap, controlMinWidth: tokens.geometry.widget.controlMinWidth },
  }, isPinConnected)

  const W = layout.body.width
  const FULL_H = layout.body.height
  const COLLAPSED_H = HEADER_BAND
  const r = tokens.geometry.node.radius + 2

  const container = new Container({ label: `holo:${node.id}` })
  container.position.set(node.position.x, node.position.y)
  // Required for PIXI v8 hit-testing — without this the editor's `dblclick`/pointer handlers can't
  // find the node, and collapse-toggle / select / drag all break. Default is 'passive' which means
  // events propagate up but the container itself isn't a hit target.
  container.eventMode = 'static'

  // ─── State buckets ──────────────────────────────────────────────────────────────────
  // shell: always-visible chrome (body, frame, title). Rebuilt on collapse/hover/select.
  const shell = new Container({ label: 'shell' })
  // bodyExtras: expanded-only content (pin beads, labels, widgets). Hidden when collapsed.
  const bodyExtras = new Container({ label: 'extras' })
  // glow: outer halo overlay for hover/selected. Detached when not needed.
  let glow: Graphics | null = null

  container.addChild(shell, bodyExtras)

  const beadByPin = new Map<string, Bead>()
  let collapsed = !!opts.collapsed
  let currentState: NodeVisualState = (opts as { state?: NodeVisualState }).state ?? 'default'

  // Current iridescent mesh — rebuilt on collapse/resize. The theme's per-frame onFrame hook
  // (registered globally via `liveMeshes` below) pokes `setHueOffset` each frame so the rainbow
  // rotates based on the node's current SCREEN position.
  let irisMesh: IridescentMeshHandle | null = null
  // WidgetsView — held so we can expose `widgetHit` / `updateWidget` in the NodeView return,
  // which is what the editor uses to drive widget interaction (clicks, slider drags, text edits).
  // Without this the widgets RENDER but stay dead — exactly the "тык не работает" symptom.
  let widgetsView: ReturnType<typeof renderWidgets> | null = null

  // ─── Build helpers ──────────────────────────────────────────────────────────────────
  function buildShell(): void {
    // Clear previous shell content (cheaper than recreating the container — preserves child order).
    while (shell.children.length > 0) shell.removeChildAt(0)!.destroy({ children: true })

    const h = collapsed ? COLLAPSED_H : FULL_H

    // 1. Translucent glass body. Body IS the hit-target for double-click (collapse toggle) and
    // single-click (select / drag-start) — `eventMode: static` enables those.
    const body = new Graphics()
      .roundRect(0, 0, W, h, r)
      .fill({ color: 0x14141c, alpha: 0.55 })
    body.eventMode = 'static'
    shell.addChild(body)

    // 2. Top inner highlight. Decorative — `eventMode: 'none'` so it doesn't compete with body
    // for hover events. Without this, moving the cursor across the highlight rect fires
    // pointer-out from body + pointer-over on highlight, which the editor reads as "node hover
    // changed" — a pulsing hover state every time the cursor crosses an internal boundary.
    const highlightH = Math.min(20, h * 0.4)
    const highlight = new Graphics()
      .roundRect(2, 2, W - 4, highlightH, r - 2)
      .fill({ color: 0xffffff, alpha: 0.06 })
    highlight.eventMode = 'none'
    shell.addChild(highlight)

    // 3. Category tint underlay — subtle wash. Same rule — decorative only, no events.
    const catTint = categoryTintColor(opts.category)
    if (catTint !== null) {
      const tint = new Graphics()
        .roundRect(0, 0, W, h, r)
        .fill({ color: catTint, alpha: 0.07 })
      tint.eventMode = 'none'
      shell.addChild(tint)
    }

    // 4. Iridescent border — REAL GLSL ring (SDF rounded-rect band + procedural HSV hue around
    //    the perimeter), with a per-frame `uHueOffset` uniform that animates as the camera pans.
    //    Replaces the baked Sprite from the first cut — no Canvas2D bake, full GPU.
    if (irisMesh) { irisMesh.destroy(); irisMesh = null }
    irisMesh = createIridescentMesh(W, h, r, 3)
    shell.addChild(irisMesh.mesh)

    // 5. Title + chevron — vertically centred in the HEADER_BAND, both share the same y.
    const titleStyle = new TextStyle({
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: TITLE_FONT_SIZE,
      fontWeight: '600',
      fill: 0xffffff,
      letterSpacing: 0.2,
    })
    const titleText = new Text({ text: opts.title ?? node.type, style: titleStyle })
    titleText.position.set(12, (HEADER_BAND - titleText.height) / 2)
    titleText.eventMode = 'none' // decorative — body handles the hover, no flicker on text crossing
    shell.addChild(titleText)

    const chev = new Graphics()
    if (collapsed) {
      // ▶ chevron — pointing right when collapsed (suggests "expand outward")
      chev.moveTo(0, 0).lineTo(5, 4).lineTo(0, 8).stroke({ color: 0xffffff, width: 1.4, alpha: 0.85 })
    } else {
      // ▼ chevron — pointing down when expanded
      chev.moveTo(0, 0).lineTo(4, 5).lineTo(8, 0).stroke({ color: 0xffffff, width: 1.4, alpha: 0.85 })
    }
    chev.position.set(W - 22, (HEADER_BAND - 8) / 2)
    // Chevron owns the collapse-toggle gesture (same contract as the base Xen renderer — the
    // editor's #onDoubleClick fires for macros/template-instances only; regular nodes collapse via
    // a click on the chevron). PIXI v8 needs `eventMode: 'static'` + an explicit `hitArea` so the
    // 8×8 graphic doesn't require pixel-perfect targeting.
    chev.eventMode = 'static'
    chev.cursor = 'pointer'
    chev.hitArea = { contains: (px: number, py: number) => px >= -8 && px <= 16 && py >= -8 && py <= 16 }
    chev.on('pointerdown', (e) => {
      e.stopPropagation()
      collapsed = !collapsed
      buildShell()
      buildExtras()
      if (currentState === 'hover')         setGlow('hover')
      else if (currentState === 'selected') setGlow('selected')
    })
    shell.addChild(chev)
  }

  function buildExtras(): void {
    while (bodyExtras.children.length > 0) bodyExtras.removeChildAt(0)!.destroy({ children: true })
    beadByPin.clear()

    const pinDiameter = tokens.geometry.pin.diameter + 2

    // ORDER MATTERS: widgets must be added FIRST, pins LAST. PIXI hit-tests children in REVERSE
    // order (top-most first), so adding pins last means they win the hit-test on pin-bound rows
    // (where a widget Graphics overlays the same row as its pin). The previous order — pins first,
    // widgets last — meant a widget caught the click meant for the pin: the user could only drag
    // wires by aiming BELOW the pin's visual centre, where the widget's hit zone ended. Same
    // pattern liquid-glass uses (pins added to container AFTER widgets' expandedInner).

    // 1. Widgets (only when expanded — collapsed pill is too small).
    if (!collapsed && node.widgets && node.widgets.length > 0) {
      const layoutTokens = {
        node:   { headerHeight: tokens.geometry.node.headerHeight },
        pin:    {
          rowSpacing: tokens.geometry.pin.rowSpacing,
          rowHeight:  tokens.geometry.pin.rowHeight,
          diameter:   tokens.geometry.pin.diameter,
          labelGap:   tokens.geometry.pin.labelGap,
        },
        header: { toPinsGap: tokens.geometry.header.toPinsGap },
        widget: {
          rowHeight: tokens.geometry.widget.rowHeight,
          gap:       tokens.geometry.widget.gap,
          paddingX:  tokens.geometry.widget.paddingX,
        },
      }
      widgetsView = renderWidgets(
        node,
        W,
        tokens,
        layoutTokens,
        (opts as { customWidgets?: never }).customWidgets,
        { isPinConnected },
      )
      bodyExtras.addChild(widgetsView.container)
    } else {
      widgetsView = null
    }

    // 2. Pins + labels — added LAST so they're hit-tested first (win over widget overlays).
    // Pattern matches base Xen / liquid-glass exactly: shapes are drawn AT (localX, localY) in
    // the Graphics' local space (no `position.set`), and hitArea Circle is at the same coords.
    for (const p of layout.pins) {
      const pin = node.pins.find((x) => String(x.id) === String(p.id))!
      const colour = pinColor(pin, tokens)

      let localX: number, localY: number
      if (collapsed) {
        localX = p.side === 'left' ? 0 : W
        localY = COLLAPSED_H / 2
      } else {
        localX = p.x - layout.body.x
        localY = p.y - layout.body.y
      }

      const bead = new Graphics()
      bead.circle(localX, localY, pinDiameter / 2).fill({ color: colour, alpha: 0.4 })
      bead.circle(localX, localY, pinDiameter / 2 - 2).fill({ color: colour, alpha: 1.0 })
      bead.circle(localX - pinDiameter / 6, localY - pinDiameter / 6, pinDiameter / 6).fill({ color: 0xffffff, alpha: 0.7 })
      markPinInteractive(bead, pin, String(node.id), localX, localY, pinDiameter / 2)
      bodyExtras.addChild(bead)
      beadByPin.set(String(pin.id), { pinId: String(pin.id), graphics: bead, x: localX, y: localY })

      if (!collapsed && pin.label) {
        const labelStyle = new TextStyle({
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 11,
          fill: 0xf5f5fa,
        })
        const label = new Text({ text: pin.label, style: labelStyle })
        label.eventMode = 'none' // decorative — pin underneath handles the click
        const labelY = localY - label.height / 2
        if (p.side === 'left') {
          label.position.set(localX + pinDiameter / 2 + 6, labelY)
        } else {
          label.anchor.set(1, 0)
          label.position.set(localX - pinDiameter / 2 - 6, labelY)
        }
        bodyExtras.addChild(label)
      }
    }
  }

  function setGlow(intensity: 'none' | 'hover' | 'selected'): void {
    if (glow) { const g = glow; glow = null; g.destroy({ children: true }) }
    if (intensity === 'none') return
    // Stack of concentric rounded-rect Graphics with decreasing alpha — fakes a soft glow whose
    // silhouette stays ROUNDED. BlurFilter renders to a rectangular bbox so its halo looks square
    // at the corners (image #37 complaint). No filter, no GPU pass, cheaper anyway.
    const h = collapsed ? COLLAPSED_H : FULL_H
    const baseColour = intensity === 'selected' ? 0xc8a8ff : 0xffffff
    const maxPad = intensity === 'selected' ? 18 : 12
    const peakAlpha = intensity === 'selected' ? 0.5 : 0.3
    const RINGS = 8
    const halo = new Graphics()
    for (let i = RINGS; i >= 1; i--) {
      const t = i / RINGS
      const pad = maxPad * t
      const a = peakAlpha * Math.pow(1 - t + 1 / RINGS, 2)
      halo.roundRect(-pad, -pad, W + pad * 2, h + pad * 2, r + pad).fill({ color: baseColour, alpha: a })
    }
    container.addChildAt(halo, 0)
    glow = halo
  }

  // ─── Initial build ──────────────────────────────────────────────────────────────────
  buildShell()
  buildExtras()
  if (currentState === 'hover')    setGlow('hover')
  if (currentState === 'selected') setGlow('selected')

  // Register the mesh in the module-scoped set — theme's `onFrame` iterates and updates hue per
  // frame. Editor contracts to call onFrame every frame; Ticker.shared was unreliable here.
  const liveEntry: LiveEntry = { container, mesh: irisMesh! }
  liveMeshes.add(liveEntry)
  container.on('destroyed', () => {
    liveMeshes.delete(liveEntry)
    if (irisMesh) { irisMesh.destroy(); irisMesh = null }
  })

  // ─── NodeView contract ─────────────────────────────────────────────────────────────
  const setVisualState = (s: NodeVisualState): void => {
    if (s === currentState) return
    currentState = s
    // Do NOT rebuild shell on state change — destroying `body` mid-hover fires pointer-out, editor
    // sees the node as un-hovered, glow drops, then the new body fires pointer-over, glow comes
    // back. Visible as a pulsing 1Hz flicker every time the cursor sits on the node. Just manage
    // the glow layer; the iridescent mesh + body geometry stay the same.
    if (s === 'hover')    setGlow('hover')
    else if (s === 'selected') setGlow('selected')
    else if (s === 'active')   setGlow('hover')
    else setGlow('none')
  }

  const setCollapsed = (c: boolean, _animated = false): void => {
    if (c === collapsed) return
    collapsed = c
    buildShell()
    buildExtras()
    // If a glow is active, rebuild it to match the new height.
    if (currentState === 'hover')    setGlow('hover')
    else if (currentState === 'selected') setGlow('selected')
  }

  const pinLocalPosition = (pinId: string): { x: number; y: number } | null => {
    const b = beadByPin.get(pinId)
    return b ? { x: b.x, y: b.y } : null
  }

  return {
    container,
    setVisualState,
    setCollapsed,
    isCollapsed: () => collapsed,
    pinLocalPosition,
    // Editor wires widget interaction by calling widgetHit() on pointerdown over the node and
    // updateWidget() during live drags. Forwarding to the WidgetsView is what makes sliders /
    // combos / text inputs respond — without these the widgets render but never react.
    widgetHit: (localX: number, localY: number) => widgetsView?.widgetHit(localX, localY) ?? null,
    updateWidget: (id: string, value: unknown) => { widgetsView?.update(id, value) },
  }
}

// ─── helpers ────────────────────────────────────────────────────────────────────────────

function pinColor(pin: Pin, tokens: XenTokens): number {
  const t = (tokens.pinType as unknown as Record<string, { color?: string } | undefined>)[pin.type]
  return parseHexColor(t?.color ?? '#ffffff')
}

function categoryTintColor(category: string | undefined): number | null {
  if (!category) return null
  switch (category) {
    case 'logic':   return 0xff4dd6
    case 'data':    return 0x4dd6ff
    case 'macro':   return 0xc8a8ff
    case 'utility': return 0xffe04d
    default:        return null
  }
}

function parseHexColor(hex: string): number {
  if (hex.startsWith('#')) {
    const h = hex.slice(1)
    if (h.length === 3) return parseInt(h.split('').map((c) => c + c).join(''), 16)
    return parseInt(h.slice(0, 6), 16)
  }
  const m = hex.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (m) {
    const r = Math.min(255, parseInt(m[1]!, 10))
    const g = Math.min(255, parseInt(m[2]!, 10))
    const b = Math.min(255, parseInt(m[3]!, 10))
    return (r << 16) | (g << 8) | b
  }
  return 0xffffff
}

// (parallaxTint helper was previously used to tint a baked rainbow Sprite; the shader Mesh now
//  handles parallax through `uHueOffset` directly, no Sprite tint needed.)
