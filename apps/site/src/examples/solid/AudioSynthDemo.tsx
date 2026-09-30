// Solid — no panel package. The card is DOM; the engine is created once on ready.
import { createSignal, onCleanup } from 'solid-js'
import { xenolith } from '@xenolithengine/graph-solid'
import { loadAudioGraph, createAudioEngine, type AudioSynthHandle } from '@xenolithengine/demo/audio-synth'

export function AudioSynthDemo() {
  const [playing, setPlaying] = createSignal(false)
  let engine: AudioSynthHandle | null = null
  onCleanup(() => { engine?.dispose(); engine = null })

  const toggle = (): void => {
    if (!engine) return
    if (playing()) engine.stop()
    else engine.play()
    setPlaying(!playing())
  }

  const btn = (on: boolean): string =>
    `font:inherit;font-size:13px;padding:7px 12px;border-radius:8px;cursor:pointer;width:100%;border:1px solid ${on ? 'var(--xeno-accent)' : 'var(--xeno-border)'};background:${on ? 'var(--xeno-accent)' : 'var(--xeno-elevated)'};color:${on ? 'var(--xeno-canvas)' : 'var(--xeno-text)'};`

  return (
    <div
      use:xenolith={{ resizeToWindow: false }}
      on:ready={(e) => { loadAudioGraph(e.detail); engine = createAudioEngine(e.detail) }}
      style="position:absolute;inset:0"
    >
      <div style="position:absolute;top:12px;left:12px;z-index:5;display:flex;flex-direction:column;gap:6px;max-width:220px;padding:10px;background:var(--xeno-panel);border:1px solid var(--xeno-border);border-radius:10px;color:var(--xeno-text);font:13px system-ui,sans-serif;">
        <button type="button" style={btn(playing())} onClick={toggle}>{playing() ? '■ Stop' : '▶ Play'}</button>
        <span style="color:var(--xeno-muted);font-size:11px;line-height:1.4;">
          Tweak the knobs while it plays — the chain is wired from the graph; the active path glows.
        </span>
      </div>
    </div>
  )
}
