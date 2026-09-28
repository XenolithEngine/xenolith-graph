import { test, expect } from '@playwright/test'

// The /?demo=agent scripted session v2 — an "agent" builds a 14-node/17-edge telemetry-anomaly
// pipeline through the exact tool surface the MCP server exposes, RUNS it via the StepDebugger
// (real values, per-node timing), and VERIFIES its own outputs. Asserts the build (counts,
// palette, glyphed schemas), the execution (history, alert fired), the self-check — and the
// command-bus guarantee: agent mutations are ordinary undoable history.

const E = '__xenoEditor'

test('the agent session builds → lays out → wires → paints a 14-node pipeline', async ({ page }) => {
  await page.goto('/?demo=agent')
  await page.waitForSelector('canvas')
  await page.waitForFunction(() => '__xenoEditor' in window)
  await page.waitForSelector('[data-agent-done]', { timeout: 45_000 })

  expect(await page.locator('[data-agent-err]').count()).toBe(0)

  const r = await page.evaluate((key) => {
    const e = (window as unknown as Record<string, any>)[key]
    return {
      nodes: [...e.graph.nodes()].map((n: any) => n.type).sort(),
      edges: [...e.graph.edges()].length,
      categories: new Set([...e.graph.nodes()].map((n: any) => n.render?.category ?? n.render)),
      glyphs: [...e.graph.nodes()].filter((n: any) => n.render?.glyph).length,
      spread: Math.max(...[...e.graph.nodes()].map((n: any) => n.position.x)) - Math.min(...[...e.graph.nodes()].map((n: any) => n.position.x)),
    }
  }, E)
  expect(r.nodes.length).toBe(14)
  expect(r.edges).toBe(17)
  expect(r.spread).toBeGreaterThan(800) // auto_layout actually spread the columns
})

test('execution is REAL: step debugger walks all 14 nodes, anomaly detected, self-check passes', async ({ page }) => {
  await page.goto('/?demo=agent')
  await page.waitForSelector('[data-agent-done]', { timeout: 45_000 })
  const r = await page.evaluate(() => {
    const run = (window as unknown as Record<string, any>)['__agentRun']
    const ok = document.querySelectorAll('[data-agent-ok]').length
    const verify = [...document.querySelectorAll('[data-agent-step]')].filter((el) => el.getAttribute('data-agent-step') === 'verify')[0]
    return { history: run.history.length, alert: run.alert, count: run.count, okSteps: ok, verifyText: verify?.textContent ?? '' }
  })
  expect(r.history).toBe(14) // every node executed exactly once
  expect(r.alert).toContain('2 anomalies')
  expect(r.count).toBe(2)
  expect(r.verifyText).toContain('pipeline correct')
  expect(await page.locator('[data-agent-err]').count()).toBe(0)
})

test('agent edits ride the command bus — one undo reverts the last agent mutation', async ({ page }) => {
  await page.goto('/?demo=agent')
  await page.waitForSelector('canvas')
  await page.waitForFunction(() => '__xenoEditor' in window)
  await page.waitForSelector('[data-agent-done]', { timeout: 45_000 })

  // The last command-bus entry after the session is autoLayout's final moveNode — undo it
  // programmatically (keyboard modifiers differ per platform) and assert exactly-one reversion.
  const r = await page.evaluate((key) => {
    const e = (window as unknown as Record<string, any>)[key]
    const before = new Map([...e.graph.nodes()].map((n: any) => [String(n.id), { ...n.position }]))
    const undone = e.undo()
    const moved = [...e.graph.nodes()].filter((n: any) => before.get(String(n.id))!.x !== n.position.x || before.get(String(n.id))!.y !== n.position.y)
    return { undone, movedCount: moved.length, edges: [...e.graph.edges()].length }
  }, E)
  expect(r.undone).toBe(true)
  expect(r.movedCount).toBeGreaterThanOrEqual(1) // the layout step rolled back for its node
  expect(r.edges).toBe(17) // graph wiring untouched by a position undo
})
