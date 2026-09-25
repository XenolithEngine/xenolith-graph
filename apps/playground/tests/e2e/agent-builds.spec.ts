import { test, expect } from '@playwright/test'

// The /?demo=agent scripted session — an "agent" builds a typed pipeline through the exact tool
// surface the MCP server exposes. Asserts the outcome (nodes wired, widget set) AND the command-bus
// guarantee the whole AI-native story rests on: agent mutations are ordinary undoable history,
// so one Ctrl+Z reverts the agent's last edit exactly like a human's.

const E = '__xenoEditor'

test('the scripted agent session builds a wired pipeline via MCP-style tool calls', async ({ page }) => {
  await page.goto('/?demo=agent')
  await page.waitForSelector('canvas')
  await page.waitForFunction(() => '__xenoEditor' in window)
  await page.waitForSelector('[data-agent-done]', { timeout: 20_000 })

  // Transcript: every tool ran, none errored, in the MCP order.
  const tools = await page.locator('[data-agent-step]').evaluateAll((els) => els.map((el) => el.getAttribute('data-agent-step')))
  expect(tools).toEqual(['list_node_types', 'add_node', 'add_node', 'add_node', 'add_node', 'connect_pins', 'connect_pins', 'connect_pins', 'set_widget_value', 'fit_view'])
  expect(await page.locator('[data-agent-err]').count()).toBe(0)

  const r = await page.evaluate((key) => {
    const e = (window as unknown as Record<string, any>)[key]
    return {
      nodes: [...e.graph.nodes()].map((n: any) => n.type).sort(),
      edges: [...e.graph.edges()].length,
      gain: (() => { const n = [...e.graph.nodes()].find((x: any) => x.type === 'Gain'); return { amount: n?.state?.['amount'] } })(),
    }
  }, E)
  expect(r.nodes).toEqual(['Gain', 'Scope', 'Shape', 'Signal'])
  expect(r.edges).toBe(3)
  expect(r.gain.amount).toBe(0.85) // set_widget_value landed in node state
})

test('agent edits ride the command bus — Ctrl+Z undoes the last agent edge', async ({ page }) => {
  await page.goto('/?demo=agent')
  await page.waitForSelector('canvas')
  await page.waitForFunction(() => '__xenoEditor' in window)
  await page.waitForSelector('[data-agent-done]', { timeout: 20_000 })

  const before = await page.evaluate((key) => [...(window as unknown as Record<string, any>)[key].graph.edges()].length, E)
  await page.locator('canvas').click({ position: { x: 400, y: 300 } }) // focus the canvas
  await page.keyboard.press('Control+z')
  await page.keyboard.press('Meta+z') // one of the two lands on each platform
  const after = await page.evaluate((key) => [...(window as unknown as Record<string, any>)[key].graph.edges()].length, E)
  expect(after).toBe(before - 1)
})
