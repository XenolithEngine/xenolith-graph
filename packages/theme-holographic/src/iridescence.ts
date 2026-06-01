// Iridescent rainbow utilities — Canvas2D bake of a rounded-rect border with HSV-rotating hue
// around the perimeter. Cached by (w, h) signature so all nodes of the same size share one
// texture. Cheaper than running a shader per node, no PIXI v8 GlProgram quirks to debug.

import { Texture } from 'pixi.js'

const cache = new Map<string, Texture>()

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const i = Math.floor(h * 6)
  const f = h * 6 - i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)
  switch (i % 6) {
    case 0: return [v, t, p]
    case 1: return [q, v, p]
    case 2: return [p, v, t]
    case 3: return [p, q, v]
    case 4: return [t, p, v]
    case 5: return [v, p, q]
  }
  return [0, 0, 0]
}

/** Bake a rounded-rect iridescent border. The hue rotates along the perimeter (0° top-left →
 *  360° back to start), giving a smooth rainbow ring. Outer stroke is the rainbow itself;
 *  inner stroke is a thin white-glow for a "neon glass edge" highlight. */
export function bakeIridescentFrame(w: number, h: number, radius: number, scale = 2): Texture {
  const key = `${Math.round(w)}x${Math.round(h)}r${Math.round(radius)}s${scale}`
  const hit = cache.get(key)
  if (hit) return hit

  const W = Math.max(2, Math.ceil(w * scale))
  const H = Math.max(2, Math.ceil(h * scale))
  const R = radius * scale
  const cnv = document.createElement('canvas')
  cnv.width = W
  cnv.height = H
  const ctx = cnv.getContext('2d')!
  ctx.imageSmoothingEnabled = true

  // Approximate the rounded-rect perimeter as N points so we can paint short arc-segments with
  // shifting hue. Higher N = smoother gradient; 360 is plenty.
  const N = 360
  const perim = roundedRectPerimeter(W, H, R, N)
  const STROKE_W = 3 * scale

  ctx.lineWidth = STROKE_W
  ctx.lineCap = 'round'

  // Outer stroke: rainbow.
  for (let i = 0; i < N; i++) {
    const a = perim[i]!
    const b = perim[(i + 1) % N]!
    const hue = i / N
    const [r, g, bb] = hsvToRgb(hue, 1.0, 1.0)
    ctx.strokeStyle = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(bb * 255)}, 0.95)`
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
  }

  // Inner thin white highlight just inside the rainbow — gives the glass-edge "light catches it"
  // feel.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)'
  ctx.lineWidth = 1 * scale
  drawRoundedRectPath(ctx, STROKE_W * 0.5, STROKE_W * 0.5, W - STROKE_W, H - STROKE_W, Math.max(0, R - STROKE_W * 0.5))
  ctx.stroke()

  const tex = Texture.from(cnv)
  cache.set(key, tex)
  return tex
}

function roundedRectPerimeter(w: number, h: number, r: number, n: number): Array<{ x: number; y: number }> {
  // Build a polyline that traces the rounded-rect outline, then sample n equally-spaced points.
  const samples: Array<{ x: number; y: number }> = []
  // Top edge: from (r, 0) to (w - r, 0).
  samples.push(...sampleLine(r, 0, w - r, 0, 32))
  // Top-right corner.
  samples.push(...sampleArc(w - r, r, r, -Math.PI / 2, 0, 32))
  // Right edge.
  samples.push(...sampleLine(w, r, w, h - r, 32))
  // Bottom-right corner.
  samples.push(...sampleArc(w - r, h - r, r, 0, Math.PI / 2, 32))
  // Bottom edge.
  samples.push(...sampleLine(w - r, h, r, h, 32))
  // Bottom-left corner.
  samples.push(...sampleArc(r, h - r, r, Math.PI / 2, Math.PI, 32))
  // Left edge.
  samples.push(...sampleLine(0, h - r, 0, r, 32))
  // Top-left corner.
  samples.push(...sampleArc(r, r, r, Math.PI, Math.PI * 1.5, 32))

  // Resample to n equally-spaced points by arc length.
  const lens = [0]
  for (let i = 1; i < samples.length; i++) {
    lens.push(lens[i - 1]! + Math.hypot(samples[i]!.x - samples[i - 1]!.x, samples[i]!.y - samples[i - 1]!.y))
  }
  const total = lens.at(-1)!
  const out: Array<{ x: number; y: number }> = []
  for (let k = 0; k < n; k++) {
    const target = (k / n) * total
    let j = 0
    while (j < lens.length - 1 && lens[j + 1]! < target) j++
    const t = (target - lens[j]!) / Math.max(1e-6, (lens[j + 1]! - lens[j]!))
    const a = samples[j]!, b = samples[Math.min(j + 1, samples.length - 1)]!
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
  }
  return out
}

function sampleLine(x0: number, y0: number, x1: number, y1: number, n: number): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = []
  for (let i = 0; i < n; i++) out.push({ x: x0 + ((x1 - x0) * i) / n, y: y0 + ((y1 - y0) * i) / n })
  return out
}
function sampleArc(cx: number, cy: number, r: number, a0: number, a1: number, n: number): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = []
  for (let i = 0; i < n; i++) {
    const a = a0 + ((a1 - a0) * i) / n
    out.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r })
  }
  return out
}

function drawRoundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

/** Hue offset (0..1) for a node based on its world position — gives the "parallax shift" feel
 *  where each node in the canvas has a slightly different iridescent tilt. Wraps every 1600
 *  world-units so panning a long graph shows a smooth rotation through the spectrum. */
export function parallaxHueFor(x: number, y: number): number {
  const v = (x * 0.00031 + y * 0.00017)
  return ((v % 1) + 1) % 1
}
