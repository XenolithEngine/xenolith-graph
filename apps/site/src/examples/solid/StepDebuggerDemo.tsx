import { createMemo, createSignal, onCleanup } from 'solid-js'
import { xenolith } from '@xenolithengine/graph-solid'
import {
  attachStepDebugger, buildStepDemo,
  type StepDebugController, type StepDebugSnapshot,
} from '@xenolithengine/demo/step-debugger'

const EMPTY: StepDebugSnapshot = {
  status: 'idle', paused: null, history: [], planned: [], macroExpanded: false, busy: false,
}

function dotColor(status: StepDebugSnapshot['status']): string {
  if (status === 'paused') return '#fcb400'
  if (status === 'running') return '#3ddc97'
  if (status === 'error') return '#e25b5b'
  if (status === 'finished') return '#5b8def'
  return '#666'
}
function statusLabel(status: StepDebugSnapshot['status']): string {
  return ({ idle: 'idle', paused: 'paused', running: 'running…', finished: 'finished', error: 'error' })[status]
}

export function StepDebuggerDemo() {
  let ctrl: StepDebugController | null = null
  const [snap, setSnap] = createSignal<StepDebugSnapshot>(EMPTY)
  onCleanup(() => { ctrl?.dispose(); ctrl = null })

  const canStart = createMemo(() => {
    const s = snap()
    return !s.busy && (s.status === 'idle' || s.status === 'finished' || s.status === 'error')
  })
  const canStep = createMemo(() => !snap().busy && snap().status === 'paused')
  const canStop = createMemo(() => !snap().busy && snap().status !== 'idle')

  const btn = (on: boolean, off: boolean): string =>
    `font:inherit;font-size:13px;padding:7px 12px;border-radius:8px;cursor:${off ? 'default' : 'pointer'};opacity:${off ? '0.4' : '1'};border:1px solid ${on ? 'var(--xeno-accent)' : 'var(--xeno-border)'};background:${on ? 'var(--xeno-accent)' : 'var(--xeno-elevated)'};color:${on ? 'var(--xeno-canvas)' : 'var(--xeno-text)'};`
  const card = 'position:absolute;z-index:5;padding:10px;background:var(--xeno-panel);border:1px solid var(--xeno-border);border-radius:10px;color:var(--xeno-text);font:13px system-ui,sans-serif;'

  return (
    <div
      use:xenolith={{ resizeToWindow: false }}
      on:ready={(e) => {
        buildStepDemo(e.detail)
        ctrl = attachStepDebugger(e.detail, () => setSnap(ctrl?.snapshot() ?? EMPTY))
        setSnap(ctrl.snapshot())
      }}
      style="position:absolute;inset:0"
    >
      <div style={card + 'top:12px;left:12px;display:flex;flex-direction:column;gap:8px;max-width:320px;'}>
        <div style="display:flex;align-items:center;gap:8px;">
          <span style={`width:8px;height:8px;border-radius:8px;background:${dotColor(snap().status)};`} />
          <strong style="font-size:12px;">Debugger {statusLabel(snap().status)}</strong>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button type="button" style={btn(canStart(), !canStart())} disabled={!canStart()} onClick={() => void ctrl?.start()}>▶ Start</button>
          <button type="button" style={btn(false, !canStep())} disabled={!canStep()} onClick={() => void ctrl?.step()}>⤵ Step</button>
          <button type="button" style={btn(false, !canStep())} disabled={!canStep()} onClick={() => void ctrl?.continue()}>⏩ Continue</button>
          <button type="button" style={btn(false, !canStop())} disabled={!canStop()} onClick={() => ctrl?.stop()}>■ Stop</button>
        </div>
        <button type="button" style={btn(false, snap().busy)} disabled={snap().busy} onClick={() => void ctrl?.toggleMacro()}>
          {snap().macroExpanded ? '⟲ Collapse macro' : '⤢ Expand macro'}
        </button>
        <div style="font-size:11px;color:var(--xeno-muted);line-height:1.4;">
          Graph: <strong>(2 + 3) × 4 = 20</strong> piped through a template-wrapped Identity
          into Display. Add + Multiply are inside macro <em>Compute</em>; Identity is inside
          template <em>Probe</em>. Toggle the macro to step its members individually. Templates
          are always one step. Click any node while debugging to toggle a breakpoint (red).
          Yellow = paused, green = executed.
        </div>
      </div>
      {snap().paused && (
        <div style={card + 'top:12px;right:12px;min-width:240px;max-width:320px;'}>
          <div style="font-size:10px;color:var(--xeno-muted);text-transform:uppercase;">Paused on</div>
          <div style="font-size:14px;font-weight:600;">{snap().paused!.nodeType}</div>
          <div style="font-size:10px;color:var(--xeno-muted);margin-top:8px;">Inputs</div>
          {snap().paused!.inputs.length === 0
            ? <div style="font-size:11px;color:var(--xeno-muted);">— (no incoming values)</div>
            : snap().paused!.inputs.map((row) => (
              <div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0;">
                <span style="color:var(--xeno-muted);">{row[0]}</span>
                <span style="font-family:ui-monospace,monospace;">{JSON.stringify(row[1])}</span>
              </div>
            ))}
        </div>
      )}
      <div style={card + 'bottom:12px;left:12px;min-width:280px;max-width:360px;max-height:260px;overflow:auto;'}>
        {snap().planned.length > 0 && (
          <>
            <div style="font-size:10px;color:var(--xeno-muted);margin-bottom:4px;">Planned walk ({snap().planned.length} steps)</div>
            <div style="font-size:10px;font-family:ui-monospace,monospace;margin-bottom:8px;line-height:1.5;">
              {snap().planned.map((step, i) => `${i + 1}. ${step}${i < snap().planned.length - 1 ? ' → ' : ''}`).join('')}
            </div>
          </>
        )}
        <div style="font-size:10px;color:var(--xeno-muted);margin-bottom:4px;">Trace</div>
        {snap().history.length === 0
          ? <div style="font-size:11px;color:var(--xeno-muted);">Press ▶ Start, then ⤵ Step.</div>
          : snap().history.map((record, i) => (
            <div style="display:grid;grid-template-columns:24px 1fr auto auto;gap:8px;font-size:11px;padding:2px 0;">
              <span style="color:var(--xeno-accent,#FCB400);">{String(i + 1).padStart(2, '0')}</span>
              <span>{record.type}</span>
              <span style="color:var(--xeno-muted);">{record.durationMs.toFixed(2)}ms</span>
              <span style="font-family:ui-monospace,monospace;">{[...record.outputs.values()].map((v) => JSON.stringify(v)).join(', ') || '—'}</span>
            </div>
          ))}
      </div>
    </div>
  )
}
