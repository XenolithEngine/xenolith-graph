import {
  defineComponent, h, inject, onMounted, onUnmounted, provide, ref, shallowRef, watch,
  type InjectionKey, type ShallowRef,
} from 'vue'
import {
  createEditorBinding,
  EDITOR_EVENT_NAMES,
  type EditorBinding,
  type XenolithProps,
} from '@xenolithengine/adapter-core'
import type { EditorEvents, XenolithEditor } from '@xenolithengine/editor'

export { vueWidget, type WidgetProps } from './widget.js'
export { useNodes, useEdges, useSelection, useViewport, useGraphJSON, useUndoRedo } from './hooks.js'
export {
  XenolithPanel, XenolithButton, XenolithControls, XenolithMiniMap, type PanelPosition,
} from './components.js'

/** `node:click` → `nodeClick` (emit name); bind in templates as `@node-click`. */
export function emitName(event: string): string {
  const [head, tail] = event.split(':')
  return tail ? head! + tail[0]!.toUpperCase() + tail.slice(1) : head!
}

/** Injection key used by `<XenolithGraph>` to expose its editor instance to descendants. Imported
 *  by the composables below; hosts can also use it directly with `provide()`/`inject()` if they
 *  want to mount the editor outside the bundled component. */
export const XenolithEditorKey: InjectionKey<ShallowRef<XenolithEditor | null>> =
  Symbol('XenolithEditor')

/**
 * Get the current editor as a `ShallowRef`. Returns `null` before `onMounted` resolves and during
 * SSR. Must be called inside a `<XenolithGraph>` subtree (the component `provide()`s the ref).
 *
 * @example
 *   const editor = useEditor()
 *   const open = () => editor.value?.openPalette()
 */
export function useEditor(): ShallowRef<XenolithEditor | null> {
  const r = inject(XenolithEditorKey, null)
  if (!r) throw new Error('useEditor() must be used inside <XenolithGraph>')
  return r
}

/** Same as {@link useEditor} but returns a tombstone `shallowRef(null)` instead of throwing when
 *  called outside a `<XenolithGraph>` subtree. Use for optional integrations (a debug panel that
 *  works inside the editor OR standalone), or in plain `defineComponent(() => h(...))` factories
 *  where you can't easily wrap in `<XenolithGraph>` first. The returned ref never resolves to an
 *  editor in that case — keep your code's null-checks honest. */
export function useEditorOrNull(): ShallowRef<XenolithEditor | null> {
  return inject(XenolithEditorKey, shallowRef<XenolithEditor | null>(null))
}

/**
 * Run a one-shot setup callback the moment the editor mounts inside the enclosing `<XenolithGraph>`.
 * Solves the "useEditor() returns null in setup" footgun: the editor instance doesn't exist yet
 * when a child component's `setup()` runs, so `editor.value!.commands.register(...)` would crash
 * silently. `useEditorReady(cb)` defers the callback until the ref becomes non-null. Returns the
 * editor's `editor` ref so the caller can keep using it after setup.
 *
 * Pass a returned cleanup function from `cb` if you need teardown on component unmount (typical
 * for `commands.register` / `contextMenu.register*` unsubscribes).
 *
 * @example
 *   useEditorReady((editor) => {
 *     const off = editor.commands.register({ id: 'demo.x', hotkey: 'Mod+K', execute: () => {} })
 *     return off  // auto-cleanup on unmount
 *   })
 */
export function useEditorReady(
  cb: (editor: XenolithEditor) => void | (() => void),
): ShallowRef<XenolithEditor | null> {
  const editor = useEditor()
  let cleanup: (() => void) | undefined
  let fired = false
  const stop = watch(editor, (e) => {
    if (!e || fired) return
    fired = true
    const c = cb(e)
    if (typeof c === 'function') cleanup = c
    stop()
  }, { immediate: true })
  onUnmounted(() => { cleanup?.() })
  return editor
}

/**
 * Subscribe to a single editor event for the lifetime of the calling component. Auto-rebound on
 * editor swap; cleaned up on unmount.
 *
 * @example
 *   useEditorEvent('node:removing', (p) => { if (p.nodeId === locked) p.cancel() })
 */
export function useEditorEvent<E extends keyof EditorEvents>(
  event: E,
  handler: (payload: EditorEvents[E]) => void,
): void {
  const editor = useEditor()
  let off: (() => void) | null = null
  const handlerRef = { current: handler }
  watch(editor, (e) => {
    off?.()
    off = e ? e.on(event, (p) => handlerRef.current(p)) : null
  }, { immediate: true })
  onUnmounted(() => { off?.(); off = null })
}

/**
 * `<XenolithGraph>` — Vue 3 component. Props: `theme`, `graph`, `zoomBounds`, `minimap`,
 * `disable-grid`, `snap`, `fit-on-load`. Editor events are emitted as `@node-click`,
 * `@selection-changed`, `@edge-connected`, … Editor is WebGL/client-only.
 *
 * Also provides the editor instance via `provide(XenolithEditorKey, ref)` so descendant components
 * can call `useEditor()` / `useEditorEvent()`.
 */
export const XenolithGraph = defineComponent({
  name: 'XenolithGraph',
  props: {
    theme: { type: null, default: undefined },
    graph: { type: null, default: undefined },
    zoomBounds: { type: null, default: undefined },
    minimap: { type: null, default: undefined },
    disableGrid: { type: Boolean, default: undefined },
    snap: { type: Number, default: undefined },
    resizeToWindow: { type: Boolean, default: undefined },
    fitOnLoad: { type: Boolean, default: undefined },
  },
  // `ready` fires once with the editor instance the moment it's mounted — Vue equivalent of
  // React's `onReady` prop. Use it for one-shot imperative setup (register schemas, loadJSON,
  // fitView) without needing a child component / composable.
  emits: ['ready' as const, ...EDITOR_EVENT_NAMES.map(emitName)],
  setup(props, { emit, expose, slots }) {
    const host = ref<HTMLDivElement | null>(null)
    const editorRef: ShallowRef<XenolithEditor | null> = shallowRef(null)
    provide(XenolithEditorKey, editorRef)
    let binding: EditorBinding | null = null
    const offs: Array<() => void> = []

    const pick = (): XenolithProps => {
      const p: XenolithProps = {}
      if (props.theme !== undefined) p.theme = props.theme as XenolithProps['theme']
      if (props.graph !== undefined) p.graph = props.graph
      if (props.zoomBounds !== undefined) p.zoomBounds = props.zoomBounds as XenolithProps['zoomBounds']
      if (props.minimap !== undefined) p.minimap = props.minimap as XenolithProps['minimap']
      if (props.disableGrid !== undefined) p.disableGrid = props.disableGrid
      if (props.snap !== undefined) p.snap = props.snap
      if (props.resizeToWindow !== undefined) p.resizeToWindow = props.resizeToWindow
      if (props.fitOnLoad !== undefined) p.fitOnLoad = props.fitOnLoad
      return p
    }

    onMounted(async () => {
      if (!host.value) return
      const b = await createEditorBinding(host.value, pick())
      binding = b
      editorRef.value = b.editor
      for (const ev of EDITOR_EVENT_NAMES) {
        offs.push(b.on(ev, (payload) => emit(emitName(ev) as never, payload as never)))
      }
      emit('ready', b.editor)
    })

    watch(
      [() => props.theme, () => props.graph, () => props.zoomBounds, () => props.minimap, () => props.disableGrid, () => props.snap, () => props.fitOnLoad],
      () => binding?.setProps(pick()),
    )

    onUnmounted(() => {
      for (const off of offs) off()
      binding?.destroy()
      binding = null
      editorRef.value = null
    })

    expose({ get editor() { return binding?.editor ?? null } })

    // Render the host div + any default-slot children (XenolithMiniMap / XenolithControls /
    // <XenolithPanel> etc). Without this, slot content was silently dropped — children declared
    // in the consumer's template were never mounted.
    return () => h('div', { ref: host, class: 'xenolith-graph' }, slots['default']?.())
  },
})
