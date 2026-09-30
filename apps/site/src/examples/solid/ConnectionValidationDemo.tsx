// Solid — no panel package. The log is a signal the shared guard writes into.
import { createSignal, For, Show } from 'solid-js'
import { xenolith } from '@xenolithengine/graph-solid'
import { buildConnectionValidation, type Attempt } from '@xenolithengine/demo/connection-validation'

export function ConnectionValidationDemo() {
  const [log, setLog] = createSignal<Attempt[]>([])

  function push(attempt: Attempt): void {
    setLog((prev) => [attempt, ...prev].slice(0, 8))
  }

  return (
    <div
      use:xenolith={{ resizeToWindow: false }}
      on:ready={(e) => {
        e.detail.chrome.setControls({ position: 'bottom-left' })
        buildConnectionValidation(e.detail, push)
      }}
      style="position:absolute;inset:0"
    >
      <div style="position:absolute;top:12px;right:12px;z-index:5;display:flex;flex-direction:column;gap:8px;width:230px;padding:10px;background:var(--xeno-panel);border:1px solid var(--xeno-border);border-radius:10px;color:var(--xeno-text);font:13px system-ui,sans-serif;">
        <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--xeno-muted);">Connection rules</p>
        <span style="color:var(--xeno-muted);font-size:11px;line-height:1.5;">
          Pins are typed. Drag <b style="color:var(--xeno-text);">Text</b> → a float input — refused (snaps back).
          Drag <b style="color:var(--xeno-text);">C</b> → <b style="color:var(--xeno-text);">A</b> — blocked (cycle).
        </span>
        <div style="display:flex;flex-direction:column;gap:3px;max-height:168px;overflow:hidden;">
          <Show when={log().length === 0}>
            <span style="color:var(--xeno-muted);font-size:11px;">No attempts yet.</span>
          </Show>
          <For each={log()}>{(attempt) =>
            <span style={`font-size:11px;font-family:var(--xeno-mono, monospace);color:${attempt.ok ? '#39d98a' : '#ff5b6e'};`}>
              {attempt.ok ? '✓' : '✗'} {attempt.text}
            </span>
          }</For>
        </div>
      </div>
    </div>
  )
}
