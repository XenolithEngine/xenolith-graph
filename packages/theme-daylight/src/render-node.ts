import { Container, Graphics, BitmapText } from 'pixi.js'
import type { Node } from '@xenolithengine/graph-core'
import {
  computeNodeLayout, renderWidgets, markPinInteractive,
  type NodeView, type NodeVisualState, type RenderNodeOptions,
} from '@xenolithengine/graph-render-pixi'
import type { XenTokens } from '@xenolithengine/graph-theme-xen'

// Daylight renderNode — built ground-up like the holographic theme, not as a wrap around the
// base Xen renderer. This buys us full control over draw order which we need for the two
// Daylight-specific affordances:
//
//   1. Pin halos that PROTRUDE from the body (~10 px disc of body-colour grey at each pin
//      position). They draw AFTER the body (so they mask the body's curved corner where the pin
//      sits) and BEFORE the pin disc (so the disc stays on top). The wire underneath terminates
//      under the halo because the editor renders #edgesLayer below #nodesLayer.
//
//   2. Pin disc swaps between a SOLID disc (connected) and a RING (disconnected) so the halo
//      grey shows through the centre — matches the Figma source exactly. Driven by
//      `opts.connectedPinIds`.
//
// Also: a small accent dot in the header marks the node's category (image / data / utility /
// macro in our token map; falls back to brand-blue if the category is unknown).

// Figma spec (Frame 2131333001 "Node Draft" — width 233, generic node):
//   - node body: 12px corner radius, box-shadow: 0 4px 14px rgba(174,174,174,0.23)
//   - header: title text at top:12 (12px padding from node top), font 12/500 line-height 12 → text
//     bottom at y=24; title area occupies y=12..28 (icon+text+chevron+dot row, height 16)
//   - first pin halo top at y=37 → gap between header bottom (28) and pin halo (37) is 9px
//   - pin halo: 20x20 (frame background = node fill; drop-shadow hides the seam), border-radius 12
//   - pin colored disc: 12x12 (r=6), inner dot: 5.33x5.33 (r=2.67, ratio 0.44 of the outer)
//   - vertical gap between stacked pins: 9px (frame 2131333008 auto-layout gap)
//   - category dot in header: 4x4
const TITLE_TOP_PAD  = 12   // Figma: title text `top: 12` inside node
const TITLE_FONT_SIZE = 12  // Figma: font-size 12, line-height 12
const HEADER_HEIGHT  = TITLE_TOP_PAD + 16   // = 28 (title text + row content)
const HEADER_TO_PIN_GAP = 9   // Figma: gap between header bottom and first pin halo TOP
const HALO_RADIUS   = 10  // 20x20 halo frame → r=10
const PIN_RADIUS    = 6   // 12x12 colored disc → r=6
const PIN_INNER_RATIO = 0.444   // 5.33 / 12  (Figma inner-dot ratio)
const PIN_GREY_GAP_RATIO = 0.60 // width of the middle grey "gap" that separates outer ring from inner dot
const PIN_ROW_GAP   = 9   // vertical gap between stacked pin halos
const CATEGORY_DOT  = 4   // 4x4
const DISCONNECTED_RING_WIDTH = 2.5

export function renderNodeDaylight(
  node: Node,
  tokens: XenTokens,
  opts: RenderNodeOptions = {},
): NodeView {
  const isPinConnected = (pinKey: string): boolean => {
    const set = opts.connectedPinIds
    if (!set) return false
    const pin = node.pins.find((p) => p.label === pinKey || String(p.id) === pinKey)
    return pin ? set.has(String(pin.id)) : false
  }

  // All Y-driving tokens flipped to Daylight's Figma spec: HEADER_HEIGHT + HEADER_TO_PIN_GAP for
  // the top band, per-row height sized to the HALO diameter (else 20px halos overlap on tight
  // Xen row spacing), and PIN_ROW_GAP for the vertical gap between neighbouring pin halos.
  //   pin_center_Y = HEADER_HEIGHT + HEADER_TO_PIN_GAP + halo_r  = 28 + 9 + 10 = 47
  //   halo_top_Y   = pin_center_Y - halo_r                        = 37   (Figma "first pin at 37")
  const layout = computeNodeLayout(node, {
    node:   { ...tokens.geometry.node, headerHeight: HEADER_HEIGHT },
    pin:    {
      diameter:   tokens.geometry.pin.diameter,
      rowSpacing: PIN_ROW_GAP,
      rowHeight:  HALO_RADIUS * 2,
    },
    header: { toPinsGap: HEADER_TO_PIN_GAP },
    widget: { rowHeight: tokens.geometry.widget.rowHeight, gap: tokens.geometry.widget.gap, controlMinWidth: tokens.geometry.widget.controlMinWidth },
  }, isPinConnected)

  const W = layout.body.width
  const FULL_H = layout.body.height
  // Collapsed form: pill height is INVARIANT (same as the no-pin pill). When more pins need to
  // fit on the cap perimeter, we SHRINK the halo / disc radius instead of growing the pill. Each
  // node still reads at the same vertical footprint when collapsed.
  const inputsCount  = node.pins.filter((p) => p.direction === 'in').length
  const outputsCount = node.pins.filter((p) => p.direction === 'out').length
  const maxPerSide = Math.max(inputsCount, outputsCount)
  const COLLAPSED_R = tokens.geometry.node.pillRadius ?? 20
  const COLLAPSED_H = tokens.geometry.node.pillHeight ?? (2 * COLLAPSED_R)
  const COLLAPSED_CY = COLLAPSED_H / 2
  // Tight-pack halos on the cap perimeter: adjacent halos should nearly touch (~2px gap).
  //   chord between neighbours = 2 * COLLAPSED_R * sin(step/2)
  //   gap = chord - 2 * haloR → for gap=2px and haloR=HALO_RADIUS:  step = 2·asin((haloR+1)/R)
  // If that step × (N-1) fits in the semicircle we keep haloR at its full value and REDUCE the
  // fan spread; otherwise we spread across the full semicircle and shrink haloR to fit.
  // Floor haloR at 3 so the disc stays visible even with a comically pin-heavy node.
  const HALO_GAP = 2
  const tightStep = 2 * Math.asin(Math.min(1, (HALO_RADIUS + HALO_GAP / 2) / COLLAPSED_R))
  const spreadFits = maxPerSide <= 1 || (maxPerSide - 1) * tightStep <= Math.PI
  const collapsedStep = maxPerSide <= 1
    ? 0
    : spreadFits ? tightStep : Math.PI / (maxPerSide - 1)
  const collapsedHaloR = spreadFits
    ? HALO_RADIUS
    : Math.max(3, COLLAPSED_R * Math.sin(collapsedStep / 2) - HALO_GAP / 2)
  const collapsedPinR = Math.max(2, collapsedHaloR * 0.6)
  const r = tokens.geometry.node.radius

  const container = new Container({ label: `daylight:${node.id}` })
  container.position.set(node.position.x, node.position.y)
  container.eventMode = 'static'

  // shell — body, shadow, header, title, category dot (always present)
  // halos — pin halos (drawn between shell and pins so they mask body corners but stay under discs)
  // pins  — pin discs + labels + widgets (expanded only)
  // glow  — hover/selected outline (attached on demand)
  const shell  = new Container({ label: 'shell' })
  const halos  = new Container({ label: 'halos' })
  const pins   = new Container({ label: 'pins' })
  container.addChild(shell, halos, pins)

  let collapsed = !!opts.collapsed
  let currentState: NodeVisualState = (opts as { state?: NodeVisualState }).state ?? 'default'
  let glow: Graphics | null = null
  let widgetsView: ReturnType<typeof renderWidgets> | null = null
  // Per-halo descriptors captured during buildPinsAndHalos so setGlow can stroke each halo's
  // outward arc — the selection outline must follow the node silhouette including pin bumps,
  // not just the body rect (image #42).
  let haloRefs: Array<{ x: number; y: number; outwardAngle: number; radius: number }> = []

  function buildShell(): void {
    while (shell.children.length > 0) shell.removeChildAt(0)!.destroy({ children: true })
    const h = collapsed ? COLLAPSED_H : FULL_H

    // Soft drop shadow — Daylight's body shares its fill with the canvas, so the shadow IS the
    // visual separator. Faked as a stack of offset rounded rects (no DropShadowFilter dependency).
    // The Figma value is `0 4px 14px rgba(174,174,174,0.23)`; we approximate the blur fall-off
    // with 5 rings.
    const SHADOW_RINGS = 5
    const shadowRadius = collapsed ? COLLAPSED_R : r
    for (let i = SHADOW_RINGS; i >= 1; i--) {
      const pad = (i / SHADOW_RINGS) * 7
      const alpha = 0.07 * (1 - i / (SHADOW_RINGS + 1))
      const shadow = new Graphics()
        .roundRect(-pad, 4 - pad, W + pad * 2, h + pad * 2, shadowRadius + pad)
        .fill({ color: 0xAEAEAE, alpha })
      shadow.eventMode = 'none'
      shell.addChild(shadow)
    }

    // Body — flat grey rounded rect (pill when collapsed, big radius). Same colour as canvas;
    // shadow above provides the rim.
    const bodyRadius = collapsed ? COLLAPSED_R : r
    const body = new Graphics()
      .roundRect(0, 0, W, h, bodyRadius)
      .fill(tokens.color.surface.node)
      .stroke({ color: tokens.color.surface.outline, width: 0.5 })
    body.eventMode = 'static'
    shell.addChild(body)

    // Title — Helvetica Neue with Inter / system fallback (the editor preloads Inter from CDN).
    // For the expanded form: title anchored at Figma's fixed 12px top-padding (NOT centred in the
    // header band — Figma places the whole title row at `top: 12` inside the node). For the
    // collapsed pill: centre in the pill.
    const titleText = new BitmapText({
      text: opts.title ?? node.type,
      style: {
        fontFamily: '"Helvetica Neue", Inter, system-ui, sans-serif',
        fontSize: TITLE_FONT_SIZE,
        fontWeight: '500',
        fill: tokens.color.text.primary,
      },
    })
    const titleY = collapsed ? (h - titleText.height) / 2 : TITLE_TOP_PAD
    titleText.position.set(12, titleY)
    titleText.eventMode = 'none'
    shell.addChild(titleText)

    // Category dot (Figma: 4x4, ellipse in the header auto-layout, 6px gap right of the title).
    if (opts.category) {
      const accent = tokens.category[opts.category as keyof typeof tokens.category]?.accent
        ?? tokens.color.brand['primary']
      const dot = new Graphics().circle(0, 0, CATEGORY_DOT / 2).fill(accent)
      ;(dot as unknown as { __categoryDot: true }).__categoryDot = true
      dot.position.set(12 + titleText.width + 6, titleY + titleText.height / 2)
      shell.addChild(dot)
    }

    // Chevron — collapse/expand toggle. Sits on the same baseline as the title (Figma: last child
    // of the header auto-layout row).
    const chev = new Graphics()
    if (collapsed) {
      chev.moveTo(0, 0).lineTo(5, 4).lineTo(0, 8).stroke({ color: tokens.color.text.secondary, width: 1.4 })
    } else {
      chev.moveTo(0, 0).lineTo(4, 5).lineTo(8, 0).stroke({ color: tokens.color.text.secondary, width: 1.4 })
    }
    const chevY = collapsed ? (h - 8) / 2 : titleY + (titleText.height - 8) / 2
    chev.position.set(W - 22, chevY)
    chev.eventMode = 'static'
    chev.cursor = 'pointer'
    chev.hitArea = { contains: (px: number, py: number) => px >= -8 && px <= 16 && py >= -8 && py <= 16 }
    chev.on('pointerdown', (e) => {
      e.stopPropagation()
      collapsed = !collapsed
      buildShell()
      buildPinsAndHalos()
      setGlow(currentState === 'hover' ? 'hover' : currentState === 'selected' ? 'selected' : 'none')
    })
    shell.addChild(chev)
  }

  function buildPinsAndHalos(): void {
    while (halos.children.length > 0) halos.removeChildAt(0)!.destroy({ children: true })
    while (pins.children.length > 0) pins.removeChildAt(0)!.destroy({ children: true })
    haloRefs = []

    // Widgets first (under pins for hit-test order — pins must win clicks on shared rows).
    // MUST use the SAME layout tokens as `computeNodeLayout` above — the widget renderer's
    // `pinRowCenterY` reads pin.rowSpacing / pin.rowHeight / node.headerHeight / header.toPinsGap
    // to compute a widget row's Y, so any drift here shifts a bound widget off its pin.
    if (!collapsed && node.widgets && node.widgets.length > 0) {
      const layoutTokens = {
        node:   { headerHeight: HEADER_HEIGHT },
        pin:    {
          rowSpacing: PIN_ROW_GAP,
          rowHeight:  HALO_RADIUS * 2,
          diameter:   tokens.geometry.pin.diameter,
          labelGap:   tokens.geometry.pin.labelGap,
        },
        header: { toPinsGap: HEADER_TO_PIN_GAP },
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
      pins.addChild(widgetsView.container)
    } else {
      widgetsView = null
    }

    // Pin halos + discs.
    // For COLLAPSED form, pins sit on the rounded end-cap perimeter — fanned over the FULL
    // semicircle (180° spread). The cap radius was pre-sized (COLLAPSED_R) so neighbouring
    // halos don't overlap, so we can just walk the angle from -π/2 (top) to π/2 (bottom).
    const collapsedInputs  = node.pins.filter((p) => p.direction === 'in')
    const collapsedOutputs = node.pins.filter((p) => p.direction === 'out')
    // Center a fan of `count` pins around the horizontal axis (angle 0), using the pre-computed
    // step so neighbours pack tight with a small gap between halos. Fan spread = (count-1)*step.
    const fanAngle = (count: number, idx: number): number => {
      if (count <= 1) return 0
      return -((count - 1) * collapsedStep) / 2 + idx * collapsedStep
    }

    for (const p of layout.pins) {
      const pin = node.pins.find((x) => String(x.id) === String(p.id))!
      const colour = resolvePinColor(pin.type, tokens)

      let localX: number, localY: number
      if (collapsed) {
        // Pin sits on the cap circle perimeter at angle θ (from "due-left" axis for inputs,
        // "due-right" for outputs). Halo center == pin center == on the pill boundary; the halo
        // disc protrudes radially outward.
        if (pin.direction === 'in') {
          const idx = collapsedInputs.indexOf(pin)
          const a   = fanAngle(collapsedInputs.length, idx)
          localX = COLLAPSED_R - COLLAPSED_R * Math.cos(a)
          localY = COLLAPSED_CY + COLLAPSED_R * Math.sin(a)
        } else {
          const idx = collapsedOutputs.indexOf(pin)
          const a   = fanAngle(collapsedOutputs.length, idx)
          localX = W - COLLAPSED_R + COLLAPSED_R * Math.cos(a)
          localY = COLLAPSED_CY + COLLAPSED_R * Math.sin(a)
        }
      } else {
        localX = p.x - layout.body.x
        localY = p.y - layout.body.y
      }

      // Halo + half-disc shadow on the PROTRUDING (outward-radial) side.
      // - Expanded: pins ride the left/right body edges → "outward" is just left or right.
      // - Collapsed: pins sit on a cap-circle perimeter → "outward" is the vector from cap
      //   centre through pin. Compute outward angle from cap centre.
      // Shadow drawn as a half-disc (arc + closePath) on the outward side so its inner half
      // (which would sit inside the body) doesn't bleed in as a dark blob (image #31).
      let outwardAngle: number
      if (collapsed) {
        const capCx = pin.direction === 'in' ? COLLAPSED_R : W - COLLAPSED_R
        outwardAngle = Math.atan2(localY - COLLAPSED_CY, localX - capCx)
      } else {
        outwardAngle = p.side === 'left' ? Math.PI : 0
      }
      const SHADOW_RINGS = 4
      for (let i = SHADOW_RINGS; i >= 1; i--) {
        const pad = (i / SHADOW_RINGS) * 4
        const alpha = 0.07 * (1 - i / (SHADOW_RINGS + 1))
        const sr = (collapsed ? collapsedHaloR : HALO_RADIUS) + pad
        const g = new Graphics()
        // Half-disc spanning ±π/2 around `outwardAngle`. arc(cx, cy, r, a0, a1, ccw=false) draws
        // the short way from a0 → a1 when ccw=false; with start=outwardAngle-π/2, end=+π/2, it
        // sweeps through outwardAngle — i.e. the outward half-disc.
        g.arc(localX, localY + 2, sr, outwardAngle - Math.PI / 2, outwardAngle + Math.PI / 2, false)
          .closePath()
          .fill({ color: 0xAEAEAE, alpha })
        g.eventMode = 'none'
        halos.addChild(g)
      }
      const haloR = collapsed ? collapsedHaloR : HALO_RADIUS
      const halo = new Graphics()
        .circle(localX, localY, haloR)
        .fill(tokens.color.surface.node)
      halo.eventMode = 'none'
      halos.addChild(halo)
      haloRefs.push({ x: localX, y: localY, outwardAngle, radius: haloR })

      // Pin disc — solid when connected, ring when not. The disconnected ring lets the halo grey
      // show through, matching the Figma source.
      const disc = new Graphics()
      const connected = isPinConnected(String(pin.id))
      const pinR = collapsed ? collapsedPinR : PIN_RADIUS
      if (connected) {
        // Bullseye "target" symbol — outer ring, grey gap, inner dot. Ratios from Figma spec:
        //   outer disc diameter = 12 (r=PIN_RADIUS)
        //   inner dot  diameter =  5.33 (r = PIN_RADIUS * PIN_INNER_RATIO ≈ 2.67)
        //   grey gap punched between them at PIN_RADIUS * PIN_GREY_GAP_RATIO to visually separate.
        disc.circle(localX, localY, pinR).fill(colour)
        disc.circle(localX, localY, pinR * PIN_GREY_GAP_RATIO).fill(tokens.color.surface.node)
        disc.circle(localX, localY, pinR * PIN_INNER_RATIO).fill(colour)
      } else {
        // Disconnected pin: paint an annulus (outer disc − inner disc filled with the halo grey)
        // so its OUTER diameter is exactly `2·pinR`, matching the connected bullseye. A stroke at
        // `pinR` extends to `pinR + width/2` outward, reading as a visibly larger pin — hence the
        // two-fill approach here.
        const ringW = Math.max(1.2, DISCONNECTED_RING_WIDTH * (pinR / PIN_RADIUS))
        disc.circle(localX, localY, pinR).fill(colour)
        disc.circle(localX, localY, Math.max(0, pinR - ringW)).fill(tokens.color.surface.node)
      }
      markPinInteractive(disc, pin, String(node.id), localX, localY, pinR)
      pins.addChild(disc)

      if (!collapsed && pin.label) {
        const label = new BitmapText({
          text: pin.label,
          style: {
            fontFamily: '"Helvetica Neue", Inter, system-ui, sans-serif',
            fontSize: 11,
            fill: tokens.color.text.secondary,
          },
        })
        label.eventMode = 'none'
        const ly = localY - label.height / 2
        if (p.side === 'left') {
          label.position.set(localX + PIN_RADIUS + 8, ly)
        } else {
          label.anchor.set(1, 0)
          label.position.set(localX - PIN_RADIUS - 8, ly)
        }
        pins.addChild(label)
      }
    }
  }

  function setGlow(intensity: 'none' | 'hover' | 'selected'): void {
    if (glow) { const g = glow; glow = null; g.destroy({ children: true }) }
    if (intensity === 'none') return
    const h = collapsed ? COLLAPSED_H : FULL_H
    const bodyR = collapsed ? COLLAPSED_R : r
    const strokeColor = tokens.color.brand['primary']!
    const RIM = 2
    // Trick: instead of computing the body+halo path union ourselves (the union has gaps where
    // halo arcs meet body corners, image #44), draw a SOLID silhouette padded by RIM in all
    // directions. Body + halos are rendered on top in their normal colours — the only visible
    // pixels of this silhouette are the RIM-wide ring around the union outline. No gaps, no
    // tangent artifacts, no manual path stitching.
    // Build silhouette as ONE compound path filled in a single .fill() — PIXI v8 closes &
    // discards the current path after fill, so each shape needs to be queued BEFORE the fill
    // call. Earlier per-halo `.arc().closePath().fill()` had only the first halo render and the
    // body outline distort (images #46/#47).
    const sel = new Graphics()
    sel.roundRect(-RIM, -RIM, W + 2 * RIM, h + 2 * RIM, bodyR + RIM)
    for (const halo of haloRefs) {
      sel.circle(halo.x, halo.y, halo.radius + RIM)
    }
    sel.fill(strokeColor)
    sel.eventMode = 'none'
    container.addChildAt(sel, 0)
    glow = sel
  }

  buildShell()
  buildPinsAndHalos()
  if (currentState === 'hover')    setGlow('hover')
  if (currentState === 'selected') setGlow('selected')

  const view: NodeView = {
    get container() { return container },
    setVisualState: (s) => {
      if (s === currentState) return
      currentState = s
      setGlow(s === 'hover' ? 'hover' : s === 'selected' ? 'selected' : 'none')
    },
    setCollapsed: (c) => {
      if (c === collapsed) return
      collapsed = c
      buildShell()
      buildPinsAndHalos()
      setGlow(currentState === 'hover' ? 'hover' : currentState === 'selected' ? 'selected' : 'none')
    },
    isCollapsed: () => collapsed,
    pinLocalPosition: (id) => {
      const lp = layout.pins.find((p) => String(p.id) === id)
      if (!lp) return null
      if (collapsed) {
        // Recompute the fan position so wires land on the visible pin disc, not the pill centre.
        const pin = node.pins.find((p) => String(p.id) === id)
        if (!pin) return { x: lp.side === 'left' ? 0 : W, y: COLLAPSED_CY }
        const siblings = node.pins.filter((p) => p.direction === pin.direction)
        const idx = siblings.indexOf(pin)
        const count = siblings.length
        const a = count <= 1 ? 0 : -Math.PI / 2 + idx * (Math.PI / (count - 1))
        return pin.direction === 'in'
          ? { x: COLLAPSED_R - COLLAPSED_R * Math.cos(a), y: COLLAPSED_CY + COLLAPSED_R * Math.sin(a) }
          : { x: W - COLLAPSED_R + COLLAPSED_R * Math.cos(a), y: COLLAPSED_CY + COLLAPSED_R * Math.sin(a) }
      }
      return { x: lp.x - layout.body.x, y: lp.y - layout.body.y }
    },
    // Forward widgetHit AND updateWidget — `updateWidget` is what the editor calls during live
    // slider / number / xypad drags to refresh the widget visual without rebuilding the node.
    // Without it the value updates in the model but the canvas stays frozen at the start value.
    widgetHit: (lx: number, ly: number) => widgetsView?.widgetHit(lx, ly) ?? null,
    updateWidget: (id: string, value: unknown) => { widgetsView?.update(id, value) },
  }
  return view
}

function resolvePinColor(type: string, tokens: XenTokens): string {
  const tok = tokens.pinType[type as keyof typeof tokens.pinType]
  return tok?.color ?? tokens.color.brand['primary']!
}
