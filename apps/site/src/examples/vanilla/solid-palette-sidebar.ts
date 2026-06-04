// Solid adapter — palette sidebar.
import { createXenolithGraph } from '@xenolithengine/solid'
import { buildPaletteSidebar } from '@xenolithengine/demo/palette-sidebar'

export async function mount(target: HTMLElement): Promise<() => void> {
  const slot = document.createElement('div')
  slot.style.cssText = 'position:absolute;inset:0;'
  target.appendChild(slot)
  const binding = await createXenolithGraph(slot, { resizeToWindow: false })
  buildPaletteSidebar(binding.editor)
  binding.editor.view.fitView({ padding: 80, maxZoom: 1 })
  return () => { binding.destroy(); slot.remove() }
}
