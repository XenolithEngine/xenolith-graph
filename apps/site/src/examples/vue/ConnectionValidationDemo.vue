<script setup lang="ts">
// Vue — the graph and the cycle guard live in @xenolithengine/demo/connection-validation.
// This file only keeps the attempt log the core reports into.
import { ref } from 'vue'
import { XenolithGraph, XenolithControls } from '@xenolithengine/graph-vue'
import type { XenolithEditor } from '@xenolithengine/graph-editor'
import { buildConnectionValidation, type Attempt } from '@xenolithengine/demo/connection-validation'
import RulesPanel from './RulesPanel.vue'

const log = ref<Attempt[]>([])
function push(attempt: Attempt): void {
  log.value = [attempt, ...log.value].slice(0, 8)
}
function ready(editor: XenolithEditor): void {
  buildConnectionValidation(editor, push)
}
</script>

<template>
  <div class="app" style="position:absolute;inset:0;">
    <XenolithGraph class="xeno" :resize-to-window="false" @ready="ready">
      <XenolithControls position="bottom-left" />
      <RulesPanel :log="log" />
    </XenolithGraph>
  </div>
</template>
