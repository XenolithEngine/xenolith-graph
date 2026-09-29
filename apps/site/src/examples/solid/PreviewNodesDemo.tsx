// Solid — per-node canvas drawing. No panel: setupPreviewNodes registers the widgets and the poller.
import { xenolith } from '@xenolithengine/graph-solid'
import { setupPreviewNodes } from '@xenolithengine/demo/preview-nodes'

export function PreviewNodesDemo() {
  return (
    <div
      use:xenolith={{ resizeToWindow: false }}
      on:ready={(e) => setupPreviewNodes(e.detail)}
      style="position:absolute;inset:0"
    />
  )
}
