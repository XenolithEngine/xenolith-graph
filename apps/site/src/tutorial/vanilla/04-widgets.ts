// CHAPTER 4 — Widgets (vanilla JS).
//
// Widgets are the bits INSIDE a node that let users edit its state. Same node JSON, richer
// schema: we keep the Greeter and ToUpper from last chapter, and grow the Greeter's widgets
// to cover the common types.
//
// Six widget types ship in the box:
//   - text   — single-line or multiline input
//   - number — numeric input with min/max/step/precision/unit
//   - slider — number on a range track
//   - combo  — drop-down with named options
//   - toggle — boolean switch
//   - color  — colour swatch + picker
//   - custom — render any canvas/DOM widget; covered in a later chapter
//
// And the secret ingredient: `displayOptions.show(state)` for CONDITIONAL widgets — the *accent*
// colour widget appears only when *Show accent* is on. Schema-only logic, no host code.

import { XenolithEditor, type NodeSchema, type XenolithGraphV1 } from '@xenolith/editor'

const greeterSchema: NodeSchema = {
  type: 'Greeter',
  title: 'Greeter',
  category: 'data',
  description: 'Emits a string greeting with configurable tone and accent.',
  pins: [
    { kind: 'data', direction: 'out', type: 'string', label: 'Out', multiple: true },
  ],
  widgets: [
    // text — the message itself.
    { id: 'msg', type: 'text', key: 'msg', label: 'Message', placeholder: 'Hello, Xenolith', freeFloating: true },
    // combo — discrete tone choice. Values can be plain strings or {label, value}.
    { id: 'tone', type: 'combo', key: 'tone', label: 'Tone',
      values: ['friendly', 'formal', 'sarcastic'],
      freeFloating: true },
    // slider — volume on 0..100. Tracks live; the node re-renders on every drag.
    { id: 'volume', type: 'slider', key: 'volume', label: 'Volume',
      min: 0, max: 100, step: 1,
      freeFloating: true },
    // toggle — drives the conditional below.
    { id: 'showAccent', type: 'toggle', key: 'showAccent', label: 'Show accent',
      onLabel: 'on', offLabel: 'off',
      freeFloating: true },
    // color — CONDITIONAL: hidden when showAccent === false. `show` is called after every
    // setWidgetValue; failure to return true hides the row entirely (renderer skips layout).
    { id: 'accent', type: 'color', key: 'accent', label: 'Accent',
      freeFloating: true,
      displayOptions: { show: (state) => state['showAccent'] === true } },
  ],
}

const toUpperSchema: NodeSchema = {
  type: 'ToUpper',
  title: 'To Upper',
  category: 'transform',
  pins: [
    { kind: 'data', direction: 'in',  type: 'string', label: 'In',  multiple: false },
    { kind: 'data', direction: 'out', type: 'string', label: 'Out', multiple: true  },
  ],
}

// JSON now carries the Greeter's state across every widget — that's what makes a saved scene
// reload to the exact same look. Widgets without `state[key]` use the type's default
// (text → '', slider → min, combo → first value, toggle → false, color → '#6c8ebf').
const graph: XenolithGraphV1 = {
  version: 'xenolith.v1',
  nodes: [
    { id: 'greeter', type: 'Greeter', position: { x: -240, y: 0 },
      state: { msg: 'Hello, Xenolith', tone: 'friendly', volume: 60, showAccent: true, accent: '#fcb400' } },
    { id: 'upper',   type: 'ToUpper', position: { x:  200, y: 0 }, state: {} },
  ],
  edges: [
    { id: 'e1', from: { node: 'greeter', pin: 'greeter:Out' }, to: { node: 'upper', pin: 'upper:In' } },
  ],
}

export async function mount(target: HTMLElement): Promise<() => void> {
  const editor = await XenolithEditor.init(target, { minimap: false })
  editor.registry.register(greeterSchema)
  editor.registry.register(toUpperSchema)
  editor.loadJSON(graph)
  editor.fitView({ padding: 80, maxZoom: 1 })
  return () => editor.destroy()
}
