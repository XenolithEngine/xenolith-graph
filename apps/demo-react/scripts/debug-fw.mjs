import { chromium } from '@playwright/test'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1000, height: 640 } })
await p.goto('http://localhost:4321/xenolith-graph/examples/palette-sidebar/?cb=' + Date.now())
await p.waitForTimeout(2500)
const out = await p.evaluate(() => {
  const panes = document.querySelectorAll('[data-fw]')
  return [...panes].map(p => ({
    fw: p.dataset.fw,
    class: p.className,
    display: getComputedStyle(p).display,
    visibility: getComputedStyle(p).visibility,
  }))
})
console.log(JSON.stringify(out, null, 2))
await b.close()
