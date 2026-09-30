<script setup lang="ts">
import type { WidgetProps } from '@xenolithengine/graph-vue'

const props = defineProps<WidgetProps>()

function onInput(event: Event): void {
  props.setValue((event.target as HTMLTextAreaElement).value)
}
</script>

<template>
  <textarea
    spellcheck="false"
    :value="String(value ?? '')"
    style="width:100%;height:100%;box-sizing:border-box;font:inherit;font-size:11px;background:var(--xeno-bg);color:var(--xeno-text);border:1px solid var(--xeno-border);border-radius:6px;padding:6px;resize:none;"
    @input="onInput"
  />
</template>
