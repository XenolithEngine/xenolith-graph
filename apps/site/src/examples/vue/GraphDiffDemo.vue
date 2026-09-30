<script setup lang="ts">
// Two <XenolithGraph> trees, so each XenolithPanel injects its own editor.
import { onUnmounted, shallowRef, watch } from 'vue'
import { XenolithGraph, XenolithPanel } from '@xenolithengine/graph-vue'
import type { GraphDiff, XenolithEditor } from '@xenolithengine/graph-editor'
import { presentGraphDiff } from '@xenolithengine/demo/graph-diff-demo'

const before = shallowRef<XenolithEditor | null>(null)
const after = shallowRef<XenolithEditor | null>(null)
const diff = shallowRef<GraphDiff | null>(null)
let presentation: { dispose(): void } | null = null

watch([before, after], () => {
  if (!before.value || !after.value || presentation) return
  const presented = presentGraphDiff(before.value, after.value)
  presentation = presented
  diff.value = presented.diff
})

onUnmounted(() => { presentation?.dispose(); presentation = null })

function onBefore(editor: XenolithEditor): void { before.value = editor }
function onAfter(editor: XenolithEditor): void { after.value = editor }
</script>

<template>
  <div style="position:absolute;inset:0;">
    <div style="position:absolute;top:0;bottom:0;left:0;right:50%;overflow:hidden;border-right:1px solid var(--xeno-border,#222);">
      <XenolithGraph class="xeno" :resize-to-window="false" @ready="onBefore">
        <XenolithPanel position="top-left">
          <div style="font-size:12px;font-weight:600;">BEFORE</div>
        </XenolithPanel>
      </XenolithGraph>
    </div>
    <div style="position:absolute;top:0;bottom:0;left:50%;right:0;overflow:hidden;">
      <XenolithGraph class="xeno" :resize-to-window="false" @ready="onAfter">
        <XenolithPanel position="top-left">
          <div style="font-size:12px;font-weight:600;">AFTER</div>
          <div v-if="diff" style="font-size:11px;color:var(--xeno-muted);display:flex;align-items:center;margin-top:6px;">
            <span style="display:inline-block;width:10px;height:10px;border-radius:10px;background:#39d98a;margin:0 6px 0 10px;" /> added {{ diff.addedNodes.size }}
            <span style="display:inline-block;width:10px;height:10px;border-radius:10px;background:#fcb400;margin:0 6px 0 10px;" /> modified {{ diff.modifiedNodes.size }}
            <span style="display:inline-block;width:10px;height:10px;border-radius:10px;background:#ff5b6e;margin:0 6px 0 10px;" /> removed {{ diff.removedNodes.size }}
          </div>
        </XenolithPanel>
      </XenolithGraph>
    </div>
  </div>
</template>
