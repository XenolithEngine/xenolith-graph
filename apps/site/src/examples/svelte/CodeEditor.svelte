<script lang="ts">
  import { onMount } from 'svelte'
  import { EditorView } from '@codemirror/view'
  import { EditorState } from '@codemirror/state'
  import { json } from '@codemirror/lang-json'
  import type { WidgetProps } from '@xenolithengine/graph-svelte/components'

  let { value, setValue }: WidgetProps = $props()
  let host: HTMLDivElement
  let view: EditorView | null = null

  onMount(() => {
    view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: String(value ?? ''),
        extensions: [
          json(),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) setValue(update.state.doc.toString())
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
    return () => { view?.destroy(); view = null }
  })
</script>

<div bind:this={host} style="width:100%;height:100%;overflow:hidden;"></div>
