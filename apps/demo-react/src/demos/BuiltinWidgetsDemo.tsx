import { XenolithGraph } from '@xenolithengine/graph-react'
import { buildBuiltinWidgets } from '@xenolithengine/demo/builtin-widgets'
import { DemoStage } from '../Layout.js'

/** Every built-in widget type on one node — slider, number, toggle, combo, color, text — rendered in
 *  WebGL and editable inline. The node is just DATA (@xenolithengine/demo/builtin-widgets, builtin-widgets.json). */
export function BuiltinWidgetsDemo() {
  return (
    <DemoStage>
      <XenolithGraph className="xeno" resizeToWindow={false} onReady={(editor) => buildBuiltinWidgets(editor)} />
    </DemoStage>
  )
}
