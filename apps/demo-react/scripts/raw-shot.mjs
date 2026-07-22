import { chromium } from '@playwright/test'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1000, height: 640 }, deviceScaleFactor: 2 })
await p.goto('http://localhost:4321/examples/palette-sidebar/?cb=' + Date.now())
await p.locator('canvas').first().waitFor({ timeout: 30000 })
await p.waitForTimeout(2500)
const out = await p.evaluate(() => {
  const sb = document.querySelector('[data-xeno-palette-sidebar]')
  const allXeno = [...document.querySelectorAll('[data-xeno-overlay-root] > *')].map(c => c.tagName + ':' + c.className + ':' + [...c.attributes].map(a => a.name).join(','))
  return { sb: sb ? sb.outerHTML.slice(0, 200) : 'NONE', children: allXeno }
})
console.log(JSON.stringify(out, null, 2))
await p.screenshot({ path: '/tmp/raw.png' })
await b.close()
