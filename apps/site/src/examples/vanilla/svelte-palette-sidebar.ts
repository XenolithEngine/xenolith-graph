// Svelte adapter — palette sidebar. Schemas + sidebar config come from the shared package; the
// editor's built-in `node:drop` handler spawns the dragged node at the drop point.
import { createXenolithGraph } from '@xenolithengine/svelte'
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
