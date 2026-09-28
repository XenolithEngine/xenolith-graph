import { test, expect } from '@playwright/test'

// G3 a11y slice 1 — the canvas is not a black box for keyboards: the host is a focusable
// application, arrows walk selection node-to-node, Enter opens the properties sidebar, Esc
// clears, and a polite live region announces what got selected. No axe-core — these are
// behavioral checks, not a generic audit.

const E = '__xenoEditor'

const selection = (page: import('@playwright/test').Page) =>
  page.evaluate((key) => [...(window as unknown as Record<string, any>)[key].selection.ids()], E)

test('the host is a focusable application with a label and a live region', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('canvas')
  await page.waitForFunction(() => '__xenoEditor' in window)

  const host = page.locator('#app')
  await expect(host).toHaveAttribute('role', 'application')
  await expect(host).toHaveAttribute('aria-label', 'Node graph editor')
  await expect(host).toHaveAttribute('tabindex', '0')
  await expect(page.locator('[aria-live="polite"]')).toHaveCount(1)

  // The focus ring appears when the host itself is keyboard-focused.
  await host.focus()
  await expect(host).toHaveCSS('outline-style', 'solid')
})

test('arrow keys walk the selection node-to-node; the live region announces it', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('canvas')
  await page.waitForFunction(() => '__xenoEditor' in window)

  await page.locator('#app').focus()
  expect(await selection(page)).toHaveLength(0)

  await page.keyboard.press('ArrowRight')
  const first = await selection(page)
  expect(first).toHaveLength(1)

  await page.keyboard.press('ArrowRight')
  const second = await selection(page)
  expect(second).toHaveLength(1)
  expect(second[0]).not.toBe(first[0])

  const announced = await page.locator('[aria-live="polite"]').textContent()
  expect(announced).toMatch(/^Selected /)
})

test('Enter opens the sidebar for the selected node; Escape clears the selection', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('canvas')
  await page.waitForFunction(() => '__xenoEditor' in window)

  await page.locator('#app').focus()
  await page.keyboard.press('ArrowRight')
  expect(await selection(page)).toHaveLength(1)

  await page.keyboard.press('Enter')
  await expect(page.locator('[data-xeno-sidebar]')).toBeVisible()

  // Esc peels ONE layer at a time: sidebar first, selection second.
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-xeno-sidebar]')).toBeHidden()
  expect(await selection(page)).toHaveLength(1)

  await page.keyboard.press('Escape')
  expect(await selection(page)).toHaveLength(0)
})
