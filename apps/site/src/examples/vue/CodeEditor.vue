<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { json } from '@codemirror/lang-json'
import type { WidgetProps } from '@xenolithengine/graph-vue'

const props = defineProps<WidgetProps>()
const host = ref<HTMLDivElement | null>(null)
let view: EditorView | null = null

onMounted(() => {
  if (!host.value) return
  view = new EditorView({
    parent: host.value,
    state: EditorState.create({
      doc: String(props.value ?? ''),
      extensions: [
        json(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) props.setValue(update.state.doc.toString())
        }),
        EditorView.theme({
          '&': { height: '100%', background: 'transparent', fontSize: '11px' },
          '.cm-content': { fontFamily: 'ui-monospace, monospace', color: 'var(--xeno-text)' },
          '.cm-scroller': { overflow: 'auto' },
          '&.cm-focused': { outline: 'none' },
        }),
      ],
    }),
  })
})

onUnmounted(() => { view?.destroy(); view = null })
</script>

<template>
  <div ref="host" style="width:100%;height:100%;overflow:hidden;"></div>
</template>
