import { test, expect } from '@playwright/test'

// The /?demo=agent&mode=propose variant (F2 / ADR 0007): the agent's whole build ENQUEUES as
// proposals, a human approves the batch through the real panel UI (badge → Approve all), and
// the batch lands as ONE command-bus transaction. Asserts the visible trust boundary (badge
// count while pending, panel review, gone after approval), the applied graph, the self-check —
// and the one-undo-step guarantee that is the entire point of the proposal mode.

const E = '__xenoEditor'
const URL = '/?demo=agent&mode=propose'

test('the pending batch surfaces: badge counts 33 proposals, panel review applies them, chrome clears', async ({ page }) => {
  await page.goto(URL)
  await page.waitForSelector('canvas')
  await page.waitForFunction(() => '__xenoEditor' in window)

  // Race window: the human_review step pauses ~1.5s (badge → panel → approve) before clicking.
  await page.waitForSelector('[data-agent-step="human_review"]')
  const badge = page.locator('[data-xeno-proposals-badge]')
  await expect(badge).not.toHaveAttribute('data-hidden', '')
  await expect(badge.locator('[data-xeno-proposals-badge-count]')).toHaveText('33')

  await page.waitForSelector('[data-agent-done]', { timeout: 45_000 })
  expect(await page.locator('[data-agent-err]').count()).toBe(0)
  // Queue emptied → panel auto-closed, badge hidden again.
  await expect(badge).toHaveAttribute('data-hidden', '')

  const r = await page.evaluate((key) => {
    const e = (window as unknown as Record<string, any>)[key]
    return {
      nodes: [...e.graph.nodes()].length,
      edges: [...e.graph.edges()].length,
      review: [...document.querySelectorAll('[data-agent-step]')]
        .filter((el) => el.getAttribute('data-agent-step') === 'human_review')[0]?.textContent ?? '',
    }
  }, E)
  expect(r.nodes).toBe(14)
  expect(r.edges).toBe(17)
  expect(r.review).toContain('ONE undo step')
})

test('approval is ONE transaction: a single undo reverts the ENTIRE agent batch', async ({ page }) => {
  await page.goto(URL)
  await page.waitForSelector('canvas')
  await page.waitForFunction(() => '__xenoEditor' in window)
  await page.waitForSelector('[data-agent-done]', { timeout: 45_000 })

  const r = await page.evaluate((key) => {
    const e = (window as unknown as Record<string, any>)[key]
    const undone = e.undo() // ONE step — the whole approved batch
    return { undone, nodes: [...e.graph.nodes()].length, edges: [...e.graph.edges()].length }
  }, E)
  expect(r.undone).toBe(true)
  expect(r.nodes).toBe(0)
  expect(r.edges).toBe(0)
})

test('execution + self-verify still pass through the propose → approve flow', async ({ page }) => {
  await page.goto(URL)
  await page.waitForSelector('[data-agent-done]', { timeout: 45_000 })
  const r = await page.evaluate(() => {
    const run = (window as unknown as Record<string, any>)['__agentRun']
    const verify = [...document.querySelectorAll('[data-agent-step]')]
      .filter((el) => el.getAttribute('data-agent-step') === 'verify')[0]
    return { history: run.history.length, alert: run.alert, count: run.count, verifyText: verify?.textContent ?? '' }
  })
  expect(r.history).toBe(14)
  expect(r.alert).toContain('2 anomalies')
  expect(r.count).toBe(2)
  expect(r.verifyText).toContain('pipeline correct')
})
