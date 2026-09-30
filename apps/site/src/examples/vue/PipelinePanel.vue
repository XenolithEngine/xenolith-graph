<script setup lang="ts">
import { watch } from 'vue'
import { XenolithPanel, XenolithButton, useEditor, vueWidget } from '@xenolithengine/graph-vue'
import { buildImagePipeline, downloadImageResult } from '@xenolithengine/demo/image-pipeline'
import ImageInput from './ImageInput.vue'
import ImageOutput from './ImageOutput.vue'

const editor = useEditor()
const input = vueWidget(ImageInput)
const output = vueWidget(ImageOutput)

watch(editor, (ed) => {
  if (!ed) return
  buildImagePipeline(ed, { input, output })
}, { immediate: true })
</script>

<template>
  <XenolithPanel position="top-left">
    <div style="display:flex;flex-direction:column;gap:6px;width:200px;">
      <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--xeno-muted);">Image pipeline</p>
      <XenolithButton style="width:100%" @click="editor && downloadImageResult(editor)">↓ Download result.png</XenolithButton>
      <span style="color:var(--xeno-muted);font-size:11px;line-height:1.45;">
        Each node is a live GLSL pass. Drag a slider — the result re-renders. Drop your own image on the Source node.
      </span>
    </div>
  </XenolithPanel>
</template>
