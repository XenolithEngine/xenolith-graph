import type { ActionReturn } from 'svelte/action'
import {
  createEditorBinding,
  EDITOR_EVENT_NAMES,
  type EditorBinding,
  type XenolithProps,
} from '@xenolithengine/graph-adapter-core'
import type { EditorEvents, XenolithEditor } from '@xenolithengine/graph-editor'

export { createXenolithStores, type XenolithStores, type XenolithNodesState } from './stores.js'

/** Imperative primitive for Svelte hosts that need direct editor access (registering schemas,
 *  opening the sidebar, etc.) — the `use:xenolith` action keeps the binding private. The caller
 *  owns teardown (call `destroy()` from `onDestroy`). */
export function createXenolithGraph(el: HTMLElement, props: XenolithProps = {}): Promise<EditorBinding> {
  return createEditorBinding(el, props)
}

/** Editor `node:click` → DOM event `node-click` (Svelte's `on:` directive can't bind colon names). */
export function svelteEventName(event: string): string {
  return event.replace(':', '-')
}

/** kebab event name at the TYPE level — the compile-time mirror of {@link svelteEventName}. */
type KebabEvent<E extends keyof EditorEvents> =
  E extends `${infer H}:${infer T}` ? `${H}-${T}` : E

/** Typed `on:*` attributes the `use:xenolith` action puts on its host element. Deriving from
 *  `EditorEvents` (locked to EDITOR_EVENT_NAMES by adapter-core's compile-time gate) is what
 *  makes `on:node-click={(e) => e.detail.nodeId}` typecheck in svelte-check — a hand-written
 *  attribute list would drift. */
export type XenolithActionAttributes = {
  /** Fires once when the editor has mounted; `event.detail` is the live `XenolithEditor`. */
  'on:ready': (event: CustomEvent<XenolithEditor>) => void
} & {
  [E in keyof EditorEvents as `on:${KebabEvent<E>}`]: (event: CustomEvent<EditorEvents[E]>) => void
}

export type XenolithActionReturn = ActionReturn<XenolithProps, XenolithActionAttributes>

/**
 * Svelte action: `<div use:xenolith={props} on:ready on:node-click on:selection-changed … />`.
 * Mounts the editor into the node, syncs props on change, dispatches `ready` (detail: the
 * `XenolithEditor`) once mounted, and re-dispatches every editor event off the node as a
 * kebab-named CustomEvent (`node-click`, `edge-connected`, …) with its typed payload as
 * `event.detail`. Editor is WebGL/client-only. Wire reactive stores from `on:ready`:
 * `stores.editor.set(e.detail)` — see `createXenolithStores`.
 */
export function xenolith(node: HTMLElement, props: XenolithProps = {}): XenolithActionReturn {
  let binding: EditorBinding | null = null
  let destroyed = false
  const offs: Array<() => void> = []

  void createEditorBinding(node, props).then((b) => {
    if (destroyed) { b.destroy(); return }
    binding = b
    for (const ev of EDITOR_EVENT_NAMES) {
      offs.push(b.on(ev, (detail) => node.dispatchEvent(new CustomEvent(svelteEventName(ev), { detail }))))
    }
    node.dispatchEvent(new CustomEvent('ready', { detail: b.editor }))
  })

  return {
    update(next) { binding?.setProps(next) },
    destroy() { destroyed = true; for (const off of offs) off(); binding?.destroy(); binding = null },
  }
}
