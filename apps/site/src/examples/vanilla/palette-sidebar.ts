// Vanilla mount — Palette sidebar. The schemas + sidebar config live in the shared package; this
// file just spins up an editor and points it at them. Drag any tile from the left rail onto the
// canvas to spawn a node at the drop point.
import { XenolithEditor } from '@xenolithengine/graph-editor'
import { buildPaletteSidebar } from '@xenolithengine/demo/palette-sidebar'

export async function mount(target: HTMLElement): Promise<() => void> {
  const editor = await XenolithEditor.init(target, { resizeToWindow: false, minimap: false })
  buildPaletteSidebar(editor)
  editor.view.fitView({ padding: 80, maxZoom: 1 })
  return () => editor.destroy()
}
