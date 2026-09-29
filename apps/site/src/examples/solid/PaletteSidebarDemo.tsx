// Solid — palette sidebar: schemas + sidebar config from the shared package; the editor's
// built-in node:drop handler spawns the dragged node at the drop point.
import { xenolith } from '@xenolithengine/graph-solid'
import { buildPaletteSidebar } from '@xenolithengine/demo/palette-sidebar'

export function PaletteSidebarDemo() {
  return (
    <div
      use:xenolith={{ resizeToWindow: false }}
      on:ready={(e) => {
        buildPaletteSidebar(e.detail)
        e.detail.view.fitView({ padding: 80, maxZoom: 1 })
      }}
      style="position:absolute;inset:0"
    />
  )
}
