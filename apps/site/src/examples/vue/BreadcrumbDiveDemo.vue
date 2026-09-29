<script setup lang="ts">
// Vue — dive helpers called with the editor from @ready. Double-click still works on the canvas.
import { ref } from 'vue'
import { XenolithGraph, XenolithPanel, XenolithButton } from '@xenolithengine/graph-vue'
import type { XenolithEditor } from '@xenolithengine/graph-editor'
import { setupBreadcrumbDive, diveIntoSlug } from '@xenolithengine/demo/breadcrumb-dive'

const editor = ref<XenolithEditor | null>(null)

function onReady(e: XenolithEditor): void {
  editor.value = e
  setupBreadcrumbDive(e)
}
</script>

<template>
  <div class="app" style="position:absolute;inset:0;">
    <XenolithGraph class="xeno" :resize-to-window="false" @ready="onReady">
      <XenolithPanel position="top-right">
        <div style="display:flex;flex-direction:column;gap:6px;min-width:180px;">
          <XenolithButton style="text-align:left" @click="editor && diveIntoSlug(editor, 'pipeline')">Dive into Pipeline</XenolithButton>
          <XenolithButton style="text-align:left" @click="editor && diveIntoSlug(editor, 'stage')">… then into Stage</XenolithButton>
          <XenolithButton style="text-align:left" @click="editor?.diveOut(0)">Pop to Root</XenolithButton>
          <div style="font-size:11px;color:var(--xeno-muted);">Or double-click any $templateInstance node.</div>
        </div>
      </XenolithPanel>
    </XenolithGraph>
  </div>
</template>
