import { XenolithGraph } from '@xenolithengine/graph-react'
import { buildMount } from '@xenolithengine/demo/mount'
import { DemoStage } from '../Layout.js'

/** Island: the honest minimum — Xen is the default theme; load one node (mount.json) and frame it. */
export function MountDemo() {
  return (
    <DemoStage>
      <XenolithGraph className="xeno" resizeToWindow={false} onReady={(editor) => buildMount(editor)} />
    </DemoStage>
  )
}
