// Regenerate ONE thumb — used after fixing a layout/visibility issue on a specific example so we
// don't re-shoot all 30+ thumbs.
import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const here = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(here, '..', '..', 'site', 'public', 'examples', 'thumbs')
const BASE = (process.env.BASE_URL ?? 'http://localhost:4321/xenolith-graph').replace(/\/$/, '')
const id = process.argv[2]
if (!id) { console.error('usage: node gen-one-thumb.mjs <example-id>'); process.exit(1) }
await mkdir(OUT, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1000, height: 640 }, deviceScaleFactor: 2 })
await page.goto(`${BASE}/examples/${id}/`, { waitUntil: 'domcontentloaded' })
await page.locator('canvas').first().waitFor({ timeout: 30000, state: 'attached' })
await page.waitForTimeout(1500)
const fit = page.getByRole('button', { name: 'Fit view' })
if (await fit.count()) await fit.first().click()
const zoomOut = page.getByRole('button', { name: 'Zoom out' })
if (await zoomOut.count()) { await zoomOut.first().click(); await zoomOut.first().click() }
await page.waitForTimeout(400)
await page.evaluate((id) => {
  document.querySelector('astro-dev-toolbar')?.remove()
  // The palette sidebar carries BOTH `data-xeno-palette-sidebar` AND `data-xeno-panel` — when we
  // exempt it for the palette-sidebar example we have to filter on both attrs (`:not(...)`),
  // otherwise the broader `[data-xeno-panel]` rule still hides it. We also don't hide overlay-root
  // (the sidebar's parent) — hiding the parent cascades onto the sidebar.
  const KEEP = id === 'palette-sidebar'
  const not = KEEP ? ':not([data-xeno-palette-sidebar])' : ''
  const base = [`[data-xeno-panel]${not}`, '[data-xeno-controls]', '[data-xeno-minimap]', '[data-xeno-breadcrumb]', '[data-xeno-sidebar]', '[data-xeno-stats]']
  const sel = KEEP ? base.join(', ') : [...base, '[data-xeno-palette-sidebar]'].join(', ')
  document.querySelectorAll(sel).forEach((el) => { el.style.display = 'none' })
}, id)
await page.waitForTimeout(150)
await page.locator('.dfr-preview').screenshot({ path: `${OUT}/${id}.jpg`, type: 'jpeg', quality: 88 })
console.log('✓', id, '→', `${OUT}/${id}.jpg`)
await browser.close()
