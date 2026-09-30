import { computed, onUnmounted, readonly, shallowRef, watch, type DeepReadonly, type ShallowRef } from 'vue'

type ReadonlyRef<T> = DeepReadonly<ShallowRef<T>>
import type {
  EditorEvents, XenolithEditor, ViewportState, Node, Edge, NodeId, XenolithGraphV1,
  GraphChanges, GraphMirror,
} from '@xenolithengine/graph-editor'
import { reduceGraphChanges, snapshotGraph } from '@xenolithengine/graph-editor'
import { diffEdgesToChanges, diffNodesToChanges } from '@xenolithengine/graph-adapter-core'
import { useEditor } from './index.js'

/** Build a reactive store hook that recomputes its value on every event in `events`. Mirrors
 *  React's `makeEditorStoreHook` — caches by editor identity, coalesces a burst of events into
 *  one microtask-batched recompute so a 1000-node transaction costs ONE rebuild, not 1000. */
function makeStoreHook<T>(
  events: ReadonlyArray<keyof EditorEvents>,
  compute: (editor: XenolithEditor) => T,
  fallback: T,
): () => ReadonlyRef<T> {
  return function useEditorStore(): ReadonlyRef<T> {
    const editor = useEditor()
    const r = shallowRef<T>(fallback)

    let scheduled = false
    let offs: Array<() => void> = []

    const apply = (e: XenolithEditor | null): void => {
      for (const off of offs) off()
      offs = []
      if (!e) { r.value = fallback; return }
      r.value = compute(e)
      const update = (): void => {
        if (scheduled) return
        scheduled = true
        queueMicrotask(() => {
          scheduled = false
          if (editor.value === e) r.value = compute(e)
        })
      }
      offs = events.map((ev) => e.on(ev, update))
    }

    watch(editor, apply, { immediate: true })
    onUnmounted(() => { for (const off of offs) off(); offs = [] })

    return readonly(r) as ReadonlyRef<T>
  }
}

const NODE_EVENTS  = ['node:added', 'node:removed', 'node:moved', 'graph:loaded', 'history:changed'] as const
const EDGE_EVENTS  = ['edge:connected', 'edge:disconnected', 'node:removed', 'graph:loaded', 'history:changed'] as const
const GRAPH_EVENTS = [
  'node:added', 'node:removed', 'node:moved', 'edge:connected', 'edge:disconnected',
  'widget:changed', 'graph:loaded', 'history:changed',
] as const

const EMPTY_NODES: readonly Node[] = Object.freeze([])
const EMPTY_EDGES: readonly Edge[] = Object.freeze([])
const EMPTY_SELECTION: readonly NodeId[] = Object.freeze([])
const DEFAULT_VIEWPORT: ViewportState = Object.freeze({ x: 0, y: 0, zoom: 1 })

/** Live array of nodes; re-renders on add/remove/move, load, and undo/redo. */
export const useNodes = makeStoreHook<readonly Node[]>(
  NODE_EVENTS,
  (e) => Object.freeze(Array.from(e.graphNodes()) as Node[]) as readonly Node[],
  EMPTY_NODES,
)

/** Live array of edges; re-renders on connect/disconnect, node removal, load, and undo/redo. */
export const useEdges = makeStoreHook<readonly Edge[]>(
  EDGE_EVENTS,
  (e) => Object.freeze(Array.from(e.graphEdges()) as Edge[]) as readonly Edge[],
  EMPTY_EDGES,
)

/** Live selection (node ids); re-renders on selection change. */
export const useSelection = makeStoreHook<readonly NodeId[]>(
  ['selection:changed'] as const,
  (e) => Object.freeze([...e.selection.ids()]) as readonly NodeId[],
  EMPTY_SELECTION,
)

/** Live viewport (`x`, `y`, `zoom`); re-renders on pan / zoom. */
export const useViewport = makeStoreHook<ViewportState>(
  ['viewport:changed'] as const,
  (e) => e.view.state,
  DEFAULT_VIEWPORT,
)

/** Live serialized graph (xenolith.v1); recomputes on any graph mutation, load, and undo/redo. */
export const useGraphJSON = makeStoreHook<XenolithGraphV1 | null>(
  GRAPH_EVENTS,
  (e) => e.getGraphReadonly(),
  null as XenolithGraphV1 | null,
)

/** Live `{ canUndo, canRedo, undo, redo }` — wires `editor.history.*` to reactive refs so a Vue
 *  toolbar button can `:disabled="!canUndo.value"` and call `undo()` on click. */
export function useUndoRedo(): {
  canUndo: ReadonlyRef<boolean>
  canRedo: ReadonlyRef<boolean>
  undo: () => boolean
  redo: () => boolean
} {
  const editor = useEditor()
  const canUndo = shallowRef(false)
  const canRedo = shallowRef(false)
  let off: (() => void) | null = null

  watch(editor, (e) => {
    off?.(); off = null
    if (!e) { canUndo.value = false; canRedo.value = false; return }
    const sync = (): void => { canUndo.value = e.history.canUndo; canRedo.value = e.history.canRedo }
    sync()
    off = e.on('history:changed', sync)
  }, { immediate: true })
  onUnmounted(() => { off?.(); off = null })

  return {
    canUndo: readonly(canUndo) as ReadonlyRef<boolean>,
    canRedo: readonly(canRedo) as ReadonlyRef<boolean>,
    undo: () => editor.value?.history.undo() ?? false,
    redo: () => editor.value?.history.redo() ?? false,
  }
}

/**
 * The controlled-state triple (E5 / ADR 0006), Vue edition — 1:1 port of React's
 * `useNodesState`: a local mirror of the graph folded from commit-time `graph:changed` arrays,
 * plus the write side. The Pinia/Vuex-migrant pattern: keep the graph in YOUR store shape,
 * mutate through the editor as one undo step, let the echo converge the mirror.
 *
 * Like React's version, positions arrive when a drag COMMITS, never per frame — the component
 * tree stays still while the renderer owns the drag.
 *
 * - `nodes` / `edges` — readonly refs of plain records; new references only when a committed
 *   change landed (mirror folds via `reduceGraphChanges`).
 * - `applyChanges(changes)` — forward an array (yours, or an echo) to `editor.applyChanges`;
 *   idempotent for echoes.
 * - `setNodes(next)` — one-shot optimistic diff (adapter-core `diffNodesToChanges`): pass the
 *   next nodes array (or an updater receiving the LIVE mirror); adds/removes/position/state
 *   deltas land on the editor as ONE undo step, and the `graph:changed` echo updates the
 *   mirror. Position diffs by coordinates, state by reference.
 *
 * @example
 *   const { nodes, setNodes } = useNodesState()
 *   // in a template: v-for="n in nodes" — and a button:
 *   // addNode() => setNodes(prev => [...prev, { id: 'x', ... }])
 */
export function useNodesState(): {
  nodes: ReadonlyRef<readonly Node[]>
  edges: ReadonlyRef<readonly Edge[]>
  applyChanges: (changes: GraphChanges) => void
  setNodes: (next: readonly Node[] | ((prev: readonly Node[]) => readonly Node[])) => void
  setEdges: (next: readonly Edge[] | ((prev: readonly Edge[]) => readonly Edge[])) => void
} {
  const editor = useEditor()
  const mirror = shallowRef<GraphMirror>({ nodes: [], edges: [] })
  let off: (() => void) | null = null

  watch(editor, (e) => {
    off?.(); off = null
    if (!e) { mirror.value = { nodes: [], edges: [] }; return }
    mirror.value = snapshotGraph(e.graphNodes(), e.graphEdges())
    off = e.on('graph:changed', ({ changes }) => {
      mirror.value = reduceGraphChanges(mirror.value, changes)
    })
  }, { immediate: true })
  onUnmounted(() => { off?.(); off = null })

  const applyChanges = (changes: GraphChanges): void => { editor.value?.applyChanges(changes) }

  const setNodes = (next: readonly Node[] | ((prev: readonly Node[]) => readonly Node[])): void => {
    const e = editor.value
    if (!e) return
    const live = snapshotGraph(e.graphNodes(), e.graphEdges())
    const nextNodes = typeof next === 'function' ? next(live.nodes) : next
    const changes = diffNodesToChanges(live, nextNodes)
    if (changes.nodes.length > 0) e.applyChanges(changes)
  }

  const setEdges = (next: readonly Edge[] | ((prev: readonly Edge[]) => readonly Edge[])): void => {
    const e = editor.value
    if (!e) return
    const live = snapshotGraph(e.graphNodes(), e.graphEdges())
    const nextEdges = typeof next === 'function' ? next(live.edges) : next
    const changes = diffEdgesToChanges(live, nextEdges)
    if (changes.edges.length > 0) e.applyChanges(changes)
  }

  // computed so consumers re-render only when the mirror actually moved; the cast matches the
  // package-wide ReadonlyRef surface the other store hooks already expose.
  const nodes = computed(() => mirror.value.nodes) as unknown as ReadonlyRef<readonly Node[]>
  const edges = computed(() => mirror.value.edges) as unknown as ReadonlyRef<readonly Edge[]>

  return { nodes, edges, applyChanges, setNodes, setEdges }
}
