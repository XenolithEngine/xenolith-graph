import { createEffect, createMemo, createSignal, onCleanup, untrack, type Accessor } from 'solid-js'
import type {
  EditorEvents, XenolithEditor, ViewportState, Node, Edge, NodeId, XenolithGraphV1,
  GraphChanges, GraphMirror,
} from '@xenolithengine/graph-editor'
import { reduceGraphChanges, snapshotGraph } from '@xenolithengine/graph-editor'
import { diffEdgesToChanges, diffNodesToChanges } from '@xenolithengine/graph-adapter-core'

// Solid's reactive fabric is signals + effects under an owner root. `createXenolithStores()`
// must be called inside one — a component's setup IS a root, so the idiomatic call site owns
// the lifetime: every subscription rides `onCleanup` of the enclosing root (or of the rebind
// effect), and disposing the component tears everything down. No manual dispose.

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

/** The controlled-state triple (E5 / ADR 0006), Solid edition — see the React `useNodesState`
 *  docs for semantics: mirror folded from commit-time `graph:changed` arrays; `setNodes` diffs
 *  onto the editor as ONE undo step; positions arrive at COMMIT, never per frame. Each
 *  `nodesState()` call creates an independent mirror — one per consumer. */
export interface XenolithNodesState {
  nodes: Accessor<readonly Node[]>
  edges: Accessor<readonly Edge[]>
  applyChanges: (changes: GraphChanges) => void
  setNodes: (next: readonly Node[] | ((prev: readonly Node[]) => readonly Node[])) => void
  setEdges: (next: readonly Edge[] | ((prev: readonly Edge[]) => readonly Edge[])) => void
}

/** Bag of signal-backed accessors bound to one editor — Solid's counterpart of the React/Vue
 *  hook set and the Svelte store bag (ADAPTER-CONTRACT §2). Same event lists, same commit-time
 *  semantics, same microtask coalescing. */
export interface XenolithStores {
  /** Wire the live editor in from the directive's `on:ready` event. Swapping re-binds every
   *  accessor; passing `null` resets them to fallbacks. */
  setEditor: (editor: XenolithEditor | null) => void
  /** Current editor, or `null` before wiring / after reset. */
  editor: Accessor<XenolithEditor | null>
  /** Live nodes; re-fires on add/remove/move, load, undo/redo. */
  nodes: Accessor<readonly Node[]>
  /** Live edges; re-fires on connect/disconnect, node removal, load, undo/redo. */
  edges: Accessor<readonly Edge[]>
  /** Live selection (node ids); re-fires on `selection:changed`. */
  selection: Accessor<readonly NodeId[]>
  /** Live viewport (`x`, `y`, `zoom`); re-fires on pan/zoom. */
  viewport: Accessor<ViewportState>
  /** Live serialized graph (xenolith.v1); recomputes on any mutation, load, undo/redo. */
  graphJSON: Accessor<XenolithGraphV1 | null>
  /** `{ canUndo, canRedo }` live accessors + stable `undo()` / `redo()` handles. */
  undoRedo: {
    canUndo: Accessor<boolean>
    canRedo: Accessor<boolean>
    undo: () => boolean
    redo: () => boolean
  }
  /** The controlled-state triple — each call creates an independent mirror. */
  nodesState(): XenolithNodesState
}

export function createXenolithStores(): XenolithStores {
  const [editor, setEditor] = createSignal<XenolithEditor | null>(null)

  // The rebind effect: tracks the editor signal; per-run `onCleanup` releases the previous
  // editor's event subscriptions, so a swap (or root disposal) never leaks. The value signals
  // are written with `untrack` + explicit `() => v` setters so reads stay reference-compared
  // and nothing in `compute()` is accidentally tracked.
  function eventAccessor<T>(
    events: ReadonlyArray<keyof EditorEvents>,
    compute: (e: XenolithEditor) => T,
    fallback: T,
  ): Accessor<T> {
    const [value, setValue] = createSignal<T>(fallback, { equals: false })
    createEffect(() => {
      const e = editor()
      let offs: Array<() => void> = []
      onCleanup(() => { for (const off of offs) off() })
      if (!e) { untrack(() => setValue(() => fallback)); return }
      untrack(() => setValue(() => compute(e)))
      let scheduled = false
      const update = (): void => {
        if (scheduled) return
        scheduled = true
        queueMicrotask(() => {
          scheduled = false
          if (untrack(editor) === e) setValue(() => compute(e))
        })
      }
      offs = events.map((ev) => e.on(ev, update))
    })
    return value
  }

  const nodes = eventAccessor(NODE_EVENTS, (e) => Object.freeze(Array.from(e.graphNodes()) as Node[]) as readonly Node[], EMPTY_NODES)
  const edges = eventAccessor(EDGE_EVENTS, (e) => Object.freeze(Array.from(e.graphEdges()) as Edge[]) as readonly Edge[], EMPTY_EDGES)
  const selection = eventAccessor(['selection:changed'] as const, (e) => Object.freeze([...e.selection.ids()]) as readonly NodeId[], EMPTY_SELECTION)
  const viewport = eventAccessor(['viewport:changed'] as const, (e) => e.view.state, DEFAULT_VIEWPORT)
  const graphJSON = eventAccessor(GRAPH_EVENTS, (e) => e.getGraphReadonly(), null as XenolithGraphV1 | null)

  const undoRedoFactory = (): XenolithStores['undoRedo'] => {
    const [canUndo, setCanUndo] = createSignal(false, { equals: false })
    const [canRedo, setCanRedo] = createSignal(false, { equals: false })
    createEffect(() => {
      const e = editor()
      let off: (() => void) | null = null
      onCleanup(() => { off?.() })
      if (!e) { untrack(() => { setCanUndo(() => false); setCanRedo(() => false) }); return }
      const sync = (): void => { setCanUndo(() => e.history.canUndo); setCanRedo(() => e.history.canRedo) }
      untrack(sync)
      off = e.on('history:changed', sync)
    })
    return {
      canUndo, canRedo,
      undo: () => untrack(editor)?.history.undo() ?? false,
      redo: () => untrack(editor)?.history.redo() ?? false,
    }
  }
  const undoRedo = undoRedoFactory()

  function nodesState(): XenolithNodesState {
    const [mirror, setMirror] = createSignal<GraphMirror>({ nodes: [], edges: [] }, { equals: false })
    const nodesAcc = createMemo(() => mirror().nodes)
    const edgesAcc = createMemo(() => mirror().edges)

    createEffect(() => {
      const e = editor()
      let off: (() => void) | null = null
      onCleanup(() => { off?.() })
      if (!e) { untrack(() => setMirror(() => ({ nodes: [], edges: [] }))); return }
      untrack(() => setMirror(() => snapshotGraph(e.graphNodes(), e.graphEdges())))
      off = e.on('graph:changed', ({ changes }) => {
        setMirror((prev) => reduceGraphChanges(prev, changes))
      })
    })

    const applyChanges = (changes: GraphChanges): void => { untrack(editor)?.applyChanges(changes) }

    const setNodes = (next: readonly Node[] | ((prev: readonly Node[]) => readonly Node[])): void => {
      const e = untrack(editor)
      if (!e) return
      const live = snapshotGraph(e.graphNodes(), e.graphEdges())
      const nextNodes = typeof next === 'function' ? next(live.nodes) : next
      const changes = diffNodesToChanges(live, nextNodes)
      if (changes.nodes.length > 0) e.applyChanges(changes)
    }

    const setEdges = (next: readonly Edge[] | ((prev: readonly Edge[]) => readonly Edge[])): void => {
      const e = untrack(editor)
      if (!e) return
      const live = snapshotGraph(e.graphNodes(), e.graphEdges())
      const nextEdges = typeof next === 'function' ? next(live.edges) : next
      const changes = diffEdgesToChanges(live, nextEdges)
      if (changes.edges.length > 0) e.applyChanges(changes)
    }

    return { nodes: nodesAcc, edges: edgesAcc, applyChanges, setNodes, setEdges }
  }

  return { setEditor, editor, nodes, edges, selection, viewport, graphJSON, undoRedo, nodesState }
}
