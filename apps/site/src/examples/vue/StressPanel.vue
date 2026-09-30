<script setup lang="ts">
import { XenolithPanel, XenolithButton, useEditor, useNodes } from '@xenolithengine/graph-vue'
import { addStressNodes } from '@xenolithengine/demo/stress-test'

const editor = useEditor()
const nodes = useNodes()

function add(n: number): void {
  const live = editor.value
  if (live) addStressNodes(live, n)
}
function reset(): void {
  editor.value?.clear()
}
</script>

<template>
  <XenolithPanel position="top-left">
    <div style="display:flex;flex-direction:column;gap:6px;width:168px;">
      <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--xeno-muted);">Stress test</p>
      <div style="font-size:22px;font-weight:700;color:var(--xeno-accent);font-variant-numeric:tabular-nums;">
        {{ nodes.length }}<span style="font-size:12px;color:var(--xeno-muted);font-weight:400;"> nodes</span>
      </div>
      <div style="display:flex;gap:6px;">
        <XenolithButton style="flex:1" @click="add(500)">+500</XenolithButton>
        <XenolithButton style="flex:1" @click="add(1000)">+1000</XenolithButton>
      </div>
      <XenolithButton style="width:100%" @click="add(5000)">+5000</XenolithButton>
      <XenolithButton style="width:100%" @click="reset">Reset</XenolithButton>
      <span style="color:var(--xeno-muted);font-size:11px;line-height:1.4;">
        WebGL, render-on-demand. Live stats top-right. The count is useNodes().length.
      </span>
    </div>
  </XenolithPanel>
</template>
