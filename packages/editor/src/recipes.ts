// Recipe library — small, named subgraph templates the host (or an AI agent over MCP) can drop
// into the editor in one call. Recipes are stored as DATA (a fragment of nodes + edges referenced
// by local placeholder ids); the editor clones each on instantiate with fresh ids, optionally
// applies a base offset, and (optionally) auto-frames the result so the user sees what just
// landed. Recipes assume the schema types they name are already registered — they intentionally
// don't bring their own schemas (that would make a recipe a different kind of thing). Use
// `register_node_schema` first if you need to extend the registry.

import type { NodeId, PinId } from '@xenolithengine/core'
import { createEdgeId } from '@xenolithengine/core'

export interface RecipeNodeDef {
  /** Placeholder id used inside this recipe's edges. Replaced with a fresh NodeId at instantiate. */
  id: string
  /** Registered node type. */
  type: string
  /** Optional state map (widget defaults etc). */
  state?: Record<string, unknown>
}

export interface RecipeEdgeDef {
  from: { node: string; pin?: string | number }
  to: { node: string; pin?: string | number }
}

export interface RecipeDef {
  id: string
  title: string
  description: string
  /** Optional grouping tag for `list_recipes` clients to render sections. */
  category?: string
  /** Schema types this recipe assumes are registered. The instantiate handler returns a helpful
   *  error listing missing types so the AI can `register_node_schema` first and retry. */
  requires: string[]
  nodes: RecipeNodeDef[]
  edges: RecipeEdgeDef[]
}

/** The default catalog. Hosts can register more via `editor.recipes.register(...)`. Each recipe
 *  uses pin LABELS (case-insensitive) rather than ids so it survives schema renames as long as
 *  labels stay stable. Pin labels are matched the same way `connect_pins` resolves them.
 *
 *  All four recipes use the `demoSchemas` types shipped in `@xenolithengine/demo` (Source / Sample /
 *  Filter / Cache / Transform / Validate / Enrich / Score / Resolve / Format / Display / Audit /
 *  Persist / Notify / Archive). The MCP demo registers those on startup, so the recipes are
 *  instantiable out of the box. */
export const BUILTIN_RECIPES: RecipeDef[] = [
  {
    id: 'linear-float',
    title: 'Linear pipeline',
    description: 'Source → Sample → Filter → Resolve → Display. A straight float chain that ends in a string render — the simplest demonstrable workflow.',
    category: 'Pipeline',
    requires: ['Source', 'Sample', 'Filter', 'Resolve', 'Display'],
    nodes: [
      { id: 'src', type: 'Source' },
      { id: 'smp', type: 'Sample' },
      { id: 'flt', type: 'Filter' },
      { id: 'res', type: 'Resolve' },
      { id: 'dsp', type: 'Display' },
    ],
    edges: [
      { from: { node: 'src', pin: 'Output' }, to: { node: 'smp', pin: 'In' } },
      { from: { node: 'smp', pin: 'Out' },    to: { node: 'flt', pin: 'In' } },
      { from: { node: 'flt', pin: 'Out' },    to: { node: 'res', pin: 'Hint' } },
      { from: { node: 'res', pin: 'Out' },    to: { node: 'dsp', pin: 'In' } },
    ],
  },
  {
    id: 'branching-pipeline',
    title: 'Branching pipeline',
    description: 'Source fans out to Sample and Filter; Sample feeds an Audit log while Filter feeds a Resolve that renders to a Display. Shows parallel branches that re-converge through the renderer.',
    category: 'Pipeline',
    requires: ['Source', 'Sample', 'Filter', 'Audit', 'Resolve', 'Display'],
    nodes: [
      { id: 'src', type: 'Source' },
      { id: 'smp', type: 'Sample' },
      { id: 'flt', type: 'Filter' },
      { id: 'aud', type: 'Audit' },
      { id: 'res', type: 'Resolve' },
      { id: 'dsp', type: 'Display' },
    ],
    edges: [
      { from: { node: 'src', pin: 'Output' }, to: { node: 'smp', pin: 'In' } },
      { from: { node: 'src', pin: 'Output' }, to: { node: 'flt', pin: 'In' } },
      { from: { node: 'smp', pin: 'Out' },    to: { node: 'aud', pin: 'In' } },
      { from: { node: 'flt', pin: 'Out' },    to: { node: 'res', pin: 'Hint' } },
      { from: { node: 'res', pin: 'Out' },    to: { node: 'dsp', pin: 'In' } },
    ],
  },
  {
    id: 'enrich-and-rank',
    title: 'Enrich → rank → display',
    description: 'Cache → Enrich → Score → Resolve → Display. The "object" branch of the demo schemas: caches an object, enriches it, ranks it, then renders the final string.',
    category: 'Pipeline',
    requires: ['Cache', 'Enrich', 'Score', 'Resolve', 'Display'],
    nodes: [
      { id: 'cch', type: 'Cache' },
      { id: 'enr', type: 'Enrich' },
      { id: 'sco', type: 'Score' },
      { id: 'res', type: 'Resolve' },
      { id: 'dsp', type: 'Display' },
    ],
    edges: [
      { from: { node: 'cch', pin: 'Out' }, to: { node: 'enr', pin: 'In' } },
      { from: { node: 'enr', pin: 'Out' }, to: { node: 'sco', pin: 'In' } },
      { from: { node: 'sco', pin: 'Out' }, to: { node: 'res', pin: 'Hint' } },
      { from: { node: 'res', pin: 'Out' }, to: { node: 'dsp', pin: 'In' } },
    ],
  },
  {
    id: 'fan-out-audit',
    title: 'Fan-out audit',
    description: 'Source → Sample → splits into Audit + Persist + Notify. A "tee" pattern: same value to three side-effects (log, persist, alert) — common in observability flows.',
    category: 'Pipeline',
    requires: ['Source', 'Sample', 'Resolve', 'Audit', 'Persist', 'Notify'],
    nodes: [
      { id: 'src', type: 'Source' },
      { id: 'smp', type: 'Sample' },
      { id: 'res', type: 'Resolve' },
      { id: 'aud', type: 'Audit' },
      { id: 'per', type: 'Persist' },
      { id: 'not', type: 'Notify' },
    ],
    edges: [
      { from: { node: 'src', pin: 'Output' }, to: { node: 'smp', pin: 'In' } },
      { from: { node: 'smp', pin: 'Out' },    to: { node: 'aud', pin: 'In' } },
      { from: { node: 'smp', pin: 'Out' },    to: { node: 'res', pin: 'Hint' } },
      { from: { node: 'res', pin: 'Out' },    to: { node: 'per', pin: 'In' } },
      { from: { node: 'res', pin: 'Out' },    to: { node: 'not', pin: 'In' } },
    ],
  },
]

export interface RecipeRegistry {
  list(): RecipeDef[]
  get(id: string): RecipeDef | undefined
  register(def: RecipeDef): void
  /** Replace the entire catalog (rare — used for testing). */
  setAll(defs: RecipeDef[]): void
}

export function createRecipeRegistry(initial: RecipeDef[] = BUILTIN_RECIPES): RecipeRegistry {
  const byId = new Map(initial.map((r) => [r.id, r]))
  return {
    list: () => Array.from(byId.values()),
    get: (id) => byId.get(id),
    register: (def) => { byId.set(def.id, def) },
    setAll: (defs) => { byId.clear(); for (const d of defs) byId.set(d.id, d) },
  }
}

/** Instantiation surface — what the editor exposes so MCP / host code can drop a recipe in. */
export interface RecipeInstantiator {
  registry: { has(type: string): boolean; all(): Array<{ type: string }> }
  insertNode(type: string, worldPos: { x: number; y: number }, opts?: { center?: boolean }): { id: NodeId; pins: Array<{ id: PinId; label?: string; direction: 'in' | 'out' }> } | null
  addEdge(edge: { id: string; from: { node: NodeId; pin: PinId }; to: { node: NodeId; pin: PinId } }): boolean
  setWidgetValue(nodeId: NodeId, widgetId: string, value: unknown): void
  fitView?(opts?: { padding?: number }): void
  graph: {
    getNode(id: NodeId): { pins: Array<{ id: PinId; label?: string; direction: 'in' | 'out' }> } | undefined
  }
}

export interface InstantiateResult {
  /** Map of recipe-local id → freshly created NodeId. */
  ids: Record<string, NodeId>
  /** Number of edges actually wired (some may fail if the schema's pin labels drifted). */
  edges: number
}

/** Instantiate `recipe` into `editor` at `origin` (defaults to 0,0; the editor's insertNode falls
 *  back to `nextFreeSpot` when the same position is reused for every node, so consecutive nodes
 *  stack — the recommended pattern is `auto_layout` after the call). Throws with the missing
 *  types listed when the registry doesn't have one of the required schemas. */
export function instantiateRecipe(
  editor: RecipeInstantiator,
  recipe: RecipeDef,
  origin: { x: number; y: number } = { x: 0, y: 0 },
): InstantiateResult {
  const missing = recipe.requires.filter((t) => !editor.registry.has(t))
  if (missing.length > 0) {
    throw new Error(`recipe '${recipe.id}' needs these node types to be registered first: ${missing.join(', ')}`)
  }
  const idMap: Record<string, NodeId> = {}
  // First pass: create every node. Nodes are stacked at `origin` — host calls auto_layout to tidy.
  for (const n of recipe.nodes) {
    const created = editor.insertNode(n.type, origin)
    if (!created) throw new Error(`recipe '${recipe.id}': insertNode failed for type '${n.type}'`)
    idMap[n.id] = created.id
    if (n.state) {
      for (const [key, value] of Object.entries(n.state)) {
        try { editor.setWidgetValue(created.id, key, value) } catch { /* widget id may be optional in the schema */ }
      }
    }
  }
  // Second pass: wire edges by resolving each (node, pinLabel) pair against the live node.
  let connected = 0
  for (const e of recipe.edges) {
    const fromId = idMap[e.from.node], toId = idMap[e.to.node]
    if (!fromId || !toId) continue
    const fromNode = editor.graph.getNode(fromId)
    const toNode = editor.graph.getNode(toId)
    if (!fromNode || !toNode) continue
    const fromPin = resolvePinByRef(fromNode.pins, e.from.pin, 'out')
    const toPin   = resolvePinByRef(toNode.pins,   e.to.pin,   'in')
    if (!fromPin || !toPin) continue
    const ok = editor.addEdge({ id: createEdgeId(), from: { node: fromId, pin: fromPin.id }, to: { node: toId, pin: toPin.id } })
    if (ok) connected++
  }
  editor.fitView?.({ padding: 64 })
  return { ids: idMap, edges: connected }
}

function resolvePinByRef(
  pins: Array<{ id: PinId; label?: string; direction: 'in' | 'out' }>,
  ref: string | number | undefined,
  fallbackDir: 'in' | 'out',
): { id: PinId; direction: 'in' | 'out' } | undefined {
  if (ref === undefined) return pins.find((p) => p.direction === fallbackDir)
  const refStr = String(ref).toLowerCase().trim()
  const byLabel = pins.find((p) => (p.label ?? '').toLowerCase() === refStr)
  if (byLabel) return byLabel
  if (/^\d+$/.test(refStr)) {
    const idx = Number(refStr)
    if (idx >= 0 && idx < pins.length) return pins[idx]
  }
  if (refStr === 'in' || refStr === 'out') return pins.find((p) => p.direction === refStr)
  return undefined
}
