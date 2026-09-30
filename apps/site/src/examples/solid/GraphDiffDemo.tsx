import { createSignal, onCleanup } from 'solid-js'
import { xenolith } from '@xenolithengine/graph-solid'
import type { XenolithEditor } from '@xenolithengine/graph-editor'
import { presentGraphDiff } from '@xenolithengine/demo/graph-diff-demo'

export function GraphDiffDemo() {
  let before: XenolithEditor | null = null
  let after: XenolithEditor | null = null
  let presentation: { dispose(): void } | null = null
  const [counts, setCounts] = createSignal<{ added: number; modified: number; removed: number } | null>(null)

  const tryPresent = (): void => {
    if (!before || !after || presentation) return
    const presented = presentGraphDiff(before, after)
    presentation = presented
    setCounts({
      added: presented.diff.addedNodes.size,
      modified: presented.diff.modifiedNodes.size,
      removed: presented.diff.removedNodes.size,
    })
  }

  onCleanup(() => { presentation?.dispose(); presentation = null })

  const swatch = (color: string): string => `display:inline-block;width:10px;height:10px;border-radius:10px;background:${color};margin:0 6px 0 10px;`
  const label = 'position:absolute;top:12px;left:12px;z-index:5;padding:8px;background:var(--xeno-panel);border:1px solid var(--xeno-border);border-radius:10px;color:var(--xeno-text);font:13px system-ui,sans-serif;'

  return (
    <div style="position:absolute;inset:0">
      <div style="position:absolute;top:0;bottom:0;left:0;right:50%;overflow:hidden;border-right:1px solid var(--xeno-border,#222);">
        <div use:xenolith={{ resizeToWindow: false }} on:ready={(e) => { before = e.detail; tryPresent() }} style="position:absolute;inset:0" />
        <div style={label + 'font-weight:600;'}>BEFORE</div>
      </div>
      <div style="position:absolute;top:0;bottom:0;left:50%;right:0;overflow:hidden;">
        <div use:xenolith={{ resizeToWindow: false }} on:ready={(e) => { after = e.detail; tryPresent() }} style="position:absolute;inset:0" />
        <div style={label}>
          <div style="font-size:12px;font-weight:600;">AFTER</div>
          {counts() && (
            <div style="font-size:11px;color:var(--xeno-muted);display:flex;align-items:center;margin-top:6px;">
              <span style={swatch('#39d98a')} /> added {counts()!.added}
              <span style={swatch('#fcb400')} /> modified {counts()!.modified}
              <span style={swatch('#ff5b6e')} /> removed {counts()!.removed}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
