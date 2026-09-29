// Solid — every built-in widget on one node. The node is data; this file only mounts it.
import { xenolith } from '@xenolithengine/graph-solid'
import { buildBuiltinWidgets } from '@xenolithengine/demo/builtin-widgets'

export function BuiltinWidgetsDemo() {
  return (
    <div
      use:xenolith={{ resizeToWindow: false }}
      on:ready={(e) => buildBuiltinWidgets(e.detail)}
      style="position:absolute;inset:0"
    />
  )
}
