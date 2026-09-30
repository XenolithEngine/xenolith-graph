<script setup lang="ts">
import { ref, watch } from 'vue'
import { XenolithPanel, XenolithButton, useEditor, vueWidget } from '@xenolithengine/graph-vue'
import { loadLLMGraph, runLLM } from '@xenolithengine/demo/llm-builder'
import PromptEditor from './PromptEditor.vue'
import OutputView from './OutputView.vue'

const editor = useEditor()
const running = ref(false)
const prompt = vueWidget(PromptEditor)
const output = vueWidget(OutputView)
let loaded = false

watch(editor, (ed) => {
  if (!ed || loaded) return
  loaded = true
  ed.registerWidget('prompt-edit', prompt)
  ed.registerWidget('output-view', output)
  loadLLMGraph(ed)
}, { immediate: true })

async function onRun(): Promise<void> {
  const ed = editor.value
  if (!ed || running.value) return
  running.value = true
  try { await runLLM(ed) } finally { running.value = false }
}
</script>

<template>
  <XenolithPanel position="top-left">
    <div style="display:flex;flex-direction:column;gap:6px;max-width:220px;">
      <XenolithButton :active="running" :disabled="running" style="width:100%" @click="onRun">
        {{ running ? 'Running…' : '▶ Run' }}
      </XenolithButton>
      <span style="color:var(--xeno-muted);font-size:11px;line-height:1.4;">
        Edit the Input / Prompt / Model, then Run — the active node glows and the completion streams in.
      </span>
    </div>
  </XenolithPanel>
</template>
