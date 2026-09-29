// Solid — the directive tracks the bound object. Reading the signal inside it re-runs setProps,
// which is how a theme flip reaches the editor after mount.
import { createSignal } from 'solid-js'
import { xenolith } from '@xenolithengine/graph-solid'
import { xenTheme } from '@xenolithengine/graph-render-pixi'
import { liquidGlassTheme } from '@xenolithengine/graph-theme-liquid-glass'
import { loadDemo } from '@xenolithengine/demo/scene'

export function ThemingDemo() {
  const [name, setName] = createSignal<'xen' | 'lg'>('xen')
  return (
    <div
      use:xenolith={{
        theme: name() === 'xen' ? xenTheme : liquidGlassTheme,
        resizeToWindow: false,
      }}
      on:ready={(e) => {
        e.detail.chrome.setControls({ position: 'top-right', orientation: 'horizontal' })
        loadDemo(e.detail)
      }}
      style="position:absolute;inset:0"
    >
      <div style="position:absolute;top:12px;left:12px;z-index:5;display:flex;gap:6px;padding:6px;background:var(--xeno-panel);border:1px solid var(--xeno-border);border-radius:10px;">
        <button
          type="button"
          style={`font:inherit;font-size:13px;padding:7px 12px;cursor:pointer;border-radius:8px;border:1px solid ${name() === 'xen' ? 'var(--xeno-accent)' : 'var(--xeno-border)'};background:${name() === 'xen' ? 'var(--xeno-accent)' : 'var(--xeno-elevated)'};color:${name() === 'xen' ? 'var(--xeno-canvas)' : 'var(--xeno-text)'};`}
          onClick={() => setName('xen')}
        >Xen</button>
        <button
          type="button"
          style={`font:inherit;font-size:13px;padding:7px 12px;cursor:pointer;border-radius:8px;border:1px solid ${name() === 'lg' ? 'var(--xeno-accent)' : 'var(--xeno-border)'};background:${name() === 'lg' ? 'var(--xeno-accent)' : 'var(--xeno-elevated)'};color:${name() === 'lg' ? 'var(--xeno-canvas)' : 'var(--xeno-text)'};`}
          onClick={() => setName('lg')}
        >Liquid Glass</button>
      </div>
    </div>
  )
}
