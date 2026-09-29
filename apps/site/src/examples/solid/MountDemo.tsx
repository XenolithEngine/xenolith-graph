// Solid — the honest minimum: the use:xenolith directive mounts the editor; on:ready (colon
// names are native in Solid) hands you the live editor for one-shot seed work.
import { xenolith } from '@xenolithengine/graph-solid'
import { buildMount } from '@xenolithengine/demo/mount'

export function MountDemo() {
  return (
    <div
      use:xenolith={{ resizeToWindow: false }}
      on:ready={(e) => buildMount(e.detail)}
      style="position:absolute;inset:0"
    />
  )
}
