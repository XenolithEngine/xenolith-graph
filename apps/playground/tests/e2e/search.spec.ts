import { test, expect } from '@playwright/test'

// H1 — Ctrl+F finds EXISTING graph nodes (the default demo graph), folds type matches into
// title matches, and picking a result selects + centers the node. The insert palette searches
// TYPES to spawn; this is the "where is that node" tool the 58k-node story requires.

const E = '__xenoEditor'

test('Ctrl+F opens search; typing filters by title AND type; Escape closes', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('canvas')
  await page.waitForFunction(() => '__xenoEditor' in window)

  await page.keyboard.press('ControlOrMeta+f')
  await expect(page.locator('[data-xeno-search]')).toBeVisible()
  const input = page.locator('[data-xeno-search-input]')
  await expect(input).toBeFocused()

  await input.fill('filter')
  const rows = page.locator('[data-xeno-search-result]')
  expect(await rows.count()).toBeGreaterThanOrEqual(1)
  expect(await rows.first().textContent()).toContain('Filter')

  await page.keyboard.press('Escape')
  await expect(page.locator('[data-xeno-search]')).toBeHidden()
})

test('picking a result selects the node and centers the viewport on it', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('canvas')
  await page.waitForFunction(() => '__xenoEditor' in window)

  await page.keyboard.press('ControlOrMeta+f')
  await page.locator('[data-xeno-search-input]').fill('filter')
  const target = page.locator('[data-xeno-search-result]').first()
  const pickedId = await target.getAttribute('data-node-id')

  const before = await page.evaluate((key) => {
    const e = (window as unknown as Record<string, any>)[key]
    return { sel: [...e.selection.ids()], vp: { ...e.view.state } }
  }, E)
  expect(before.sel).not.toContain(pickedId)

  await target.click()
  await expect(page.locator('[data-xeno-search]')).toBeHidden()

  const after = await page.evaluate((key) => {
    const e = (window as unknown as Record<string, any>)[key]
    return { sel: [...e.selection.ids()], vp: { ...e.view.state } }
  }, E)
  expect(after.sel).toEqual([pickedId])
  // Centering moved the viewport onto the node.
  expect(after.vp.x).not.toBe(before.vp.x)
})
