import { chromium } from '@playwright/test'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 })
p.on('pageerror', e => console.log('PAGEERR:', e.message))
p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE.error:', m.text()) })
await p.goto('http://localhost:4321/learn/02-register-schema/?cb=' + Date.now())
await p.waitForTimeout(2000)
const reactChip = p.locator('[data-fw-chip="react"]')
await reactChip.click()
await p.waitForTimeout(2000)
const state = await p.evaluate(() => {
  const reactPane = document.querySelector('[data-fw="react"]')
  return {
    reactClass: reactPane?.className,
    reactDisplay: reactPane ? getComputedStyle(reactPane).display : null,
    reactCanvas: reactPane?.querySelectorAll('canvas').length,
    reactCanvasSize: reactPane?.querySelector('canvas')?.getBoundingClientRect() ?
      JSON.stringify((reactPane.querySelector('canvas')).getBoundingClientRect()) : null,
  }
})
console.log(JSON.stringify(state, null, 2))
await p.screenshot({ path: '/tmp/learn-react.png' })
await b.close()
