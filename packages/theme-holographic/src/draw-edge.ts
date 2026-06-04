import type { Graphics } from 'pixi.js'
import { computeEdgePath, sampleBezier, bezierMidpoint, type RenderEdgeOptions, type PinLayout } from '@xenolithengine/graph-render-pixi'
import type { XenTokens } from '@xenolithengine/graph-theme-xen'

// Holographic wire renderer — bezier path drawn as a sequence of short coloured segments that
// rotate through the HSV wheel along the curve. Result is a rainbow GRADIENT stroke (PIXI
// Graphics doesn't support native gradient strokes, so we fake it with N segments).
//
// Soft glow underneath each segment (lower alpha, wider) so the rainbow READS as a luminous tube
// rather than a flat painted line.

const SEG = 36          // number of segments along the bezier — smooth enough for a graceful gradient
const SEGMENT_OVERLAP = 1 // small overdraw between segments so joins don't show as colour-stops

function hsvToHex(h: number, s: number, v: number): number {
  const i = Math.floor(h * 6)
  const f = h * 6 - i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)
  let r = 0, g = 0, b = 0
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break
    case 1: r = q; g = v; b = p; break
    case 2: r = p; g = v; b = t; break
    case 3: r = p; g = q; b = v; break
    case 4: r = t; g = p; b = v; break
    case 5: r = v; g = p; b = q; break
  }
  return (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255)
}

export function drawEdgeHolographic(
  g: Graphics,
  from: PinLayout,
  to: PinLayout,
  tokens: XenTokens,
  opts: RenderEdgeOptions = {},
): Graphics {
  g.clear()
  const baseWidth = opts.sourceType === 'exec' ? tokens.geometry.edge.execWidth : tokens.geometry.edge.width

  const path = computeEdgePath(from, to, {
    bezierTension: tokens.geometry.edge.bezierTension,
    minHorizontalSpread: tokens.geometry.edge.minHorizontalSpread,
  })
  const pts = sampleBezier(path, SEG)

  // Hue offset based on the START point so two edges from the same source share a starting
  // colour (creates a sense of "data identity" along branches).
  const hueOffset = ((from.x + from.y) * 0.0007) % 1

  // PASS 1 — soft glow under everything (single colour: a near-white with low alpha — keeps the
  // bloom neutral so the rainbow overpaint stays vivid).
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!, b = pts[i + 1]!
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ color: 0xffffff, width: baseWidth + 8, alpha: 0.05 })
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!, b = pts[i + 1]!
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ color: 0xffffff, width: baseWidth + 3, alpha: 0.1 })
  }

  // PASS 2 — rainbow segments on top. Hue rotates by edge position so the wire reads as a
  // gradient stroke. Slight overdraw at joins avoids visible colour-stops.
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!, b = pts[i + 1]!
    const t = i / (pts.length - 1)
    const hue = (hueOffset + t) % 1
    const colour = hsvToHex(hue, 0.85, 1.0)
    const dx = b.x - a.x, dy = b.y - a.y
    const len = Math.hypot(dx, dy) || 1
    const ux = dx / len, uy = dy / len
    const x0 = a.x - ux * SEGMENT_OVERLAP, y0 = a.y - uy * SEGMENT_OVERLAP
    const x1 = b.x + ux * SEGMENT_OVERLAP, y1 = b.y + uy * SEGMENT_OVERLAP
    g.moveTo(x0, y0).lineTo(x1, y1).stroke({ color: colour, width: baseWidth, alpha: opts.animated ? 0.55 : 1 })
  }

  if (opts.markerEnd === 'arrow') {
    const a = tokens.geometry.edge.arrowSize
    const dx = path.end.x - path.c2.x, dy = path.end.y - path.c2.y
    const len = Math.hypot(dx, dy) || 1
    const ux = dx / len, uy = dy / len
    const tip = path.end
    const baseX = tip.x - ux * a, baseY = tip.y - uy * a
    const px = -uy, py = ux
    const half = a * 0.4
    const tipHue = (hueOffset + 1) % 1
    g.moveTo(tip.x, tip.y)
      .lineTo(baseX + px * half, baseY + py * half)
      .lineTo(baseX - px * half, baseY - py * half)
      .closePath()
      .fill({ color: hsvToHex(tipHue, 0.85, 1.0) })
  }

  // Midpoint dot — same contract as base Xen / liquid-glass: lets reroute insertion + edge
  // context menu find the wire's midpoint by hit-test. Without it, the edge-midpoint UI breaks.
  const rMid = tokens.geometry.edge.midpointRadius
  if (!opts.noMidpoint && rMid > 0) {
    const mid = bezierMidpoint(path)
    const midHue = (hueOffset + 0.5) % 1
    g.circle(mid.x, mid.y, rMid)
      .fill({ color: hsvToHex(midHue, 0.85, 1.0) })
      .stroke({ color: tokens.color.surface.canvas, width: 1, alignment: 0.5 })
  }

  return g
}
