import { test, expect } from '@playwright/test'

// Thumbnail GENERATOR for the site's /examples/ cards — not a functional test. It screenshots
// pages served by the SITE dev server (:4321), which only exists while the site suite (or a
// manual `pnpm --filter @xenolithengine/site dev`) is running — gating it on that race made
// whole-suite runs flake. Regenerate explicitly: THUMBS=1 pnpm --filter @xenolithengine/demo-react test:e2e
const IDS = ['mount','load','binding','canvas-widget','hero','events','graph-json','theming','viewport']
for (const id of IDS) {
  test(`thumb ${id}`, async ({ page }) => {
    test.skip(!process.env.THUMBS, 'thumbnail generator — opt in with THUMBS=1 (needs the site dev server on :4321)')
    await page.setViewportSize({ width: 1000, height: 640 })
    await page.goto(`http://localhost:4321/examples/${id}/`)
    await expect(page.locator('canvas')).toBeVisible({ timeout: 12000 })
    await page.waitForTimeout(1800)
    const preview = page.locator('.dfr-preview')
    await preview.screenshot({ path: `../site/public/examples/thumbs/${id}.png` })
  })
}
