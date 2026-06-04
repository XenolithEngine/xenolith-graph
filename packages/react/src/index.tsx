'use client'
// `'use client'` is REQUIRED — Xenolith is WebGL/PIXI; cannot run as a React Server Component. Without
// this directive, Next.js App Router fails at the first import. Same applies to react-widget.tsx,
// hooks.ts, components.tsx, context.ts.
import { useEffect, useRef, useState, type CSSProperties, type ReactElement, type ReactNode, type Ref } from 'react'
import { createEditorBinding, type EditorBinding, type XenolithProps } from '@xenolithengine/graph-adapter-core'
import type { EditorEvents, XenolithEditor } from '@xenolithengine/graph-editor'
import { EVENT_PROP, type EventCallbacks } from './events-map.js'
import { XenolithContext } from './context.js'

export type { EventCallbacks } from './events-map.js'
export { EVENT_PROP } from './events-map.js'
export { XenolithContext, useXenolithEditor, useEditor } from './context.js'
export {
  XenolithPanel, XenolithButton, XenolithControls, XenolithMiniMap,
  type PanelPosition, type XenolithPanelProps, type XenolithButtonProps,
  type XenolithControlsProps, type XenolithMiniMapProps,
} from './components.js'
export { useNodes, useEdges, useSelection, useViewport, useGraphJSON, useEditorEvent, useUndoRedo } from './hooks.js'
export { reactWidget, type WidgetProps } from './react-widget.js'

export interface XenolithGraphProps extends XenolithProps, EventCallbacks {
  className?: string
  style?: CSSProperties
  /** Called once the editor is mounted and ready. */
  onReady?: (editor: XenolithEditor) => void
  /** Forwarded to the host div, e.g. to grab the editor imperatively. */
  containerRef?: Ref<HTMLDivElement>
  /** In-editor overlay UI: `<XenolithPanel>`, `<XenolithControls>`, or any component using the hooks. */
  children?: ReactNode
}

const EDITOR_KEYS = ['theme', 'graph', 'zoomBounds', 'minimap', 'disableGrid', 'snap', 'resizeToWindow', 'fitOnLoad', 'isValidConnection'] as const

// Module-level promise chain that serializes all editor mount/unmount lifecycle operations.
// React 19 StrictMode in dev runs every useEffect mount → cleanup → mount. With async PIXI init
// in the middle that races two apps onto the same host. Routing both init and teardown through
// this single chain guarantees ordering across the whole lifecycle.
let pendingChain: Promise<void> = Promise.resolve()

function pickEditorProps(props: XenolithGraphProps): XenolithProps {
  const out: XenolithProps = {}
  for (const k of EDITOR_KEYS) if (props[k] !== undefined) (out as Record<string, unknown>)[k] = props[k]
  return out
}

/**
 * `<XenolithGraph>` — idiomatic React wrapper. Pass editor props (`theme`, `graph`, `minimap`, …)
 * and `on*` event callbacks; the component mounts the editor into its div, keeps props in sync, and
 * tears it down on unmount. The editor is WebGL/client-only — render it only in the browser.
 */
export function XenolithGraph(props: XenolithGraphProps): ReactElement {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const bindingRef = useRef<EditorBinding | null>(null)
  // Editor lives in state so overlay children (panels/controls/hooks) render once it's ready.
  const [editor, setEditor] = useState<XenolithEditor | null>(null)
  // Latest callbacks, read by the stable subscriptions so changing a handler never re-subscribes.
  const cbRef = useRef(props)
  cbRef.current = props

  // Mount once. Subscriptions read the live cbRef, so they survive prop changes.
  // React 19 StrictMode runs every useEffect twice in dev (mount → cleanup → mount). Because
  // `createEditorBinding` is async (PIXI Application.init is async), a naive implementation
  // starts a second editor before the first one finishes, leaving two PIXI apps registering
  // global filter extensions on the same canvas → BindGroup state corrupts, first frame
  // renders empty. The fix: serialize mount/destroy through a single promise chain on a ref —
  // every cleanup waits for the in-flight init to settle, every re-mount waits for the
  // previous binding to be fully torn down before starting its own init.
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let disposed = false
    const offs: Array<() => void> = []
    type Cell = { binding: EditorBinding | null }
    const cell: Cell = { binding: null }

    // Wait for any pending teardown from a prior mount cycle (StrictMode) to finish before we
    // touch the host. Chains all serializing through a shared module-level promise.
    pendingChain = pendingChain
      .catch(() => {})
      .then(async () => {
        if (disposed) return
        const binding = await createEditorBinding(host, pickEditorProps(cbRef.current))
        if (disposed) { binding.destroy(); return }
        cell.binding = binding
        bindingRef.current = binding
        cbRef.current.onReady?.(binding.editor)
        setEditor(binding.editor)
        for (const [event, prop] of Object.entries(EVENT_PROP) as [keyof EditorEvents, keyof EventCallbacks][]) {
          offs.push(binding.on(event, (payload) => {
            ;(cbRef.current[prop] as ((p: unknown) => void) | undefined)?.(payload)
          }))
        }
      })

    return () => {
      disposed = true
      for (const off of offs) off()
      // Push teardown onto the same chain — guarantees we don't destroy() before the init
      // promise has resolved (and thus before there's a binding to tear down), and any
      // subsequent mount waits for this destroy() to finish before starting fresh.
      pendingChain = pendingChain
        .catch(() => {})
        .then(() => {
          if (cell.binding) {
            cell.binding.destroy()
            cell.binding = null
          }
          if (bindingRef.current === cell.binding) bindingRef.current = null
        })
      setEditor(null)
    }
  }, [])

  // Sync editor props on every render (reference-diffed inside the binding).
  useEffect(() => { bindingRef.current?.setProps(pickEditorProps(props)) })

  return (
    <div
      ref={(el) => {
        hostRef.current = el
        if (typeof props.containerRef === 'function') props.containerRef(el)
        else if (props.containerRef) (props.containerRef as { current: HTMLDivElement | null }).current = el
      }}
      className={props.className}
      style={props.style}
    >
      <XenolithContext.Provider value={editor}>
        {/* Render in-editor children ONLY after the editor has finished mounting. Holding
         *  them back means `useEditor()` (the strict hook) can rely on a non-null editor
         *  for its entire lifecycle — no race between subscribe and mount. Components that
         *  must paint a loading/empty state live OUTSIDE <XenolithGraph>. */}
        {editor ? props.children : null}
      </XenolithContext.Provider>
    </div>
  )
}

/** Lower-level hook: mount a XenolithGraph editor into `hostRef` and return the binding ref. */
export function useXenolith(
  hostRef: Ref<HTMLDivElement>,
  props: XenolithProps = {},
): { editorRef: { current: XenolithEditor | null } } {
  const editorRef = useRef<XenolithEditor | null>(null)
  const propsRef = useRef(props)
  propsRef.current = props
  const bindingRef = useRef<EditorBinding | null>(null)

  useEffect(() => {
    const el = (hostRef as { current: HTMLDivElement | null }).current
    if (!el) return
    let disposed = false
    void createEditorBinding(el, propsRef.current).then((binding) => {
      if (disposed) { binding.destroy(); return }
      bindingRef.current = binding
      editorRef.current = binding.editor
    })
    return () => { disposed = true; bindingRef.current?.destroy(); bindingRef.current = null; editorRef.current = null }
  }, [])

  useEffect(() => { bindingRef.current?.setProps(props) })

  return { editorRef }
}
