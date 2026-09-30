import { createEffect, createMemo, createSignal, onCleanup } from 'solid-js'
import { xenolith } from '@xenolithengine/graph-solid'
import type { StepRecord, XenolithEditor } from '@xenolithengine/graph-editor'
import { buildTimeTravel, runTimeTravel, showTimeTravelStep } from '@xenolithengine/demo/time-travel'

export function TimeTravelDemo() {
  let editor: XenolithEditor | null = null
  const [history, setHistory] = createSignal<StepRecord[]>([])
  const [scrub, setScrub] = createSignal(0)
  const [playing, setPlaying] = createSignal(false)
  let timer: ReturnType<typeof setTimeout> | undefined
  onCleanup(() => clearTimeout(timer))

  createEffect(() => {
    const live = editor
    const steps = history()
    const index = scrub()
    if (!live || steps.length === 0) return
    showTimeTravelStep(live, steps, index)
  })

  createEffect(() => {
    const on = playing()
    const index = scrub()
    const total = history().length
    clearTimeout(timer)
    if (!on) return
    if (index >= total) { setPlaying(false); return }
    timer = setTimeout(() => setScrub((s) => Math.min(s + 1, history().length)), 600)
  })

  const current = createMemo(() => (scrub() > 0 ? history()[scrub() - 1] : undefined))
  const node = createMemo(() => {
    const rec = current()
    if (!rec || !editor) return undefined
    return editor.getNode(rec.nodeId)
  })
  const outputRows = createMemo(() => {
    const rec = current()
    const n = node()
    if (!rec || !n) return []
    return [...rec.outputs.entries()].map(([pinId, value]) => ({
      label: n.pins.find((p) => p.id === pinId)?.label ?? pinId,
      value: JSON.stringify(value),
    }))
  })

  const btn = (on: boolean): string =>
    `font:inherit;font-size:13px;padding:7px 12px;border-radius:8px;cursor:pointer;border:1px solid ${on ? 'var(--xeno-accent)' : 'var(--xeno-border)'};background:${on ? 'var(--xeno-accent)' : 'var(--xeno-elevated)'};color:${on ? 'var(--xeno-canvas)' : 'var(--xeno-text)'};`

  return (
    <div
      use:xenolith={{ resizeToWindow: false }}
      on:ready={(e) => {
        editor = e.detail
        buildTimeTravel(e.detail)
        void runTimeTravel(e.detail).then((steps) => {
          if (editor !== e.detail) return
          setHistory(steps)
          setScrub(steps.length)
        })
      }}
      style="position:absolute;inset:0"
    >
      <div style="position:absolute;top:12px;left:12px;z-index:5;display:flex;flex-direction:column;gap:8px;max-width:360px;padding:10px;background:var(--xeno-panel);border:1px solid var(--xeno-border);border-radius:10px;color:var(--xeno-text);font:13px system-ui,sans-serif;">
        <div style="font-size:12px;font-weight:600;">Time-travel scrubber</div>
        <div style="font-size:11px;color:var(--xeno-muted);line-height:1.4;">
          The graph ran <strong>(2 + 3) × 4 = 20</strong> from start to finish. Drag the slider
          to rewind through {history().length} steps — green = done, yellow = the step you're
          inspecting. Press Play to auto-advance.
        </div>
        <input data-testid="scrub" type="range" min="0" max={history().length} value={scrub()} step="1" style="width:100%" onInput={(ev) => { setPlaying(false); setScrub(Number(ev.currentTarget.value)) }} />
        <div style="display:flex;gap:6px;align-items:center;font-size:11px;">
          <button type="button" style={btn(playing())} onClick={() => { if (scrub() >= history().length) setScrub(0); setPlaying(!playing()) }}>{playing() ? '⏸ Pause' : '▶ Play'}</button>
          <button type="button" style={btn(false)} onClick={() => { setPlaying(false); setScrub(0) }}>⟲ Reset</button>
          <span style="margin-left:auto;color:var(--xeno-muted);">{scrub()}/{history().length}</span>
        </div>
      </div>
      {current() && node() && (
        <div style="position:absolute;top:12px;right:12px;z-index:5;min-width:240px;max-width:320px;padding:10px;background:var(--xeno-panel);border:1px solid var(--xeno-border);border-radius:10px;color:var(--xeno-text);font:13px system-ui,sans-serif;">
          <div style="font-size:10px;color:var(--xeno-muted);text-transform:uppercase;">Step {scrub()}</div>
          <div style="font-size:14px;font-weight:600;">{node()!.type}</div>
          <div style="font-size:10px;color:var(--xeno-muted);margin-top:8px;">Outputs</div>
          {outputRows().map((row) => (
            <div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0;">
              <span style="color:var(--xeno-muted);">{row.label}</span>
              <span style="font-family:ui-monospace,monospace;">{row.value}</span>
            </div>
          ))}
          <div style="font-size:10px;color:var(--xeno-muted);margin-top:6px;">{current()!.durationMs.toFixed(2)}ms</div>
        </div>
      )}
    </div>
  )
}
