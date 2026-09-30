import { test, expect, type Page } from '@playwright/test'

// setInteractive(false) is the read-only lock (graph diff, live mode). It already stops
// node drag, pin connect, and marquee. These tests pin the hole where the insert palette,
// the context menu, and mutating shortcuts still edited the graph.

const PALETTE = '[data-xeno-palette]'
const MENU = '[data-xeno-edge-menu]'

type Ed = {
  graph: { nodeCount: number; getNode: (id: string) => { position: { x: number; y: number }; size?: { x: number; y: number } } | undefined }
  viewport: { x: number; y: number; zoom: number }
  selection: { replaceWith: (ids: string[]) => void }
  setInteractive: (v: boolean) => void
  openPalette: (at?: { x: number; y: number }) => void
  isPaletteOpen: boolean
  insertNode: (type: string, at: { x: number; y: number }) => { id: string } | null
  setControls: (opts: { showInsert: boolean; position: string; orientation: string }) => void
}

async function ready(page: Page): Promise<void> {
  await page.goto('/')
  await page.waitForSelector('canvas')
  await page.waitForFunction(() => (window as unknown as { __xenoEditor?: unknown }).__xenoEditor !== undefined)
}

async function nodeCount(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { __xenoEditor: Ed }).__xenoEditor.graph.nodeCount)
}

async function lock(page: Page): Promise<void> {
  await page.evaluate(() => (window as unknown as { __xenoEditor: Ed }).__xenoEditor.setInteractive(false))
}

test.describe('locked graph cannot be edited from the palette or menus', () => {
  test.beforeEach(async ({ page }) => {
    await ready(page)
  })

  test('Tab, double-click, and openPalette do not open the insert palette', async ({ page }) => {
    const before = await nodeCount(page)
    await lock(page)

    await page.keyboard.press('Tab')
    await expect(page.locator(PALETTE)).toBeHidden()

    await page.locator('canvas').dblclick({ position: { x: 30, y: 400 } })
    await expect(page.locator(PALETTE)).toBeHidden()

    const opened = await page.evaluate(() => {
      const editor = (window as unknown as { __xenoEditor: Ed }).__xenoEditor
      editor.openPalette({ x: 200, y: 200 })
      return editor.isPaletteOpen
    })
    expect(opened).toBe(false)
    expect(await nodeCount(page)).toBe(before)
  })

  test('locking closes a palette that was already open', async ({ page }) => {
    await page.keyboard.press('Tab')
    await expect(page.locator(PALETTE)).toBeVisible()
    const before = await nodeCount(page)
    await lock(page)
    await expect(page.locator(PALETTE)).toBeHidden()
    await page.keyboard.press('Enter')
    expect(await nodeCount(page)).toBe(before)
  })

  test('the insert button does not open the palette while locked', async ({ page }) => {
    await page.evaluate(() => {
      const editor = (window as unknown as { __xenoEditor: Ed }).__xenoEditor
      editor.setControls({ position: 'top-right', orientation: 'horizontal', showInsert: true })
      editor.setInteractive(false)
    })
    await page.getByRole('button', { name: 'Insert node' }).click({ force: true })
    await expect(page.locator(PALETTE)).toBeHidden()
  })

  test('right-click does not open a menu that can add or delete a node', async ({ page }) => {
    await lock(page)
    const c = await page.evaluate(() => {
      const editor = (window as unknown as { __xenoEditor: Ed }).__xenoEditor
      const n = editor.graph.getNode('display')!
      const s = n.size ?? { x: 120, y: 40 }
      return {
        x: editor.viewport.x + (n.position.x + s.x / 2) * editor.viewport.zoom,
        y: editor.viewport.y + (n.position.y + s.y / 2) * editor.viewport.zoom,
      }
    })
    await page.mouse.click(c.x, c.y, { button: 'right' })
    await expect(page.locator(MENU)).toBeHidden()
    expect(await nodeCount(page)).toBeGreaterThan(0)
  })

  test('Delete and undo shortcuts do not change the graph; insertNode still does', async ({ page }) => {
    await lock(page)
    const before = await nodeCount(page)
    await page.evaluate(() => {
      (window as unknown as { __xenoEditor: Ed }).__xenoEditor.selection.replaceWith(['display'])
    })
    await page.keyboard.press('Delete')
    await page.keyboard.press('Backspace')
    expect(await nodeCount(page)).toBe(before)

    const inserted = await page.evaluate(() => {
      const editor = (window as unknown as { __xenoEditor: Ed }).__xenoEditor
      return editor.insertNode('Transform', { x: 40, y: 40 }) !== null
    })
    expect(inserted).toBe(true)
    expect(await nodeCount(page)).toBe(before + 1)

    await page.keyboard.press('ControlOrMeta+z')
    expect(await nodeCount(page)).toBe(before + 1)

    const undone = await page.evaluate(() => {
      const editor = (window as unknown as { __xenoEditor: { undo: () => boolean; graph: { nodeCount: number } } }).__xenoEditor
      editor.undo()
      return editor.graph.nodeCount
    })
    expect(undone).toBe(before)
  })

  test('unlocking restores the insert palette', async ({ page }) => {
    await lock(page)
    await page.evaluate(() => (window as unknown as { __xenoEditor: Ed }).__xenoEditor.setInteractive(true))
    await page.keyboard.press('Tab')
    await expect(page.locator(PALETTE)).toBeVisible()
  })
})
