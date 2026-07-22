import { chromium } from '@playwright/test'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 })
p.on('pageerror', e => console.log('PAGEERR:', e.message))
p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE.error:', m.text()) })
await p.goto('http://localhost:4321/learn/02-register-schema/?cb=' + Date.now())
await p.waitForTimeout(3000)
const state = await p.evaluate(() => {
  const panes = [...document.querySelectorAll('[data-fw]')].map(p => ({
    fw: p.dataset.fw, class: p.className, display: getComputedStyle(p).display,
    canvases: p.querySelectorAll('canvas').length,
    childHtml: p.innerHTML.slice(0, 200),
  }))
  return { panes }
})
console.log(JSON.stringify(state, null, 2))
await p.screenshot({ path: '/tmp/learn-02.png' })
await b.close()
