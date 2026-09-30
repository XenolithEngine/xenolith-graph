// Solid — no panel package. The count is stores.nodes(); buttons call the shared helpers.
import { xenolith, createXenolithStores } from '@xenolithengine/graph-solid'
import { setupStressTest, addStressNodes } from '@xenolithengine/demo/stress-test'

export function StressTestDemo() {
  const stores = createXenolithStores()

  function add(n: number): void {
    const live = stores.editor()
    if (live) addStressNodes(live, n)
  }

  const btn = 'font:inherit;font-size:13px;padding:7px 12px;border-radius:8px;border:1px solid var(--xeno-border);background:var(--xeno-elevated);color:var(--xeno-text);cursor:pointer;'

  return (
    <div
      use:xenolith={{ resizeToWindow: false, zoomBounds: [0.05, 2] }}
      on:ready={(e) => { stores.setEditor(e.detail); setupStressTest(e.detail) }}
      style="position:absolute;inset:0"
    >
      <div style="position:absolute;top:12px;left:12px;z-index:5;display:flex;flex-direction:column;gap:6px;width:168px;padding:10px;background:var(--xeno-panel);border:1px solid var(--xeno-border);border-radius:10px;color:var(--xeno-text);font:13px system-ui,sans-serif;">
        <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--xeno-muted);">Stress test</p>
        <div style="font-size:22px;font-weight:700;color:var(--xeno-accent);font-variant-numeric:tabular-nums;">
          {stores.nodes().length}<span style="font-size:12px;color:var(--xeno-muted);font-weight:400;"> nodes</span>
        </div>
        <div style="display:flex;gap:6px;">
          <button type="button" style={`${btn}flex:1`} onClick={() => add(500)}>+500</button>
          <button type="button" style={`${btn}flex:1`} onClick={() => add(1000)}>+1000</button>
        </div>
        <button type="button" style={`${btn}width:100%`} onClick={() => add(5000)}>+5000</button>
        <button type="button" style={`${btn}width:100%`} onClick={() => stores.editor()?.clear()}>Reset</button>
        <span style="color:var(--xeno-muted);font-size:11px;line-height:1.4;">
          WebGL, render-on-demand. Live stats top-right. The count is stores.nodes().length.
        </span>
      </div>
    </div>
  )
}
