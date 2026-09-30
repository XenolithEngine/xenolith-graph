import { createEffect, onCleanup } from 'solid-js'
import {
  createEditorBinding,
  EDITOR_EVENT_NAMES,
  type EditorBinding,
  type XenolithProps,
} from '@xenolithengine/graph-adapter-core'
import { solidEventName } from './event-name.js'

export { createXenolithStores, type XenolithStores, type XenolithNodesState } from './stores.js'
export { solidEventName }

// Typing for `use:xenolith={props}` — the documented way Solid libraries type their directives.
// Importing this module teaches the language tools the directive's value type project-wide.
// eslint-disable-next-line @typescript-eslint/no-namespace -- module augmentation is Solid's documented directive-typing pattern
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- JSX lives in a namespace by design
  namespace JSX {
    interface Directives {
      xenolith: XenolithProps
    }
  }
}

/**
 * Solid directive: `<div use:xenolith={props} on:ready on:node-click on:selection-changed … />`.
 * Mounts the editor into the element, syncs props reactively (the bound expression is tracked),
 * dispatches `ready` (detail: the live `XenolithEditor`) once mounted, and re-dispatches every
 * editor event off the element as a kebab CustomEvent (`node-click`, `selection-changed`, …)
 * with the payload in `event.detail`. The name has one colon (`on:node-click`) so Vite's
 * esbuild dep scan can parse the JSX — `on:node:click` cannot. Client-only (WebGL). Wire
 * reactive stores from `on:ready`: `stores.setEditor(e.detail)` — see `createXenolithStores`.
 *
 * Solid calls a directive as `xenolith(el, accessor)`, where `accessor()` is the bound value.
 */
export function xenolith(el: HTMLElement, accessor: () => XenolithProps | undefined): void {
  let binding: EditorBinding | null = null
  let destroyed = false
  const offs: Array<() => void> = []

  void createEditorBinding(el, accessor() ?? {}).then((b) => {
    if (destroyed) { b.destroy(); return }
    binding = b
    for (const ev of EDITOR_EVENT_NAMES) {
      offs.push(b.on(ev, (detail) => el.dispatchEvent(new CustomEvent(solidEventName(ev), { detail }))))
    }
    b.setProps(accessor() ?? {})
    el.dispatchEvent(new CustomEvent('ready', { detail: b.editor }))
  })

  // Re-run whenever the bound props signal changes.
  createEffect(() => { const p = accessor(); if (p) binding?.setProps(p) })

  onCleanup(() => { destroyed = true; for (const off of offs) off(); binding?.destroy(); binding = null })
}

/** Imperative primitive for hosts that prefer it over the directive. Returns the binding promise;
 *  the caller owns teardown (call `destroy()` from `onCleanup`). */
export function createXenolithGraph(el: HTMLElement, props: XenolithProps = {}): Promise<EditorBinding> {
  return createEditorBinding(el, props)
}
