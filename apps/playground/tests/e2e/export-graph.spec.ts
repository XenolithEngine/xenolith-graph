import { test, expect } from '@playwright/test'

// exportImage() must produce a NON-EMPTY PNG even when the whole-graph render target exceeds the
// WebGL MAX_TEXTURE_SIZE limit. The export target's pixel size is (graphBBox + padding) × scale; a
// wide graph at the default scale 2 blows past the ~8192–16384px GPU texture cap, and PIXI silently
// yields an empty (fully transparent) RenderTexture — so the PNG comes out blank regardless of
// viewport state. The fix tiles the render (each tile under the limit) and stitches into one canvas.
//
// Verified at the pixel level: a default-scale PNG export of a wide graph must contain the graph's
// real pixels — node fills, text, pins — not just the flat background an oversized-target render
// leaves behind. Counted as distinct colours differing from the background.

const E = '__xenoEditor'

test('exportImage PNG is non-empty for a wide graph at default scale (regression: blank PNG past texture limit)', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('canvas')
  await page.waitForFunction(() => '__xenoEditor' in window)

  // A WIDE graph: 30 nodes spread 700px apart along X → ~21000px world width. At the default
  // export scale (2) the target texture is ~42000px wide, far beyond any GPU's MAX_TEXTURE_SIZE —
  // the exact condition that produced a fully-transparent PNG before the tile fix.
  await page.evaluate((key) => {
    const e = (window as unknown as Record<string, any>)[key]
    e.clear()
    e.registry.register({ type: 'Mark', title: 'Mark', category: 'mark', pins: [{ kind: 'data', direction: 'in', type: 'float', label: 'in' }] })
    e.setCategoryPalette({ mark: { color: '#ff00ff' } })
    for (let i = 0; i < 30; i++) e.insertNode('Mark', { x: i * 700, y: (i % 3) * 200 })
  }, E)
  await page.waitForTimeout(500)

  const r = await page.evaluate(async (key) => {
    const e = (window as unknown as Record<string, any>)[key]
    // Default scale (2) — the user-facing Save PNG path.
    const blob: Blob = await e.exportImage({ format: 'png' })
    const bmp = await createImageBitmap(blob)
    const cv = document.createElement('canvas'); cv.width = bmp.width; cv.height = bmp.height
    const ctx = cv.getContext('2d')!; ctx.drawImage(bmp, 0, 0)
    const { data } = ctx.getImageData(0, 0, bmp.width, bmp.height)
    // The background is one flat colour, so a BLANK/oversized export (which only ever renders that
    // background, or nothing) shows ~1 colour. A real graph paints node fills, header tints, title
    // text and pins — dozens of distinct colours. Count distinct colour buckets that differ from the
    // corner's background sample; that count is the real-vs-blank signal, immune to the background
    // fill masking the problem (the trap an alpha-only check falls into).
    const bg = [data[0]!, data[1]!, data[2]!]
    const colours = new Set<number>()
    let ink = 0, sampled = 0
    for (let i = 0; i < data.length; i += 64) { // stride 16 px for speed on the very large canvas
      sampled++
      const red = data[i]!, grn = data[i + 1]!, blu = data[i + 2]!, alp = data[i + 3]!
      if (alp === 0) continue
      if (Math.abs(red - bg[0]) + Math.abs(grn - bg[1]) + Math.abs(blu - bg[2]) > 30) {
        ink++
        colours.add((red >> 4) * 4096 + (grn >> 4) * 16 + (blu >> 4))
      }
    }
    return { width: bmp.width, height: bmp.height, sampled, ink, distinctColours: colours.size }
  }, E)

  // Before the tile fix: the oversized target renders empty, so only the flat background survives —
  // a handful of distinct colours at most (just the bg shade + AA). After it, the whole graph with
  // its node fills/text/pins paints, yielding many distinct colours. Require a clear margin.
  expect(r.distinctColours).toBeGreaterThan(40)
})
