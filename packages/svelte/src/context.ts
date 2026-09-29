import { getContext, setContext } from 'svelte'
import { writable, type Writable } from 'svelte/store'
import type { XenolithEditor } from '@xenolithengine/graph-editor'

/** Svelte context key carrying the live editor (as a writable store) to the in-editor panel
 *  components. Exported for advanced hosts that want to `getContext` manually. */
export const XenolithEditorContextKey = Symbol('xenolith-editor')

/**
 * Provide the editor for all {@link getXenolithEditorContext} readers below this component —
 * call ONCE during the host component's initialization (top of `<script>`, NOT inside
 * `on:ready`: Svelte context must be set synchronously during component init). Returns the
 * writable store the host feeds the editor into when the action's `ready` event fires.
 *
 * @example
 *   <script>
 *     const editor = createXenolithEditorContext()
 *   </script>
 *   <div use:xenolith={props} on:ready={(e) => editor.set(e.detail)}></div>
 *   <XenolithPanel position="top-right">…</XenolithPanel>
 */
export function createXenolithEditorContext(): Writable<XenolithEditor | null> {
  const store = writable<XenolithEditor | null>(null)
  setContext(XenolithEditorContextKey, store)
  return store
}

/** The editor store from the nearest {@link createXenolithEditorContext} provider. Outside a
 *  provider (or before ready) it tombstones to a never-resolving store — panels render nothing,
 *  no throws. Used by the panel components. */
export function getXenolithEditorContext(): Writable<XenolithEditor | null> {
  return getContext<Writable<XenolithEditor | null>>(XenolithEditorContextKey) ?? writable(null)
}
