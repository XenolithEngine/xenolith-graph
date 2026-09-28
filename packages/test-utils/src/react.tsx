/**
 * React-side test kit: mount the REAL `<XenolithGraph>` adapter (real editor, real command
 * bus, real React lifecycle) under jsdom. `mockPixi()` is installed automatically and undone
 * on unmount; pass your own `mockPixi()` first for `flushFrames()` control.
 *
 * Uses `react-dom/client` + React's `act()` directly — no @testing-library dependency at
 * runtime. Bring your own renderer wrappers when you need them.
 */

import { StrictMode, act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { XenolithGraph, type XenolithGraphProps } from '@xenolithengine/graph-react'
import type { XenolithEditor } from '@xenolithengine/graph-editor'
import { mockPixi, activeMock } from './index.js'

export type { XenolithGraphProps }

/** Handle over a real React-mounted editor. */
export interface ReactRenderHandle {
  /** The editor reported by `<XenolithGraph onReady>` — ready to drive. */
  editor: XenolithEditor
  container: HTMLElement
  /** Unmount the React root, detach the container, undo the auto-installed mock. Idempotent. */
  unmount(): void
}

export interface RenderXenolithOptions {
  /** Wrap in `<React.StrictMode>` to exercise double-mount behaviour. Default false. */
  strictMode?: boolean
}

/**
 * Mount a real `<XenolithGraph>` with `props` and resolve once `onReady` fired. The component
 * renders into a detached-from-framework `div` appended to `document.body`.
 */
export async function renderXenolithToDOM(
  props: XenolithGraphProps = {},
  options: RenderXenolithOptions = {},
): Promise<ReactRenderHandle> {
  const ownsMock = !activeMock
  const mock = activeMock ?? mockPixi()
  const container = document.createElement('div')
  document.body.appendChild(container)
  let root: Root | null = createRoot(container)
  let editor: XenolithEditor | undefined

  const element = (
    <XenolithGraph
      {...props}
      onReady={(ed) => {
        editor = ed
        props.onReady?.(ed)
      }}
    />
  )

  const fail = (err: unknown): never => {
    try { root?.unmount() } catch { /* best effort */ }
    root = null
    container.remove()
    if (ownsMock) mock.restore()
    throw err
  }

  try {
    await act(async () => {
      root!.render(options.strictMode ? <StrictMode>{element}</StrictMode> : element)
    })
  } catch (err) {
    fail(err)
  }

  // The adapter's boot is async (createEditorBinding); keep flushing act queues until onReady
  // fires rather than assuming one await is enough — a prior test's unmount can delay it.
  const deadline = Date.now() + 4000
  while (editor === undefined && Date.now() < deadline) {
    await act(async () => { await Promise.resolve() })
  }
  if (editor === undefined) {
    fail(new Error('renderXenolithToDOM: onReady never fired within 4s — editor boot failed under jsdom'))
  }

  const booted = editor as XenolithEditor
  let unmounted = false
  return {
    editor: booted,
    container,
    unmount(): void {
      if (unmounted) return
      unmounted = true
      // The adapter owns the editor lifecycle: root.unmount() → effect cleanup →
      // binding.destroy() → editor.destroy(). Destroying the editor here as well would
      // double-destroy (the second pass crashes on a nulled PIXI Application).
      act(() => { root?.unmount() })
      root = null
      container.remove()
      if (ownsMock) mock.restore()
    },
  }
}
