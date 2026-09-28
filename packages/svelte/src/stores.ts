import { derived, get, writable, type Readable, type Writable } from 'svelte/store'
import type {
  EditorEvents, XenolithEditor, ViewportState, Node, Edge, NodeId, XenolithGraphV1,
  GraphChanges, GraphMirror,
} from '@xenolithengine/graph-editor'
import { reduceGraphChanges, snapshotGraph } from '@xenolithengine/graph-editor'
import { diffNodesToChanges } from '@xenolithengine/graph-adapter-core'

// Svelte's reactive fabric is stores — components subscribe with the `$` prefix, no wrapper
// components needed. `createXenolithStores()` builds a per-editor bag (never a module-level
// singleton: multiple editors must coexist); the consumer wires the live editor in from the
// action's `ready` event (`stores.editor.set(e.detail)`), and every store re-binds on swap.

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

/** Bag of reactive stores bound to one editor — Svelte's counterpart of the React/Vue hook set
 *  (ADAPTER-CONTRACT §2). Same event lists, same commit-time semantics, same microtask
 *  coalescing: a 1000-node transaction costs ONE recompute per store, not 1000. */
export interface XenolithStores {
  /** Set the live editor here (typically from `on:ready`). Swapping re-binds every store;
   *  setting `null` resets them to fallbacks. */
  editor: Writable<XenolithEditor | null>
  /** Live nodes; re-fires on add/remove/move, load, undo/redo. `$stores.nodes`. */
  nodes: Readable<readonly Node[]>
  /** Live edges; re-fires on connect/disconnect, node removal, load, undo/redo. */
  edges: Readable<readonly Edge[]>
  /** Live selection (node ids); re-fires on `selection:changed`. */
  selection: Readable<readonly NodeId[]>
  /** Live viewport (`x`, `y`, `zoom`); re-fires on pan/zoom. */
  viewport: Readable<ViewportState>
  /** Live serialized graph (xenolith.v1); recomputes on any mutation, load, undo/redo. */
  graphJSON: Readable<XenolithGraphV1 | null>
  /** `{ canUndo, canRedo }` live state + stable `undo()` / `redo()` handles. */
  undoRedo: {
    canUndo: Readable<boolean>
    canRedo: Readable<boolean>
    undo: () => boolean
    redo: () => boolean
  }
  /** The controlled-state triple (E5 / ADR 0006). Each call creates an independent mirror —
   *  one per consumer, like the React hook. See {@link XenolithNodesState}. */
  nodesState(): XenolithNodesState
  /** Unsubscribe every internal editor listener. Call when the editor is destroyed for good
   *  (the action's destroy path) — `$`-subscriptions in components tear down on their own. */
  dispose(): void
}

/** The controlled triple, Svelte edition — see the React `useNodesState` docs for semantics:
 *  mirror folded from commit-time `graph:changed` arrays; `setNodes` diffs onto the editor as
 *  ONE undo step; positions arrive at COMMIT, never per frame. */
export interface XenolithNodesState {
  nodes: Readable<readonly Node[]>
  edges: Readable<readonly Edge[]>
  applyChanges: (changes: GraphChanges) => void
  setNodes: (next: readonly Node[] | ((prev: readonly Node[]) => readonly Node[])) => void
}

export function createXenolithStores(): XenolithStores {
  const editor = writable<XenolithEditor | null>(null)
  const disposers: Array<() => void> = []

  // One central editor subscription per store: re-binds event listeners when the editor
  // identity changes, recomputes immediately, coalesces bursts into one microtask recompute.
  function eventStore<T>(
    events: ReadonlyArray<keyof EditorEvents>,
    compute: (e: XenolithEditor) => T,
    fallback: T,
  ): Readable<T> {
    const store = writable<T>(fallback)
    let offs: Array<() => void> = []
    let scheduled = false
    disposers.push(editor.subscribe((e) => {
      for (const off of offs) off()
      offs = []
      if (!e) { store.set(fallback); return }
      store.set(compute(e))
      const update = (): void => {
        if (scheduled) return
        scheduled = true
        queueMicrotask(() => {
          scheduled = false
          if (get(editor) === e) store.set(compute(e))
        })
      }
      offs = events.map((ev) => e.on(ev, update))
    }))
    disposers.push(() => { for (const off of offs) off(); offs = [] })
    return store
  }

  const nodes = eventStore(NODE_EVENTS, (e) => Object.freeze(Array.from(e.graphNodes()) as Node[]) as readonly Node[], EMPTY_NODES)
  const edges = eventStore(EDGE_EVENTS, (e) => Object.freeze(Array.from(e.graphEdges()) as Edge[]) as readonly Edge[], EMPTY_EDGES)
  const selection = eventStore(['selection:changed'] as const, (e) => Object.freeze([...e.selection.ids()]) as readonly NodeId[], EMPTY_SELECTION)
  const viewport = eventStore(['viewport:changed'] as const, (e) => e.view.state, DEFAULT_VIEWPORT)
  const graphJSON = eventStore(GRAPH_EVENTS, (e) => e.getGraphReadonly(), null as XenolithGraphV1 | null)

  const canUndo = writable(false)
  const canRedo = writable(false)
  {
    let off: (() => void) | null = null
    disposers.push(editor.subscribe((e) => {
      off?.(); off = null
      if (!e) { canUndo.set(false); canRedo.set(false); return }
      const sync = (): void => { canUndo.set(e.history.canUndo); canRedo.set(e.history.canRedo) }
      sync()
      off = e.on('history:changed', sync)
    }))
    disposers.push(() => { off?.(); off = null })
  }

  function nodesState(): XenolithNodesState {
    const mirror = writable<GraphMirror>({ nodes: [], edges: [] })
    let off: (() => void) | null = null
    disposers.push(editor.subscribe((e) => {
      off?.(); off = null
      if (!e) { mirror.set({ nodes: [], edges: [] }); return }
      mirror.set(snapshotGraph(e.graphNodes(), e.graphEdges()))
      off = e.on('graph:changed', ({ changes }) => {
        mirror.update((prev) => reduceGraphChanges(prev, changes))
      })
    }))
    disposers.push(() => { off?.(); off = null })

    const applyChanges = (changes: GraphChanges): void => { get(editor)?.applyChanges(changes) }

    const setNodes = (next: readonly Node[] | ((prev: readonly Node[]) => readonly Node[])): void => {
      const e = get(editor)
      if (!e) return
      const live = snapshotGraph(e.graphNodes(), e.graphEdges())
      const nextNodes = typeof next === 'function' ? next(live.nodes) : next
      const changes = diffNodesToChanges(live, nextNodes)
      if (changes.nodes.length > 0) e.applyChanges(changes)
    }

    return {
      nodes: derived(mirror, (m) => m.nodes),
      edges: derived(mirror, (m) => m.edges),
      applyChanges,
      setNodes,
    }
  }

  return {
    editor,
    nodes, edges, selection, viewport, graphJSON,
    undoRedo: {
      canUndo, canRedo,
      undo: () => get(editor)?.history.undo() ?? false,
      redo: () => get(editor)?.history.redo() ?? false,
    },
    nodesState,
    dispose() { for (const d of disposers.splice(0)) d() },
  }
}
