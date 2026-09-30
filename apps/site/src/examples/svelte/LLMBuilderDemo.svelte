<script lang="ts">
  import { xenolith, createXenolithEditorContext } from '@xenolithengine/graph-svelte'
  import { XenolithPanel, XenolithButton, svelteWidget } from '@xenolithengine/graph-svelte/components'
  import type { XenolithEditor } from '@xenolithengine/graph-editor'
  import { loadLLMGraph, runLLM } from '@xenolithengine/demo/llm-builder'
  import PromptEditor from './PromptEditor.svelte'
  import OutputView from './OutputView.svelte'

  const panelEditor = createXenolithEditorContext()
  let editor = $state<XenolithEditor | null>(null)
  let running = $state(false)
  const prompt = svelteWidget(PromptEditor)
  const output = svelteWidget(OutputView)

  async function onRun(): Promise<void> {
    if (!editor || running) return
    running = true
    try { await runLLM(editor) } finally { running = false }
  }
</script>

<div
  use:xenolith={{ resizeToWindow: false }}
  onready={(e) => {
    editor = e.detail
    panelEditor.set(e.detail)
    e.detail.registerWidget('prompt-edit', prompt)
    e.detail.registerWidget('output-view', output)
    loadLLMGraph(e.detail)
  }}
  style="position:absolute;inset:0"
></div>

<XenolithPanel position="top-left">
  <div style="display:flex;flex-direction:column;gap:6px;max-width:220px;">
    <XenolithButton active={running} disabled={running} style="width:100%" onclick={() => void onRun()}>
      {running ? 'Running…' : '▶ Run'}
    </XenolithButton>
    <span style="color:var(--xeno-muted);font-size:11px;line-height:1.4;">
      Edit the Input / Prompt / Model, then Run — the active node glows and the completion streams in.
    </span>
  </div>
</XenolithPanel>
