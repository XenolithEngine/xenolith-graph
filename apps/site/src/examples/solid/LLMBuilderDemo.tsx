// Solid has no widget bridge. prompt-edit and output-view are DOM controllers, registered before load.
import { createSignal } from 'solid-js'
import { xenolith } from '@xenolithengine/graph-solid'
import type { DomWidgetController, XenolithEditor } from '@xenolithengine/graph-editor'
import { loadLLMGraph, runLLM } from '@xenolithengine/demo/llm-builder'

const box = 'width:100%;height:100%;box-sizing:border-box;font:11px inherit;background:var(--xeno-bg);color:var(--xeno-text);border:1px solid var(--xeno-border);border-radius:6px;padding:6px;resize:none;'

function promptEdit(): DomWidgetController {
  let area: HTMLTextAreaElement | null = null
  return {
    mount(el, c) {
      area = document.createElement('textarea')
      area.spellcheck = false
      area.value = String(c.value ?? '')
      area.style.cssText = box
      area.addEventListener('input', () => c.setValue(area?.value ?? ''))
      el.append(area)
      return () => { area = null; el.replaceChildren() }
    },
    update(c) {
      const next = String(c.value ?? '')
      if (area && area.value !== next) area.value = next
    },
  }
}

function outputView(): DomWidgetController {
  let view: HTMLDivElement | null = null
  const paint = (value: unknown): void => {
    if (!view) return
    const text = String(value ?? '')
    view.textContent = text || 'Run to generate…'
    view.style.color = text ? 'var(--xeno-text)' : 'var(--xeno-muted)'
  }
  return {
    mount(el, c) {
      view = document.createElement('div')
      view.style.cssText = box + 'overflow:auto;white-space:pre-wrap;font-family:ui-monospace,monospace;'
      el.append(view)
      paint(c.value)
      return () => { view = null; el.replaceChildren() }
    },
    update(c) { paint(c.value) },
  }
}

export function LLMBuilderDemo() {
  let editor: XenolithEditor | null = null
  const [running, setRunning] = createSignal(false)
  const btn = (on: boolean): string =>
    `font:inherit;font-size:13px;padding:7px 12px;border-radius:8px;cursor:${on ? 'default' : 'pointer'};opacity:${on ? '0.4' : '1'};width:100%;border:1px solid ${on ? 'var(--xeno-accent)' : 'var(--xeno-border)'};background:${on ? 'var(--xeno-accent)' : 'var(--xeno-elevated)'};color:${on ? 'var(--xeno-canvas)' : 'var(--xeno-text)'};`

  const onRun = async (): Promise<void> => {
    if (!editor || running()) return
    setRunning(true)
    try { await runLLM(editor) } finally { setRunning(false) }
  }

  return (
    <div
      use:xenolith={{ resizeToWindow: false }}
      on:ready={(e) => {
        editor = e.detail
        e.detail.registerWidget('prompt-edit', promptEdit())
        e.detail.registerWidget('output-view', outputView())
        loadLLMGraph(e.detail)
      }}
      style="position:absolute;inset:0"
    >
      <div style="position:absolute;top:12px;left:12px;z-index:5;display:flex;flex-direction:column;gap:6px;max-width:220px;padding:10px;background:var(--xeno-panel);border:1px solid var(--xeno-border);border-radius:10px;color:var(--xeno-text);font:13px system-ui,sans-serif;">
        <button type="button" style={btn(running())} disabled={running()} onClick={() => void onRun()}>{running() ? 'Running…' : '▶ Run'}</button>
        <span style="color:var(--xeno-muted);font-size:11px;line-height:1.4;">
          Edit the Input / Prompt / Model, then Run — the active node glows and the completion streams in.
        </span>
      </div>
    </div>
  )
}
