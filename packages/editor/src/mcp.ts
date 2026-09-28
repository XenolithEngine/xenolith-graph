import type { Edge, NodeId, PinId } from '@xenolithengine/graph-core'
import { createEdgeId, createNodeId } from '@xenolithengine/graph-core'
import { resolvePin } from './pin-resolve.js'
import { findNodesIn } from './find-nodes.js'
import { layeredLayout, nextFreeSpot } from './layout-ops.js'
import { BUILTIN_RECIPES, instantiateRecipe, type RecipeDef, type RecipeRegistry, createRecipeRegistry } from './recipes.js'

/** Editor-side WebSocket client for the @xenolithengine/graph-mcp-server bridge.
 *  The protocol mirrors packages/mcp-server/src/protocol.ts — server sends `call`, editor replies
 *  with `result`. Tool handlers below are intentionally thin wrappers around existing public APIs;
 *  validation/undo lives where it already does (commandBus etc). */

interface CallMsg { id: string; kind: 'call'; tool: string; args?: unknown }
interface ResultMsg { id: string; kind: 'result'; ok: true; data?: unknown }
interface ErrorMsg { id: string; kind: 'result'; ok: false; error: string }

/** Subset of editor surface that the MCP client needs. Kept as a structural type so tests can
 *  pass a mock without importing the full editor. */
interface PinLike {
  id: PinId
  kind: 'data' | 'exec'
  direction: 'in' | 'out'
  type: string
  label?: string
  multiple?: boolean
}
interface NodeLike {
  id: NodeId
  type: string
  position: { x: number; y: number }
  size?: { x: number; y: number }
  pins: PinLike[]
  state?: Record<string, unknown>
}
interface SchemaPinLike { kind: 'data' | 'exec'; direction: 'in' | 'out'; type: string; label?: string }
interface SchemaWidgetLike {
  id: string
  key?: string
  type: string
  label?: string
  // Type-specific options. combo NEEDS `values`; slider/number use min/max/step.
  values?: Array<string | { label: string; value: string }>
  min?: number
  max?: number
  step?: number
}
interface SchemaLike { type: string; title?: string; category?: string; pins: SchemaPinLike[]; widgets?: SchemaWidgetLike[] }
export interface McpEditorSurface {
  registry: {
    all(): SchemaLike[]
    register(schema: SchemaLike): void
    has(type: string): boolean
  }
  toJSON(): unknown
  insertNode(type: string, worldPos: { x: number; y: number }, opts?: { center?: boolean }): NodeLike | null
  addEdge(edge: Edge): boolean
  fitView(opts?: { padding?: number; maxZoom?: number; minZoom?: number }): void
  moveNode(id: NodeId, position: { x: number; y: number }): void
  setWidgetValue(nodeId: NodeId, widgetId: string, value: unknown): void
  removeNode(nodeId: NodeId): boolean
  disconnectEdge(edgeId: string): boolean
  createMacroFromSelection(memberIds?: NodeId[], title?: string): NodeId | null
  expandMacro(id: NodeId): void
  collapseMacro(id: NodeId): void
  setSelection(ids: readonly NodeId[]): void
  diveInto(instanceId: NodeId): boolean
  diveOut(toDepth?: number): void
  setCategoryPalette(palette: Record<string, unknown> | undefined): void
  setTheme(input: unknown): void
  exportImage?(opts?: { format?: 'png' | 'jpeg'; quality?: number; padding?: number; scale?: number }): Promise<Blob>
  exportNodeImage?(nodeId: NodeId, opts?: { format?: 'png' | 'jpeg'; quality?: number; scale?: number; padding?: number }): Promise<Blob>
  /** Optional recipe registry override — if absent, BUILTIN_RECIPES is used. Hosts that ship
   *  domain-specific recipes can pass their own registry through `buildHandlers` (or, on real
   *  editor instances, `editor.recipes`). */
  recipes?: RecipeRegistry
  /** Optional: the editor's command bus — proposal approve() uses it to land the batch as ONE
   *  undoable transaction. Absent on minimal test doubles (approve then applies unbatched). */
  commandBus?: { transaction<R>(fn: () => R): R }
  graph: {
    nodes(): Iterable<NodeLike & { widgets?: Array<{ id: string; key?: string; type: string; label?: string }> }>
    edges(): Iterable<{ id: string; from: { node: NodeId; pin?: PinId }; to: { node: NodeId; pin?: PinId } }>
    getNode(id: NodeId): (NodeLike & { widgets?: Array<{ id: string; key?: string; type: string; label?: string }> }) | undefined
    getEdge?(id: string): { id: string; from: { node: NodeId }; to: { node: NodeId } } | undefined
  }
}

export type ToolHandler = (args: unknown) => unknown | Promise<unknown>

// ---- audit log (C-Bet1a) -----------------------------------------------------------------------
//
// Every DOCUMENT-MUTATING tool call appends one entry — success or failure. Read/view tools
// (get_graph, list_*, find_*, describe_*, fit_view, select_*, screenshots) are NOT audited:
// they cannot change the graph. SECURITY NOTES, stated plainly: (a) entries contain graph
// data (node types, positions, digests of the arguments the agent sent) — treat the log as
// sensitive as the graph itself; (b) `clientId` is transport-provided identity, NOT
// authentication — any client can claim any id until the server grows an auth story.

export interface AuditEffectDelta { added: number; removed: number }

export interface AuditEntry {
  /** Monotonic across the ring's lifetime (survives evictions). */
  seq: number
  /** Epoch ms. */
  ts: number
  /** Transport-provided client label (NOT authenticated — see the note above). */
  clientId: string
  tool: string
  ok: boolean
  /** Human digest: tool + truncated args + outcome. Contract: ≤ ~160 chars. */
  summary: string
  nodes?: AuditEffectDelta
  edges?: AuditEffectDelta
}

export interface AuditLogOptions {
  /** Ring capacity. Default 500 — enough for a long agent session, bounded for memory. */
  capacity?: number
}

/** Bounded ring of agent-mutation records. Hosts may inject one instance and share it across
 *  MCP reconnects/clients; `editor.connectMCP` keeps one per editor (`editor.mcpAudit`). */
export class AuditLog {
  readonly capacity: number
  #entries: AuditEntry[] = []
  #dropped = 0
  #seq = 0

  constructor(capacity = 500) { this.capacity = capacity }

  append(entry: Omit<AuditEntry, 'seq' | 'ts'>): AuditEntry {
    const full: AuditEntry = { ...entry, seq: ++this.#seq, ts: Date.now() }
    this.#entries.push(full)
    if (this.#entries.length > this.capacity) {
      this.#dropped += this.#entries.length - this.capacity
      this.#entries.splice(0, this.#entries.length - this.capacity)
    }
    return full
  }

  read(): { entries: readonly AuditEntry[]; dropped: number; capacity: number } {
    return { entries: this.#entries.slice(), dropped: this.#dropped, capacity: this.capacity }
  }
}

// ---- proposal mode (C-Bet1b) ---------------------------------------------------------------------
//
// 'propose' mode: mutating tool calls ENQUEUE instead of applying. The host reviews
// (`editor.mcpProposals`) and either approves the batch — re-running every stored operation
// against the CURRENT graph inside ONE command-bus transaction (one undo step; atomic — any
// failure rolls the whole batch back and the queue survives for retry) — or rejects it.
// Proposals are RE-RESOLVED at approval time (ADR 0007): pin labels and layout run against
// the graph as it is THEN, not as it was when proposed. Default mode is 'auto' (mutations
// apply immediately) — proposal mode is an opt-in trust boundary, and only a client connected
// with mode 'propose' is bound by it.

export interface ProposalEntry {
  readonly id: number
  readonly ts: number
  readonly clientId: string
  readonly tool: string
  /** Human digest shown in the review queue (mirrors the audit summary format). */
  readonly summary: string
  /** Original tool arguments — replayed on approval. */
  readonly args: unknown
}

export interface ProposalApproveResult {
  applied: number
}

export class ProposalQueue {
  #seq = 0
  #entries: Array<ProposalEntry & { run: (idMap: Map<string, string>) => unknown }> = []
  #listeners: Array<(size: number) => void> = []
  #tx: { transaction<R>(fn: () => R): R } | null = null

  /** Wire the editor's command bus so approve() lands as ONE undoable transaction. */
  attach(bus: { transaction<R>(fn: () => R): R } | undefined): void { this.#tx = bus ?? null }

  /** Current queue, oldest first. */
  entries(): readonly ProposalEntry[] { return this.#entries.slice() }

  get size(): number { return this.#entries.length }

  /** Subscribe to size changes (enqueue / approve / reject). Returns an unsubscribe. */
  onChange(cb: (size: number) => void): () => void {
    this.#listeners.push(cb)
    return () => { this.#listeners = this.#listeners.filter((l) => l !== cb) }
  }

  /** @internal — called by the proposal wrapper; not part of the host surface. `run` receives
   *  the approval-time provisional→real node-id map so chained proposals resolve. */
  _enqueue(entry: Omit<ProposalEntry, 'id' | 'ts'> & { run: (idMap: Map<string, string>) => unknown }): number {
    const id = ++this.#seq
    this.#entries.push({ ...entry, id, ts: Date.now() })
    this.#notify()
    return id
  }

  /** Approve the WHOLE batch: one transaction, one undo step. On failure the transaction
   *  rolls back atomically and the entries STAY queued (retry after fixing the cause). */
  approve(): ProposalApproveResult {
    if (this.#entries.length === 0) return { applied: 0 }
    const batch = this.#entries.slice()
    // Provisional→real id translation: add_node proposals mint a provisional id at ENQUEUE time
    // (returned to the agent so it can chain connect_pins etc.); at replay the real id lands in
    // the map and later proposals' node references are rewritten through it.
    const idMap = new Map<string, string>()
    const apply = (): void => { for (const e of batch) e.run(idMap) }
    if (this.#tx) this.#tx.transaction(apply)
    else apply()
    this.#entries = []
    this.#notify()
    return { applied: batch.length }
  }

  /** Discard everything (or the given ids). The graph is untouched. */
  reject(ids?: readonly number[]): void {
    if (ids === undefined) {
      this.#entries = []
    } else {
      const drop = new Set(ids)
      this.#entries = this.#entries.filter((e) => !drop.has(e.id))
    }
    this.#notify()
  }

  #notify(): void { for (const l of this.#listeners) l(this.#entries.length) }
}

export interface BuildHandlersOptions {
  /** Identity stamped on audit entries. Defaults to 'editor-connection'. */
  clientId?: string
  /** Inject a host-owned ring (shared across reconnects). A fresh one is created otherwise. */
  audit?: AuditLog
  /** 'propose': mutating tools enqueue for human approval instead of applying (C-Bet1b).
   *  Default 'auto' — mutations apply immediately (back-compat; opt-in trust boundary). */
  mode?: 'auto' | 'propose'
  /** Inject a host-owned proposal queue. A fresh one is created otherwise (propose mode). */
  proposals?: ProposalQueue
}

/** Document-mutating tools — the audited set. View/read/stateless tools are excluded on purpose. */
const AUDITED_TOOLS = new Set([
  'add_node', 'connect_pins', 'set_widget_value', 'remove_node', 'disconnect_edge',
  'create_macro', 'expand_macro', 'collapse_macro', 'auto_layout', 'set_category_palette',
  'set_theme', 'register_node_schema', 'dive_into_template', 'dive_out', 'instantiate_recipe',
])

const digest = (args: unknown): string => {
  const json = JSON.stringify(args ?? {}) ?? ''
  return json.length > 120 ? json.slice(0, 117) + '…' : json
}

export function buildHandlers(editor: McpEditorSurface, opts: BuildHandlersOptions = {}): Record<string, ToolHandler> {
  const recipes: RecipeRegistry = editor.recipes ?? createRecipeRegistry(BUILTIN_RECIPES)
  const audit = opts.audit ?? new AuditLog()
  const clientId = opts.clientId ?? 'editor-connection'
  const proposals = opts.proposals ?? new ProposalQueue()
  proposals.attach(editor.commandBus)
  return wrapWithProposals(proposals, clientId, opts.mode ?? 'auto', wrapWithAudit(audit, clientId, editor, {
    list_node_types: () => editor.registry.all().map((s) => ({
      type: s.type,
      title: s.title,
      category: s.category,
      pins: s.pins.map((p, i) => ({
        index: i,
        label: p.label ?? null,
        direction: p.direction,
        kind: p.kind,
        type: p.type,
      })),
      widgets: (s.widgets ?? []).map((w) => ({
        id: w.id,
        key: w.key ?? null,
        type: w.type,
        label: w.label ?? null,
      })),
    })),
    get_graph: () => editor.toJSON(),
    add_node: (args) => {
      const a = (args ?? {}) as { type?: string; x?: number; y?: number }
      if (!a.type) throw new Error('add_node: missing type')
      const pos = (typeof a.x === 'number' && typeof a.y === 'number')
        ? { x: a.x, y: a.y }
        : nextFreeSpot(editor)
      const node = editor.insertNode(a.type, pos)
      if (!node) throw new Error(`unknown node type '${a.type}'`)
      return { id: node.id, position: node.position }
    },
    connect_pins: (args) => {
      const a = args as { from: { node: string; pin: string | number }; to: { node: string; pin: string | number } }
      const fromNode = editor.graph.getNode(a.from.node as NodeId)
      if (!fromNode) throw new Error(`connect_pins: source node '${a.from.node}' not found`)
      const toNode = editor.graph.getNode(a.to.node as NodeId)
      if (!toNode) throw new Error(`connect_pins: target node '${a.to.node}' not found`)
      const fromPin = resolvePin<PinLike>(fromNode, a.from.pin, 'out')
      const toPin   = resolvePin<PinLike>(toNode,   a.to.pin,   'in')
      const edge: Edge = {
        id: createEdgeId(),
        from: { node: fromNode.id, pin: fromPin.id },
        to:   { node: toNode.id,   pin: toPin.id   },
      }
      const ok = editor.addEdge(edge)
      if (!ok) throw new Error(`addEdge rejected: pins incompatible (${fromPin.type} → ${toPin.type}) or vetoed`)
      return { id: edge.id, from: { pin: fromPin.label ?? fromPin.id, type: fromPin.type }, to: { pin: toPin.label ?? toPin.id, type: toPin.type } }
    },
    fit_view: (args) => {
      const a = (args ?? {}) as { padding?: number }
      editor.fitView(a.padding !== undefined ? { padding: a.padding } : {})
      return null
    },
    set_widget_value: (args) => {
      const a = args as { nodeId: string; widget: string; value: unknown }
      const node = editor.graph.getNode(a.nodeId as NodeId)
      if (!node) throw new Error(`set_widget_value: node '${a.nodeId}' not found`)
      const wid = resolveWidgetId(node, a.widget)
      editor.setWidgetValue(node.id, wid, a.value)
      return { nodeId: node.id, widget: wid, value: a.value }
    },
    remove_node: (args) => {
      const a = args as { nodeId: string }
      const ok = editor.removeNode(a.nodeId as NodeId)
      if (!ok) throw new Error(`remove_node: node '${a.nodeId}' not found or removal vetoed`)
      return { removed: a.nodeId }
    },
    disconnect_edge: (args) => {
      const a = args as { edgeId: string }
      const ok = editor.disconnectEdge(a.edgeId)
      if (!ok) throw new Error(`disconnect_edge: edge '${a.edgeId}' not found or vetoed`)
      return { removed: a.edgeId }
    },
    create_macro: (args) => {
      const a = args as { nodeIds: string[]; title?: string }
      const id = editor.createMacroFromSelection(a.nodeIds.map((s) => s as NodeId), a.title ?? 'Macro')
      if (!id) throw new Error('create_macro: failed (need at least 1 valid node)')
      return { id }
    },
    expand_macro: (args) => {
      const a = args as { macroId: string }
      editor.expandMacro(a.macroId as NodeId)
      return { expanded: a.macroId }
    },
    collapse_macro: (args) => {
      const a = args as { macroId: string }
      editor.collapseMacro(a.macroId as NodeId)
      return { collapsed: a.macroId }
    },
    auto_layout: (args) => {
      const a = (args ?? {}) as { direction?: 'LR' | 'TB'; spacing?: number }
      const positions = layeredLayout(editor, a.direction ?? 'LR', a.spacing ?? 80)
      for (const [id, p] of positions) editor.moveNode(id, p)
      editor.fitView({ padding: 64 })
      return { moved: positions.size, direction: a.direction ?? 'LR' }
    },
    set_category_palette: (args) => {
      const a = (args ?? {}) as { palette?: Record<string, unknown> }
      editor.setCategoryPalette(a.palette)
      return { applied: Object.keys(a.palette ?? {}) }
    },
    set_theme: (args) => {
      const a = (args ?? {}) as { tokens?: unknown }
      if (a.tokens === undefined) throw new Error('set_theme: missing tokens')
      editor.setTheme(a.tokens)
      return { applied: true }
    },
    register_node_schema: (args) => {
      const a = args as SchemaLike
      if (!a?.type || !Array.isArray(a.pins)) throw new Error('register_node_schema: type + pins are required')
      if (editor.registry.has(a.type)) {
        // Discourage AI clients from inventing variant names ("LLMCall A", "LLMCall B" ...) when
        // they hit this — they should use the existing schema instead.
        throw new Error(`register_node_schema: type '${a.type}' is ALREADY registered. Do not create a variant with a different name — use add_node({type: '${a.type}'}) to instantiate the existing one.`)
      }
      const schema: SchemaLike = {
        type: a.type,
        title: a.title ?? a.type,
        ...(a.category !== undefined ? { category: a.category } : {}),
        pins: a.pins.map((p) => ({
          kind: p.kind ?? 'data',
          direction: p.direction,
          type: p.type,
          ...(p.label !== undefined ? { label: p.label } : {}),
        })),
        ...(a.widgets ? {
          widgets: a.widgets.map((w) => {
            // Validate combo up-front — a combo without `values` blows up at render time
            // (`comboOptions: cannot read 'map' of undefined`); reject here with a clear message
            // so the AI client can fix the call instead of hanging the editor.
            if (w.type === 'combo' && (!Array.isArray(w.values) || w.values.length === 0)) {
              throw new Error(`register_node_schema: combo widget '${w.id}' needs a non-empty 'values' array (e.g. ["gpt-4o", "claude-opus"])`)
            }
            // A widget without a key matching a pin label is silently dropped at render unless it
            // has `freeFloating: true` (renders in the body band below the pins). AI clients almost
            // always want this — they describe a config field, not a pin overlay. Auto-set the flag
            // when there's no matching pin so the widget actually shows up.
            const bindKey = (w.key ?? w.id).toLowerCase()
            const hasMatchingPin = a.pins.some((p) => (p.label ?? '').toLowerCase() === bindKey)
            const needsFree = !hasMatchingPin && w.type !== 'button'
            return {
              id: w.id,
              ...(w.key !== undefined ? { key: w.key } : {}),
              type: w.type,
              ...(w.label !== undefined ? { label: w.label } : {}),
              ...(w.values !== undefined ? { values: w.values } : {}),
              ...(w.min !== undefined ? { min: w.min } : {}),
              ...(w.max !== undefined ? { max: w.max } : {}),
              ...(w.step !== undefined ? { step: w.step } : {}),
              ...(needsFree ? { freeFloating: true } : {}),
            }
          }),
        } : {}),
      }
      editor.registry.register(schema as never)
      return { registered: schema.type }
    },
    select_nodes: (args) => {
      const a = args as { nodeIds: string[] }
      editor.setSelection(a.nodeIds.map((s) => s as NodeId))
      return { selected: a.nodeIds.length }
    },
    clear_selection: () => {
      editor.setSelection([])
      return { cleared: true }
    },
    dive_into_template: (args) => {
      const a = args as { instanceId: string }
      const ok = editor.diveInto(a.instanceId as NodeId)
      if (!ok) throw new Error(`dive_into_template: '${a.instanceId}' is not a template instance`)
      return { dived: a.instanceId }
    },
    dive_out: (args) => {
      const a = (args ?? {}) as { toDepth?: number }
      editor.diveOut(a.toDepth)
      return { ok: true }
    },
    find_nodes: (args) => {
      const a = (args ?? {}) as { type?: string; category?: string; titleContains?: string }
      const hits = findNodesIn(
        { registry: editor.registry, nodes: editor.graph.nodes() as Iterable<{ id: unknown; type: string; state?: Record<string, unknown> }> },
        a,
      )
      return { count: hits.length, nodes: hits }
    },
    describe_node: (args) => {
      const a = args as { nodeId: string }
      const node = editor.graph.getNode(a.nodeId as NodeId)
      if (!node) throw new Error(`describe_node: node '${a.nodeId}' not found`)
      const incident: Array<{ edgeId: string; direction: 'in' | 'out'; pin: string; otherNode: string }> = []
      for (const e of editor.graph.edges()) {
        if (e.from.node === node.id) incident.push({ edgeId: e.id, direction: 'out', pin: String(e.from.pin ?? ''), otherNode: String(e.to.node) })
        if (e.to.node === node.id)   incident.push({ edgeId: e.id, direction: 'in',  pin: String(e.to.pin ?? ''),   otherNode: String(e.from.node) })
      }
      const widgets = (node.widgets ?? []).map((w) => ({
        id: w.id, key: w.key ?? null, type: w.type, label: w.label ?? null,
        value: (node.state ?? {})[w.key ?? w.id] ?? null,
      }))
      return {
        id: node.id,
        type: node.type,
        position: node.position,
        size: node.size,
        pins: node.pins.map((p, i) => ({ index: i, id: p.id, label: p.label ?? null, direction: p.direction, type: p.type })),
        widgets,
        edges: incident,
      }
    },
    screenshot: async (args) => {
      if (!editor.exportImage) throw new Error('screenshot: editor.exportImage not available (headless host?)')
      const a = (args ?? {}) as { format?: 'png' | 'jpeg'; scale?: number; padding?: number }
      const blob = await editor.exportImage({ format: a.format ?? 'png', scale: a.scale ?? 2, padding: a.padding ?? 48 })
      return { format: a.format ?? 'png', dataUri: await blobToDataUri(blob), bytes: blob.size }
    },
    node_screenshot: async (args) => {
      if (!editor.exportNodeImage) throw new Error('node_screenshot: editor.exportNodeImage not available (headless host?)')
      const a = args as { nodeId: string; format?: 'png' | 'jpeg'; scale?: number }
      const blob = await editor.exportNodeImage(a.nodeId as NodeId, { format: a.format ?? 'png', scale: a.scale ?? 2 })
      return { nodeId: a.nodeId, format: a.format ?? 'png', dataUri: await blobToDataUri(blob), bytes: blob.size }
    },
    list_recipes: () => recipes.list().map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category ?? null,
      requires: r.requires,
      nodeCount: r.nodes.length,
      edgeCount: r.edges.length,
    })),
    instantiate_recipe: (args) => {
      const a = args as { id: string; x?: number; y?: number }
      const def: RecipeDef | undefined = recipes.get(a.id)
      if (!def) throw new Error(`instantiate_recipe: no recipe '${a.id}'. Available: ${recipes.list().map((r) => r.id).join(', ')}`)
      const origin = { x: a.x ?? 0, y: a.y ?? 0 }
      const result = instantiateRecipe(editor as never, def, origin)
      return { recipe: def.id, ids: result.ids, edges: result.edges, nodes: Object.keys(result.ids).length }
    },
    get_audit_log: () => audit.read(),
  }))
}

/** Outermost wrapper (C-Bet1b): in propose mode, mutating calls enqueue a replay closure
 *  (the AUDITED handler — so approval lands in the audit log with effect deltas) and return an
 *  honest 'proposed' result to the agent instead of mutating. Auto mode passes straight
 *  through — zero behavior change for existing sessions. */
function wrapWithProposals(
  proposals: ProposalQueue,
  clientId: string,
  mode: 'auto' | 'propose',
  handlers: Record<string, ToolHandler>,
): Record<string, ToolHandler> {
  if (mode !== 'propose') return handlers
  const out: Record<string, ToolHandler> = {}
  for (const [name, handler] of Object.entries(handlers)) {
    if (!AUDITED_TOOLS.has(name) || name === 'get_audit_log') { out[name] = handler; continue }
    if (name === 'add_node' || name === 'instantiate_recipe') {
      // Node-MINTING tools hand the agent a PROVISIONAL id it can reference in later proposals;
      // approval translates provisional → real through the queue's id map.
      out[name] = (args: unknown) => {
        const provisionalId = String(createNodeId())
        const proposalId = proposals._enqueue({
          clientId, tool: name,
          summary: `${name}(${digest(args)}) — proposed`,
          args,
          run: (idMap) => {
            const result = handler(args) as { id?: unknown } | Promise<{ id?: unknown }>
            const settle = (r: { id?: unknown }): { id?: unknown } => {
              if (r && typeof r.id === 'string') idMap.set(provisionalId, r.id)
              return r
            }
            return result instanceof Promise ? result.then(settle) : settle(result)
          },
        })
        return { proposed: true, proposalId, provisionalNodeId: provisionalId, tool: name, queued: proposals.size }
      }
      continue
    }
    out[name] = (args: unknown) => {
      const proposalId = proposals._enqueue({
        clientId, tool: name,
        summary: `${name}(${digest(args)}) — proposed`,
        args,
        run: (idMap) => handler(rewriteNodeRefs(args, idMap)),
      })
      return { proposed: true, proposalId, tool: name, queued: proposals.size }
    }
  }
  return out
}

/** Rewrite node-id references in tool args through the provisional→real map (chained
 *  proposals). Unknown ids pass through untouched. */
function rewriteNodeRefs(args: unknown, idMap: Map<string, string>): unknown {
  if (idMap.size === 0 || args === null || typeof args !== 'object') return args
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk)
    if (v === null || typeof v !== 'object') return v
    const out: Record<string, unknown> = {}
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if ((k === 'node' || k === 'nodeId') && typeof val === 'string' && idMap.has(val)) out[k] = idMap.get(val)
      else if (k === 'nodeIds' && Array.isArray(val)) out[k] = val.map((id) => (typeof id === 'string' && idMap.has(id) ? idMap.get(id) : id))
      else out[k] = walk(val)
    }
    return out
  }
  return walk(args)
}

/** Wrap every AUDITED tool so its call appends one audit entry (ok or error) with effect
 *  deltas measured from graph counts. Read/view tools pass through untouched. */
function wrapWithAudit(
  audit: AuditLog,
  clientId: string,
  editor: McpEditorSurface,
  handlers: Record<string, ToolHandler>,
): Record<string, ToolHandler> {
  const countOf = (it: Iterable<unknown>): number => { let n = 0; for (const _ of it) n++; return n }
  const delta = (before: number, after: number): AuditEffectDelta =>
    ({ added: Math.max(0, after - before), removed: Math.max(0, before - after) })
  const out: Record<string, ToolHandler> = {}
  for (const [name, handler] of Object.entries(handlers)) {
    if (!AUDITED_TOOLS.has(name)) { out[name] = handler; continue }
    // Promise-aware but NOT unconditionally async: synchronous handlers keep their synchronous
    // throw semantics (callers and tests rely on them); async handlers chain through.
    out[name] = (args: unknown) => {
      const beforeNodes = countOf(editor.graph.nodes())
      const beforeEdges = countOf(editor.graph.edges())
      const recordOk = (): void => {
        const nodes = delta(beforeNodes, countOf(editor.graph.nodes()))
        const edges = delta(beforeEdges, countOf(editor.graph.edges()))
        audit.append({
          clientId, tool: name, ok: true,
          summary: `${name}(${digest(args)}) ok`,
          ...(nodes.added + nodes.removed > 0 ? { nodes } : {}),
          ...(edges.added + edges.removed > 0 ? { edges } : {}),
        })
      }
      const recordErr = (err: unknown): void => {
        audit.append({
          clientId, tool: name, ok: false,
          summary: `${name}(${digest(args)}) error: ${(err as Error).message}`.slice(0, 160),
        })
      }
      let result: unknown
      try {
        result = handler(args)
      } catch (err) {
        recordErr(err)
        throw err
      }
      if (result instanceof Promise) {
        return result.then(
          (r) => { recordOk(); return r },
          (e) => { recordErr(e); throw e },
        )
      }
      recordOk()
      return result
    }
  }
  return out
}

async function blobToDataUri(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer())
  let bin = ''
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]!)
  const b64 = typeof btoa === 'function' ? btoa(bin) : Buffer.from(bin, 'binary').toString('base64')
  return `data:${blob.type};base64,${b64}`
}

/** Resolve a widget reference like the pin resolver — id → key → label match. The editor's
 *  `setWidgetValue` wants the widget *id*, so we translate friendly names back to it. */
function resolveWidgetId(node: NodeLike & { widgets?: Array<{ id: string; key?: string; type: string; label?: string }> }, ref: string): string {
  const ws = node.widgets ?? []
  if (ws.length === 0) throw new Error(`node '${node.id}' has no widgets`)
  const refStr = String(ref).toLowerCase().trim()
  const byId = ws.find((w) => w.id === ref)
  if (byId) return byId.id
  const byKey = ws.find((w) => (w.key ?? '').toLowerCase() === refStr)
  if (byKey) return byKey.id
  const byLabel = ws.find((w) => (w.label ?? '').toLowerCase() === refStr)
  if (byLabel) return byLabel.id
  const list = ws.map((w) => `${w.id}${w.key ? `(key:${w.key})` : ''}${w.label ? `(label:${w.label})` : ''}`).join(', ')
  throw new Error(`widget '${ref}' not found on node '${node.id}'. available: [${list}]`)
}

// Pin resolution lives in './pin-resolve.js' — extracted (E2) so hosts get the same
// id → label → index → direction resolution via editor.connect(from, ref, to, ref).

/** Lightweight WebSocket-like contract so unit tests can drive a mock without `ws` or browser WS. */
export interface McpSocketLike {
  send(data: string): void
  close(): void
  onmessage: ((ev: { data: unknown }) => void) | null
  onopen: ((ev: unknown) => void) | null
  onclose: ((ev: unknown) => void) | null
  onerror: ((ev: unknown) => void) | null
}

export interface McpClientOptions {
  /** Override the WebSocket constructor (useful for tests; defaults to globalThis.WebSocket). */
  socketFactory?: (url: string) => McpSocketLike
  /** Called on socket open + close + per-call so hosts can show a status indicator. */
  onStatus?: (status: 'connecting' | 'open' | 'closed' | 'error') => void
}

export class McpClient {
  #socket: McpSocketLike | null = null
  #handlers: Record<string, ToolHandler>
  #status: McpClientOptions['onStatus']
  /** Transport-provided identity for audit entries. NOT authentication — any client can
   *  claim any id until the server grows an auth story (see the audit security notes). */
  readonly clientId: string

  constructor(editor: McpEditorSurface, opts: McpClientOptions & { clientId?: string; audit?: AuditLog; mode?: 'auto' | 'propose'; proposals?: ProposalQueue } = {}) {
    const hOpts: BuildHandlersOptions = {}
    if (opts.clientId !== undefined) hOpts.clientId = opts.clientId
    if (opts.audit !== undefined) hOpts.audit = opts.audit
    if (opts.mode !== undefined) hOpts.mode = opts.mode
    if (opts.proposals !== undefined) hOpts.proposals = opts.proposals
    this.#handlers = buildHandlers(editor, hOpts)
    this.#status = opts.onStatus
    this.clientId = opts.clientId ?? 'editor-connection'
  }

  connect(url: string, opts: McpClientOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      const factory = opts.socketFactory
        ?? ((u: string) => new (globalThis as unknown as { WebSocket: new (u: string) => McpSocketLike }).WebSocket(u))
      const ws = factory(url)
      this.#socket = ws
      this.#status?.('connecting')
      ws.onopen = () => {
        ws.send(JSON.stringify({ kind: 'hello', editorVersion: '0.7.0-beta.6', clientId: this.clientId }))
        this.#status?.('open')
        resolve()
      }
      ws.onerror = () => { this.#status?.('error'); reject(new Error('mcp socket error')) }
      ws.onclose = () => { this.#status?.('closed'); this.#socket = null }
      ws.onmessage = (ev) => { void this.#onMessage(typeof ev.data === 'string' ? ev.data : '') }
    })
  }

  disconnect(): void { this.#socket?.close(); this.#socket = null }

  async #onMessage(raw: string): Promise<void> {
    let msg: CallMsg | null = null
    try { msg = JSON.parse(raw) as CallMsg } catch { return }
    if (!msg || msg.kind !== 'call' || typeof msg.id !== 'string' || typeof msg.tool !== 'string') return
    const handler = this.#handlers[msg.tool]
    const respond = (r: ResultMsg | ErrorMsg): void => this.#socket?.send(JSON.stringify(r))
    if (!handler) { respond({ id: msg.id, kind: 'result', ok: false, error: `unknown tool '${msg.tool}'` }); return }
    try {
      const data = await handler(msg.args)
      respond({ id: msg.id, kind: 'result', ok: true, data })
    } catch (err) {
      respond({ id: msg.id, kind: 'result', ok: false, error: err instanceof Error ? err.message : String(err) })
    }
  }
}
