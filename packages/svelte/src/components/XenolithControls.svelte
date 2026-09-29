<script lang="ts">
  import type { ControlsOptions } from '@xenolithengine/graph-editor'
  import { getXenolithEditorContext } from '../context.js'

  let {
    position, orientation, zoomStep,
    showZoom, showFit, showReset, showHistory, showSave, showLock, showInsert,
  }: ControlsOptions = $props()

  const editor = getXenolithEditorContext()

  $effect(() => {
    const e = $editor
    if (!e) return
    const o: ControlsOptions = {}
    if (position    !== undefined) o.position    = position
    if (orientation !== undefined) o.orientation = orientation
    if (zoomStep    !== undefined) o.zoomStep    = zoomStep
    if (showZoom    !== undefined) o.showZoom    = showZoom
    if (showFit     !== undefined) o.showFit     = showFit
    if (showReset   !== undefined) o.showReset   = showReset
    if (showHistory !== undefined) o.showHistory = showHistory
    if (showSave    !== undefined) o.showSave    = showSave
    if (showLock    !== undefined) o.showLock    = showLock
    if (showInsert  !== undefined) o.showInsert  = showInsert
    e.chrome.setControls(o)
    return () => e.chrome.setControls(false)
  })
</script>
