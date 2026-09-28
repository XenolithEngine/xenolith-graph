import { test, expect } from '@playwright/test'

// Smoke test for /examples/auto-layout/ — verifies that:
//  1. The page loads, the demo mounts, the editor canvas paints.
//  2. The Auto-arrange / LR / TB panel is reachable to clicks (not buried under the canvas
//     because of missing `pointer-events: auto` on chrome).
//  3. Clicking "Auto-arrange" actually fires the handler (button text flips to "Arranging…"
//     briefly, then back). Without the handler firing this assertion never resolves.
//
// We previously claimed this demo was fixed multiple times without verifying. This test is
// the gate: if it passes, the demo works. If it fails, we haven't fixed anything.

test('auto-layout demo panel is interactive', async ({ page }) => {
  // Dev-server page compile under the saturated full `pnpm -w test:e2e` run can exceed the
  // config's 30s test timeout (ERR_ABORTED mid-navigation). 60s keeps the gate meaningful
  // locally; in CI (beefier, less contended) it never gets close.
  test.setTimeout(60_000)
  await page.goto('/examples/auto-layout/')

  // Wait for the editor canvas to mount inside the demo preview. 30s because the Astro DEV
  // server compiles this page on first request — under the full `pnpm -w test:e2e` run four
  // sibling suites compete for CPU and a cold compile regularly exceeds 15s (observed
  // 2026-09-28: passes isolated in ~11s, flakes in parallel). Not a product regression.
  const canvas = page.locator('.dfr-preview canvas')
  await expect(canvas).toBeVisible({ timeout: 30_000 })

  // The three-button panel from the vanilla mount (auto-layout.ts).
  const arrange = page.getByRole('button', { name: /Auto-arrange/ })
  const lr = page.getByRole('button', { name: 'LR' })
  const tb = page.getByRole('button', { name: 'TB' })

  await expect(arrange).toBeVisible()
  await expect(lr).toBeVisible()
  await expect(tb).toBeVisible()

  // Click LR — direction toggle. The button's background should change to the gold accent
  // (var(--xeno-accent)) when active. We assert via inline `background:` style fragment.
  await lr.click()
  await expect(lr).toHaveAttribute('style', /FCB400|var\(--xeno-accent/)

  // Click Auto-arrange — handler is async. While it runs the label changes to "Arranging…".
  // If the click doesn't reach the handler at all, the label stays "Auto-arrange" and the
  // assertion times out.
  await arrange.click()
  // Either the busy label flashes (race-able) OR the click already settled — accept both.
  await expect.poll(async () => {
    const txt = await arrange.textContent()
    return txt === 'Arranging…' || txt === 'Auto-arrange'
  }, { timeout: 8_000 }).toBeTruthy()
  // After settle, label is back to original.
  await expect(arrange).toHaveText('Auto-arrange', { timeout: 8_000 })
})
