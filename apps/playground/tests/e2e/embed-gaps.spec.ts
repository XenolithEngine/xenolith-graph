import { test, expect } from '@playwright/test'

const E = '__xenoEditor'

async function ready(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.waitForSelector('canvas')
  await page.waitForFunction(() => '__xenoEditor' in window)
}

test('setDefaultEdgeOptions styles new wires; an explicit pathStyle wins', async ({ page }) => {
  await ready(page)
  const r = await page.evaluate((key) => {
    const e = (window as unknown as Record<string, any>)[key]
    e.clear()
    e.registry.register({
      type: 'Src', title: 'Src',
      pins: [{ kind: 'data', direction: 'out', type: 'float', label: 'out' }],
    })
    e.registry.register({
      type: 'Dst', title: 'Dst',
      pins: [{ kind: 'data', direction: 'in', type: 'float', label: 'in' }],
    })
    e.setDefaultEdgeOptions({ pathStyle: 'step' })
    const src = e.insertNode('Src', { x: 0, y: 0 })
    const dst = e.insertNode('Dst', { x: 240, y: 0 })
    const id = e.connect(src, 0, dst, 0)
    const inherited = e.getEdgeOptions(id).pathStyle
    e.setEdgeOptions(id, { pathStyle: 'linear' })
    const explicit = e.getEdgeOptions(id).pathStyle
    return { inherited, explicit }
  }, E)
  expect(r.inherited).toBe('step')
  expect(r.explicit).toBe('linear')
})

test('a DOM widget can open the properties sidebar', async ({ page }) => {
  await ready(page)
  await page.evaluate((key) => {
    const e = (window as unknown as Record<string, any>)[key]
    e.clear()
    e.registerWidget('side-btn', {
      mount(el: HTMLElement, c: { openSidebar: () => void }) {
        const b = document.createElement('button')
        b.id = 'open-side'
        b.textContent = 'Open'
        b.addEventListener('click', () => c.openSidebar())
        el.appendChild(b)
      },
    })
    e.registry.register({
      type: 'Box', title: 'Box',
      pins: [{ kind: 'data', direction: 'in', type: 'float', label: 'in' }],
      widgets: [
        { id: 'w', type: 'custom', renderer: 'side-btn', label: '', key: 'in', height: 36 },
        { id: 'gain', type: 'slider', label: 'gain', key: 'gain', min: 0, max: 1, showInSidebar: true, freeFloating: true, inNodeBody: false },
      ],
    })
    e.insertNode('Box', { x: 80, y: 80 })
  }, E)
  await page.locator('#open-side').click()
  const open = await page.evaluate((key) => (window as unknown as Record<string, any>)[key].isSidebarOpen(), E)
  expect(open).toBe(true)
  await expect(page.locator('[data-xeno-sidebar]')).toContainText('gain')
})
