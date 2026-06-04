// React demo — Palette sidebar. Same setup as the vanilla version: schemas + sidebar config from
// the shared package, mounted in `onReady`. The default `node:drop` handler the editor wires up
// is enough — drag a tile from the rail and drop on the canvas; a fresh node spawns at the world
// position. Listen to `node:drop` yourself if you want to layer on validation / snapping.
import { XenolithGraph } from '@xenolithengine/react'
import { buildPaletteSidebar } from '@xenolithengine/demo/palette-sidebar'
import { DemoStage } from '../Layout.js'

export function PaletteSidebarDemo() {
  return (
    <DemoStage>
      <XenolithGraph
        className="xeno"
        resizeToWindow={false}
        onReady={(editor) => {
          buildPaletteSidebar(editor)
          editor.view.fitView({ padding: 80, maxZoom: 1 })
        }}
      />
    </DemoStage>
  )
}
