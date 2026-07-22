import { chromium } from '@playwright/test'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 })
p.on('pageerror', e => console.log('PAGEERR:', e.message))
p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log(`[${m.type()}]`, m.text()) })
await p.goto('http://localhost:4321/learn/02-register-schema/?cb=' + Date.now())
await p.waitForTimeout(1500)
await p.locator('[data-fw-chip="react"]').click()
await p.waitForTimeout(3000)
// Try to reach React's editor through host div
const state = await p.evaluate(() => {
  const reactPane = document.querySelector('[data-fw="react"]')
  const xenoDiv = reactPane?.querySelector('.xeno')
  const app = reactPane?.querySelector('.app')
  return {
    appRect: app?.getBoundingClientRect ? JSON.stringify(app.getBoundingClientRect()) : null,
    xenoRect: xenoDiv?.getBoundingClientRect ? JSON.stringify(xenoDiv.getBoundingClientRect()) : null,
    xenoHtml: xenoDiv?.innerHTML.slice(0, 300),
  }
})
console.log(JSON.stringify(state, null, 2))
await b.close()
