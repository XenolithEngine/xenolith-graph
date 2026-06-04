// Vanilla mount for mobile-touch — touch-first demo for testing pinch / two-finger pan / long-press
// on iOS Simulator and real devices. See /docs/TESTING-ON-IOS-SIMULATOR.md.
import { XenolithEditor } from '@xenolith/editor'
import type { NodeSchema } from '@xenolith/editor'

const NODE_TYPES: NodeSchema[] = [
  { type: 'Source',    title: 'Source',    category: 'data',
    pins: [{ kind: 'data', direction: 'out', type: 'number', label: 'Out', multiple: true }],
    widgets: [{ id: 'v', type: 'number', key: 'value', label: 'Value', step: 1, freeFloating: true }] },
  { type: 'Multiply',  title: 'Multiply',  category: 'transform',
    pins: [
      { kind: 'data', direction: 'in',  type: 'number', label: 'A', multiple: false },
      { kind: 'data', direction: 'in',  type: 'number', label: 'B', multiple: false },
      { kind: 'data', direction: 'out', type: 'number', label: 'Out', multiple: true },
    ] },
  { type: 'Output',    title: 'Output',    category: 'utility',
    pins: [{ kind: 'data', direction: 'in', type: 'number', label: 'In', multiple: false }] },
]

const SEED = {
  version: 'xenolith.v1',
  nodes: [
    { id: 's1', type: 'Source',   position: { x: -240, y: -80 }, state: { value: 6 } },
    { id: 's2', type: 'Source',   position: { x: -240, y:  80 }, state: { value: 7 } },
    { id: 'm1', type: 'Multiply', position: { x:    0, y:   0 }, state: {} },
    { id: 'o1', type: 'Output',   position: { x:  240, y:   0 }, state: {} },
  ],
  edges: [
    { id: 'e1', from: { node: 's1', pin: 's1:Out' }, to: { node: 'm1', pin: 'm1:A' } },
    { id: 'e2', from: { node: 's2', pin: 's2:Out' }, to: { node: 'm1', pin: 'm1:B' } },
    { id: 'e3', from: { node: 'm1', pin: 'm1:Out' }, to: { node: 'o1', pin: 'o1:In' } },
  ],
}

export async function mount(target: HTMLElement): Promise<() => void> {
  const editor = await XenolithEditor.init(target, { controls: { position: 'bottom-right' } })
  NODE_TYPES.forEach((s) => editor.registry.register(s))
  editor.loadJSON(SEED)
  editor.view.fitView({ padding: 60, maxZoom: 1 })

  // Cheat sheet overlay — visible reminder of the gestures we're testing.
  const help = document.createElement('div')
  help.style.cssText =
    'position:absolute;top:10px;left:10px;right:10px;padding:8px 12px;border-radius:8px;' +
    'background:rgba(0,0,0,0.55);color:#e8e8e8;backdrop-filter:blur(8px);' +
    'font:12px/1.45 ui-monospace,monospace;z-index:6;pointer-events:none;max-width:520px;'
  help.innerHTML =
    '<b style="color:#FCB400">Mobile touch demo</b><br>' +
    '• Pinch — zoom &nbsp; • Two-finger drag — pan<br>' +
    '• Long-press — context menu &nbsp; • Tap node — select<br>' +
    '• Tap ⛶ (top-right) — fullscreen'
  editor.chrome.overlayRoot.appendChild(help)

  // Fullscreen toggle — uses editor.chrome.toggleFullscreen() (falls back to CSS pseudo-fullscreen on iOS).
  const fs = document.createElement('button')
  fs.textContent = '⛶'
  fs.setAttribute('aria-label', 'Toggle fullscreen')
  fs.style.cssText =
    'position:absolute;top:10px;right:10px;width:44px;height:44px;border-radius:8px;' +
    'background:rgba(0,0,0,0.55);color:#fff;border:1px solid rgba(255,255,255,0.15);' +
    'font-size:20px;cursor:pointer;z-index:7;backdrop-filter:blur(8px);' +
    // overlayRoot has pointer-events:none so the canvas underneath stays clickable;
    // re-enable for this button explicitly.
    'pointer-events:auto;'
  fs.addEventListener('click', () => editor.chrome.toggleFullscreen())
  editor.chrome.overlayRoot.appendChild(fs)

  return () => { help.remove(); fs.remove(); editor.destroy() }
}
