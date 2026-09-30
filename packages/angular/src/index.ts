import { BehaviorSubject, map, Subject, type Observable } from 'rxjs'
import {
  createEditorBinding,
  diffEdgesToChanges,
  diffNodesToChanges,
  EDITOR_EVENT_NAMES,
  type EditorBinding,
  type XenolithProps,
} from '@xenolithengine/graph-adapter-core'
import type {
  EditorEvents, XenolithEditor, ViewportState, Node, Edge, NodeId, XenolithGraphV1,
  GraphChanges, GraphMirror,
} from '@xenolithengine/graph-editor'
import { reduceGraphChanges, snapshotGraph } from '@xenolithengine/graph-editor'

// Why a service and not a shipped `<xenolith-graph>` component: Angular libraries that ship
// components MUST be partially compiled (ng-packagr / @angular/compiler-cli) — a decorator
// class compiled by plain tsc has no `ɵcmp` and throws "is not a component" in every default
// (AOT) consumer build. This adapter stays compiler-free and decorator-free instead: a plain
// class Angular's DI injects as-is (`providers: [XenolithGraphService]`), with RxJS — the
// fabric every Angular app already has — as the reactive surface. The host writes its own
// thin component (the Learn page ships the exact recipe) and Angular compiles THAT.

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

/** The controlled-state triple (E5 / ADR 0006), Angular edition — see the React `useNodesState`
 *  docs for semantics: mirror folded from commit-time `graph:changed` arrays; `setNodes` diffs
 *  onto the editor as ONE undo step; positions arrive at COMMIT, never per frame. Each
 *  `nodesState()` call creates an independent mirror — one per consumer. */
export interface XenolithNodesState {
  nodes$: Observable<readonly Node[]>
  edges$: Observable<readonly Edge[]>
  applyChanges: (changes: GraphChanges) => void
  setNodes: (next: readonly Node[] | ((prev: readonly Node[]) => readonly Node[])) => void
  setEdges: (next: readonly Edge[] | ((prev: readonly Edge[]) => readonly Edge[])) => void
}

/**
 * DI service that owns one XenolithGraph editor and exposes it through RxJS — Angular's
 * counterpart of the React/Vue hooks and the Svelte store bag (ADAPTER-CONTRACT §2).
 *
 * - Provide PER EDITOR at the component level (`providers: [XenolithGraphService]`) and
 *   `inject()` it — the class is decorator-free (no constructor deps of its own), so plain-class
 *   DI works without any library compilation on our side.
 * - `mount(host, props)` from `ngAfterViewInit`; `destroy()` from `ngOnDestroy`. Remount after
 *   destroy rebinds the same service.
 * - Observables are BehaviorSubject-backed: `| async` and `toSignal()` see the current value
 *   immediately; bursts are coalesced into one microtask recompute (a 1000-node transaction
 *   costs ONE rebuild, not 1000 — same budget as the React/Vue/Svelte adapters). They never
 *   complete — dispose host-side subscriptions with `| async` / `takeUntilDestroyed`.
 *
 * @example
 *   \@Component({
 *     providers: [XenolithGraphService],
 *     template: '<div #host style="position:absolute;inset:0"></div><p>{{ n() }} nodes</p>',
 *   })
 *   export class EditorHost implements AfterViewInit, OnDestroy {
 *     private graph = inject(XenolithGraphService)
 *     private host = viewChild.required<ElementRef<HTMLDivElement>>('host')
 *     protected n = toSignal(this.graph.nodes$.pipe(map((ns) => ns.length)), { initialValue: 0 })
 *     async ngAfterViewInit() { await this.graph.mount(this.host().nativeElement, { snap: 8 }) }
 *     ngOnDestroy() { this.graph.destroy() }
 *   }
 */
export class XenolithGraphService {
  readonly editor$: Observable<XenolithEditor | null>
  readonly nodes$: Observable<readonly Node[]>
  readonly edges$: Observable<readonly Edge[]>
  readonly selection$: Observable<readonly NodeId[]>
  readonly viewport$: Observable<ViewportState>
  readonly graphJSON$: Observable<XenolithGraphV1 | null>
  readonly canUndo$: Observable<boolean>
  readonly canRedo$: Observable<boolean>

  #editor = new BehaviorSubject<XenolithEditor | null>(null)
  #nodes = new BehaviorSubject<readonly Node[]>(EMPTY_NODES)
  #edges = new BehaviorSubject<readonly Edge[]>(EMPTY_EDGES)
  #selection = new BehaviorSubject<readonly NodeId[]>(EMPTY_SELECTION)
  #viewport = new BehaviorSubject<ViewportState>(DEFAULT_VIEWPORT)
  #graphJSON = new BehaviorSubject<XenolithGraphV1 | null>(null)
  #canUndo = new BehaviorSubject<boolean>(false)
  #canRedo = new BehaviorSubject<boolean>(false)
  #eventSubjects = new Map<keyof EditorEvents, Subject<never>>()
  #binding: EditorBinding | null = null
  #offs: Array<() => void> = []

  constructor() {
    this.editor$ = this.#editor
    this.nodes$ = this.#nodes
    this.edges$ = this.#edges
    this.selection$ = this.#selection
    this.viewport$ = this.#viewport
    this.graphJSON$ = this.#graphJSON
    this.canUndo$ = this.#canUndo
    this.canRedo$ = this.#canRedo
  }

  /** The live editor instance, or `null` before `mount()` resolves / after `destroy()`. */
  get editor(): XenolithEditor | null { return this.#binding?.editor ?? null }

  /**
   * Mount the editor into `host`. Resolves with the editor instance (`editor$` emits it too).
   * Props apply at mount; for later changes prefer the imperative editor API
   * (`editor.setTheme(...)` etc.) — same reference-diff semantics as every adapter.
   */
  async mount(host: HTMLElement, props: XenolithProps = {}): Promise<XenolithEditor> {
    this.#release()
    const binding = await createEditorBinding(host, props)
    this.#binding = binding
    const e = binding.editor
    this.#editor.next(e)

    // Every public editor event routes into a per-event Subject that exists for the whole
    // service lifetime — late on$() subscribers still see events from any later mount on.
    for (const ev of EDITOR_EVENT_NAMES) {
      this.#offs.push(binding.on(ev, (payload) => {
        (this.#subject(ev) as unknown as { next: (p: unknown) => void }).next(payload)
      }))
    }

    const coalesce = (events: ReadonlyArray<keyof EditorEvents>, recompute: () => void): void => {
      let scheduled = false
      const update = (): void => {
        if (scheduled) return
        scheduled = true
        queueMicrotask(() => {
          scheduled = false
          if (this.#binding === binding) recompute()
        })
      }
      for (const ev of events) this.#offs.push(binding.on(ev, update))
    }

    coalesce(NODE_EVENTS, () => this.#nodes.next(Object.freeze(Array.from(e.graphNodes()) as Node[]) as readonly Node[]))
    coalesce(EDGE_EVENTS, () => this.#edges.next(Object.freeze(Array.from(e.graphEdges()) as Edge[]) as readonly Edge[]))
    coalesce(['selection:changed'] as const, () => this.#selection.next(Object.freeze([...e.selection.ids()]) as readonly NodeId[]))
    coalesce(['viewport:changed'] as const, () => this.#viewport.next(e.view.state))
    coalesce(GRAPH_EVENTS, () => this.#graphJSON.next(e.getGraphReadonly()))
    this.#offs.push(binding.on('history:changed', () => {
      this.#canUndo.next(e.history.canUndo)
      this.#canRedo.next(e.history.canRedo)
    }))

    this.#seed(e)
    return e
  }

  /** Tear the editor down and release its WebGL context; `editor$` emits `null`. The service
   *  can be `mount()`ed again afterwards (observables keep flowing). */
  destroy(): void {
    this.#release()
    this.#binding?.destroy()
    this.#binding = null
    this.#editor.next(null)
    this.#nodes.next(EMPTY_NODES)
    this.#edges.next(EMPTY_EDGES)
    this.#selection.next(EMPTY_SELECTION)
    this.#viewport.next(DEFAULT_VIEWPORT)
    this.#graphJSON.next(null)
    this.#canUndo.next(false)
    this.#canRedo.next(false)
  }

  /** Subscribe to a single editor event with its typed payload. Multicast across subscribers;
   *  events flow only while an editor is mounted. Scope host subscriptions with
   *  `takeUntil`/`takeUntilDestroyed`. */
  on$<E extends keyof EditorEvents>(event: E): Observable<EditorEvents[E]> {
    return this.#subject(event) as unknown as Observable<EditorEvents[E]>
  }

  /** Undo one step; `false` when nothing to undo or no editor mounted. */
  undo(): boolean { return this.#editor.value?.history.undo() ?? false }

  /** Redo one step; `false` when nothing to redo or no editor mounted. */
  redo(): boolean { return this.#editor.value?.history.redo() ?? false }

  /**
   * The controlled-state triple (E5 / ADR 0006): `{ nodes$, edges$, applyChanges, setNodes }`,
   * folded from commit-time `graph:changed` arrays; `setNodes` lands on the editor as ONE undo
   * step (shallow diff via adapter-core `diffNodesToChanges`). Each call creates an independent
   * mirror — one per consumer; the mirror resets whenever the service remounts.
   */
  nodesState(): XenolithNodesState {
    const mirror = new BehaviorSubject<GraphMirror>({ nodes: [], edges: [] })

    const applyChanges = (changes: GraphChanges): void => { this.#editor.value?.applyChanges(changes) }

    const setNodes = (next: readonly Node[] | ((prev: readonly Node[]) => readonly Node[])): void => {
      const e = this.#editor.value
      if (!e) return
      const live = snapshotGraph(e.graphNodes(), e.graphEdges())
      const nextNodes = typeof next === 'function' ? next(live.nodes) : next
      const changes = diffNodesToChanges(live, nextNodes)
      if (changes.nodes.length > 0) e.applyChanges(changes)
    }

    const setEdges = (next: readonly Edge[] | ((prev: readonly Edge[]) => readonly Edge[])): void => {
      const e = this.#editor.value
      if (!e) return
      const live = snapshotGraph(e.graphNodes(), e.graphEdges())
      const nextEdges = typeof next === 'function' ? next(live.edges) : next
      const changes = diffEdgesToChanges(live, nextEdges)
      if (changes.edges.length > 0) e.applyChanges(changes)
    }

    // Service-lifetime subscription: fires on every mount (BehaviorSubject) and rebinds the
    // graph:changed fold to the fresh editor; the per-editor `off` rides #offs so a remount
    // releases the previous one. Never disposed explicitly — it dies with the service, like
    // the store BehaviorSubjects.
    this.#editor.subscribe((e) => {
      if (!e) { mirror.next({ nodes: [], edges: [] }); return }
      mirror.next(snapshotGraph(e.graphNodes(), e.graphEdges()))
      this.#offs.push(e.on('graph:changed', ({ changes }) => {
        mirror.next(reduceGraphChanges(mirror.value, changes))
      }))
    })

    return {
      nodes$: mirror.pipe(map((m) => m.nodes)),
      edges$: mirror.pipe(map((m) => m.edges)),
      applyChanges,
      setNodes,
      setEdges,
    }
  }

  #subject(ev: keyof EditorEvents): Subject<never> {
    let s = this.#eventSubjects.get(ev)
    if (!s) this.#eventSubjects.set(ev, (s = new Subject<never>()))
    return s
  }

  #release(): void {
    for (const off of this.#offs) off()
    this.#offs = []
  }

  #seed(e: XenolithEditor): void {
    this.#nodes.next(Object.freeze(Array.from(e.graphNodes()) as Node[]) as readonly Node[])
    this.#edges.next(Object.freeze(Array.from(e.graphEdges()) as Edge[]) as readonly Edge[])
    this.#selection.next(Object.freeze([...e.selection.ids()]) as readonly NodeId[])
    this.#viewport.next(e.view.state)
    this.#graphJSON.next(e.getGraphReadonly())
    this.#canUndo.next(e.history.canUndo)
    this.#canRedo.next(e.history.canRedo)
  }
}
