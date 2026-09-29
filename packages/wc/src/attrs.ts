import { EDITOR_EVENT_NAMES, type XenolithProps } from '@xenolithengine/graph-adapter-core'

/** A boolean HTML attribute is true when present unless its value is the string "false". */
function boolAttr(el: HTMLElement, name: string): boolean | undefined {
  if (!el.hasAttribute(name)) return undefined
  return el.getAttribute(name) !== 'false'
}

/** A numeric attribute; `undefined` when absent or unparsable. */
function numAttr(el: HTMLElement, name: string): number | undefined {
  const raw = el.getAttribute(name)
  if (raw == null) return undefined
  const v = Number(raw)
  return Number.isFinite(v) ? v : undefined
}

/** Parse the declarative (string) attributes of `<xenolith-graph>` into props — the full
 *  attribute dictionary: `minimap`, `fit-on-load`, `disable-grid`, `resize-to-window` (booleans)
 *  and `snap` (number). Complex props (`theme` object, `graph` data, `zoomBounds`,
 *  `isValidConnection` fn) arrive via JS properties, not attributes. */
export function readAttributes(el: HTMLElement): Partial<XenolithProps> {
  const props: Partial<XenolithProps> = {}
  const minimap = boolAttr(el, 'minimap')
  if (minimap !== undefined) props.minimap = minimap
  const fit = boolAttr(el, 'fit-on-load')
  if (fit !== undefined) props.fitOnLoad = fit
  const grid = boolAttr(el, 'disable-grid')
  if (grid !== undefined) props.disableGrid = grid
  const resize = boolAttr(el, 'resize-to-window')
  if (resize !== undefined) props.resizeToWindow = resize
  const snap = numAttr(el, 'snap')
  if (snap !== undefined) props.snap = snap
  return props
}

/** Every public editor event is re-dispatched off the element as a same-named CustomEvent whose
 *  `detail` is the event payload — DERIVED from `EDITOR_EVENT_NAMES` (adapter-core locks it to
 *  `EditorEvents` at compile time), never hand-listed. The previous hand-list had silently lost
 *  12 of the 25 events, including every preventable `-ing` veto channel. */
export const FORWARDED_EVENTS = EDITOR_EVENT_NAMES
