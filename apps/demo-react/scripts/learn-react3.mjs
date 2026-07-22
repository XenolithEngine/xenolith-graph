import { chromium } from '@playwright/test'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 })
p.on('pageerror', e => console.log('PAGEERR:', e.message))
p.on('console', m => { if (m.type() !== 'log') console.log(`[${m.type()}]`, m.text()) })
await p.goto('http://localhost:4321/learn/02-register-schema/?cb=' + Date.now())
await p.waitForTimeout(1500)
await p.locator('[data-fw-chip="react"]').click()
await p.waitForTimeout(2500)
// React's xenolith-graph div has a host element. PIXI mounts canvas inside. The editor is
// exposed via XenolithGraph's containerRef - we can read editor via window.__xenoEditor pattern
// if there is one. Let me probe.
const probe = await p.evaluate(() => {
  // Inspect the React editor by reading PIXI canvas pixels at center
  const canvas = document.querySelector('[data-fw="react"] canvas')
  if (!canvas) return { error: 'no canvas' }
  const w = canvas.width, h = canvas.height
  // Take a sample of the center to check non-empty
  const ctx = canvas.getContext('webgl2') || canvas.getContext('webgl')
  if (!ctx) return { error: 'no webgl' }
  // The actual editor instance — see if it's exposed somewhere
  return {
    canvasInner: `${w}x${h}`,
    canvasCss: `${canvas.style.width}x${canvas.style.height}`,
    // window-level editor maps populated by site (if any)
    keys: Object.keys(window).filter(k => k.toLowerCase().includes('xeno')),
  }
})
console.log(JSON.stringify(probe, null, 2))
await b.close()
