// Palette sidebar showcase: rich registry across 5 categories so users see the panel grouping
// them, search them, and drag-spawn into the canvas. No special host code — the editor's default
// drop handler inserts the node at the world position automatically when the user drops a tile.
//
// Shared between vanilla + React demos.

import type { NodeSchema, XenolithEditor } from '@xenolithengine/graph-editor'

const stringPin = (dir: 'in' | 'out', label: string) =>
  ({ kind: 'data' as const, direction: dir, type: 'string', label, multiple: dir === 'out' })
const numberPin = (dir: 'in' | 'out', label: string) =>
  ({ kind: 'data' as const, direction: dir, type: 'number', label, multiple: dir === 'out' })
const boolPin = (dir: 'in' | 'out', label: string) =>
  ({ kind: 'data' as const, direction: dir, type: 'boolean', label, multiple: dir === 'out' })

export const paletteSchemas: NodeSchema[] = [
  // DATA — leaf sources, no inputs
  { type: 'Const',  title: 'Constant',  category: 'data', description: 'A fixed number.',          keywords: ['number', 'value'], pins: [numberPin('out', 'Value')],
    widgets: [{ id: 'value', type: 'number', key: 'value', label: 'Value', step: 1, freeFloating: true }] },
  { type: 'TextValue', title: 'Text',  category: 'data', description: 'A fixed text string.',     keywords: ['string', 'literal'], pins: [stringPin('out', 'Text')],
    widgets: [{ id: 'text', type: 'text', key: 'text', label: 'Text', placeholder: 'hello', freeFloating: true }] },
  { type: 'Random', title: 'Random',   category: 'data', description: 'Pseudo-random 0..1 on read.', keywords: ['rand', 'noise'], pins: [numberPin('out', 'Out')] },

  // MATH — arithmetic & trig
  { type: 'Add',      title: 'Add',      category: 'math', description: 'A + B', keywords: ['plus', 'sum'],     pins: [numberPin('in', 'A'), numberPin('in', 'B'), numberPin('out', 'Sum')] },
  { type: 'Subtract', title: 'Subtract', category: 'math', description: 'A − B', keywords: ['minus', 'diff'],   pins: [numberPin('in', 'A'), numberPin('in', 'B'), numberPin('out', 'Diff')] },
  { type: 'Multiply', title: 'Multiply', category: 'math', description: 'A × B', keywords: ['times', 'mul'],    pins: [numberPin('in', 'A'), numberPin('in', 'B'), numberPin('out', 'Product')] },
  { type: 'Divide',   title: 'Divide',   category: 'math', description: 'A ÷ B', keywords: ['div', 'fraction'], pins: [numberPin('in', 'A'), numberPin('in', 'B'), numberPin('out', 'Quotient')] },
  { type: 'Sin',      title: 'Sin',      category: 'math', description: 'sin(x), radians.', keywords: ['trig'], pins: [numberPin('in', 'X'), numberPin('out', 'Out')] },

  // TRANSFORM — string ops
  { type: 'ToUpper', title: 'To Upper', category: 'transform', description: 'Uppercase a string.', keywords: ['caps', 'upper'], pins: [stringPin('in', 'In'), stringPin('out', 'Out')] },
  { type: 'ToLower', title: 'To Lower', category: 'transform', description: 'Lowercase a string.', keywords: ['case'],          pins: [stringPin('in', 'In'), stringPin('out', 'Out')] },
  { type: 'Trim',    title: 'Trim',     category: 'transform', description: 'Strip leading/trailing whitespace.', keywords: ['strip'], pins: [stringPin('in', 'In'), stringPin('out', 'Out')] },
  { type: 'Concat',  title: 'Concat',   category: 'transform', description: 'Join two strings.',   keywords: ['join'],          pins: [stringPin('in', 'A'), stringPin('in', 'B'), stringPin('out', 'Out')] },

  // LOGIC — booleans + control
  { type: 'IfElse', title: 'If / Else', category: 'logic', description: 'Pick A when cond is true, else B.', keywords: ['cond', 'pick'],
    pins: [boolPin('in', 'Cond'), numberPin('in', 'A'), numberPin('in', 'B'), numberPin('out', 'Out')] },
  { type: 'Equals', title: 'Equals',    category: 'logic', description: 'A == B', keywords: ['eq', 'cmp'],
    pins: [numberPin('in', 'A'), numberPin('in', 'B'), boolPin('out', 'Out')] },
  { type: 'Not',    title: 'Not',       category: 'logic', description: 'Invert a boolean.', keywords: ['invert'],
    pins: [boolPin('in', 'In'), boolPin('out', 'Out')] },

  // IO — terminal sinks / readouts
  { type: 'Output', title: 'Output', category: 'io', description: 'Show the value in a read-only widget.', keywords: ['print', 'sink'],
    pins: [numberPin('in', 'In')],
    widgets: [{ id: 'result', type: 'text', key: 'result', label: 'Result', placeholder: '—', freeFloating: true, disabled: true }] },
  { type: 'Log',    title: 'Log',    category: 'io', description: 'Console.log on every change.', keywords: ['debug', 'print'],
    pins: [stringPin('in', 'In')] },
]

/** Register schemas + mount palette sidebar. Filters out built-ins ($templateInstance, $reroute,
 *  etc) so the panel only shows the user-facing types this demo cares about. */
export function buildPaletteSidebar(editor: XenolithEditor): void {
  for (const s of paletteSchemas) editor.registry.register(s)
  const ourTypes = new Set(paletteSchemas.map((s) => s.type))
  editor.setPaletteSidebar({ side: 'left', filter: (s) => ourTypes.has(s.type) })
}
