import { test, expect } from '@playwright/test'

// /examples/mount/ is live-React (no vanilla island) and also has Vue source.
// The chip switches the code tabs only — the canvas must stay the React mount,
// and a note has to say so. A Vue chip that silently leaves a React canvas
// reads as "the Vue demo is the React demo".

test('a non-live framework chip is source only and leaves the canvas up', async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto('/examples/mount/')

  const canvas = page.locator('.dfr-preview canvas')
  await expect(canvas).toBeVisible({ timeout: 30_000 })

  const note = page.locator('[data-code-note]')
  await expect(note).toBeHidden()

  await page.locator('.dfr-chip[data-fw-chip="vue"]').click()
  await expect(note).toBeVisible()
  await expect(note).toContainText('Canvas stays on React')
  await expect(note).toContainText('source only')
  await expect(page.locator('[data-fw-code="vue"]')).not.toHaveClass(/dfr-hidden/)
  await expect(canvas).toBeVisible()

  await page.locator('.dfr-chip[data-fw-chip="react"]').click()
  await expect(note).toBeHidden()
  await expect(canvas).toBeVisible()
})

test('two-way Vue source is a code tab, and the canvas stays React', async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto('/examples/two-way/')

  const canvas = page.locator('.dfr-preview canvas')
  await expect(canvas).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('[data-code-note]')).toBeHidden()

  await page.locator('.dfr-chip[data-fw-chip="vue"]').click()
  const note = page.locator('[data-code-note]')
  await expect(note).toBeVisible()
  await expect(note).toContainText('Canvas stays on React')
  await expect(note).toContainText('source only')
  const vue = page.locator('[data-fw-code="vue"]')
  await expect(vue).not.toHaveClass(/dfr-hidden/)
  // The code wrap itself stays hidden until the user opens it, so read textContent.
  const source = await vue.evaluate((el) => el.textContent ?? '')
  expect(source).toContain('useSelection')
  expect(source).toContain('useGraphJSON')
  await expect(canvas).toBeVisible()
})

test('auto-layout Vue source is a code tab, and the canvas stays JS', async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto('/examples/auto-layout/')

  const canvas = page.locator('.dfr-preview canvas')
  await expect(canvas).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('[data-code-note]')).toBeHidden()

  await page.locator('.dfr-chip[data-fw-chip="vue"]').click()
  const note = page.locator('[data-code-note]')
  await expect(note).toBeVisible()
  await expect(note).toContainText('Canvas stays on JS')
  await expect(note).toContainText('source only')
  const vue = page.locator('[data-fw-code="vue"]')
  await expect(vue).not.toHaveClass(/dfr-hidden/)
  const source = await vue.evaluate((el) => el.textContent ?? '')
  expect(source).toContain('runAutoLayout')
  await expect(canvas).toBeVisible()
})
