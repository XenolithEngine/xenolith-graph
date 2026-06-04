import { XenolithEditor, type XenolithEditorOptions, type EditorEvents } from '@xenolith/editor'
import { applyProps, type XenolithProps } from './props.js'

export type { XenolithProps } from './props.js'
export { applyProps, type EditorLike } from './props.js'

/** The canonical public editor event names. Every adapter derives its idiomatic surface from this
 *  single list (React `onNodeClick`, Vue `@node-click`, DOM `node:click`, …). Includes the four
 *  preventable `-ing` variants — adapter users can cancel them from idiomatic adapter code. */
export const EDITOR_EVENT_NAMES = [
  'node:added', 'node:removed', 'node:removing', 'node:moved', 'node:click', 'node:clicking', 'node:drop',
  'edge:connected', 'edge:disconnected', 'edge:connecting', 'edge:disconnecting',
  'selection:changed', 'viewport:changed',
  'widget:changed', 'widget:action',
  'graph:loaded', 'history:changed', 'dive:changed',
  'sidebar:opened', 'sidebar:closed',
  'livemode:changed',
  'node:contextmenu', 'edge:contextmenu', 'canvas:contextmenu',
] as const satisfies ReadonlyArray<keyof EditorEvents>

/** Compile-time exhaustiveness gate — if EditorEvents grows a new key and EDITOR_EVENT_NAMES forgets
 *  it, this alias resolves to a tuple complaint instead of `true`, failing `tsc`. Cheaper than a
 *  test and runs on every build.
 *
 *  CI also has `events-coverage.test.ts` for a runtime check that survives a tsc skip. */
type _MissingEventNames = Exclude<keyof EditorEvents, (typeof EDITOR_EVENT_NAMES)[number]>
type _AllEventsCovered = [_MissingEventNames] extends [never]
  ? true
  : ['ERROR — EDITOR_EVENT_NAMES is missing these events:', _MissingEventNames]
const _eventsCovered: _AllEventsCovered = true
void _eventsCovered

export interface EditorBinding {
  readonly editor: XenolithEditor
  /** Subscribe to a public editor event. Returns an unsubscribe fn. */
  on<E extends keyof EditorEvents>(event: E, handler: (payload: EditorEvents[E]) => void): () => void
  /** Apply a new props object; only changed (by reference) props touch the editor. */
  setProps(next: XenolithProps): void
  /** Tear down the editor and release its WebGL context. */
  destroy(): void
}

function toInitOptions(props: XenolithProps): XenolithEditorOptions {
  const opts: XenolithEditorOptions = {}
  if (props.theme !== undefined) opts.theme = props.theme
  if (props.zoomBounds !== undefined) opts.zoomBounds = props.zoomBounds
  if (props.minimap !== undefined) opts.minimap = props.minimap
  if (props.disableGrid !== undefined) opts.disableGrid = props.disableGrid
  if (props.snap !== undefined) opts.snap = props.snap
  if (props.resizeToWindow !== undefined) opts.resizeToWindow = props.resizeToWindow
  if (props.isValidConnection !== undefined) opts.isValidConnection = props.isValidConnection
  return opts
}

/** Mount a XenolithGraph editor into `target` and wrap it in a framework-agnostic binding. This is
 *  the single foundation every adapter (Web Component, React, Vue, Svelte, Solid) builds on:
 *  props in (reactively, via {@link EditorBinding.setProps}), events out (via `on`). */
export async function createEditorBinding(
  target: string | HTMLElement,
  props: XenolithProps = {},
): Promise<EditorBinding> {
  const editor = await XenolithEditor.init(target, toInitOptions(props))
  let current: XenolithProps = props

  if (props.graph != null) {
    editor.loadJSON(props.graph)
    if (props.fitOnLoad) editor.fitView()
  }

  return {
    editor,
    on: (event, handler) => editor.on(event, handler),
    setProps(next) { applyProps(editor, current, next); current = next },
    destroy() { editor.destroy() },
  }
}
