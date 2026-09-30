<script lang="ts">
  // One Svelte editor context cannot serve two panes, so the labels are plain DOM.
  import { onDestroy } from 'svelte'
  import { xenolith } from '@xenolithengine/graph-svelte'
  import type { XenolithEditor } from '@xenolithengine/graph-editor'
  import { presentGraphDiff } from '@xenolithengine/demo/graph-diff-demo'

  let beforeEd = $state<XenolithEditor | null>(null)
  let afterEd = $state<XenolithEditor | null>(null)
  let added = $state(0)
  let modified = $state(0)
  let removed = $state(0)
  let presentation: { dispose(): void } | null = null

  $effect(() => {
    const before = beforeEd
    const after = afterEd
    if (!before || !after) return
    const presented = presentGraphDiff(before, after)
    presentation = presented
    added = presented.diff.addedNodes.size
    modified = presented.diff.modifiedNodes.size
    removed = presented.diff.removedNodes.size
    return () => { presented.dispose(); if (presentation === presented) presentation = null }
  })

  onDestroy(() => { presentation?.dispose(); presentation = null })
</script>

<div style="position:absolute;inset:0;">
  <div style="position:absolute;top:0;bottom:0;left:0;right:50%;overflow:hidden;border-right:1px solid var(--xeno-border,#222);">
    <div use:xenolith={{ resizeToWindow: false }} onready={(e) => { beforeEd = e.detail }} style="position:absolute;inset:0"></div>
    <div style="position:absolute;top:12px;left:12px;z-index:5;padding:8px;background:var(--xeno-panel);border:1px solid var(--xeno-border);border-radius:10px;color:var(--xeno-text);font:13px system-ui,sans-serif;font-weight:600;">BEFORE</div>
  </div>
  <div style="position:absolute;top:0;bottom:0;left:50%;right:0;overflow:hidden;">
    <div use:xenolith={{ resizeToWindow: false }} onready={(e) => { afterEd = e.detail }} style="position:absolute;inset:0"></div>
    <div style="position:absolute;top:12px;left:12px;z-index:5;padding:8px;background:var(--xeno-panel);border:1px solid var(--xeno-border);border-radius:10px;color:var(--xeno-text);font:13px system-ui,sans-serif;">
      <div style="font-size:12px;font-weight:600;">AFTER</div>
      {#if beforeEd && afterEd}
        <div style="font-size:11px;color:var(--xeno-muted);display:flex;align-items:center;margin-top:6px;">
          <span style="display:inline-block;width:10px;height:10px;border-radius:10px;background:#39d98a;margin:0 6px 0 10px;"></span> added {added}
          <span style="display:inline-block;width:10px;height:10px;border-radius:10px;background:#fcb400;margin:0 6px 0 10px;"></span> modified {modified}
          <span style="display:inline-block;width:10px;height:10px;border-radius:10px;background:#ff5b6e;margin:0 6px 0 10px;"></span> removed {removed}
        </div>
      {/if}
    </div>
  </div>
</div>
