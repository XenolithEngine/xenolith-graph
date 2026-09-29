import { test, expect } from '@playwright/test'

// The /?demo=agent&mode=propose variant (F2 / ADR 0007): the agent's whole build ENQUEUES as
// proposals, the session OPENS the panel and then WAITS — these specs PLAY THE HUMAN (Approve
// all / Reject all in the real panel UI). Asserts the visible trust boundary (badge count while
// pending, panel review, gone after the decision), the applied graph, the self-check, the
// one-undo-step guarantee — and the reject path: the agent changes NOTHING.

const E = '__xenoEditor'
const URL = '/?demo=agent&mode=propose'

/** The session pauses at human_review and waits for a REAL decision — the tests play the human. */
async function playHumanApprove(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForSelector('[data-agent-step="human_review"]')
  await page.waitForSelector('[data-xeno-proposals-panel]', { timeout: 10_000 })
  await page.click('[data-xeno-proposals-approve]')
}

test('the pending batch surfaces: badge counts 33 proposals, panel review applies them, chrome clears', async ({ page }) => {
  await page.goto(URL)
  await page.waitForSelector('canvas')
  await page.waitForFunction(() => '__xenoEditor' in window)

  // The session auto-opens the panel but NEVER approves by itself — it waits for the human.
  await page.waitForSelector('[data-agent-step="human_review"]')
  const badge = page.locator('[data-xeno-proposals-badge]')
  await expect(badge).not.toHaveAttribute('data-hidden', '')
  await expect(badge.locator('[data-xeno-proposals-badge-count]')).toHaveText('33')
  // The session must still be pending (no scripted approval): the step has no ✓ yet.
  await expect(page.locator('[data-agent-step="human_review"]')).not.toHaveAttribute('data-agent-ok', '')
  await playHumanApprove(page)

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
  await playHumanApprove(page)
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
  await playHumanApprove(page)
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

test('REJECT all: the agent changes NOTHING — graph intact, history clean, session ends honestly', async ({ page }) => {
  await page.goto(URL)
  await page.waitForSelector('[data-agent-step="human_review"]')
  await page.waitForSelector('[data-xeno-proposals-panel]', { timeout: 10_000 })
  await page.click('[data-xeno-proposals-reject]')

  await page.waitForSelector('[data-agent-done]', { timeout: 45_000 })
  const r = await page.evaluate((key) => {
    const e = (window as unknown as Record<string, any>)[key]
    const review = [...document.querySelectorAll('[data-agent-step]')]
      .filter((el) => el.getAttribute('data-agent-step') === 'human_review')[0]
    const done = document.querySelector('[data-agent-done]')
    return {
      nodes: [...e.graph.nodes()].length,
      edges: [...e.graph.edges()].length,
      canUndo: e.history.canUndo,
      review: review?.textContent ?? '',
      done: done?.textContent ?? '',
      errors: document.querySelectorAll('[data-agent-err]').length,
    }
  }, E)
  expect(r.nodes).toBe(0)
  expect(r.edges).toBe(0)
  expect(r.canUndo).toBe(false) // the agent never touched history — nothing to undo
  expect(r.review).toContain('changed NOTHING')
  expect(r.done).toContain('REJECTED')
  expect(r.errors).toBe(0)
})
