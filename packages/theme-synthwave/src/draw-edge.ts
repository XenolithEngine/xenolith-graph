import type { Graphics } from 'pixi.js'
import { computeEdgePath, resolveEdgeColor, type RenderEdgeOptions } from '@xenolithengine/graph-render-pixi'
import type { PinLayout } from '@xenolithengine/graph-render-pixi'
import type { XenTokens } from '@xenolithengine/graph-theme-xen'

// Synthwave wire renderer — two-pass bezier: wide blurred glow stroke + sharp on-top stroke.
// Same Graphics, two draw calls. Cheap, no filter, but the wires now read as neon TUBES sitting
// on the dark canvas rather than thin flat lines.

export function drawEdgeSynthwave(
  g: Graphics,
  from: PinLayout,
  to: PinLayout,
  tokens: XenTokens,
  opts: RenderEdgeOptions = {},
): Graphics {
  const sourceType = opts.sourceType ?? 'any'
  const color = resolveEdgeColor(sourceType, tokens)
  const baseWidth = sourceType === 'exec' ? tokens.geometry.edge.execWidth : tokens.geometry.edge.width

  g.clear()

  const path = computeEdgePath(from, to, {
    bezierTension: tokens.geometry.edge.bezierTension,
    minHorizontalSpread: tokens.geometry.edge.minHorizontalSpread,
  })

  // PASS 1 — wide soft glow underneath. Heavy stroke with low alpha simulates an outer halo.
  // Two layers (wider/dimmer + narrower/brighter) give a smoother falloff than a single wide one.
  g.moveTo(path.start.x, path.start.y)
    .bezierCurveTo(path.c1.x, path.c1.y, path.c2.x, path.c2.y, path.end.x, path.end.y)
    .stroke({ color, width: baseWidth + 10, alpha: 0.12 })

  g.moveTo(path.start.x, path.start.y)
    .bezierCurveTo(path.c1.x, path.c1.y, path.c2.x, path.c2.y, path.end.x, path.end.y)
    .stroke({ color, width: baseWidth + 4, alpha: 0.32 })

  // PASS 2 — sharp on-top stroke. The actual wire.
  g.moveTo(path.start.x, path.start.y)
    .bezierCurveTo(path.c1.x, path.c1.y, path.c2.x, path.c2.y, path.end.x, path.end.y)
    .stroke({ color, width: baseWidth, alpha: opts.animated ? 0.4 : 1 })

  // Arrow head (uses the same colour, no glow — keeps the tip readable).
  if (opts.markerEnd === 'arrow') {
    const a = tokens.geometry.edge.arrowSize
    const dx = path.end.x - path.c2.x, dy = path.end.y - path.c2.y
    const len = Math.hypot(dx, dy) || 1
    const ux = dx / len, uy = dy / len
    const tip = path.end
    const baseX = tip.x - ux * a, baseY = tip.y - uy * a
    const px = -uy, py = ux
    const half = a * 0.4
    g.moveTo(tip.x, tip.y)
      .lineTo(baseX + px * half, baseY + py * half)
      .lineTo(baseX - px * half, baseY - py * half)
      .closePath()
      .fill({ color })
  }

  // Midpoint dot — same convention as the base renderer (lets reroute hit-testing find midpoints).
  const rMid = tokens.geometry.edge.midpointRadius
  if (!opts.noMidpoint && rMid > 0) {
    const mid = { x: 0.125 * (path.start.x + 3 * path.c1.x + 3 * path.c2.x + path.end.x), y: 0.125 * (path.start.y + 3 * path.c1.y + 3 * path.c2.y + path.end.y) }
    g.circle(mid.x, mid.y, rMid)
      .fill({ color })
      .stroke({ color: tokens.color.surface.canvas, width: 1, alignment: 0.5 })
  }

  return g
}
