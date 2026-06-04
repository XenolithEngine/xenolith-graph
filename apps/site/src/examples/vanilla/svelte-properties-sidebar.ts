// Svelte adapter — properties sidebar. Imperative primitive + the shared scene builder; the toggle
// button is a plain DOM control mounted into editor.overlayRoot.
import { createXenolithGraph } from '@xenolith/svelte'
import { setupPropertiesSidebar, PROPERTIES_SIDEBAR_NODE_ID } from '@xenolith/demo/properties-sidebar'

export async function mount(target: HTMLElement): Promise<() => void> {
  const slot = document.createElement('div')
  slot.style.cssText = 'position:absolute;inset:0;'
  target.appendChild(slot)
  const binding = await createXenolithGraph(slot, { resizeToWindow: false })
  setupPropertiesSidebar(binding.editor)
  binding.editor.openSidebar(PROPERTIES_SIDEBAR_NODE_ID)

  const panel = document.createElement('div')
  panel.setAttribute('data-xeno-panel', '')
  panel.style.cssText = 'position:absolute;top:12px;left:12px;display:flex;gap:6px;padding:6px;background:var(--xeno-panel,#1d1d1d);border:1px solid var(--xeno-border,#333);border-radius:8px;font:12px Inter,system-ui,sans-serif;z-index:5;'
  const btn = document.createElement('button')
  let open = true
  const paint = (): void => {
    btn.textContent = open ? 'Close sidebar' : 'Open sidebar'
    btn.style.cssText = `padding:6px 12px;font:inherit;font-size:12px;cursor:pointer;border-radius:6px;border:1px solid ${open ? 'var(--xeno-accent,#FCB400)' : 'var(--xeno-border,#333)'};background:${open ? 'var(--xeno-accent,#FCB400)' : 'transparent'};color:${open ? 'var(--xeno-canvas,#111)' : 'var(--xeno-text,#cfcfcf)'};`
  }
  btn.addEventListener('click', () => {
    if (open) { binding.editor.closeSidebar(); open = false }
    else      { binding.editor.openSidebar(PROPERTIES_SIDEBAR_NODE_ID); open = true }
    paint()
  })
  paint()
  panel.appendChild(btn)
  binding.editor.overlayRoot.appendChild(panel)

  return () => { panel.remove(); binding.destroy(); slot.remove() }
}
